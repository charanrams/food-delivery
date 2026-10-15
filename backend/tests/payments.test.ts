import { createHmac } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { loadEnv } from '../src/config/env';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { Product, syncIndexes } from '../src/models';
import { SEED_PASSWORD, seedDemoData } from '../src/scripts/seed-data';

// Razorpay flow with the provider API stubbed (no network, no money).
const SECRET = 'test_key_secret';
const WEBHOOK = 'test_webhook_secret';
const env = loadEnv({ NODE_ENV: 'test', PAYMENT_MODE: 'LIVE', RAZORPAY_KEY_ID: 'rzp_test_key', RAZORPAY_KEY_SECRET: SECRET, RAZORPAY_WEBHOOK_SECRET: WEBHOOK });
const app = createApp(env);
const api = '/api/v1';
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

let customer: string, admin: string, addressId: string, dosaId: string;
let providerSeq = 0;

beforeAll(async () => {
  const realFetch = globalThis.fetch;
  vi.stubGlobal('fetch', async (url: string | URL, init?: RequestInit) => {
    if (String(url).startsWith('https://api.razorpay.com/v1/orders')) {
      const body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ id: `order_TEST${++providerSeq}`, amount: body.amount, currency: 'INR' }), { status: 200 });
    }
    return realFetch(url, init);
  });
  await connectDatabase(env);
  await syncIndexes();
  await seedDemoData();
  const login = async (identifier: string) => (await request(app).post(`${api}/auth/login`).send({ identifier, password: SEED_PASSWORD })).body.data.accessToken as string;
  [customer, admin] = await Promise.all([login('customer@a3kitchen.in'), login('admin@a3kitchen.in')]);
  addressId = (
    await request(app)
      .post(`${api}/addresses`)
      .set(auth(customer))
      .send({ recipientName: 'Ravi', phone: '9876543210', line1: 'Flat 302', city: 'Hyderabad', state: 'Telangana', postalCode: '500072' })
  ).body.data.id;
  dosaId = String((await Product.findOne({ slug: 'ghee-masala-dosa' }).lean())!._id);
});
afterAll(async () => {
  vi.unstubAllGlobals();
  await disconnectDatabase();
});

const sign = (s: string, secret = SECRET) => createHmac('sha256', secret).update(s).digest('hex');

describe('razorpay', () => {
  let orderId: string, providerOrderId: string;

  it('creates a Razorpay order at checkout and refuses the simulated test method in LIVE mode', async () => {
    const res = await request(app).post(`${api}/orders/checkout`).set(auth(customer)).send({ items: [{ productId: dosaId, quantity: 2 }], addressId, paymentMethod: 'RAZORPAY' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ status: 'PLACED', paymentStatus: 'PENDING', actions: ['pay', 'cancel'] });
    expect(res.body.data.razorpay).toMatchObject({ keyId: 'rzp_test_key', amountPaise: res.body.data.totalPaise, currency: 'INR' });
    expect(JSON.stringify(res.body)).not.toContain(SECRET);
    orderId = res.body.data.id;
    providerOrderId = res.body.data.razorpay.providerOrderId;

    const test = await request(app).post(`${api}/orders/checkout`).set(auth(customer)).send({ items: [{ productId: dosaId, quantity: 1 }], addressId, paymentMethod: 'TEST' });
    expect(test.status).toBe(400);
  });

  it('keeps the kitchen from accepting before payment', async () => {
    const res = await request(app).post(`${api}/admin/orders/${orderId}/accept`).set(auth(admin));
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/payment/i);
  });

  it('rejects a forged signature', async () => {
    const res = await request(app)
      .post(`${api}/payments/razorpay/verify`)
      .set(auth(customer))
      .send({ razorpay_order_id: providerOrderId, razorpay_payment_id: 'pay_FAKE1', razorpay_signature: sign('wrong|data') });
    expect(res.status).toBe(400);
    expect((await request(app).get(`${api}/orders/${orderId}`).set(auth(customer))).body.data.paymentStatus).toBe('PENDING');
  });

  it('marks PAID on a valid signature, then lets the kitchen accept', async () => {
    const res = await request(app)
      .post(`${api}/payments/razorpay/verify`)
      .set(auth(customer))
      .send({ razorpay_order_id: providerOrderId, razorpay_payment_id: 'pay_OK1', razorpay_signature: sign(`${providerOrderId}|pay_OK1`) });
    expect(res.status).toBe(200);
    const order = (await request(app).get(`${api}/orders/${orderId}`).set(auth(customer))).body.data;
    expect(order).toMatchObject({ paymentStatus: 'PAID', actions: ['cancel'] });
    await request(app).post(`${api}/admin/orders/${orderId}/accept`).set(auth(admin)).expect(200);
  });

  it('accepts a signed webhook once and ignores replays', async () => {
    const res = await request(app).post(`${api}/orders/checkout`).set(auth(customer)).send({ items: [{ productId: dosaId, quantity: 1 }], addressId, paymentMethod: 'RAZORPAY' });
    const oid = res.body.data.razorpay.providerOrderId as string;
    const payload = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_WH1', order_id: oid } } } });
    const send = () =>
      request(app)
        .post(`${api}/payments/webhooks/razorpay`)
        .set('Content-Type', 'application/json')
        .set('X-Razorpay-Event-Id', 'evt_1')
        .set('X-Razorpay-Signature', sign(payload, WEBHOOK))
        .send(payload);

    expect((await send()).body.data).toEqual({ received: true });
    expect((await send()).body.data).toEqual({ duplicate: true });
    expect((await request(app).get(`${api}/orders/${res.body.data.id}`).set(auth(customer))).body.data.paymentStatus).toBe('PAID');

    const forged = await request(app)
      .post(`${api}/payments/webhooks/razorpay`)
      .set('Content-Type', 'application/json')
      .set('X-Razorpay-Signature', sign(payload, 'not-the-secret'))
      .send(payload);
    expect(forged.status).toBe(400);
  });

  it('lets a customer retry payment after a failure', async () => {
    const res = await request(app).post(`${api}/orders/checkout`).set(auth(customer)).send({ items: [{ productId: dosaId, quantity: 1 }], addressId, paymentMethod: 'RAZORPAY' });
    await request(app).post(`${api}/payments/razorpay/failed`).set(auth(customer)).send({ orderId: res.body.data.id }).expect(200);
    expect((await request(app).get(`${api}/orders/${res.body.data.id}`).set(auth(customer))).body.data.paymentStatus).toBe('FAILED');
    const retry = await request(app).post(`${api}/payments/razorpay/order`).set(auth(customer)).send({ orderId: res.body.data.id });
    expect(retry.body.data.providerOrderId).toBe(res.body.data.razorpay.providerOrderId); // same provider order reused
  });
});

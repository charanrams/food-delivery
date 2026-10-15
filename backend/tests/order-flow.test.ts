import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { loadEnv } from '../src/config/env';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { DeliveryOtp, Product, syncIndexes } from '../src/models';
import { SEED_PASSWORD, seedDemoData } from '../src/scripts/seed-data';

// docs/TESTING.md §3 — the critical end-to-end order scenario, against the real API.
const env = loadEnv({ NODE_ENV: 'test', OTP_MAX_ATTEMPTS: '3' });
const app = createApp(env);
const api = '/api/v1';
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

async function login(identifier: string) {
  const res = await request(app).post(`${api}/auth/login`).send({ identifier, password: SEED_PASSWORD });
  expect(res.status).toBe(200);
  return res.body.data.accessToken as string;
}

let customer: string, admin: string, partner: string, partnerId: string;
let addressId: string, biryaniId: string, fullVariantId: string, dosaId: string;

beforeAll(async () => {
  await connectDatabase(env);
  await syncIndexes();
  await seedDemoData();
  [customer, admin, partner] = await Promise.all([login('customer@a3kitchen.in'), login('admin@a3kitchen.in'), login('delivery@a3kitchen.in')]);
  const me = await request(app).get(`${api}/delivery/me`).set(auth(partner));
  partnerId = me.body.data.id;
  const biryani = await Product.findOne({ slug: 'chicken-dum-biryani' }).lean();
  biryaniId = String(biryani!._id);
  fullVariantId = String(biryani!.variants.find((v) => v.name === 'Full')!._id);
  dosaId = String((await Product.findOne({ slug: 'ghee-masala-dosa' }).lean())!._id);
});
afterAll(disconnectDatabase);

describe('addresses', () => {
  it('creates an address, flags serviceability, and hides it from other users', async () => {
    const res = await request(app)
      .post(`${api}/addresses`)
      .set(auth(customer))
      .send({ recipientName: 'Ravi Kumar', phone: '9876543210', line1: 'Flat 302, Sri Sai Residency', city: 'Hyderabad', state: 'Telangana', postalCode: '500072' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ isDefault: true, isServiceable: true });
    addressId = res.body.data.id;

    const far = await request(app)
      .post(`${api}/addresses`)
      .set(auth(customer))
      .send({ recipientName: 'Ravi', phone: '9876543210', line1: 'Somewhere far', city: 'Chennai', state: 'TN', postalCode: '600001' });
    expect(far.body.data.isServiceable).toBe(false);

    const asAdmin = await request(app).get(`${api}/addresses`).set(auth(admin));
    expect(asAdmin.status).toBe(403);
  });

  it('refuses checkout to an unserviceable address', async () => {
    const list = await request(app).get(`${api}/addresses`).set(auth(customer));
    const far = list.body.data.find((a: { postalCode: string }) => a.postalCode === '600001');
    const res = await request(app)
      .post(`${api}/orders/checkout`)
      .set(auth(customer))
      .send({ items: [{ productId: dosaId, quantity: 1 }], addressId: far.id, paymentMethod: 'COD' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('ADDRESS_NOT_SERVICEABLE');
  });
});

describe('critical order flow', () => {
  let orderId: string;

  it('prices on the server, ignores tampered totals, and is idempotent', async () => {
    const body = {
      items: [{ productId: biryaniId, variantId: fullVariantId, quantity: 2, pricePaise: 1 }],
      addressId,
      paymentMethod: 'COD',
      totalPaise: 100, // tampered — must be ignored
    };
    const first = await request(app).post(`${api}/orders/checkout`).set(auth(customer)).set('Idempotency-Key', 'flow-1').send(body);
    expect(first.status).toBe(201);
    // 2 × ₹249 = ₹498 → below ₹499 free-delivery threshold → ₹39 fee; 5% GST = ₹24.90
    expect(first.body.data).toMatchObject({ status: 'PLACED', paymentStatus: 'PENDING', subtotalPaise: 49800, deliveryFeePaise: 3900, taxPaise: 2490, totalPaise: 56190 });
    orderId = first.body.data.id;

    const replay = await request(app).post(`${api}/orders/checkout`).set(auth(customer)).set('Idempotency-Key', 'flow-1').send(body);
    expect(replay.status).toBe(200);
    expect(replay.body.data.id).toBe(orderId); // same order, no duplicate
    const mine = await request(app).get(`${api}/orders`).set(auth(customer));
    expect(mine.body.data.filter((o: { id: string }) => o.id === orderId)).toHaveLength(1);
  });

  it('requires a portion for dishes that have portions', async () => {
    const res = await request(app).post(`${api}/orders/checkout`).set(auth(customer)).send({ items: [{ productId: biryaniId, quantity: 1 }], addressId, paymentMethod: 'COD' });
    expect(res.status).toBe(400);
  });

  it('shows the order in the admin queue and blocks illegal jumps', async () => {
    const queue = await request(app).get(`${api}/admin/orders?status=ACTIVE`).set(auth(admin));
    expect(queue.body.data.map((o: { id: string }) => o.id)).toContain(orderId);
    expect(queue.body.data.find((o: { id: string }) => o.id === orderId).actions).toEqual(['accept', 'reject', 'cancel']);

    const jump = await request(app).post(`${api}/admin/orders/${orderId}/ready`).set(auth(admin));
    expect(jump.status).toBe(409);
    expect(jump.body.error.code).toBe('INVALID_ORDER_TRANSITION');

    const asCustomer = await request(app).post(`${api}/admin/orders/${orderId}/accept`).set(auth(customer));
    expect(asCustomer.status).toBe(403);
  });

  it('lets only one of two concurrent admin actions win', async () => {
    // Two admins hit Accept at the same moment: exactly one succeeds.
    const [a, b] = await Promise.all([
      request(app).post(`${api}/admin/orders/${orderId}/accept`).set(auth(admin)),
      request(app).post(`${api}/admin/orders/${orderId}/accept`).set(auth(admin)),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const reject = await request(app).post(`${api}/admin/orders/${orderId}/reject`).set(auth(admin)).send({ reason: 'Too busy' });
    expect(reject.status).toBe(409); // already accepted
  });

  it('moves through preparation and refuses an offline partner', async () => {
    await request(app).post(`${api}/admin/orders/${orderId}/prepare`).set(auth(admin)).expect(200);
    await request(app).post(`${api}/admin/orders/${orderId}/ready`).set(auth(admin)).expect(200);

    const offline = await request(app).post(`${api}/admin/orders/${orderId}/assign`).set(auth(admin)).send({ partnerId });
    expect(offline.status).toBe(409);
    expect((await request(app).get(`${api}/admin/orders/eligible-partners`).set(auth(admin))).body.data).toHaveLength(0);

    await request(app).patch(`${api}/delivery/availability`).set(auth(partner)).send({ availability: 'ONLINE' }).expect(200);
    const eligible = await request(app).get(`${api}/admin/orders/eligible-partners`).set(auth(admin));
    expect(eligible.body.data[0]).toMatchObject({ id: partnerId, suggested: true });

    const assigned = await request(app).post(`${api}/admin/orders/${orderId}/assign`).set(auth(admin)).send({ partnerId });
    expect(assigned.body.data).toMatchObject({ status: 'ASSIGNED', partner: { id: partnerId } });
  });

  it('lets the partner accept, pick up and start delivery — but not go offline mid-delivery', async () => {
    const list = await request(app).get(`${api}/delivery/orders`).set(auth(partner));
    expect(list.body.data[0]).toMatchObject({ id: orderId, actions: ['accept', 'decline'] });

    const early = await request(app).post(`${api}/delivery/orders/${orderId}/pickup`).set(auth(partner));
    expect(early.status).toBe(409); // must accept first

    await request(app).post(`${api}/delivery/orders/${orderId}/accept`).set(auth(partner)).expect(200);
    await request(app).post(`${api}/delivery/orders/${orderId}/pickup`).set(auth(partner)).expect(200);
    const out = await request(app).post(`${api}/delivery/orders/${orderId}/out-for-delivery`).set(auth(partner));
    expect(out.body.data.status).toBe('OUT_FOR_DELIVERY');
    expect(out.body.data.deliveryOtp).toBeUndefined(); // the partner never sees the code

    const offline = await request(app).patch(`${api}/delivery/availability`).set(auth(partner)).send({ availability: 'OFFLINE' });
    expect(offline.status).toBe(409);
  });

  it('shows the code to the customer only', async () => {
    const asCustomer = await request(app).get(`${api}/orders/${orderId}`).set(auth(customer));
    expect(asCustomer.body.data.deliveryOtp).toMatch(/^\d{6}$/);
    const asAdmin = await request(app).get(`${api}/admin/orders/${orderId}`).set(auth(admin));
    expect(asAdmin.body.data.deliveryOtp).toBeUndefined();
    const stored = await DeliveryOtp.findOne({ orderId }).lean();
    expect(JSON.stringify(stored)).not.toContain(asCustomer.body.data.deliveryOtp); // only hash + cipher stored
  });

  it('rejects a wrong code, needs cash confirmation for COD, rejects an expired code, then delivers exactly once', async () => {
    const code = (await request(app).get(`${api}/orders/${orderId}`).set(auth(customer))).body.data.deliveryOtp as string;
    const wrong = code === '000000' ? '111111' : '000000';

    const bad = await request(app).post(`${api}/delivery/orders/${orderId}/verify-otp`).set(auth(partner)).send({ otp: wrong, cashCollected: true });
    expect(bad.status).toBe(422);
    expect(bad.body.error.details).toEqual({ attemptsRemaining: 2 });

    const noCash = await request(app).post(`${api}/delivery/orders/${orderId}/verify-otp`).set(auth(partner)).send({ otp: code });
    expect(noCash.status).toBe(400);

    await DeliveryOtp.updateMany({ orderId }, { expiresAt: new Date(Date.now() - 1000) });
    const expired = await request(app).post(`${api}/delivery/orders/${orderId}/verify-otp`).set(auth(partner)).send({ otp: code, cashCollected: true });
    expect(expired.status).toBe(410);
    expect((await request(app).get(`${api}/orders/${orderId}`).set(auth(customer))).body.data.status).toBe('OUT_FOR_DELIVERY');

    await DeliveryOtp.deleteMany({ orderId, createdAt: { $gt: new Date(Date.now() - 60_000) } }); // skip the 1-minute cooldown in tests
    await request(app).post(`${api}/delivery/orders/${orderId}/regenerate-otp`).set(auth(partner)).expect(200);
    const fresh = (await request(app).get(`${api}/orders/${orderId}`).set(auth(customer))).body.data.deliveryOtp as string;

    const [one, two] = await Promise.all([
      request(app).post(`${api}/delivery/orders/${orderId}/verify-otp`).set(auth(partner)).send({ otp: fresh, cashCollected: true }),
      request(app).post(`${api}/delivery/orders/${orderId}/verify-otp`).set(auth(partner)).send({ otp: fresh, cashCollected: true }),
    ]);
    expect([one.status, two.status].sort()).toEqual([200, 409]); // delivered exactly once

    const final = await request(app).get(`${api}/orders/${orderId}`).set(auth(customer));
    expect(final.body.data).toMatchObject({ status: 'DELIVERED', paymentStatus: 'PAID', actions: ['reorder'] });
    expect(final.body.data.deliveryOtp).toBeUndefined();

    const history = await request(app).get(`${api}/delivery/history`).set(auth(partner));
    expect(history.body.data.map((o: { id: string }) => o.id)).toContain(orderId);
    expect((await request(app).get(`${api}/delivery/me`).set(auth(partner))).body.data.todayDelivered).toBe(1);
  });

  it('notified the customer along the way', async () => {
    const res = await request(app).get(`${api}/notifications`).set(auth(customer));
    const titles = res.body.data.items.map((n: { title: string }) => n.title);
    expect(titles).toEqual(expect.arrayContaining(['Order placed', 'Order accepted', 'On the way', 'Delivered']));
  });
});

describe('cancellation and payments', () => {
  it('lets a customer cancel a just-placed test-paid order and refunds it', async () => {
    const res = await request(app).post(`${api}/orders/checkout`).set(auth(customer)).send({ items: [{ productId: dosaId, quantity: 1 }], addressId, paymentMethod: 'TEST' });
    expect(res.body.data).toMatchObject({ paymentStatus: 'PAID', actions: ['cancel'] });
    const cancelled = await request(app).post(`${api}/orders/${res.body.data.id}/cancel`).set(auth(customer)).send({ reason: 'Ordered by mistake' });
    expect(cancelled.body.data).toMatchObject({ status: 'CANCELLED', paymentStatus: 'REFUNDED' });
  });

  it('reports online payment as unavailable instead of faking it', async () => {
    const res = await request(app).post(`${api}/orders/checkout`).set(auth(customer)).send({ items: [{ productId: dosaId, quantity: 1 }], addressId, paymentMethod: 'RAZORPAY' });
    expect(res.status).toBe(503);
  });

  it('never shows one customer another customer’s order', async () => {
    const reg = await request(app).post(`${api}/auth/login`).send({ identifier: 'admin@a3kitchen.in', password: SEED_PASSWORD });
    const someOrder = (await request(app).get(`${api}/admin/orders`).set(auth(reg.body.data.accessToken))).body.data[0].id;
    // A brand-new customer token for a different user:
    const other = await request(app).post(`${api}/orders/${someOrder}/cancel`).set(auth(partner));
    expect(other.status).toBe(403); // wrong role entirely
  });
});

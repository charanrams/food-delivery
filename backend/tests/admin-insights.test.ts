import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { loadEnv } from '../src/config/env';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { syncIndexes } from '../src/models';
import { SEED_PASSWORD, seedDemoData } from '../src/scripts/seed-data';

const env = loadEnv({ NODE_ENV: 'test', CLOUDINARY_CLOUD_NAME: 'demo-cloud', CLOUDINARY_API_KEY: '123', CLOUDINARY_API_SECRET: 'shh' });
const app = createApp(env);
const api = '/api/v1';
const login = async (phone: string) =>
  (await request(app).post(`${api}/auth/login`).send({ identifier: phone, password: SEED_PASSWORD })).body.data.accessToken as string;

let admin: string;
let customer: string;
beforeAll(async () => {
  await connectDatabase(env);
  await syncIndexes();
  await seedDemoData();
  admin = await login('9000000001');
  customer = await login('9000000003');
});
afterAll(disconnectDatabase);

describe('admin insights', () => {
  it('is admin-only', async () => {
    for (const path of ['/admin/customers', '/admin/payments', '/admin/reports', '/admin/settings']) {
      expect((await request(app).get(`${api}${path}`).set('Authorization', `Bearer ${customer}`)).status).toBe(403);
    }
  });

  it('lists customers with order stats and can block one', async () => {
    const res = await request(app).get(`${api}/admin/customers`).set('Authorization', `Bearer ${admin}`);
    expect(res.status).toBe(200);
    const c = res.body.data[0];
    expect(c).toMatchObject({ orders: expect.any(Number), spentPaise: expect.any(Number) });
    const blocked = await request(app).patch(`${api}/admin/customers/${c.id}/status`).set('Authorization', `Bearer ${admin}`).send({ status: 'SUSPENDED' });
    expect(blocked.body.data.status).toBe('SUSPENDED');
    await request(app).patch(`${api}/admin/customers/${c.id}/status`).set('Authorization', `Bearer ${admin}`).send({ status: 'ACTIVE' });
  });

  it('returns a daily report with one row per day', async () => {
    const res = await request(app).get(`${api}/admin/reports?days=7`).set('Authorization', `Bearer ${admin}`);
    expect(res.status).toBe(200);
    expect(res.body.data.daily).toHaveLength(7);
  });

  it('reads and updates kitchen settings, validating PIN codes', async () => {
    const auth = { Authorization: `Bearer ${admin}` };
    expect((await request(app).get(`${api}/admin/settings`).set(auth)).body.data).toHaveProperty('taxRateBps');
    expect((await request(app).patch(`${api}/admin/settings`).set(auth).send({ serviceablePostalCodes: ['12'] })).status).toBe(400);
    const ok = await request(app).patch(`${api}/admin/settings`).set(auth).send({ deliveryFeePaise: 3000, freeDeliveryAbovePaise: null });
    expect(ok.body.data).toMatchObject({ deliveryFeePaise: 3000 });
    expect(ok.body.data.freeDeliveryAbovePaise).toBeUndefined();
  });

  it('lists payments', async () => {
    const res = await request(app).get(`${api}/admin/payments?status=PAID`).set('Authorization', `Bearer ${admin}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

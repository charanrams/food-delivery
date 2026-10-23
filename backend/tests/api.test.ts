import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { loadEnv } from '../src/config/env';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { AuditLog, syncIndexes } from '../src/models';
import { SEED_PASSWORD, seedDemoData } from '../src/scripts/seed-data';
import { testOutbox } from '../src/utils/mailer';

const lastCode = () => /(\d{6})/.exec(testOutbox.at(-1)!.text)![1];

const env = loadEnv({ NODE_ENV: 'test', CLOUDINARY_CLOUD_NAME: 'demo-cloud', CLOUDINARY_API_KEY: '123', CLOUDINARY_API_SECRET: 'shh' });
const app = createApp(env);
const api = '/api/v1';

const login = async (phone: string) => {
  const res = await request(app).post(`${api}/auth/login`).send({ identifier: phone, password: SEED_PASSWORD });
  expect(res.status).toBe(200);
  return res.body.data.accessToken as string;
};

let adminToken: string;
let customerToken: string;

beforeAll(async () => {
  await connectDatabase(env);
  await syncIndexes();
  await seedDemoData();
  adminToken = await login('9000000001');
  customerToken = await login('9000000003');
});
afterAll(disconnectDatabase);

describe('auth', () => {
  const newPerson = { name: 'New Person', phone: '9876543210', email: 'new.person@example.com' };

  it('requires a verified email code to register', async () => {
    const bad = await request(app).post(`${api}/auth/register`).send({ ...newPerson, password: 'longenough', otp: '000000' });
    expect(bad.status).toBe(400);
    const sent = await request(app).post(`${api}/auth/register/otp`).send(newPerson);
    expect(sent.status).toBe(200);
    expect(testOutbox.at(-1)!.to).toBe('new.person@example.com');
  });

  it('registers a customer with the emailed code and ignores any role the client sends', async () => {
    const res = await request(app)
      .post(`${api}/auth/register`)
      .send({ ...newPerson, password: 'longenough', otp: lastCode(), role: 'ADMIN' });
    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({ role: 'CUSTOMER', phone: '+919876543210' });
    expect(res.headers['set-cookie']?.[0]).toMatch(/a3_rt=.*HttpOnly/);
    expect(res.body.data.refreshToken).toBeUndefined(); // web clients only get the cookie
  });

  it('rejects a duplicate phone number', async () => {
    const res = await request(app).post(`${api}/auth/register/otp`).send({ ...newPerson, email: 'other@example.com' });
    expect(res.status).toBe(409);
  });

  it('resets a password with an emailed code, without revealing unknown emails', async () => {
    const before = testOutbox.length;
    const unknown = await request(app).post(`${api}/auth/password/forgot`).send({ email: 'nobody@example.com' });
    expect(unknown.status).toBe(200);
    expect(testOutbox.length).toBe(before);

    await request(app).post(`${api}/auth/password/forgot`).send({ email: newPerson.email }).expect(200);
    const wrong = await request(app).post(`${api}/auth/password/reset`).send({ email: newPerson.email, otp: '999999', password: 'brand-new-pass' });
    expect(wrong.status).toBe(400);
    await request(app).post(`${api}/auth/password/reset`).send({ email: newPerson.email, otp: lastCode(), password: 'brand-new-pass' }).expect(200);
    await request(app).post(`${api}/auth/login`).send({ identifier: newPerson.email, password: 'brand-new-pass' }).expect(200);
  });

  it('uses one message for unknown phone and wrong password', async () => {
    const a = await request(app).post(`${api}/auth/login`).send({ identifier: '9111111111', password: 'whatever1' });
    const b = await request(app).post(`${api}/auth/login`).send({ identifier: '9000000003', password: 'wrong-pass' });
    expect(a.status).toBe(401);
    expect(b.body.error.message).toBe(a.body.error.message);
  });

  it('logs in by email and returns the role so the client can route', async () => {
    const res = await request(app).post(`${api}/auth/login`).send({ identifier: 'Admin@A3kitchen.in', password: SEED_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ role: 'ADMIN', email: 'admin@a3kitchen.in' });
    const partner = await request(app).post(`${api}/auth/login`).send({ identifier: 'delivery@a3kitchen.in', password: SEED_PASSWORD });
    expect(partner.body.data.user.role).toBe('DELIVERY_PARTNER');
  });

  it('rotates refresh tokens for mobile and revokes the family on reuse', async () => {
    const first = await request(app).post(`${api}/auth/login`).set('X-Client', 'mobile').send({ identifier: '9000000003', password: SEED_PASSWORD });
    const rt1 = first.body.data.refreshToken as string;
    expect(rt1).toBeTruthy();

    const second = await request(app).post(`${api}/auth/refresh`).set('X-Client', 'mobile').send({ refreshToken: rt1 });
    expect(second.status).toBe(200);
    const rt2 = second.body.data.refreshToken as string;
    expect(rt2).not.toBe(rt1);

    const replay = await request(app).post(`${api}/auth/refresh`).set('X-Client', 'mobile').send({ refreshToken: rt1 });
    expect(replay.status).toBe(401);
    const afterReuse = await request(app).post(`${api}/auth/refresh`).set('X-Client', 'mobile').send({ refreshToken: rt2 });
    expect(afterReuse.status).toBe(401); // whole family revoked
  });

  it('returns the profile for a valid token and 401 without one', async () => {
    expect((await request(app).get(`${api}/users/me`)).status).toBe(401);
    const res = await request(app).get(`${api}/users/me`).set('Authorization', `Bearer ${customerToken}`);
    expect(res.body.data).toMatchObject({ name: 'Ravi Kumar', role: 'CUSTOMER' });
    expect(res.body.data.passwordHash).toBeUndefined();
  });
});

describe('catalog', () => {
  it('lists active categories with product counts', async () => {
    const res = await request(app).get(`${api}/categories`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(6);
    expect(res.body.data[0]).toMatchObject({ name: 'Biryani & Rice', productCount: 2 });
    expect(res.body.data[0].imageUrl).toMatch(/^https:\/\/res\.cloudinary\.com\//);
  });

  it('filters products by category slug, search and veg, with pagination meta', async () => {
    const cat = await request(app).get(`${api}/products?categorySlug=curries`);
    expect(cat.body.data.map((p: { name: string }) => p.name)).toContain('Paneer Butter Masala');
    expect(cat.body.meta).toMatchObject({ page: 1, total: 3 });

    const veg = await request(app).get(`${api}/products?search=paneer&veg=true`);
    expect(veg.body.data.every((p: { isVegetarian: boolean }) => p.isVegetarian)).toBe(true);
    expect(veg.body.data).toHaveLength(3);
  });

  it('caps the page size', async () => {
    expect((await request(app).get(`${api}/products?limit=500`)).status).toBe(400);
  });

  it('blocks customers from admin endpoints', async () => {
    const res = await request(app).post(`${api}/admin/categories`).set('Authorization', `Bearer ${customerToken}`).send({ name: 'Hack' });
    expect(res.status).toBe(403);
  });

  it('lets an admin create, price-change, hide and archive a dish — with an audit trail', async () => {
    const auth = { Authorization: `Bearer ${adminToken}` };
    const cat = await request(app).post(`${api}/admin/categories`).set(auth).send({ name: 'Snacks' });
    expect(cat.status).toBe(201);
    expect(cat.body.data.slug).toBe('snacks');

    const created = await request(app)
      .post(`${api}/admin/products`)
      .set(auth)
      .send({ categoryId: cat.body.data.id, name: 'Mirchi Bajji', pricePaise: 6900, isVegetarian: true });
    expect(created.status).toBe(201);
    const id = created.body.data.id;

    const repriced = await request(app).patch(`${api}/admin/products/${id}`).set(auth).send({ pricePaise: 7900 });
    expect(repriced.body.data.pricePaise).toBe(7900);
    const log = await AuditLog.findOne({ entityId: id, action: 'product.update' }).lean();
    expect(log?.metadata).toMatchObject({ pricePaise: { from: 6900, to: 7900 } });

    const hidden = await request(app).patch(`${api}/admin/products/${id}/availability`).set(auth).send({ isAvailable: false });
    expect(hidden.body.data.isAvailable).toBe(false);

    await request(app).delete(`${api}/admin/products/${id}`).set(auth).expect(200);
    expect((await request(app).get(`${api}/products/${id}`)).status).toBe(404); // hidden from customers
    expect((await request(app).get(`${api}/admin/products/${id}`).set(auth)).body.data.isArchived).toBe(true);
  });

  it('rejects fractional paise and foreign image hosts', async () => {
    const auth = { Authorization: `Bearer ${adminToken}` };
    const cats = await request(app).get(`${api}/categories`);
    const categoryId = cats.body.data[0].id;
    const frac = await request(app).post(`${api}/admin/products`).set(auth).send({ categoryId, name: 'Bad Price', pricePaise: 99.5 });
    expect(frac.status).toBe(400);
    const foreign = await request(app)
      .post(`${api}/admin/products`)
      .set(auth)
      .send({ categoryId, name: 'Bad Image', pricePaise: 100, images: ['https://evil.example.com/x.jpg'] });
    expect(foreign.status).toBe(400);
    const ours = await request(app)
      .post(`${api}/admin/products`)
      .set(auth)
      .send({ categoryId, name: 'Good Image', pricePaise: 100, images: ['https://res.cloudinary.com/demo-cloud/image/upload/v1/a3-kitchen/products/x.jpg'] });
    expect(ours.status).toBe(201);
  });

  it('refuses to delete a category that still has dishes', async () => {
    const auth = { Authorization: `Bearer ${adminToken}` };
    const cats = await request(app).get(`${api}/categories`);
    const res = await request(app).delete(`${api}/admin/categories/${cats.body.data[0].id}`).set(auth);
    expect(res.status).toBe(409);
  });
});

describe('uploads', () => {
  it('signs an upload for admins without leaking the secret', async () => {
    const res = await request(app).post(`${api}/admin/uploads/sign`).set('Authorization', `Bearer ${adminToken}`).send({ folder: 'products' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ cloudName: 'demo-cloud', apiKey: '123', folder: 'a3-kitchen/products' });
    expect(res.body.data.signature).toMatch(/^[a-f0-9]{40}$/);
    expect(JSON.stringify(res.body)).not.toContain('shh');
  });

  it('refuses to sign for customers', async () => {
    const res = await request(app).post(`${api}/admin/uploads/sign`).set('Authorization', `Bearer ${customerToken}`).send({ folder: 'products' });
    expect(res.status).toBe(403);
  });
});

describe('admin delivery partners', () => {
  const body = { name: 'Kiran P.', email: 'kiran.partner@example.com', phone: '9123456780', vehicleType: 'Bike', vehicleNumber: 'ts09ab1234' };

  it('is admin-only', async () => {
    const res = await request(app).get(`${api}/admin/delivery-partners`).set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(403);
  });

  it('creates a partner, emails working credentials, then updates, suspends and deletes', async () => {
    const created = await request(app).post(`${api}/admin/delivery-partners`).set('Authorization', `Bearer ${adminToken}`).send(body);
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ emailSent: true, partner: { vehicleNumber: 'TS09AB1234', status: 'ACTIVE' } });
    const mail = testOutbox.at(-1)!;
    expect(mail.to).toBe(body.email);
    const password = /Password: (\S+)/.exec(mail.text)![1];
    await request(app).post(`${api}/auth/login`).send({ identifier: body.email, password }).expect(200);

    const id = created.body.data.partner.id as string;
    const dup = await request(app).post(`${api}/admin/delivery-partners`).set('Authorization', `Bearer ${adminToken}`).send({ ...body, phone: '9123456781' });
    expect(dup.status).toBe(409);

    const suspended = await request(app).patch(`${api}/admin/delivery-partners/${id}`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'SUSPENDED', vehicleType: 'Scooter' });
    expect(suspended.body.data).toMatchObject({ status: 'SUSPENDED', vehicleType: 'Scooter' });
    const blocked = await request(app).post(`${api}/auth/login`).send({ identifier: body.email, password });
    expect(blocked.status).toBe(403);

    const list = await request(app).get(`${api}/admin/delivery-partners?search=kiran`).set('Authorization', `Bearer ${adminToken}`);
    expect(list.body.data).toHaveLength(1);

    await request(app).delete(`${api}/admin/delivery-partners/${id}`).set('Authorization', `Bearer ${adminToken}`).expect(200);
  });
});

describe('one-field login + sign-up (driveflow flow, dummy OTP)', () => {
  it('tells the app what to show next for email and phone', async () => {
    const check = (identifier: string) => request(app).post(`${api}/auth/check`).send({ identifier }).then((r) => r.body.data);
    expect(await check('customer@a3kitchen.in')).toEqual({ kind: 'email', exists: true }); // → password step
    expect(await check('9000000003')).toEqual({ kind: 'phone', exists: true }); // → OTP step
    expect(await check('nobody@example.com')).toEqual({ kind: 'email', exists: false }); // → sign-up
    expect(await check('9111122222')).toEqual({ kind: 'phone', exists: false }); // → sign-up
  });

  it('logs an existing customer in with the phone OTP (single-use)', async () => {
    const sent = await request(app).post(`${api}/auth/phone/otp`).send({ phone: '9000000003' });
    expect(sent.body.data).toEqual({ sent: true, isNewUser: false, devCode: '123456' });
    expect((await request(app).post(`${api}/auth/phone/verify`).send({ phone: '9000000003', otp: '000000' })).status).toBe(400);
    const ok = await request(app).post(`${api}/auth/phone/verify`).set('X-Client', 'mobile').send({ phone: '9000000003', otp: '123456' });
    expect(ok.body.data.user).toMatchObject({ role: 'CUSTOMER', name: 'Ravi Kumar' });
    expect((await request(app).post(`${api}/auth/phone/verify`).send({ phone: '9000000003', otp: '123456' })).status).toBe(400);
  });

  it('refuses phone login for an unknown number', async () => {
    await request(app).post(`${api}/auth/phone/otp`).send({ phone: '9111122223' });
    expect((await request(app).post(`${api}/auth/phone/verify`).send({ phone: '9111122223', otp: '123456' })).status).toBe(404);
  });

  it('signs up with name, email, password and mobile number (no OTP) — then email login works', async () => {
    const body = { name: 'Lakshmi', email: 'lakshmi@example.com', phone: '9123456780', password: 'longenough1' };
    const done = await request(app).post(`${api}/auth/signup`).set('X-Client', 'mobile').send(body);
    expect(done.status).toBe(201);
    expect(done.body.data.user).toMatchObject({ name: 'Lakshmi', phone: '+919123456780', email: 'lakshmi@example.com', role: 'CUSTOMER' });
    const byEmail = await request(app).post(`${api}/auth/login`).send({ identifier: 'lakshmi@example.com', password: 'longenough1' });
    expect(byEmail.status).toBe(200);
    expect((await request(app).post(`${api}/auth/signup`).send(body)).status).toBe(409);
  });
});

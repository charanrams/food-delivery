import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { loadEnv } from '../src/config/env';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { Product, syncIndexes } from '../src/models';
import { SEED_PASSWORD, seedDemoData } from '../src/scripts/seed-data';

// Today's specials: admin CRUD, what customers see, and that the server applies the discount.
const env = loadEnv({ NODE_ENV: 'test' });
const app = createApp(env);
const api = '/api/v1';
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

async function login(identifier: string) {
  const res = await request(app).post(`${api}/auth/login`).send({ identifier, password: SEED_PASSWORD });
  return res.body.data.accessToken as string;
}

let admin: string, customer: string, naanId: string, specialId: string;
const quote = () => request(app).post(`${api}/orders/quote`).set(auth(customer)).send({ items: [{ productId: naanId, quantity: 2 }] });

beforeAll(async () => {
  await connectDatabase(env);
  await syncIndexes();
  await seedDemoData();
  [admin, customer] = await Promise.all([login('admin@a3kitchen.in'), login('customer@a3kitchen.in')]);
  naanId = String((await Product.findOne({ slug: 'butter-naan' }).lean())!._id); // ₹49, single portion
});
afterAll(disconnectDatabase);

describe('specials', () => {
  it('only admins can manage specials', async () => {
    const res = await request(app).post(`${api}/admin/specials`).set(auth(customer)).send({ productId: naanId, discountPercent: 20 });
    expect(res.status).toBe(403);
  });

  it('creates a special that customers see and checkout honours', async () => {
    const before = (await quote()).body.data;
    expect(before.discountPaise).toBe(0);

    const created = await request(app).post(`${api}/admin/specials`).set(auth(admin)).send({ productId: naanId, discountPercent: 20, label: 'Today only' });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ discountPercent: 20, specialPricePaise: 3920, isLive: true, label: 'Today only' });
    specialId = created.body.data.id;

    const pub = await request(app).get(`${api}/specials`);
    expect(pub.body.data.map((s: { product: { slug: string } }) => s.product.slug)).toContain('butter-naan');

    const after = (await quote()).body.data;
    expect(after.subtotalPaise).toBe(9800);
    expect(after.discountPaise).toBe(1960); // 20% of ₹98
    expect(after.taxPaise).toBe(392); // GST on the discounted ₹78.40
    expect(after.totalPaise).toBe(9800 - 1960 + after.deliveryFeePaise + 392);
  });

  it('rejects a second special for the same dish and bad windows', async () => {
    const dup = await request(app).post(`${api}/admin/specials`).set(auth(admin)).send({ productId: naanId, discountPercent: 10 });
    expect(dup.status).toBe(409);
    const bad = await request(app)
      .patch(`${api}/admin/specials/${specialId}`)
      .set(auth(admin))
      .send({ startsAt: '2030-01-02T00:00:00Z', endsAt: '2030-01-01T00:00:00Z' });
    expect(bad.status).toBe(400);
  });

  it('a paused or future special is hidden and not applied', async () => {
    await request(app).patch(`${api}/admin/specials/${specialId}`).set(auth(admin)).send({ isActive: false });
    expect((await request(app).get(`${api}/specials`)).body.data).toHaveLength(0);
    expect((await quote()).body.data.discountPaise).toBe(0);

    await request(app).patch(`${api}/admin/specials/${specialId}`).set(auth(admin)).send({ isActive: true, startsAt: '2099-01-01T00:00:00Z' });
    expect((await request(app).get(`${api}/specials`)).body.data).toHaveLength(0);
    expect((await quote()).body.data.discountPaise).toBe(0);

    await request(app).patch(`${api}/admin/specials/${specialId}`).set(auth(admin)).send({ startsAt: null });
    expect((await quote()).body.data.discountPaise).toBe(1960);
  });

  it('deletes a special', async () => {
    const del = await request(app).delete(`${api}/admin/specials/${specialId}`).set(auth(admin));
    expect(del.status).toBe(200);
    expect((await request(app).get(`${api}/admin/specials`).set(auth(admin))).body.data).toHaveLength(0);
  });
});

describe('offer sections', () => {
  it('admin creates a section; its deals show only while the section is on', async () => {
    const sec = await request(app).post(`${api}/admin/offer-sections`).set(auth(admin)).send({ title: 'Weekend deals', subtitle: 'Sat & Sun only' });
    expect(sec.status).toBe(201);
    const sectionId = sec.body.data.id as string;
    expect((await request(app).get(`${api}/offer-sections`)).body.data.map((x: { id: string }) => x.id)).toContain(sectionId);

    const lassi = await Product.findOne({ slug: { $ne: 'butter-naan' }, isArchived: false }).lean();
    const deal = await request(app).post(`${api}/admin/specials`).set(auth(admin)).send({ productId: String(lassi!._id), discountPercent: 15, sectionId });
    expect(deal.status).toBe(201);
    expect(deal.body.data).toMatchObject({ sectionId, isLive: true });

    const list = await request(app).get(`${api}/admin/offer-sections`).set(auth(admin));
    expect(list.body.data.find((x: { id: string }) => x.id === sectionId).specialCount).toBe(1);

    await request(app).patch(`${api}/admin/offer-sections/${sectionId}`).set(auth(admin)).send({ isActive: false }).expect(200);
    const pub = await request(app).get(`${api}/specials`);
    expect(pub.body.data.some((s: { id: string }) => s.id === deal.body.data.id)).toBe(false);

    await request(app).delete(`${api}/admin/offer-sections/${sectionId}`).set(auth(admin)).expect(200);
    const all = await request(app).get(`${api}/admin/specials`).set(auth(admin));
    expect(all.body.data.some((s: { id: string }) => s.id === deal.body.data.id)).toBe(false);
  });

  it('customers cannot manage sections', async () => {
    await request(app).post(`${api}/admin/offer-sections`).set(auth(customer)).send({ title: 'Nope' }).expect(403);
  });
});

describe('offer section start/stop', () => {
  it('a section scheduled for later is hidden and its deals are not live', async () => {
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString();
    const sec = await request(app).post(`${api}/admin/offer-sections`).set(auth(admin)).send({ title: 'Tomorrow only', startsAt: tomorrow });
    expect(sec.status).toBe(201);
    expect(sec.body.data.isLive).toBe(false);
    expect((await request(app).get(`${api}/offer-sections`)).body.data.some((x: { id: string }) => x.id === sec.body.data.id)).toBe(false);
    const bad = await request(app).patch(`${api}/admin/offer-sections/${sec.body.data.id}`).set(auth(admin)).send({ endsAt: new Date().toISOString() });
    expect(bad.status).toBe(400);
  });
});

describe('home rows', () => {
  it('popular returns up to 8 available dishes', async () => {
    const res = await request(app).get(`${api}/products/popular`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.length).toBeLessThanOrEqual(8);
    expect(res.body.data.every((p: { isAvailable: boolean }) => p.isAvailable)).toBe(true);
  });

  it('admin can show a category on Home', async () => {
    const cats = (await request(app).get(`${api}/admin/categories`).set(auth(admin))).body.data;
    expect(cats[0].showOnHome).toBe(false);
    const res = await request(app).patch(`${api}/admin/categories/${cats[0].id}`).set(auth(admin)).send({ showOnHome: true });
    expect(res.body.data.showOnHome).toBe(true);
  });
});

describe('popular section + order', () => {
  it('popular is built in, cannot hold deals or be deleted, and sections can be reordered', async () => {
    const { ensurePopularSection } = await import('../src/modules/specials/specials');
    await ensurePopularSection();
    await ensurePopularSection();
    const list = (await request(app).get(`${api}/admin/offer-sections`).set(auth(admin))).body.data as { id: string; kind: string }[];
    const pop = list.filter((x) => x.kind === 'POPULAR');
    expect(pop).toHaveLength(1);
    await request(app).delete(`${api}/admin/offer-sections/${pop[0]!.id}`).set(auth(admin)).expect(400);
    const dish = await Product.findOne({ isArchived: false, slug: { $ne: 'butter-naan' } }).skip(3).lean();
    await request(app).post(`${api}/admin/specials`).set(auth(admin)).send({ productId: String(dish!._id), discountPercent: 10, sectionId: pop[0]!.id }).expect(400);

    const ids = list.map((x) => x.id).reverse();
    const re = await request(app).post(`${api}/admin/offer-sections/reorder`).set(auth(admin)).send({ ids });
    expect(re.body.data.map((x: { id: string }) => x.id)).toEqual(ids);
  });
});

describe('category rows in the global order', () => {
  it('Row on Home adds the category to the section order and removes it again', async () => {
    const cats = (await request(app).get(`${api}/admin/categories`).set(auth(admin))).body.data;
    const c = cats[1];
    await request(app).patch(`${api}/admin/categories/${c.id}`).set(auth(admin)).send({ showOnHome: true }).expect(200);
    let rows = (await request(app).get(`${api}/offer-sections`)).body.data as { kind: string; categorySlug?: string }[];
    expect(rows.some((x) => x.kind === 'CATEGORY' && x.categorySlug === c.slug)).toBe(true);
    await request(app).patch(`${api}/admin/categories/${c.id}`).set(auth(admin)).send({ showOnHome: false }).expect(200);
    rows = (await request(app).get(`${api}/offer-sections`)).body.data;
    expect(rows.some((x) => x.categorySlug === c.slug)).toBe(false);
  });
});

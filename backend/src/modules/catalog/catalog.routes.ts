import { Router } from 'express';
import { z } from 'zod';
import { actorOf, authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { ok } from '../../utils/http';
import * as catalog from './catalog.service';
import { syncCategoryRow } from '../specials/specials';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const idParams = z.object({ id: objectId });
const paise = z.number().int('Use whole paise').min(0).max(10_000_00);
const boolish = z.enum(['true', 'false']).transform((v) => v === 'true');
const imageUrl = z.url().max(500);

const productQuery = z.object({
  categoryId: objectId.optional(),
  categorySlug: z.string().max(80).optional(),
  search: z.string().trim().max(60).optional(),
  veg: boolish.optional(),
  available: boolish.optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  sort: z.enum(['popular', 'price_asc', 'price_desc', 'newest']).default('popular'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(24), // capped (docs/API.md)
});

const categoryBody = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).optional(),
  imageUrl: imageUrl.optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  isActive: z.boolean().optional(),
  showOnHome: z.boolean().optional(),
});

const variantBody = z.object({ name: z.string().trim().min(1).max(40), pricePaise: paise, isAvailable: z.boolean().optional() });
const productBody = z.object({
  categoryId: objectId,
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(600).optional(),
  images: z.array(imageUrl).max(6).optional(),
  pricePaise: paise,
  compareAtPricePaise: paise.optional(),
  isAvailable: z.boolean().optional(),
  isVegetarian: z.boolean().optional(),
  preparationTimeMinutes: z.number().int().min(0).max(240).optional(),
  variants: z.array(variantBody).max(8).optional(),
});

// ---------- Public ----------
export const publicCatalogRouter = Router();

publicCatalogRouter.get('/categories', async (_req, res) => {
  ok(res, await catalog.listCategories());
});

publicCatalogRouter.get('/products', validate({ query: productQuery }), async (_req, res) => {
  const { items, meta } = await catalog.listProducts(res.locals.query);
  ok(res, items, 200, meta);
});

/** "Popular Near You": best sellers of the last 30 days, topped up with menu order when sales are thin. */
publicCatalogRouter.get('/products/popular', async (_req, res) => {
  ok(res, await catalog.popularProducts(8));
});

publicCatalogRouter.get('/products/:idOrSlug', async (req, res) => {
  ok(res, await catalog.getProduct(String(req.params.idOrSlug)));
});

// ---------- Admin ----------
export const adminCatalogRouter = Router();
adminCatalogRouter.use(authenticate, requireRole('ADMIN'));

adminCatalogRouter.get('/categories', async (_req, res) => {
  ok(res, await catalog.listCategories({ includeInactive: true }));
});
adminCatalogRouter.post('/categories', validate({ body: categoryBody }), async (req, res) => {
  ok(res, await catalog.createCategory(actorOf(req), req.body), 201);
});
adminCatalogRouter.patch('/categories/:id', validate({ params: idParams, body: categoryBody.partial() }), async (req, res) => {
  const c = await catalog.updateCategory(actorOf(req), String(req.params.id), req.body);
  if (req.body.showOnHome !== undefined || req.body.name !== undefined) await syncCategoryRow(c.id);
  ok(res, c);
});
adminCatalogRouter.delete('/categories/:id', validate({ params: idParams }), async (req, res) => {
  await catalog.removeCategory(actorOf(req), String(req.params.id));
  await syncCategoryRow(String(req.params.id));
  ok(res, { deleted: true });
});

adminCatalogRouter.get('/products', validate({ query: productQuery }), async (_req, res) => {
  const { items, meta } = await catalog.listProducts(res.locals.query, { admin: true });
  ok(res, items, 200, meta);
});
adminCatalogRouter.get('/products/:id', validate({ params: idParams }), async (req, res) => {
  ok(res, await catalog.getProduct(String(req.params.id), { admin: true }));
});
adminCatalogRouter.post('/products', validate({ body: productBody }), async (req, res) => {
  ok(res, await catalog.createProduct(actorOf(req), req.body), 201);
});
adminCatalogRouter.patch('/products/:id', validate({ params: idParams, body: productBody.partial() }), async (req, res) => {
  ok(res, await catalog.updateProduct(actorOf(req), String(req.params.id), req.body));
});
adminCatalogRouter.patch(
  '/products/:id/availability',
  validate({ params: idParams, body: z.object({ isAvailable: z.boolean() }) }),
  async (req, res) => {
    ok(res, await catalog.setAvailability(actorOf(req), String(req.params.id), req.body.isAvailable));
  },
);
adminCatalogRouter.delete('/products/:id', validate({ params: idParams }), async (req, res) => {
  ok(res, await catalog.archiveProduct(actorOf(req), String(req.params.id)));
});
adminCatalogRouter.post('/products/:id/restore', validate({ params: idParams }), async (req, res) => {
  ok(res, await catalog.archiveProduct(actorOf(req), String(req.params.id), false));
});

import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import type { OfferSectionDto, SpecialDto } from '@a3/contracts';
import { AuditLog, Category, OfferSection, Product, Special, type OfferSectionDoc, type ProductDoc, type SpecialDoc } from '../../models';
import { actorOf, authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { AppError } from '../../utils/app-error';
import { ok } from '../../utils/http';
import { toProductDto } from '../catalog/catalog.service';

type WithId<T> = T & { _id: unknown };

/** Live = switched on, inside its optional date window, and its offer section (if any) is on. */
const isLive = (s: Pick<SpecialDoc, 'isActive' | 'startsAt' | 'endsAt' | 'sectionId'>, onSections: Set<string>, now = new Date()) =>
  s.isActive && (!s.sectionId || onSections.has(String(s.sectionId))) && (!s.startsAt || s.startsAt <= now) && (!s.endsAt || s.endsAt > now);

const sectionLive = (x: Pick<OfferSectionDoc, 'isActive' | 'startsAt' | 'endsAt'>, now = new Date()) =>
  x.isActive && (!x.startsAt || x.startsAt <= now) && (!x.endsAt || x.endsAt > now);

/** Sections that are on and inside their window right now. */
const activeSectionIds = async () => new Set((await OfferSection.find({ isActive: true }).lean()).filter((x) => sectionLive(x)).map((x) => String(x._id)));

export const discounted = (paise: number, percent: number) => Math.round((paise * (100 - percent)) / 100);

const defaultPrice = (p: ProductDoc) =>
  p.variants.find((v) => v.isAvailable && v.name === 'Full')?.pricePaise ?? p.variants.find((v) => v.isAvailable)?.pricePaise ?? p.pricePaise;

/** productId → discount % for specials that are live right now (used by checkout pricing). */
export async function liveDiscounts(productIds: string[]): Promise<Map<string, number>> {
  const ids = productIds.filter(isValidObjectId);
  if (!ids.length) return new Map();
  const [rows, on] = await Promise.all([Special.find({ productId: { $in: ids }, isActive: true }).lean(), activeSectionIds()]);
  return new Map(rows.filter((s) => isLive(s, on)).map((s) => [String(s.productId), s.discountPercent]));
}

function toDto(s: WithId<SpecialDoc>, p: WithId<ProductDoc>, on: Set<string>): SpecialDto {
  return {
    id: String(s._id),
    product: toProductDto(p as never),
    discountPercent: s.discountPercent,
    ...(s.label ? { label: s.label } : {}),
    ...(s.startsAt ? { startsAt: s.startsAt.toISOString() } : {}),
    ...(s.endsAt ? { endsAt: s.endsAt.toISOString() } : {}),
    isActive: s.isActive,
    sortOrder: s.sortOrder,
    specialPricePaise: discounted(defaultPrice(p), s.discountPercent),
    isLive: isLive(s, on),
    ...(s.sectionId ? { sectionId: String(s.sectionId) } : {}),
  };
}

async function load(filter: Record<string, unknown>) {
  const specials = await Special.find(filter).sort({ sortOrder: 1, createdAt: -1 }).lean();
  const products = await Product.find({ _id: { $in: specials.map((s) => s.productId) } }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const on = await activeSectionIds();
  return specials.flatMap((s) => {
    const p = byId.get(String(s.productId));
    return p ? [{ s, p, on }] : [];
  });
}

// ---------- Public: what customers see on Home ----------
export const publicSpecialsRouter = Router();
publicSpecialsRouter.get('/specials', async (_req, res) => {
  const activeCats = new Set((await Category.find({ isActive: true }).distinct('_id')).map(String));
  const rows = (await load({ isActive: true })).filter(({ s, p, on }) => isLive(s, on) && !p.isArchived && activeCats.has(String(p.categoryId)));
  ok(res, rows.map(({ s, p, on }) => toDto(s, p, on)));
});

const sectionDto = (x: WithId<OfferSectionDoc>, specialCount?: number, slugs?: Map<string, string>): OfferSectionDto => ({
  id: String(x._id),
  kind: x.kind ?? 'DEALS',
  ...(x.categoryId ? { categoryId: String(x.categoryId), categorySlug: slugs?.get(String(x.categoryId)) ?? '' } : {}),
  title: x.title,
  ...(x.subtitle ? { subtitle: x.subtitle } : {}),
  ...(x.startsAt ? { startsAt: x.startsAt.toISOString() } : {}),
  ...(x.endsAt ? { endsAt: x.endsAt.toISOString() } : {}),
  isActive: x.isActive,
  isLive: sectionLive(x),
  sortOrder: x.sortOrder,
  ...(specialCount !== undefined ? { specialCount } : {}),
});

/** Switched-on offer sections, in Home order. Their deals come from /specials (match on sectionId). */
publicSpecialsRouter.get('/offer-sections', async (_req, res) => {
  const [rows, cats] = await Promise.all([
    OfferSection.find({ isActive: true }).sort({ sortOrder: 1, createdAt: 1 }).lean(),
    Category.find({ isActive: true }).select('slug').lean(),
  ]);
  const slugs = new Map(cats.map((c) => [String(c._id), c.slug]));
  // Category rows disappear while their category is hidden from the menu.
  ok(res, rows.filter((x) => sectionLive(x) && (x.kind !== 'CATEGORY' || slugs.has(String(x.categoryId)))).map((x) => sectionDto(x, undefined, slugs)));
});

// ---------- Admin CRUD ----------
const body = z.object({
  productId: z.string().regex(/^[a-f\d]{24}$/i),
  discountPercent: z.number().int().min(1, 'At least 1% off').max(90, 'At most 90% off'),
  label: z.string().trim().max(40).nullable().optional(),
  sectionId: z.string().regex(/^[a-f\d]{24}$/i).nullable().optional(),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});
const idParams = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) });

export const adminSpecialsRouter = Router();
adminSpecialsRouter.use(authenticate, requireRole('ADMIN'));

adminSpecialsRouter.get('/', async (_req, res) => {
  ok(res, (await load({})).map(({ s, p, on }) => toDto(s, p, on)));
});

async function checkSection(id?: string | null) {
  if (!id) return;
  const x = await OfferSection.findById(id).lean();
  if (!x) throw AppError.notFound('Offer section not found.');
  if (x.kind !== 'DEALS') throw new AppError('VALIDATION_ERROR', 400, 'This row fills itself automatically. Add deals to a deals section.');
}

function checkWindow(startsAt?: Date | null, endsAt?: Date | null) {
  if (startsAt && endsAt && endsAt <= startsAt) throw new AppError('VALIDATION_ERROR', 400, 'The end time must be after the start time.');
}

adminSpecialsRouter.post('/', validate({ body }), async (req, res) => {
  const b = req.body as z.infer<typeof body>;
  checkWindow(b.startsAt, b.endsAt);
  const product = await Product.findOne({ _id: b.productId, isArchived: false }).lean();
  if (!product) throw AppError.notFound('Dish not found.', 'PRODUCT_NOT_FOUND');
  if (await Special.exists({ productId: b.productId })) throw AppError.conflict('ALREADY_EXISTS', `${product.name} already has a deal. Edit that one instead.`);
  await checkSection(b.sectionId);
  const count = await Special.countDocuments();
  const s = await Special.create({ ...b, label: b.label || undefined, sectionId: b.sectionId ?? undefined, startsAt: b.startsAt ?? undefined, endsAt: b.endsAt ?? undefined, sortOrder: b.sortOrder ?? count });
  const a = actorOf(req);
  await AuditLog.create({ actorId: a.userId, actorRole: a.role, action: 'special.create', entityType: 'Special', entityId: s._id, to: `${b.discountPercent}%` });
  ok(res, toDto(s.toObject(), product, await activeSectionIds()), 201);
});

adminSpecialsRouter.patch('/:id', validate({ params: idParams, body: body.partial() }), async (req, res) => {
  const b = req.body as Partial<z.infer<typeof body>>;
  const existing = await Special.findById(req.params.id).lean();
  if (!existing) throw AppError.notFound('Special not found.');
  checkWindow(b.startsAt === undefined ? existing.startsAt : b.startsAt, b.endsAt === undefined ? existing.endsAt : b.endsAt);
  if (b.productId && b.productId !== String(existing.productId) && (await Special.exists({ productId: b.productId }))) {
    throw AppError.conflict('ALREADY_EXISTS', 'That dish already has a deal.');
  }
  await checkSection(b.sectionId);
  const $set: Record<string, unknown> = {};
  const $unset: Record<string, 1> = {};
  for (const [k, v] of Object.entries(b)) (v === null || v === '' ? ($unset[k] = 1) : ($set[k] = v));
  const s = await Special.findByIdAndUpdate(req.params.id, { $set, ...(Object.keys($unset).length && { $unset }) }, { returnDocument: 'after', runValidators: true }).lean();
  const product = await Product.findById(s!.productId).lean();
  if (!product) throw AppError.notFound('Dish not found.', 'PRODUCT_NOT_FOUND');
  ok(res, toDto(s!, product, await activeSectionIds()));
});

adminSpecialsRouter.delete('/:id', validate({ params: idParams }), async (req, res) => {
  const s = await Special.findByIdAndDelete(req.params.id).lean();
  if (!s) throw AppError.notFound('Special not found.');
  const a = actorOf(req);
  await AuditLog.create({ actorId: a.userId, actorRole: a.role, action: 'special.delete', entityType: 'Special', entityId: s._id });
  ok(res, { id: String(s._id) });
});

// ---------- Admin: offer sections ----------
const sectionBody = z.object({
  title: z.string().trim().min(2, 'Give the section a name').max(40),
  subtitle: z.string().trim().max(80).nullable().optional(),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

export const adminOfferSectionsRouter = Router();
adminOfferSectionsRouter.use(authenticate, requireRole('ADMIN'));

adminOfferSectionsRouter.get('/', async (_req, res) => {
  const [rows, counts] = await Promise.all([
    OfferSection.find().sort({ sortOrder: 1, createdAt: 1 }).lean(),
    Special.aggregate<{ _id: unknown; n: number }>([{ $match: { sectionId: { $exists: true } } }, { $group: { _id: '$sectionId', n: { $sum: 1 } } }]),
  ]);
  const byId = new Map(counts.map((c) => [String(c._id), c.n]));
  const slugs = new Map((await Category.find().select('slug').lean()).map((c) => [String(c._id), c.slug]));
  ok(res, rows.map((x) => sectionDto(x, byId.get(String(x._id)) ?? 0, slugs)));
});

adminOfferSectionsRouter.post('/', validate({ body: sectionBody }), async (req, res) => {
  const b = req.body as z.infer<typeof sectionBody>;
  checkWindow(b.startsAt, b.endsAt);
  const x = await OfferSection.create({ ...b, subtitle: b.subtitle || undefined, startsAt: b.startsAt ?? undefined, endsAt: b.endsAt ?? undefined, sortOrder: b.sortOrder ?? (await OfferSection.countDocuments()) });
  const a = actorOf(req);
  await AuditLog.create({ actorId: a.userId, actorRole: a.role, action: 'offerSection.create', entityType: 'OfferSection', entityId: x._id, to: b.title });
  ok(res, sectionDto(x.toObject(), 0), 201);
});

adminOfferSectionsRouter.patch('/:id', validate({ params: idParams, body: sectionBody.partial() }), async (req, res) => {
  const b = req.body as Partial<z.infer<typeof sectionBody>>;
  const existing = await OfferSection.findById(req.params.id).lean();
  if (!existing) throw AppError.notFound('Offer section not found.');
  checkWindow(b.startsAt === undefined ? existing.startsAt : b.startsAt, b.endsAt === undefined ? existing.endsAt : b.endsAt);
  const $set: Record<string, unknown> = {};
  const $unset: Record<string, 1> = {};
  for (const [k, v] of Object.entries(b)) (v === null || v === '' ? ($unset[k] = 1) : ($set[k] = v));
  const x = await OfferSection.findByIdAndUpdate(req.params.id, { $set, ...(Object.keys($unset).length && { $unset }) }, { returnDocument: 'after', runValidators: true }).lean();
  if (!x) throw AppError.notFound('Offer section not found.');
  ok(res, sectionDto(x, await Special.countDocuments({ sectionId: x._id })));
});

/** Home order: the full list of section ids, first to last. */
adminOfferSectionsRouter.post('/reorder', validate({ body: z.object({ ids: z.array(z.string().regex(/^[a-f\d]{24}$/i)).min(1).max(100) }) }), async (req, res) => {
  const { ids } = req.body as { ids: string[] };
  await OfferSection.bulkWrite(ids.map((id, i) => ({ updateOne: { filter: { _id: id }, update: { $set: { sortOrder: i } } } })));
  const rows = await OfferSection.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
  ok(res, rows.map((x) => sectionDto(x)));
});

/** Deleting a section also removes its deals, so those dishes go back to normal price. */
adminOfferSectionsRouter.delete('/:id', validate({ params: idParams }), async (req, res) => {
  const found = await OfferSection.findById(req.params.id).lean();
  if (!found) throw AppError.notFound('Offer section not found.');
  if (found.kind === 'POPULAR') throw new AppError('VALIDATION_ERROR', 400, 'Popular Near You can’t be deleted. Switch it off instead.');
  const x = (await OfferSection.findByIdAndDelete(req.params.id).lean())!;
  await Special.deleteMany({ sectionId: x._id });
  if (x.categoryId) await Category.updateOne({ _id: x.categoryId }, { $set: { showOnHome: false } });
  const a = actorOf(req);
  await AuditLog.create({ actorId: a.userId, actorRole: a.role, action: 'offerSection.delete', entityType: 'OfferSection', entityId: x._id, from: x.title });
  ok(res, { id: String(x._id) });
});

/**
 * Today's specials is an ordinary offer section (first on Home) so admins can switch it on/off,
 * schedule, rename or delete it like any other. Moves older section-less specials into it.
 * Runs at boot; safe to repeat.
 */
export async function ensureTodaySpecialsSection() {
  if (!(await Special.exists({ sectionId: { $exists: false } }))) return;
  const x =
    (await OfferSection.findOne({ title: 'Today’s specials' })) ??
    (await OfferSection.create({ title: 'Today’s specials', sortOrder: -1 }));
  await Special.updateMany({ sectionId: { $exists: false } }, { $set: { sectionId: x._id } });
}

/** Popular Near You is a built-in automatic section (placed last when first created). Runs at boot. */
export async function ensurePopularSection() {
  if (await OfferSection.exists({ kind: 'POPULAR' })) return;
  const last = await OfferSection.findOne().sort({ sortOrder: -1 }).lean();
  await OfferSection.create({ kind: 'POPULAR', title: 'Popular Near You', sortOrder: (last?.sortOrder ?? -1) + 1 });
}

/** Keep a category's Home row in the global section order in step with its "Row on Home" switch. */
export async function syncCategoryRow(categoryId: string) {
  const c = await Category.findById(categoryId).lean();
  const row = await OfferSection.findOne({ kind: 'CATEGORY', categoryId }).lean();
  if (c?.showOnHome && !row) {
    const last = await OfferSection.findOne().sort({ sortOrder: -1 }).lean();
    await OfferSection.create({ kind: 'CATEGORY', categoryId, title: c.name, sortOrder: (last?.sortOrder ?? -1) + 1 });
  } else if (!c?.showOnHome && row) {
    await OfferSection.deleteOne({ _id: row._id });
  } else if (c && row && row.title !== c.name) {
    await OfferSection.updateOne({ _id: row._id }, { $set: { title: c.name } });
  }
}

/** Boot: categories switched on before rows joined the global order get their row. */
export async function ensureCategoryRows() {
  for (const c of await Category.find({ showOnHome: true }).select('_id').lean()) await syncCategoryRow(String(c._id));
}

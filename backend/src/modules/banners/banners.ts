import { Router } from 'express';
import { z } from 'zod';
import type { BannerDto } from '@a3/contracts';
import { AuditLog, Banner, type BannerDoc } from '../../models';
import { actorOf, authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { AppError } from '../../utils/app-error';
import { ok } from '../../utils/http';

type WithId<T> = T & { _id: unknown };

/** Live = switched on and inside its optional date window. */
const isLive = (b: Pick<BannerDoc, 'isActive' | 'startsAt' | 'endsAt'>, now = new Date()) =>
  b.isActive && (!b.startsAt || b.startsAt <= now) && (!b.endsAt || b.endsAt > now);

const toDto = (b: WithId<BannerDoc>): BannerDto => ({
  id: String(b._id),
  title: b.title,
  ...(b.highlight && { highlight: b.highlight }),
  ...(b.subtitle && { subtitle: b.subtitle }),
  ...(b.buttonText && { buttonText: b.buttonText }),
  linkType: b.linkType as BannerDto['linkType'],
  ...(b.linkValue && { linkValue: b.linkValue }),
  image: b.image,
  ...(b.startsAt && { startsAt: b.startsAt.toISOString() }),
  ...(b.endsAt && { endsAt: b.endsAt.toISOString() }),
  isActive: b.isActive,
  isLive: isLive(b),
  sortOrder: b.sortOrder,
});

// ---------- Public: home carousel (app + web) ----------
export const publicBannersRouter = Router();
publicBannersRouter.get('/banners', async (_req, res) => {
  const rows = await Banner.find({ isActive: true }).sort({ sortOrder: 1, createdAt: 1 }).lean();
  ok(res, rows.filter((b) => isLive(b)).map(toDto));
});

// ---------- Admin: /admin/banners ----------
const idParams = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id') });
const body = z.object({
  title: z.string().trim().min(2, 'Give the banner a title').max(40),
  highlight: z.string().trim().max(40).nullable().optional(),
  subtitle: z.string().trim().max(120).nullable().optional(),
  buttonText: z.string().trim().max(24).nullable().optional(),
  linkType: z.enum(['none', 'category', 'product', 'offer', 'url']).default('none'),
  linkValue: z.string().trim().max(300).nullable().optional(),
  image: z.string().url('Upload a banner photo'),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

function checkWindow(startsAt?: Date | null, endsAt?: Date | null) {
  if (startsAt && endsAt && endsAt <= startsAt) throw new AppError('VALIDATION_ERROR', 400, 'The end date must be after the start date.');
}

export const adminBannersRouter = Router();
adminBannersRouter.use(authenticate, requireRole('ADMIN'));

adminBannersRouter.get('/', async (_req, res) => {
  const rows = await Banner.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
  ok(res, rows.map(toDto));
});

adminBannersRouter.post('/', validate({ body }), async (req, res) => {
  const b = req.body as z.infer<typeof body>;
  checkWindow(b.startsAt, b.endsAt);
  const count = await Banner.countDocuments();
  const clean = Object.fromEntries(Object.entries(b).filter(([, v]) => v !== null && v !== ''));
  const doc = await Banner.create({ ...clean, sortOrder: b.sortOrder ?? count });
  const a = actorOf(req);
  await AuditLog.create({ actorId: a.userId, actorRole: a.role, action: 'banner.create', entityType: 'Banner', entityId: doc._id, to: b.title });
  ok(res, toDto(doc.toObject()), 201);
});

adminBannersRouter.patch('/:id', validate({ params: idParams, body: body.partial() }), async (req, res) => {
  const b = req.body as Partial<z.infer<typeof body>>;
  const existing = await Banner.findById(req.params.id).lean();
  if (!existing) throw AppError.notFound('Banner not found.');
  checkWindow(b.startsAt === undefined ? existing.startsAt : b.startsAt, b.endsAt === undefined ? existing.endsAt : b.endsAt);
  const $set: Record<string, unknown> = {};
  const $unset: Record<string, 1> = {};
  for (const [k, v] of Object.entries(b)) (v === null || v === '' ? ($unset[k] = 1) : ($set[k] = v));
  const doc = await Banner.findByIdAndUpdate(req.params.id, { $set, ...(Object.keys($unset).length && { $unset }) }, { returnDocument: 'after', runValidators: true }).lean();
  ok(res, toDto(doc!));
});

adminBannersRouter.post('/reorder', validate({ body: z.object({ ids: z.array(idParams.shape.id).max(50) }) }), async (req, res) => {
  const ids = (req.body as { ids: string[] }).ids;
  await Banner.bulkWrite(ids.map((id, i) => ({ updateOne: { filter: { _id: id }, update: { $set: { sortOrder: i } } } })));
  const rows = await Banner.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
  ok(res, rows.map(toDto));
});

adminBannersRouter.delete('/:id', validate({ params: idParams }), async (req, res) => {
  const doc = await Banner.findByIdAndDelete(req.params.id).lean();
  if (!doc) throw AppError.notFound('Banner not found.');
  const a = actorOf(req);
  await AuditLog.create({ actorId: a.userId, actorRole: a.role, action: 'banner.delete', entityType: 'Banner', entityId: doc._id });
  ok(res, { id: String(doc._id) });
});

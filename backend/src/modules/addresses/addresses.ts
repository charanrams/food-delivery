import { Router } from 'express';
import { z } from 'zod';
import type { AddressDto } from '@a3/contracts';
import { Address, Settings, type AddressDoc } from '../../models';
import { actorOf, authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { AppError } from '../../utils/app-error';
import { normalizePhone, ok } from '../../utils/http';

/** Postal codes the kitchen delivers to. Empty list = delivers everywhere (dev convenience). */
export async function serviceableCodes(): Promise<Set<string> | null> {
  const s = await Settings.findById('kitchen').lean();
  return s?.serviceablePostalCodes?.length ? new Set(s.serviceablePostalCodes) : null;
}

export const toAddressDto = (a: AddressDoc & { _id: unknown }, codes: Set<string> | null): AddressDto => ({
  id: String(a._id),
  label: a.label as AddressDto['label'],
  recipientName: a.recipientName,
  phone: a.phone,
  line1: a.line1,
  ...(a.line2 ? { line2: a.line2 } : {}),
  ...(a.landmark ? { landmark: a.landmark } : {}),
  city: a.city,
  state: a.state,
  postalCode: a.postalCode,
  isDefault: a.isDefault,
  isServiceable: !codes || codes.has(a.postalCode),
  ...(a.location?.coordinates?.length === 2 ? { lat: a.location.coordinates[1], lng: a.location.coordinates[0] } : {}),
});

const body = z.object({
  label: z.enum(['HOME', 'WORK', 'OTHER']).default('HOME'),
  recipientName: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(/^(\+?91)?[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  line1: z.string().trim().min(3).max(160),
  line2: z.string().trim().max(160).optional(),
  landmark: z.string().trim().max(80).optional(),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  postalCode: z.string().trim().regex(/^[1-9]\d{5}$/, 'Enter a 6-digit PIN code'),
  isDefault: z.boolean().optional(),
  /** Map pin (optional) — helps the rider find the door. */
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

/** Request lat/lng → GeoJSON point stored on the address. */
const withLocation = <T extends { lat?: number; lng?: number }>({ lat, lng, ...rest }: T) =>
  lat !== undefined && lng !== undefined ? { ...rest, location: { type: 'Point', coordinates: [lng, lat] } } : rest;
const idParams = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) });

export const addressesRouter = Router();
addressesRouter.use(authenticate, requireRole('CUSTOMER'));

addressesRouter.get('/', async (req, res) => {
  const [list, codes] = await Promise.all([
    Address.find({ userId: actorOf(req).userId }).sort({ isDefault: -1, updatedAt: -1 }).lean(),
    serviceableCodes(),
  ]);
  ok(res, list.map((a) => toAddressDto(a, codes)));
});

addressesRouter.post('/', validate({ body }), async (req, res) => {
  const userId = actorOf(req).userId;
  const count = await Address.countDocuments({ userId });
  if (count >= 10) throw new AppError('VALIDATION_ERROR', 400, 'You can save up to 10 addresses.');
  const makeDefault = req.body.isDefault || count === 0;
  if (makeDefault) await Address.updateMany({ userId }, { isDefault: false });
  const doc = await Address.create({ ...withLocation(req.body), phone: normalizePhone(req.body.phone), userId, isDefault: makeDefault });
  ok(res, toAddressDto(doc.toObject(), await serviceableCodes()), 201);
});

addressesRouter.patch('/:id', validate({ params: idParams, body: body.partial() }), async (req, res) => {
  const userId = actorOf(req).userId;
  if (req.body.isDefault) await Address.updateMany({ userId }, { isDefault: false });
  const update = { ...withLocation(req.body), ...(req.body.phone && { phone: normalizePhone(req.body.phone) }) };
  // Ownership is part of the filter — another customer's id is simply "not found".
  const doc = await Address.findOneAndUpdate({ _id: req.params.id, userId }, update, { new: true, runValidators: true }).lean();
  if (!doc) throw AppError.notFound('Address not found.', 'ADDRESS_NOT_FOUND');
  ok(res, toAddressDto(doc, await serviceableCodes()));
});

addressesRouter.delete('/:id', validate({ params: idParams }), async (req, res) => {
  const userId = actorOf(req).userId;
  const doc = await Address.findOneAndDelete({ _id: req.params.id, userId }).lean();
  if (!doc) throw AppError.notFound('Address not found.', 'ADDRESS_NOT_FOUND');
  if (doc.isDefault) {
    const next = await Address.findOne({ userId }).sort({ updatedAt: -1 });
    if (next) await Address.updateOne({ _id: next._id }, { isDefault: true });
  }
  ok(res, { deleted: true });
});

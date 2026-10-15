import { randomInt } from 'node:crypto';
import type { Types } from 'mongoose';
import type { DeliveryPartnerDto, UserStatus } from '@a3/contracts';
import { config } from '../../config';
import type { Actor } from '../../middleware/auth';
import { AuditLog, DeliveryAssignment, DeliveryPartnerProfile, RefreshSession, User } from '../../models';
import { AppError } from '../../utils/app-error';
import { normalizePhone } from '../../utils/http';
import { logger } from '../../utils/logger';
import { partnerCredentialsEmail, sendMail } from '../../utils/mailer';
import { hashPassword } from '../auth/auth.service';

export interface PartnerInput {
  name: string;
  email: string;
  phone: string;
  vehicleType?: string;
  vehicleNumber?: string;
}

const audit = (actor: Actor, action: string, entityId: Types.ObjectId, metadata?: object) =>
  AuditLog.create({ actorId: actor.userId, actorRole: actor.role, action, entityType: 'DeliveryPartner', entityId, metadata });

// No look-alike characters (0/O, 1/l/I) — partners read this off a phone screen.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
export function generatePassword(): string {
  const body = Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
  return `${body}@${randomInt(10, 100)}`; // always has a letter, digit and symbol
}

type UserLean = { _id: Types.ObjectId; name: string; email?: string | null; phone: string; status: UserStatus; createdAt?: Date };
type ProfileLean = { availability?: DeliveryPartnerDto['availability'] | null; vehicleType?: string | null; vehicleNumber?: string | null } | null;

const toDto = (u: UserLean, p: ProfileLean): DeliveryPartnerDto => ({
  id: String(u._id),
  name: u.name,
  email: u.email ?? '',
  phone: u.phone,
  status: u.status,
  availability: p?.availability ?? 'OFFLINE',
  ...(p?.vehicleType && { vehicleType: p.vehicleType }),
  ...(p?.vehicleNumber && { vehicleNumber: p.vehicleNumber }),
  createdAt: (u.createdAt ?? new Date()).toISOString(),
});

async function findPartner(id: string) {
  const user = await User.findOne({ _id: id, role: 'DELIVERY_PARTNER' });
  if (!user) throw AppError.notFound('Delivery partner not found.');
  return user;
}

async function assertUnique(email: string, phone: string, excludeId?: string) {
  const clash = await User.findOne({ $or: [{ email }, { phone }], ...(excludeId && { _id: { $ne: excludeId } }) }).lean();
  if (!clash) return;
  const field = clash.email === email ? 'email' : 'mobile number';
  throw AppError.conflict('ALREADY_EXISTS', `Another account already uses this ${field}.`);
}

async function emailCredentials(user: UserLean, password: string, isReset = false): Promise<boolean> {
  try {
    const mail = partnerCredentialsEmail({ name: user.name, email: user.email!, phone: user.phone, password, loginUrl: `${config().APP_URL}/login`, isReset });
    await sendMail({ to: user.email!, ...mail });
    return true;
  } catch (err) {
    // The account still exists; the admin can resend from the dashboard.
    logger.error({ err }, 'partner credentials email failed');
    return false;
  }
}

export async function listPartners(search?: string): Promise<DeliveryPartnerDto[]> {
  const q = search?.trim();
  const rx = q ? new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : undefined;
  const users = await User.find({ role: 'DELIVERY_PARTNER', ...(rx && { $or: [{ name: rx }, { email: rx }, { phone: rx }] }) })
    .sort({ createdAt: -1 })
    .lean();
  const profiles = await DeliveryPartnerProfile.find({ userId: { $in: users.map((u) => u._id) } }).lean();
  const byUser = new Map(profiles.map((p) => [String(p.userId), p]));
  return users.map((u) => toDto(u, byUser.get(String(u._id)) ?? null));
}

export async function createPartner(actor: Actor, input: PartnerInput) {
  const email = input.email.toLowerCase();
  const phone = normalizePhone(input.phone);
  await assertUnique(email, phone);

  const password = generatePassword();
  const user = await User.create({ name: input.name, email, phone, role: 'DELIVERY_PARTNER', passwordHash: await hashPassword(password) });
  const profile = await DeliveryPartnerProfile.create({ userId: user._id, vehicleType: input.vehicleType, vehicleNumber: input.vehicleNumber });
  await audit(actor, 'partner.create', user._id);

  const emailSent = await emailCredentials(user, password);
  return { partner: toDto(user, profile), emailSent };
}

export async function updatePartner(actor: Actor, id: string, input: Partial<PartnerInput> & { status?: 'ACTIVE' | 'SUSPENDED' }) {
  const user = await findPartner(id);
  const email = input.email?.toLowerCase() ?? user.email ?? '';
  const phone = input.phone ? normalizePhone(input.phone) : user.phone;
  if (input.email || input.phone) await assertUnique(email, phone, id);

  if (input.name) user.name = input.name;
  user.email = email;
  user.phone = phone;
  if (input.status) user.status = input.status;
  await user.save();

  const profile = await DeliveryPartnerProfile.findOneAndUpdate(
    { userId: user._id },
    { ...(input.vehicleType !== undefined && { vehicleType: input.vehicleType }), ...(input.vehicleNumber !== undefined && { vehicleNumber: input.vehicleNumber }) },
    { returnDocument: 'after', upsert: true },
  ).lean();

  // A suspended partner is signed out everywhere immediately.
  if (input.status === 'SUSPENDED') await RefreshSession.updateMany({ userId: user._id, revokedAt: null }, { revokedAt: new Date() });
  await audit(actor, 'partner.update', user._id, { fields: Object.keys(input) });
  return toDto(user, profile);
}

/** New random password, emailed to the partner; all their sessions end. */
export async function resendCredentials(actor: Actor, id: string) {
  const user = await findPartner(id);
  if (!user.email) throw new AppError('VALIDATION_ERROR', 400, 'Add an email address for this partner first.');
  const password = generatePassword();
  user.passwordHash = await hashPassword(password);
  await user.save();
  await RefreshSession.updateMany({ userId: user._id, revokedAt: null }, { revokedAt: new Date() });
  await audit(actor, 'partner.credentials_reset', user._id);
  const emailSent = await emailCredentials(user, password, true);
  if (!emailSent) throw new AppError('SERVICE_UNAVAILABLE', 503, 'Password was reset but the email failed. Please try again.');
  return { emailSent };
}

export async function deletePartner(actor: Actor, id: string) {
  const user = await findPartner(id);
  // Delivery history must keep pointing at a real person — suspend instead.
  if (await DeliveryAssignment.exists({ partnerId: user._id })) {
    throw AppError.conflict('PARTNER_BUSY', 'This partner has delivery history. Suspend them instead of deleting.');
  }
  await Promise.all([
    DeliveryPartnerProfile.deleteOne({ userId: user._id }),
    RefreshSession.deleteMany({ userId: user._id }),
    User.deleteOne({ _id: user._id }),
  ]);
  await audit(actor, 'partner.delete', user._id);
}

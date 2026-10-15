import { createHash, randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { AuthResponseDto, UserDto } from '@a3/contracts';
import { config } from '../../config';
import { RefreshSession, User } from '../../models';
import { AppError } from '../../utils/app-error';
import { normalizePhone } from '../../utils/http';
import { issueOtp, issuePhoneOtp, verifyOtp } from './otp.service';

const BCRYPT_COST = 12;
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export const toUserDto = (u: {
  _id: unknown;
  name: string;
  phone: string;
  email?: string | null;
  role: UserDto['role'];
  status: UserDto['status'];
}): UserDto => ({
  id: String(u._id),
  name: u.name,
  phone: u.phone,
  ...(u.email && { email: u.email }),
  role: u.role,
  status: u.status,
});

/** "30d" / "12h" / "15m" → milliseconds. */
export function durationMs(v: string): number {
  const m = /^(\d+)([smhd])$/.exec(v);
  if (!m) throw new Error(`Invalid duration "${v}"`);
  const unit = { s: 1e3, m: 6e4, h: 3.6e6, d: 8.64e7 }[m[2] as 's' | 'm' | 'h' | 'd'];
  return Number(m[1]) * unit;
}

const signAccess = (user: UserDto) =>
  jwt.sign({ role: user.role }, config().JWT_ACCESS_SECRET, {
    subject: user.id,
    algorithm: 'HS256',
    expiresIn: config().ACCESS_TOKEN_TTL as SignOptions['expiresIn'],
  });

async function issueSession(user: UserDto, familyId: string, userAgent?: string) {
  const refreshToken = randomBytes(48).toString('base64url');
  const session = await RefreshSession.create({
    userId: user.id,
    tokenHash: sha256(refreshToken),
    familyId,
    userAgent: userAgent?.slice(0, 200),
    expiresAt: new Date(Date.now() + durationMs(config().REFRESH_TOKEN_TTL)),
  });
  return { accessToken: signAccess(user), refreshToken, sessionId: session._id };
}

/** Step 1 of sign-up: email a verification code (fails early if the phone/email is taken). */
export async function startRegistration(input: { name: string; phone: string; email: string }) {
  const email = input.email.toLowerCase();
  const clash = await User.exists({ $or: [{ phone: normalizePhone(input.phone) }, { email }] });
  if (clash) throw AppError.conflict('ALREADY_EXISTS', 'An account with this phone or email already exists. Try logging in.');
  await issueOtp(email, 'REGISTER', input.name);
}

/** Step 2: verify the code and create the account. Self-registration always creates a CUSTOMER (docs/SECURITY.md �1). */
export async function register(
  input: { name: string; phone: string; email: string; password: string; otp: string },
  userAgent?: string,
) {
  const phone = normalizePhone(input.phone);
  const email = input.email.toLowerCase();
  const clash = await User.exists({ $or: [{ phone }, { email }] });
  if (clash) throw AppError.conflict('ALREADY_EXISTS', 'An account with this phone or email already exists. Try logging in.');
  await verifyOtp(email, 'REGISTER', input.otp);

  const doc = await User.create({
    name: input.name,
    phone,
    email,
    passwordHash: await bcrypt.hash(input.password, BCRYPT_COST),
    role: 'CUSTOMER',
  });
  const user = toUserDto(doc);
  const { accessToken, refreshToken } = await issueSession(user, randomUUID(), userAgent);
  return { user, accessToken, refreshToken };
}

/** Always succeeds from the caller's view � never reveals whether an email has an account. */
export async function forgotPassword(emailRaw: string): Promise<void> {
  const email = emailRaw.toLowerCase();
  const user = await User.findOne({ email });
  if (!user || user.status === 'SUSPENDED') return;
  await issueOtp(email, 'RESET_PASSWORD', user.name);
}

/** Sets a new password and signs out every device. */
export async function resetPassword(input: { email: string; otp: string; password: string }): Promise<void> {
  const email = input.email.toLowerCase();
  await verifyOtp(email, 'RESET_PASSWORD', input.otp);
  const user = await User.findOneAndUpdate({ email }, { passwordHash: await bcrypt.hash(input.password, BCRYPT_COST) });
  if (!user) throw new AppError('OTP_INVALID', 400, 'This code has expired. Please request a new one.');
  await RefreshSession.updateMany({ userId: user._id, revokedAt: null }, { revokedAt: new Date() });
}

export async function login(input: { identifier: string; password: string }, userAgent?: string) {
  const id = input.identifier.trim();
  const query = id.includes('@') ? { email: id.toLowerCase() } : { phone: normalizePhone(id) };
  const doc = await User.findOne(query).select('+passwordHash');
  // Same message for unknown phone and wrong password — no account enumeration.
  const valid = doc && (await bcrypt.compare(input.password, doc.passwordHash));
  if (!doc || !valid) throw new AppError('UNAUTHENTICATED', 401, 'Email/phone or password is incorrect.');
  if (doc.status !== 'ACTIVE') throw new AppError('FORBIDDEN', 403, 'This account is not active. Please contact the kitchen.');

  const user = toUserDto(doc);
  const { accessToken, refreshToken } = await issueSession(user, randomUUID(), userAgent);
  return { user, accessToken, refreshToken };
}

/**
 * One-field login (driveflow pattern). The client asks whether the email/phone has an account:
 *   email + account → password step · phone + account → OTP step · no account → sign-up, pre-filled.
 * This reveals whether an identifier is registered — by design for this flow; rate-limited like login.
 */
export async function checkIdentifier(identifierRaw: string): Promise<{ kind: 'email' | 'phone'; exists: boolean }> {
  const id = identifierRaw.trim();
  const kind = id.includes('@') ? 'email' : 'phone';
  const user = await User.findOne(kind === 'email' ? { email: id.toLowerCase() } : { phone: normalizePhone(id) }).select('status').lean();
  return { kind, exists: !!user && user.status === 'ACTIVE' };
}

/**
 * Sends a phone OTP — for logging in, or for verifying the number during sign-up.
 * SMS is not wired yet: with OTP_DUMMY the code is always DUMMY_OTP_CODE and nothing is sent.
 */
export async function sendPhoneOtp(phoneRaw: string): Promise<{ sent: true; isNewUser: boolean; devCode?: string }> {
  const phone = normalizePhone(phoneRaw);
  const user = await User.findOne({ phone }).lean();
  if (user && user.status !== 'ACTIVE') throw new AppError('FORBIDDEN', 403, 'This account is not active. Please contact the kitchen.');
  const devCode = await issuePhoneOtp(phone);
  return { sent: true, isNewUser: !user, ...(devCode ? { devCode } : {}) };
}

/** Phone-OTP login for an existing account. */
export async function verifyPhoneOtp(input: { phone: string; otp: string }, userAgent?: string) {
  const phone = normalizePhone(input.phone);
  const doc = await User.findOne({ phone });
  if (!doc) throw AppError.notFound('No account uses this number yet. Please sign up.');
  if (doc.status !== 'ACTIVE') throw new AppError('FORBIDDEN', 403, 'This account is not active. Please contact the kitchen.');
  await verifyOtp(phone, 'LOGIN', input.otp);
  const user = toUserDto(doc);
  const { accessToken, refreshToken } = await issueSession(user, randomUUID(), userAgent);
  return { user, accessToken, refreshToken };
}

/**
 * Sign-up (driveflow pattern): name, email, password and a mobile number verified by OTP.
 * Creates a CUSTOMER only; the customer can later log in with either email+password or phone OTP.
 */
export async function signupWithPhone(
  input: { name: string; email: string; phone: string; password: string; otp: string },
  userAgent?: string,
) {
  const phone = normalizePhone(input.phone);
  const email = input.email.trim().toLowerCase();
  const clash = await User.findOne({ $or: [{ phone }, { email }] }).select('phone email').lean();
  if (clash) {
    const what = clash.phone === phone ? 'mobile number' : 'email';
    throw AppError.conflict('ALREADY_EXISTS', `An account with this ${what} already exists. Please log in.`);
  }
  await verifyOtp(phone, 'LOGIN', input.otp);
  const doc = await User.create({
    name: input.name.trim(),
    phone,
    email,
    passwordHash: await bcrypt.hash(input.password, BCRYPT_COST),
    role: 'CUSTOMER',
  });
  const user = toUserDto(doc);
  const { accessToken, refreshToken } = await issueSession(user, randomUUID(), userAgent);
  return { user, accessToken, refreshToken };
}

/** Rotates the refresh token. Reusing a rotated token revokes the whole family. */
export async function refresh(token: string | undefined, userAgent?: string): Promise<Required<AuthResponseDto>> {
  if (!token) throw new AppError('UNAUTHENTICATED', 401, 'Please log in.');
  const session = await RefreshSession.findOne({ tokenHash: sha256(token) });
  if (!session || session.expiresAt < new Date()) throw new AppError('UNAUTHENTICATED', 401, 'Session expired. Please log in.');

  if (session.revokedAt) {
    await RefreshSession.updateMany({ familyId: session.familyId, revokedAt: null }, { revokedAt: new Date() });
    throw new AppError('UNAUTHENTICATED', 401, 'Session expired. Please log in.');
  }

  const doc = await User.findById(session.userId);
  if (!doc || doc.status !== 'ACTIVE') throw new AppError('UNAUTHENTICATED', 401, 'Please log in.');
  const user = toUserDto(doc);
  const next = await issueSession(user, session.familyId, userAgent);
  // Conditional update guards against two concurrent refreshes both succeeding.
  const rotated = await RefreshSession.updateOne(
    { _id: session._id, revokedAt: null },
    { revokedAt: new Date(), replacedBy: next.sessionId },
  );
  if (rotated.modifiedCount === 0) {
    await RefreshSession.updateMany({ familyId: session.familyId, revokedAt: null }, { revokedAt: new Date() });
    throw new AppError('UNAUTHENTICATED', 401, 'Session expired. Please log in.');
  }
  return { user, accessToken: next.accessToken, refreshToken: next.refreshToken };
}

export async function logout(token: string | undefined): Promise<void> {
  if (!token) return;
  await RefreshSession.updateOne({ tokenHash: sha256(token), revokedAt: null }, { revokedAt: new Date() });
}

export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_COST);

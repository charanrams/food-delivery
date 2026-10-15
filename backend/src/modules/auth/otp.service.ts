import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { config } from '../../config';
import { AuthOtp } from '../../models';
import { AppError } from '../../utils/app-error';
import { logger } from '../../utils/logger';
import { otpEmail, sendMail } from '../../utils/mailer';

export type OtpPurpose = 'REGISTER' | 'RESET_PASSWORD' | 'LOGIN';
const RESEND_COOLDOWN_MS = 60_000;

// Keyed hash: a leaked authOtps collection can't be brute-forced offline without the server secret.
const hashCode = (email: string, purpose: OtpPurpose, code: string) =>
  createHmac('sha256', config().JWT_REFRESH_SECRET).update(`${purpose}:${email}:${code}`).digest('hex');

/** Creates (or replaces) the code for this email + purpose and emails it. */
export async function issueOtp(email: string, purpose: OtpPurpose, name?: string): Promise<void> {
  const existing = await AuthOtp.findOne({ email, purpose });
  if (existing && Date.now() - existing.sentAt.getTime() < RESEND_COOLDOWN_MS) {
    throw new AppError('RATE_LIMITED', 429, 'Please wait a minute before asking for another code.');
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const ttl = config().OTP_TTL_SECONDS;
  await AuthOtp.findOneAndUpdate(
    { email, purpose },
    { codeHash: hashCode(email, purpose, code), attempts: 0, sentAt: new Date(), expiresAt: new Date(Date.now() + ttl * 1000) },
    { upsert: true },
  );
  try {
    await sendMail({ to: email, ...otpEmail({ name, code, purpose, minutes: Math.round(ttl / 60) }) });
  } catch (err) {
    await AuthOtp.deleteOne({ email, purpose }); // let them retry straight away
    logger.error({ err, purpose }, 'OTP email failed');
    throw new AppError('SERVICE_UNAVAILABLE', 503, 'We couldn’t send the email right now. Please try again shortly.');
  }
}

/** Dummy phone OTP is on by default outside production (no SMS provider configured yet). */
export const phoneOtpDummy = () => (config().OTP_DUMMY ?? (config().NODE_ENV === 'production' ? 'false' : 'true')) === 'true';

/**
 * Phone login code. Dummy mode: the code is always DUMMY_OTP_CODE and is returned so the
 * app can hint it; nothing is sent. Real SMS (MSG91/Twilio/WhatsApp) plugs in here later.
 * Returns the code only in dummy mode.
 */
export async function issuePhoneOtp(phone: string): Promise<string | undefined> {
  if (!phoneOtpDummy()) {
    throw new AppError('SERVICE_UNAVAILABLE', 503, 'SMS login isn’t set up yet. Please contact the kitchen.');
  }
  const code = config().DUMMY_OTP_CODE;
  await AuthOtp.findOneAndUpdate(
    { email: phone, purpose: 'LOGIN' },
    { codeHash: hashCode(phone, 'LOGIN', code), attempts: 0, sentAt: new Date(), expiresAt: new Date(Date.now() + config().OTP_TTL_SECONDS * 1000) },
    { upsert: true },
  );
  logger.info({ phone: phone.slice(0, 5) + '•••••' }, 'dummy phone OTP issued');
  return code;
}

/** Checks and consumes the code. Wrong codes count towards OTP_MAX_ATTEMPTS. */
export async function verifyOtp(email: string, purpose: OtpPurpose, code: string): Promise<void> {
  const doc = await AuthOtp.findOne({ email, purpose }).select('+codeHash');
  if (!doc || doc.expiresAt < new Date()) {
    throw new AppError('OTP_EXPIRED', 400, 'This code has expired. Please request a new one.');
  }
  if (doc.attempts >= config().OTP_MAX_ATTEMPTS) {
    throw new AppError('OTP_LOCKED', 429, 'Too many wrong codes. Please request a new one.');
  }
  const expected = Buffer.from(doc.codeHash, 'hex');
  const actual = Buffer.from(hashCode(email, purpose, code.trim()), 'hex');
  if (!timingSafeEqual(expected, actual)) {
    await AuthOtp.updateOne({ _id: doc._id }, { $inc: { attempts: 1 } });
    throw new AppError('OTP_INVALID', 400, 'That code isn’t right. Check the email and try again.');
  }
  await AuthOtp.deleteOne({ _id: doc._id });
}

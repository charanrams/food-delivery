import { Schema, model, type InferSchemaType } from 'mongoose';
import { ADDRESS_LABELS, PARTNER_AVAILABILITY, USER_ROLES, USER_STATUSES } from '@a3/contracts';
import { objectId } from './_shared';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true }, // normalised E.164
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: [...USER_ROLES], required: true, default: 'CUSTOMER' },
    status: { type: String, enum: [...USER_STATUSES], required: true, default: 'ACTIVE' },
    avatarUrl: String,
  },
  { timestamps: true },
);
userSchema.index({ phone: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } });
export type UserDoc = InferSchemaType<typeof userSchema>;
export const User = model('User', userSchema);

const refreshSessionSchema = new Schema(
  {
    userId: objectId('User'),
    tokenHash: { type: String, required: true },
    familyId: { type: String, required: true }, // reuse of a rotated token revokes the family
    userAgent: String,
    expiresAt: { type: Date, required: true },
    revokedAt: Date,
    replacedBy: { type: Schema.Types.ObjectId, ref: 'RefreshSession' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
refreshSessionSchema.index({ tokenHash: 1 }, { unique: true });
refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const RefreshSession = model('RefreshSession', refreshSessionSchema, 'refreshSessions');

const addressSchema = new Schema(
  {
    userId: objectId('User'),
    label: { type: String, enum: [...ADDRESS_LABELS], default: 'HOME' },
    recipientName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    landmark: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, match: /^[1-9][0-9]{5}$/ },
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number], default: undefined }, // [lng, lat]
    },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);
addressSchema.index({ userId: 1, isDefault: -1 });
export type AddressDoc = InferSchemaType<typeof addressSchema>;
export const Address = model('Address', addressSchema);

const deliveryPartnerProfileSchema = new Schema(
  {
    userId: objectId('User'),
    availability: { type: String, enum: [...PARTNER_AVAILABILITY], default: 'OFFLINE' },
    isEligible: { type: Boolean, default: true },
    vehicleType: String,
    vehicleNumber: { type: String, trim: true, uppercase: true },
    lastSeenAt: Date,
  },
  { timestamps: true },
);
deliveryPartnerProfileSchema.index({ userId: 1 }, { unique: true });
deliveryPartnerProfileSchema.index({ availability: 1, isEligible: 1 });
export const DeliveryPartnerProfile = model(
  'DeliveryPartnerProfile',
  deliveryPartnerProfileSchema,
  'deliveryPartnerProfiles',
);

/** Email one-time codes for sign-up verification and password reset. Only the hash is stored. */
export const AUTH_OTP_PURPOSES = ['REGISTER', 'RESET_PASSWORD', 'LOGIN'] as const;
const authOtpSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    purpose: { type: String, enum: [...AUTH_OTP_PURPOSES], required: true },
    codeHash: { type: String, required: true, select: false },
    attempts: { type: Number, default: 0 },
    sentAt: { type: Date, required: true }, // resend cooldown
    expiresAt: { type: Date, required: true },
  },
  { timestamps: false },
);
authOtpSchema.index({ email: 1, purpose: 1 }, { unique: true }); // one live code per email + purpose
authOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const AuthOtp = model('AuthOtp', authOtpSchema, 'authOtps');

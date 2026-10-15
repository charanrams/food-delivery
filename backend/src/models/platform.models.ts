import { Schema, model } from 'mongoose';
import { USER_ROLES } from '@a3/contracts';
import { objectId, paise } from './_shared';

const notificationSchema = new Schema(
  {
    userId: objectId('User'),
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    readAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
export const Notification = model('Notification', notificationSchema);

/** Singleton document with _id "kitchen". */
const settingsSchema = new Schema(
  {
    _id: { type: String, default: 'kitchen' },
    isAcceptingOrders: { type: Boolean, default: true },
    kitchenHours: [
      {
        _id: false,
        day: { type: Number, min: 0, max: 6, required: true }, // 0 = Sunday
        open: { type: String, match: /^\d{2}:\d{2}$/, required: true },
        close: { type: String, match: /^\d{2}:\d{2}$/, required: true },
      },
    ],
    deliveryFeePaise: { ...paise(), default: 0 },
    freeDeliveryAbovePaise: paise(false),
    taxRateBps: { type: Number, min: 0, max: 10_000, default: 500 }, // 5% GST (PRD open question 7)
    serviceablePostalCodes: { type: [String], default: [] },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);
export const Settings = model('Settings', settingsSchema, 'settings');

const auditLogSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    actorRole: { type: String, enum: [...USER_ROLES, 'SYSTEM'], required: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    from: String,
    to: String,
    reason: String,
    metadata: Schema.Types.Mixed, // safe fields only — never OTPs, tokens or payment payloads
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
export const AuditLog = model('AuditLog', auditLogSchema, 'auditLogs');

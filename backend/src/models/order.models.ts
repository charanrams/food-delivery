import { Schema, model, type InferSchemaType } from 'mongoose';
import {
  ASSIGNMENT_STATUSES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from '@a3/contracts';
import { objectId, paise } from './_shared';

// Orders snapshot items and address at checkout (DECISIONS 007).
const orderItemSchema = new Schema(
  {
    productId: objectId('Product'),
    productName: { type: String, required: true },
    imageUrl: String,
    variantName: String,
    quantity: { type: Number, required: true, min: 1 },
    unitPricePaise: paise(),
    lineTotalPaise: paise(),
  },
  { _id: false },
);

const addressSnapshotSchema = new Schema(
  {
    recipientName: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    line2: String,
    landmark: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    // Map pin copied from the saved address (for the rider's navigation).
    lat: Number,
    lng: Number,
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true }, // A3-YYYYMMDD-NNNN
    customerId: objectId('User'),
    items: { type: [orderItemSchema], validate: (v: unknown[]) => v.length > 0 },
    deliveryAddress: { type: addressSnapshotSchema, required: true },
    subtotalPaise: paise(),
    discountPaise: { ...paise(), default: 0 },
    deliveryFeePaise: { ...paise(), default: 0 },
    taxPaise: { ...paise(), default: 0 },
    totalPaise: paise(),
    status: { type: String, enum: [...ORDER_STATUSES], required: true, default: 'PLACED' },
    paymentStatus: { type: String, enum: [...PAYMENT_STATUSES], required: true, default: 'PENDING' },
    paymentMethod: { type: String, enum: [...PAYMENT_METHODS], required: true },
    deliveryAssignmentId: { type: Schema.Types.ObjectId, ref: 'DeliveryAssignment' },
    partnerId: { type: Schema.Types.ObjectId, ref: 'User' }, // current partner (denormalised for queries)
    rejectionReason: String,
    cancellationReason: String,
    acceptedAt: Date,
    preparingAt: Date,
    readyAt: Date,
    assignedAt: Date,
    outForDeliveryAt: Date,
    rejectedAt: Date,
    cashCollectedAt: Date,
    pickedUpAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,
    idempotencyKey: String,
  },
  { timestamps: true },
);
orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ partnerId: 1, status: 1 });
orderSchema.index(
  { customerId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } },
);
export type OrderDoc = InferSchemaType<typeof orderSchema>;
export const Order = model('Order', orderSchema);

/** Daily counter backing order numbers (atomic $inc). */
const counterSchema = new Schema({ _id: String, seq: { type: Number, default: 0 } });
export const Counter = model('Counter', counterSchema);

const paymentSchema = new Schema(
  {
    orderId: objectId('Order'),
    customerId: objectId('User'),
    provider: { type: String, enum: [...PAYMENT_METHODS], required: true },
    providerOrderId: String,
    providerPaymentId: String,
    amountPaise: paise(),
    status: { type: String, enum: [...PAYMENT_STATUSES], required: true, default: 'PENDING' },
    idempotencyKey: String,
    paidAt: Date,
    refundedAt: Date,
  },
  { timestamps: true },
);
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ providerOrderId: 1 }, { sparse: true });
export const Payment = model('Payment', paymentSchema);

const paymentWebhookEventSchema = new Schema(
  {
    provider: { type: String, required: true },
    providerEventId: { type: String, required: true },
    type: { type: String, required: true },
    payloadDigest: { type: String, required: true },
    processedAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
paymentWebhookEventSchema.index({ provider: 1, providerEventId: 1 }, { unique: true });
export const PaymentWebhookEvent = model(
  'PaymentWebhookEvent',
  paymentWebhookEventSchema,
  'paymentWebhookEvents',
);

const deliveryAssignmentSchema = new Schema(
  {
    orderId: objectId('Order'),
    partnerId: objectId('User'),
    status: { type: String, enum: [...ASSIGNMENT_STATUSES], required: true, default: 'ASSIGNED' },
    assignedBy: objectId('User'),
    assignedAt: { type: Date, required: true, default: () => new Date() },
    acceptedAt: Date,
    pickedUpAt: Date,
    completedAt: Date,
    declinedAt: Date,
    declineReason: String,
    cancelReason: String,
  },
  { timestamps: true },
);
deliveryAssignmentSchema.index({ partnerId: 1, status: 1 });
deliveryAssignmentSchema.index({ orderId: 1, assignedAt: -1 });
export const DeliveryAssignment = model(
  'DeliveryAssignment',
  deliveryAssignmentSchema,
  'deliveryAssignments',
);

const deliveryOtpSchema = new Schema(
  {
    orderId: objectId('Order'),
    customerId: objectId('User'),
    partnerId: objectId('User'),
    otpHash: { type: String, required: true, select: false },
    // AES-GCM copy so the order's customer can see the code; never returned to partners/admins.
    otpCipher: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    failedAttempts: { type: Number, default: 0 },
    verifiedAt: Date,
    // TTL cleanup a day after expiry; the verification itself is kept in auditLogs.
    purgeAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
deliveryOtpSchema.index({ orderId: 1, verifiedAt: 1 });
deliveryOtpSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });
export const DeliveryOtp = model('DeliveryOtp', deliveryOtpSchema, 'deliveryOtps');

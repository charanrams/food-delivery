import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { Router, type Request } from 'express';
import { z } from 'zod';
import type { RazorpayCheckoutDto } from '@a3/contracts';
import { config } from '../../config';
import { AuditLog, Order, Payment, PaymentWebhookEvent, User } from '../../models';
import { actorOf, authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { AppError } from '../../utils/app-error';
import { logger } from '../../utils/logger';
import { ok } from '../../utils/http';
import { notify } from '../notifications/notifications';

// Razorpay (docs/ARCHITECTURE.md §6.2): server creates the provider order → client pays →
// server verifies the signature → signed webhook reconciles. A client "success" alone never marks PAID.

function keys() {
  const { RAZORPAY_KEY_ID: keyId, RAZORPAY_KEY_SECRET: secret } = config();
  if (!keyId || !secret) throw new AppError('PAYMENT_PROVIDER_ERROR', 503, 'Online payment isn’t set up yet. Please choose cash on delivery.');
  return { keyId, secret };
}

const safeEqualHex = (a: string, b: string) => {
  const x = Buffer.from(a, 'hex');
  const y = Buffer.from(b, 'hex');
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Creates (or reuses) the Razorpay order for an unpaid online order. */
export async function razorpayCheckout(orderId: string, customerId: string): Promise<RazorpayCheckoutDto> {
  const { keyId, secret } = keys();
  const order = await Order.findOne({ _id: orderId, customerId }).lean();
  if (!order) throw AppError.notFound('Order not found.', 'ORDER_NOT_FOUND');
  if (order.paymentMethod !== 'RAZORPAY') throw new AppError('VALIDATION_ERROR', 400, 'This order isn’t an online-payment order.');
  if (order.paymentStatus === 'PAID') throw AppError.conflict('ALREADY_EXISTS', 'This order is already paid.');
  if (order.status !== 'PLACED') throw AppError.conflict('INVALID_ORDER_TRANSITION', 'This order can no longer be paid.');

  const payment = await Payment.findOne({ orderId: order._id, provider: 'RAZORPAY' });
  let providerOrderId = payment?.providerOrderId;
  if (!providerOrderId) {
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`${keyId}:${secret}`).toString('base64')}` },
      body: JSON.stringify({ amount: order.totalPaise, currency: 'INR', receipt: order.orderNumber, notes: { orderId: String(order._id) } }),
    }).catch(() => null);
    const body = (await res?.json().catch(() => null)) as { id?: string; error?: { description?: string } } | null;
    if (!res?.ok || !body?.id) {
      logger.error({ status: res?.status, reason: body?.error?.description }, 'razorpay order create failed');
      throw new AppError('PAYMENT_PROVIDER_ERROR', 502, 'We couldn’t reach the payment provider. Please try again or choose cash on delivery.');
    }
    providerOrderId = body.id;
    await Payment.updateOne({ orderId: order._id, provider: 'RAZORPAY' }, { providerOrderId, status: 'PENDING' }, { upsert: true, setDefaultsOnInsert: true });
  }
  const customer = await User.findById(customerId).select('name email phone').lean();
  return {
    keyId,
    providerOrderId,
    amountPaise: order.totalPaise,
    currency: 'INR',
    orderNumber: order.orderNumber,
    prefill: { name: customer?.name ?? '', email: customer?.email ?? '', contact: customer?.phone ?? '' },
  };
}

/** Marks an online order PAID exactly once (signature verify and webhook may both arrive). */
async function markPaid(providerOrderId: string, providerPaymentId: string, source: 'verify' | 'webhook') {
  const payment = await Payment.findOneAndUpdate(
    { providerOrderId, status: { $ne: 'PAID' } },
    { status: 'PAID', providerPaymentId, paidAt: new Date() },
    { new: true },
  );
  if (!payment) return; // already paid — idempotent
  const order = await Order.findOneAndUpdate({ _id: payment.orderId, paymentStatus: { $ne: 'PAID' } }, { paymentStatus: 'PAID' }, { new: true }).lean();
  if (!order) return;
  await AuditLog.create({ actorRole: 'SYSTEM', action: 'payment.paid', entityType: 'Order', entityId: order._id, metadata: { source, providerPaymentId } });
  await notify(order.customerId, { type: 'payment.paid', title: 'Payment received', message: `${order.orderNumber} is paid. The kitchen will review it now.`, orderId: order._id });
  const admins = await User.find({ role: 'ADMIN', status: 'ACTIVE' }).select('_id').lean();
  await Promise.all(admins.map((a) => notify(a._id, { type: 'payment.paid', title: 'Online payment received', message: order.orderNumber, orderId: order._id })));
}

async function markFailed(providerOrderId: string) {
  const payment = await Payment.findOneAndUpdate({ providerOrderId, status: 'PENDING' }, { status: 'FAILED' }, { new: true });
  if (payment) await Order.updateOne({ _id: payment.orderId, paymentStatus: 'PENDING' }, { paymentStatus: 'FAILED' });
}

export const paymentsRouter = Router();

// Customer: (re)open Razorpay for an unpaid order — used after a failed/cancelled payment.
paymentsRouter.post(
  '/razorpay/order',
  authenticate,
  requireRole('CUSTOMER'),
  validate({ body: z.object({ orderId: z.string().regex(/^[a-f\d]{24}$/i) }) }),
  async (req, res) => {
    ok(res, await razorpayCheckout(req.body.orderId, actorOf(req).userId));
  },
);

// Customer: client hands back Razorpay's response; we verify the HMAC before trusting it.
paymentsRouter.post(
  '/razorpay/verify',
  authenticate,
  requireRole('CUSTOMER'),
  validate({
    body: z.object({
      razorpay_order_id: z.string().min(5).max(64),
      razorpay_payment_id: z.string().min(5).max(64),
      razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i),
    }),
  }),
  async (req, res) => {
    const { secret } = keys();
    const { razorpay_order_id: oid, razorpay_payment_id: pid, razorpay_signature: sig } = req.body;
    const payment = await Payment.findOne({ providerOrderId: oid, customerId: actorOf(req).userId }).lean();
    if (!payment) throw AppError.notFound('Payment not found.');
    const expected = createHmac('sha256', secret).update(`${oid}|${pid}`).digest('hex');
    if (!safeEqualHex(expected, sig)) {
      logger.warn({ providerOrderId: oid }, 'razorpay signature mismatch');
      throw new AppError('PAYMENT_PROVIDER_ERROR', 400, 'We couldn’t confirm this payment. If money was deducted it will be refunded automatically.');
    }
    await markPaid(oid, pid, 'verify');
    ok(res, { orderId: String(payment.orderId), paymentStatus: 'PAID' });
  },
);

// Customer: payment sheet closed or failed on the device.
paymentsRouter.post(
  '/razorpay/failed',
  authenticate,
  requireRole('CUSTOMER'),
  validate({ body: z.object({ orderId: z.string().regex(/^[a-f\d]{24}$/i) }) }),
  async (req, res) => {
    const payment = await Payment.findOne({ orderId: req.body.orderId, customerId: actorOf(req).userId, provider: 'RAZORPAY' }).lean();
    if (payment?.providerOrderId) await markFailed(payment.providerOrderId);
    ok(res, { ok: true });
  },
);

/** Razorpay webhook — raw-body HMAC, de-duplicated by event id (docs/SECURITY.md §6). */
paymentsRouter.post('/webhooks/razorpay', async (req: Request & { rawBody?: Buffer }, res) => {
  const secret = config().RAZORPAY_WEBHOOK_SECRET;
  const signature = req.get('x-razorpay-signature') ?? '';
  const raw = req.rawBody ?? Buffer.from('');
  if (!secret || !/^[a-f0-9]{64}$/i.test(signature) || !safeEqualHex(createHmac('sha256', secret).update(raw).digest('hex'), signature)) {
    throw new AppError('FORBIDDEN', 400, 'Invalid signature.');
  }
  const event = req.body as { event?: string; payload?: { payment?: { entity?: { id: string; order_id: string } }; order?: { entity?: { id: string } } } };
  const eventId = req.get('x-razorpay-event-id') ?? createHash('sha256').update(raw).digest('hex');
  try {
    await PaymentWebhookEvent.create({ provider: 'RAZORPAY', providerEventId: eventId, type: event.event ?? 'unknown', payloadDigest: createHash('sha256').update(raw).digest('hex') });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return ok(res, { duplicate: true }); // already processed
    throw err;
  }
  const p = event.payload?.payment?.entity;
  if ((event.event === 'payment.captured' || event.event === 'order.paid') && p) await markPaid(p.order_id, p.id, 'webhook');
  else if (event.event === 'payment.failed' && p) await markFailed(p.order_id);
  await PaymentWebhookEvent.updateOne({ provider: 'RAZORPAY', providerEventId: eventId }, { processedAt: new Date() });
  ok(res, { received: true });
});

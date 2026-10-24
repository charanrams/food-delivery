import { discounted, liveDiscounts } from '../specials/specials';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import mongoose, { isValidObjectId, type Types } from 'mongoose';
import type {
  AdminSummaryDto,
  AssignmentStatus,
  CheckoutQuoteDto,
  CheckoutRequestDto,
  DeliveryProfileDto,
  PartnerWeeklyStatementDto,
  EligiblePartnerDto,
  OrderDto,
  OrderItemDto,
  OrderStatus,
  UserRole,
} from '@a3/contracts';
import { config } from '../../config';
import {
  Address,
  AuditLog,
  Category,
  Counter,
  DeliveryAssignment,
  DeliveryOtp,
  DeliveryPartnerProfile,
  Order,
  Payment,
  Product,
  Settings,
  User,
  type OrderDoc,
} from '../../models';
import type { Actor } from '../../middleware/auth';
import { AppError } from '../../utils/app-error';
import { notify } from '../notifications/notifications';
import { serviceableCodes } from '../addresses/addresses';
import { razorpayCheckout } from '../payments/payments';

type Id = string | Types.ObjectId;
type OrderRow = OrderDoc & { _id: Types.ObjectId; createdAt?: Date };

const ACTIVE_DELIVERY: OrderStatus[] = ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'];
const STAMP: Partial<Record<OrderStatus, keyof OrderDoc>> = {
  ACCEPTED: 'acceptedAt',
  PREPARING: 'preparingAt',
  READY_FOR_PICKUP: 'readyAt',
  ASSIGNED: 'assignedAt',
  PICKED_UP: 'pickedUpAt',
  OUT_FOR_DELIVERY: 'outForDeliveryAt',
  DELIVERED: 'deliveredAt',
  CANCELLED: 'cancelledAt',
  REJECTED: 'rejectedAt',
};

// ---------------------------------------------------------------- delivery code crypto
// Hash (for verification) + AES-GCM copy (so only the order's customer can read it back).
const otpKey = () => createHash('sha256').update(`${config().JWT_REFRESH_SECRET}:delivery-otp`).digest();
const hashOtp = (orderId: Id, code: string) => createHmac('sha256', otpKey()).update(`${String(orderId)}:${code}`).digest('hex');
function encryptOtp(code: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', otpKey(), iv);
  const enc = Buffer.concat([c.update(code, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64url')).join('.');
}
function decryptOtp(cipher: string): string | undefined {
  try {
    const [iv, tag, enc] = cipher.split('.').map((p) => Buffer.from(p, 'base64url'));
    const d = createDecipheriv('aes-256-gcm', otpKey(), iv!);
    d.setAuthTag(tag!);
    return Buffer.concat([d.update(enc!), d.final()]).toString('utf8');
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------- helpers
const audit = (actor: Actor | 'SYSTEM', action: string, orderId: Id, from?: string, to?: string, reason?: string, metadata?: object) =>
  AuditLog.create({
    actorId: actor === 'SYSTEM' ? undefined : actor.userId,
    actorRole: actor === 'SYSTEM' ? 'SYSTEM' : actor.role,
    action,
    entityType: 'Order',
    entityId: orderId,
    from,
    to,
    reason,
    metadata,
  });

async function notifyAdmins(n: { type: string; title: string; message: string; orderId?: Id }) {
  const admins = await User.find({ role: 'ADMIN', status: 'ACTIVE' }).select('_id').lean();
  await Promise.all(admins.map((a) => notify(a._id, n)));
}

/** Start of "today" in India (UTC+5:30). */
function startOfTodayIST(): Date {
  const ist = new Date(Date.now() + 5.5 * 3600_000);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - 5.5 * 3600_000);
}

async function nextOrderNumber(session?: mongoose.ClientSession): Promise<string> {
  const ist = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10).replaceAll('-', '');
  const c = await Counter.findOneAndUpdate({ _id: `order-${ist}` }, { $inc: { seq: 1 } }, { upsert: true, new: true, session });
  return `A3-${ist}-${String(c!.seq).padStart(4, '0')}`;
}

// ---------------------------------------------------------------- DTO
function actionsFor(o: OrderRow, role: UserRole, assignmentStatus?: AssignmentStatus): string[] {
  const s = o.status as OrderStatus;
  if (role === 'CUSTOMER')
    return s === 'PLACED' && o.paymentMethod === 'RAZORPAY' && o.paymentStatus !== 'PAID' ? ['pay', 'cancel'] : s === 'PLACED' ? ['cancel'] : s === 'DELIVERED' || s === 'CANCELLED' || s === 'REJECTED' ? ['reorder'] : [];
  if (role === 'ADMIN') {
    const map: Partial<Record<OrderStatus, string[]>> = {
      PLACED: o.paymentMethod === 'RAZORPAY' && o.paymentStatus !== 'PAID' ? ['cancel'] : ['accept', 'reject', 'cancel'],
      ACCEPTED: ['prepare', 'cancel'],
      PREPARING: ['ready', 'cancel'],
      READY_FOR_PICKUP: ['assign', 'cancel'],
      ASSIGNED: ['unassign'],
      OUT_FOR_DELIVERY: ['override-delivery'],
    };
    return map[s] ?? [];
  }
  if (s === 'ASSIGNED') return assignmentStatus === 'ACCEPTED' ? ['pickup'] : ['accept', 'decline'];
  if (s === 'PICKED_UP') return ['out-for-delivery'];
  if (s === 'OUT_FOR_DELIVERY') return ['verify-otp', 'regenerate-otp'];
  return [];
}

const iso = (d?: Date | null) => (d ? d.toISOString() : undefined);

export async function toOrderDto(o: OrderRow, role: UserRole, opts: { withOtp?: boolean } = {}): Promise<OrderDto> {
  const [partnerUser, partnerProfile, assignment, customer] = await Promise.all([
    o.partnerId ? User.findById(o.partnerId).select('name phone').lean() : null,
    o.partnerId ? DeliveryPartnerProfile.findOne({ userId: o.partnerId }).lean() : null,
    o.deliveryAssignmentId ? DeliveryAssignment.findById(o.deliveryAssignmentId).select('status').lean() : null,
    role !== 'CUSTOMER' ? User.findById(o.customerId).select('name phone').lean() : null,
  ]);
  let deliveryOtp: string | undefined;
  if (opts.withOtp && role === 'CUSTOMER' && o.status === 'OUT_FOR_DELIVERY') {
    const otp = await DeliveryOtp.findOne({ orderId: o._id, verifiedAt: null }).sort({ createdAt: -1 }).select('+otpCipher').lean();
    deliveryOtp = otp ? decryptOtp(otp.otpCipher) : undefined;
  }
  const assignmentStatus = assignment?.status as AssignmentStatus | undefined;
  const t = o as OrderRow & Record<string, Date | undefined>;
  return {
    id: String(o._id),
    orderNumber: o.orderNumber,
    status: o.status as OrderStatus,
    paymentStatus: o.paymentStatus as OrderDto['paymentStatus'],
    paymentMethod: o.paymentMethod as OrderDto['paymentMethod'],
    items: o.items.map((i) => ({
      productId: String(i.productId),
      productName: i.productName,
      ...(i.imageUrl ? { imageUrl: i.imageUrl } : {}),
      ...(i.variantName ? { variantName: i.variantName } : {}),
      quantity: i.quantity,
      unitPricePaise: i.unitPricePaise,
      lineTotalPaise: i.lineTotalPaise,
    })),
    deliveryAddress: {
      recipientName: o.deliveryAddress.recipientName,
      phone: o.deliveryAddress.phone,
      line1: o.deliveryAddress.line1,
      ...(o.deliveryAddress.line2 ? { line2: o.deliveryAddress.line2 } : {}),
      ...(o.deliveryAddress.landmark ? { landmark: o.deliveryAddress.landmark } : {}),
      city: o.deliveryAddress.city,
      state: o.deliveryAddress.state,
      postalCode: o.deliveryAddress.postalCode,
      ...(o.deliveryAddress.lat != null && o.deliveryAddress.lng != null
        ? { lat: o.deliveryAddress.lat, lng: o.deliveryAddress.lng }
        : {}),
    },
    subtotalPaise: o.subtotalPaise,
    discountPaise: o.discountPaise,
    deliveryFeePaise: o.deliveryFeePaise,
    taxPaise: o.taxPaise,
    totalPaise: o.totalPaise,
    timeline: {
      placedAt: (o.createdAt ?? new Date()).toISOString(),
      acceptedAt: iso(t.acceptedAt),
      preparingAt: iso(t.preparingAt),
      readyAt: iso(t.readyAt),
      assignedAt: iso(t.assignedAt),
      pickedUpAt: iso(t.pickedUpAt),
      outForDeliveryAt: iso(t.outForDeliveryAt),
      deliveredAt: iso(t.deliveredAt),
      cancelledAt: iso(t.cancelledAt ?? t.rejectedAt),
    },
    ...(o.rejectionReason ? { rejectionReason: o.rejectionReason } : {}),
    ...(o.cancellationReason ? { cancellationReason: o.cancellationReason } : {}),
    ...(customer ? { customer: { id: String(customer._id), name: customer.name, phone: customer.phone } } : {}),
    ...(partnerUser
      ? {
          partner: {
            id: String(partnerUser._id),
            name: partnerUser.name,
            phone: partnerUser.phone,
            ...(partnerProfile?.vehicleType ? { vehicleType: partnerProfile.vehicleType } : {}),
            ...(partnerProfile?.vehicleNumber ? { vehicleNumber: partnerProfile.vehicleNumber } : {}),
          },
        }
      : {}),
    ...(assignmentStatus ? { assignmentStatus } : {}),
    ...(deliveryOtp ? { deliveryOtp } : {}),
    actions: actionsFor(o, role, assignmentStatus),
  };
}

// ---------------------------------------------------------------- pricing & checkout

/** Server-side pricing — client prices are never trusted (docs/SECURITY.md §5). */
export async function quote(items: CheckoutRequestDto['items']): Promise<CheckoutQuoteDto> {
  if (!items.length) throw new AppError('VALIDATION_ERROR', 400, 'Your cart is empty.');
  const ids = [...new Set(items.map((i) => i.productId))].filter(isValidObjectId);
  const [products, activeCats, settings, offers] = await Promise.all([
    Product.find({ _id: { $in: ids }, isArchived: false }).lean(),
    Category.find({ isActive: true }).distinct('_id'),
    Settings.findById('kitchen').lean(),
    liveDiscounts(ids),
  ]);
  const activeCat = new Set(activeCats.map(String));
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const lines: OrderItemDto[] = [];
  for (const i of items) {
    const p = byId.get(i.productId);
    if (!p || !activeCat.has(String(p.categoryId))) {
      throw AppError.conflict('PRODUCT_UNAVAILABLE', 'A dish in your cart is no longer on the menu. Please review your cart.');
    }
    if (!p.isAvailable) throw AppError.conflict('PRODUCT_UNAVAILABLE', `${p.name} is currently unavailable. Remove it to continue.`);
    let unit = p.pricePaise;
    let variantName: string | undefined;
    if (p.variants.length) {
      const v = p.variants.find((x) => String((x as unknown as { _id: unknown })._id) === i.variantId);
      if (!v) throw new AppError('VALIDATION_ERROR', 400, `Choose a portion for ${p.name}.`);
      if (!v.isAvailable) throw AppError.conflict('PRODUCT_UNAVAILABLE', `${p.name} (${v.name}) is currently unavailable.`);
      unit = v.pricePaise;
      variantName = v.name;
    }
    const existing = lines.find((l) => l.productId === i.productId && l.variantName === variantName);
    if (existing) {
      existing.quantity = Math.min(existing.quantity + i.quantity, 20);
      existing.lineTotalPaise = existing.unitPricePaise * existing.quantity;
      continue;
    }
    lines.push({
      productId: i.productId,
      productName: p.name,
      ...(p.images[0] ? { imageUrl: p.images[0] } : {}),
      ...(variantName ? { variantName } : {}),
      quantity: i.quantity,
      unitPricePaise: unit,
      lineTotalPaise: unit * i.quantity,
    });
  }

  const subtotal = lines.reduce((s, l) => s + l.lineTotalPaise, 0);
  // Today's specials: % off the dish's line, decided by the server only.
  const discount = lines.reduce((s, l) => {
    const pct = offers.get(l.productId);
    return pct ? s + (l.lineTotalPaise - discounted(l.lineTotalPaise, pct)) : s;
  }, 0);
  const afterDiscount = subtotal - discount;
  const fee = settings?.freeDeliveryAbovePaise != null && afterDiscount >= settings.freeDeliveryAbovePaise ? 0 : settings?.deliveryFeePaise ?? 0;
  const tax = Math.round((afterDiscount * (settings?.taxRateBps ?? 500)) / 10_000);
  return { items: lines, subtotalPaise: subtotal, discountPaise: discount, deliveryFeePaise: fee, taxPaise: tax, totalPaise: afterDiscount + fee + tax, warnings: [] };
}

export async function checkout(actor: Actor, req: CheckoutRequestDto, idempotencyKey?: string): Promise<{ order: OrderDto; created: boolean }> {
  // Replaying the same request returns the same order — never a duplicate (docs/TESTING.md §3.13).
  if (idempotencyKey) {
    const existing = await Order.findOne({ customerId: actor.userId, idempotencyKey }).lean();
    if (existing) return { order: await withRazorpay(existing, actor), created: false };
  }

  const settings = await Settings.findById('kitchen').lean();
  if (settings && !settings.isAcceptingOrders) throw AppError.conflict('KITCHEN_CLOSED', 'The kitchen is not taking orders right now. Please try again later.');

  const address = await Address.findOne({ _id: req.addressId, userId: actor.userId }).lean();
  if (!address) throw AppError.notFound('Choose a delivery address.', 'ADDRESS_NOT_FOUND');
  const codes = await serviceableCodes();
  if (codes && !codes.has(address.postalCode)) {
    throw new AppError('ADDRESS_NOT_SERVICEABLE', 422, `Sorry, we don’t deliver to ${address.postalCode} yet.`);
  }

  if (req.paymentMethod === 'RAZORPAY' && (!config().RAZORPAY_KEY_ID || !config().RAZORPAY_KEY_SECRET)) {
    throw new AppError('PAYMENT_PROVIDER_ERROR', 503, 'Online payment isn’t set up yet. Please choose cash on delivery.');
  }
  if (req.paymentMethod === 'TEST' && config().PAYMENT_MODE !== 'TEST') {
    throw new AppError('VALIDATION_ERROR', 400, 'Test payments are disabled.');
  }

  const priced = await quote(req.items);
  const paid = req.paymentMethod === 'TEST';
  const session = await mongoose.startSession();
  let orderId: Types.ObjectId | undefined;
  try {
    await session.withTransaction(async () => {
      const [order] = await Order.create(
        [
          {
            orderNumber: await nextOrderNumber(session),
            customerId: actor.userId,
            items: priced.items,
            deliveryAddress: {
              recipientName: address.recipientName,
              phone: address.phone,
              line1: address.line1,
              line2: address.line2,
              landmark: address.landmark,
              city: address.city,
              state: address.state,
              postalCode: address.postalCode,
              ...(address.location?.coordinates?.length === 2
                ? { lng: address.location.coordinates[0], lat: address.location.coordinates[1] }
                : {}),
            },
            subtotalPaise: priced.subtotalPaise,
            discountPaise: priced.discountPaise,
            deliveryFeePaise: priced.deliveryFeePaise,
            taxPaise: priced.taxPaise,
            totalPaise: priced.totalPaise,
            status: 'PLACED',
            paymentStatus: paid ? 'PAID' : 'PENDING',
            paymentMethod: req.paymentMethod,
            ...(idempotencyKey ? { idempotencyKey } : {}),
          },
        ],
        { session },
      );
      await Payment.create(
        [
          {
            orderId: order!._id,
            customerId: actor.userId,
            provider: req.paymentMethod,
            amountPaise: priced.totalPaise,
            status: paid ? 'PAID' : 'PENDING',
            ...(paid ? { paidAt: new Date() } : {}),
            ...(idempotencyKey ? { idempotencyKey } : {}),
          },
        ],
        { session },
      );
      orderId = order!._id;
    });
  } catch (err) {
    // Two identical requests racing: the unique (customerId, idempotencyKey) index lets one win.
    if ((err as { code?: number }).code === 11000 && idempotencyKey) {
      const existing = await Order.findOne({ customerId: actor.userId, idempotencyKey }).lean();
      if (existing) return { order: await toOrderDto(existing, 'CUSTOMER'), created: false };
    }
    throw err;
  } finally {
    await session.endSession();
  }

  const order = (await Order.findById(orderId).lean())!;
  if (order.paymentMethod === 'RAZORPAY') {
    // Kitchen is told once the payment is confirmed (payments.markPaid) — not before.
    await audit(actor, 'order.place', order._id, undefined, 'PLACED', undefined, { paymentMethod: 'RAZORPAY' });
    try {
      return { order: await withRazorpay(order, actor), created: true };
    } catch (err) {
      await transition('SYSTEM', String(order._id), ['PLACED'], 'CANCELLED', { set: { cancellationReason: 'Payment provider unavailable', paymentStatus: 'FAILED' } });
      throw err;
    }
  }
  await audit(actor, 'order.place', order._id, undefined, 'PLACED', undefined, { paymentMethod: req.paymentMethod });
  await notifyAdmins({ type: 'order.created', title: 'New order', message: `${order.orderNumber} · ${order.items.length} item(s)`, orderId: order._id });
  await notify(actor.userId, { type: 'order.updated', title: 'Order placed', message: `We’ve sent ${order.orderNumber} to the kitchen.`, orderId: order._id });
  return { order: await toOrderDto(order, 'CUSTOMER'), created: true };
}

async function withRazorpay(o: OrderRow, actor: Actor): Promise<OrderDto> {
  const dto = await toOrderDto(o, 'CUSTOMER');
  if (o.paymentMethod === 'RAZORPAY' && o.paymentStatus !== 'PAID' && o.status === 'PLACED') dto.razorpay = await razorpayCheckout(String(o._id), actor.userId);
  return dto;
}

// ---------------------------------------------------------------- state machine

/**
 * The only way order status changes. Atomic conditional update on the current status,
 * so two admins can't both accept/reject (docs/ARCHITECTURE.md §6).
 */
async function transition(
  actor: Actor | 'SYSTEM',
  orderId: string,
  from: OrderStatus[],
  to: OrderStatus,
  opts: { match?: object; set?: object; unset?: string[]; reason?: string } = {},
): Promise<OrderRow> {
  if (!isValidObjectId(orderId)) throw AppError.notFound('Order not found.', 'ORDER_NOT_FOUND');
  const stamp = STAMP[to];
  const before = await Order.findOne({ _id: orderId, ...opts.match }).select('status').lean();
  if (!before) throw AppError.notFound('Order not found.', 'ORDER_NOT_FOUND');
  const updated = await Order.findOneAndUpdate(
    { _id: orderId, status: { $in: from }, ...opts.match },
    {
      $set: { status: to, ...(stamp ? { [stamp]: new Date() } : {}), ...opts.set },
      ...(opts.unset?.length ? { $unset: Object.fromEntries(opts.unset.map((k) => [k, 1])) } : {}),
    },
    { new: true },
  ).lean();
  if (!updated) {
    throw AppError.conflict('INVALID_ORDER_TRANSITION', `This order is already ${before.status.toLowerCase().replaceAll('_', ' ')} and can’t be moved to ${to.toLowerCase().replaceAll('_', ' ')}.`);
  }
  await audit(actor, `order.${to.toLowerCase()}`, updated._id, before.status, to, opts.reason);
  return updated as OrderRow;
}

const CUSTOMER_MESSAGES: Partial<Record<OrderStatus, [string, string]>> = {
  ACCEPTED: ['Order accepted', 'The kitchen has accepted your order.'],
  PREPARING: ['Being prepared', 'Your food is being cooked now.'],
  READY_FOR_PICKUP: ['Ready', 'Your order is packed and waiting for a delivery partner.'],
  PICKED_UP: ['Picked up', 'Your delivery partner has collected your order.'],
  OUT_FOR_DELIVERY: ['On the way', 'Your order is out for delivery. Keep your delivery code ready.'],
  DELIVERED: ['Delivered', 'Enjoy your meal! Thanks for ordering from A3 Kitchen.'],
  REJECTED: ['Order declined', 'Sorry — the kitchen couldn’t take this order.'],
  CANCELLED: ['Order cancelled', 'Your order has been cancelled.'],
};
async function tellCustomer(o: OrderRow) {
  const m = CUSTOMER_MESSAGES[o.status as OrderStatus];
  if (m) await notify(o.customerId, { type: 'order.updated', title: m[0], message: `${o.orderNumber}: ${m[1]}`, orderId: o._id });
}

/** Cancelled/rejected paid orders: test payments refund instantly; real ones wait for the provider. */
async function settleRefund(o: OrderRow) {
  if (o.paymentStatus !== 'PAID') return;
  const status = o.paymentMethod === 'TEST' ? 'REFUNDED' : 'REFUND_PENDING';
  await Order.updateOne({ _id: o._id }, { paymentStatus: status });
  await Payment.updateMany({ orderId: o._id }, { status, ...(status === 'REFUNDED' ? { refundedAt: new Date() } : {}) });
}

// ---- customer
export async function customerCancel(actor: Actor, orderId: string, reason?: string) {
  const o = await transition(actor, orderId, ['PLACED'], 'CANCELLED', {
    match: { customerId: actor.userId },
    set: { cancellationReason: reason || 'Cancelled by customer' },
    reason,
  });
  await settleRefund(o);
  await notifyAdmins({ type: 'order.cancelled', title: 'Order cancelled by customer', message: o.orderNumber, orderId: o._id });
  return o;
}

// ---- admin
export async function adminAction(actor: Actor, orderId: string, action: string, body: { reason?: string; partnerId?: string }) {
  let o: OrderRow;
  switch (action) {
    case 'accept': {
      // Online orders can't be cooked before the money is confirmed.
      const pending = await Order.exists({ _id: orderId, paymentMethod: 'RAZORPAY', paymentStatus: { $ne: 'PAID' } });
      if (pending) throw AppError.conflict('INVALID_ORDER_TRANSITION', 'Waiting for the customer’s online payment.');
      o = await transition(actor, orderId, ['PLACED'], 'ACCEPTED');
      break;
    }
    case 'reject':
      if (!body.reason) throw new AppError('VALIDATION_ERROR', 400, 'Give a reason so the customer knows why.');
      o = await transition(actor, orderId, ['PLACED'], 'REJECTED', { set: { rejectionReason: body.reason }, reason: body.reason });
      await settleRefund(o);
      break;
    case 'prepare':
      o = await transition(actor, orderId, ['ACCEPTED'], 'PREPARING');
      break;
    case 'ready':
      o = await transition(actor, orderId, ['PREPARING'], 'READY_FOR_PICKUP');
      break;
    case 'cancel':
      if (!body.reason) throw new AppError('VALIDATION_ERROR', 400, 'Give a reason for cancelling.');
      o = await transition(actor, orderId, ['PLACED', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP'], 'CANCELLED', {
        set: { cancellationReason: body.reason },
        reason: body.reason,
      });
      await settleRefund(o);
      break;
    case 'assign':
      return assign(actor, orderId, body.partnerId ?? '');
    case 'unassign':
      return unassign(actor, orderId, body.reason || 'Reassigned by kitchen');
    case 'override-delivery':
      if (!body.reason || body.reason.trim().length < 5) throw new AppError('VALIDATION_ERROR', 400, 'Explain why the delivery code could not be used.');
      return completeDelivery(actor, orderId, { override: body.reason.trim() });
    default:
      throw new AppError('VALIDATION_ERROR', 400, 'Unknown action.');
  }
  await tellCustomer(o);
  return o;
}

async function activeCount(partnerId: Id) {
  return Order.countDocuments({ partnerId, status: { $in: ACTIVE_DELIVERY } });
}

export async function eligiblePartners(): Promise<EligiblePartnerDto[]> {
  const profiles = await DeliveryPartnerProfile.find({ availability: 'ONLINE', isEligible: true }).lean();
  const users = await User.find({ _id: { $in: profiles.map((p) => p.userId) }, status: 'ACTIVE', role: 'DELIVERY_PARTNER' }).lean();
  const rows = await Promise.all(
    users.map(async (u) => {
      const p = profiles.find((x) => String(x.userId) === String(u._id));
      return { id: String(u._id), name: u.name, phone: u.phone, ...(p?.vehicleType ? { vehicleType: p.vehicleType } : {}), activeAssignments: await activeCount(u._id), suggested: false };
    }),
  );
  // MVP: one active delivery per partner; online ≠ free (docs/ARCHITECTURE.md §8).
  const free = rows.filter((r) => r.activeAssignments === 0).sort((a, b) => a.name.localeCompare(b.name));
  if (free[0]) free[0].suggested = true;
  return free;
}

async function assign(actor: Actor, orderId: string, partnerId: string) {
  if (!isValidObjectId(partnerId)) throw new AppError('VALIDATION_ERROR', 400, 'Choose a delivery partner.');
  const [user, profile] = await Promise.all([
    User.findOne({ _id: partnerId, role: 'DELIVERY_PARTNER', status: 'ACTIVE' }).lean(),
    DeliveryPartnerProfile.findOne({ userId: partnerId }).lean(),
  ]);
  if (!user || !profile?.isEligible) throw new AppError('VALIDATION_ERROR', 400, 'This delivery partner can’t take orders.');
  if (profile.availability !== 'ONLINE') throw AppError.conflict('PARTNER_BUSY', `${user.name} is offline.`);
  if ((await activeCount(partnerId)) > 0) throw AppError.conflict('PARTNER_BUSY', `${user.name} is already on a delivery.`);

  const assignment = await DeliveryAssignment.create({ orderId, partnerId, status: 'ASSIGNED', assignedBy: actor.userId });
  try {
    const o = await transition(actor, orderId, ['READY_FOR_PICKUP'], 'ASSIGNED', {
      set: { partnerId, deliveryAssignmentId: assignment._id },
    });
    await notify(partnerId, { type: 'delivery.assigned', title: 'New delivery', message: `${o.orderNumber} is ready at the kitchen.`, orderId: o._id });
    await notify(o.customerId, { type: 'order.updated', title: 'Partner assigned', message: `${user.name} will deliver ${o.orderNumber}.`, orderId: o._id });
    return o;
  } catch (err) {
    await DeliveryAssignment.updateOne({ _id: assignment._id }, { status: 'CANCELLED', cancelReason: 'Assignment failed' });
    throw err;
  }
}

/** Back to READY_FOR_PICKUP with a recorded reason (decline or admin reassignment). */
async function unassign(actor: Actor, orderId: string, reason: string, match: object = {}) {
  const current = await Order.findOne({ _id: orderId, ...match }).lean();
  if (!current) throw AppError.notFound('Order not found.', 'ORDER_NOT_FOUND');
  const o = await transition(actor, orderId, ['ASSIGNED'], 'READY_FOR_PICKUP', { match, unset: ['partnerId', 'deliveryAssignmentId'], reason });
  const declined = actor.role === 'DELIVERY_PARTNER';
  await DeliveryAssignment.updateOne(
    { _id: current.deliveryAssignmentId },
    declined ? { status: 'DECLINED', declinedAt: new Date(), declineReason: reason } : { status: 'CANCELLED', cancelReason: reason },
  );
  if (declined) await notifyAdmins({ type: 'delivery.declined', title: 'Delivery declined', message: `${o.orderNumber}: ${reason}`, orderId: o._id });
  else if (current.partnerId) await notify(current.partnerId, { type: 'delivery.cancelled', title: 'Delivery reassigned', message: `${o.orderNumber} was reassigned by the kitchen.`, orderId: o._id });
  return o;
}

// ---- delivery partner
const mine = (actor: Actor) => ({ partnerId: actor.userId });

export async function partnerAction(actor: Actor, orderId: string, action: string, body: { reason?: string; otp?: string; cashCollected?: boolean }) {
  switch (action) {
    case 'accept': {
      const o = await Order.findOne({ _id: orderId, ...mine(actor), status: 'ASSIGNED' }).lean();
      if (!o) throw AppError.notFound('Assignment not found.', 'NOT_ASSIGNED');
      const r = await DeliveryAssignment.updateOne({ _id: o.deliveryAssignmentId, status: 'ASSIGNED' }, { status: 'ACCEPTED', acceptedAt: new Date() });
      if (!r.modifiedCount) throw AppError.conflict('INVALID_ORDER_TRANSITION', 'This delivery was already accepted.');
      await audit(actor, 'delivery.accept', o._id);
      await notifyAdmins({ type: 'delivery.accepted', title: 'Delivery accepted', message: o.orderNumber, orderId: o._id });
      return o as OrderRow;
    }
    case 'decline':
      if (!body.reason) throw new AppError('VALIDATION_ERROR', 400, 'Tell the kitchen why you can’t take this delivery.');
      return unassign(actor, orderId, body.reason, mine(actor));
    case 'pickup': {
      const o = await Order.findOne({ _id: orderId, ...mine(actor) }).lean();
      if (!o) throw AppError.notFound('Assignment not found.', 'NOT_ASSIGNED');
      const a = await DeliveryAssignment.findById(o.deliveryAssignmentId).lean();
      if (a?.status !== 'ACCEPTED') throw AppError.conflict('INVALID_ORDER_TRANSITION', 'Accept the delivery before confirming pickup.');
      const updated = await transition(actor, orderId, ['ASSIGNED'], 'PICKED_UP', { match: mine(actor) });
      await DeliveryAssignment.updateOne({ _id: a._id }, { status: 'PICKED_UP', pickedUpAt: new Date() });
      await tellCustomer(updated);
      return updated;
    }
    case 'out-for-delivery': {
      const o = await transition(actor, orderId, ['PICKED_UP'], 'OUT_FOR_DELIVERY', { match: mine(actor) });
      await issueOtp(o);
      await tellCustomer(o);
      return o;
    }
    case 'regenerate-otp': {
      const o = await Order.findOne({ _id: orderId, ...mine(actor), status: 'OUT_FOR_DELIVERY' }).lean();
      if (!o) throw AppError.conflict('INVALID_ORDER_TRANSITION', 'A new code can only be issued while out for delivery.');
      const recent = await DeliveryOtp.countDocuments({ orderId, createdAt: { $gt: new Date(Date.now() - 60_000) } });
      if (recent) throw new AppError('RATE_LIMITED', 429, 'Please wait a minute before requesting a new code.');
      await issueOtp(o as OrderRow);
      await notify(o.customerId, { type: 'order.otp', title: 'New delivery code', message: `${o.orderNumber}: open the order to see your new code.`, orderId: o._id });
      await audit(actor, 'delivery.otp_regenerated', o._id);
      return o as OrderRow;
    }
    case 'verify-otp':
      return completeDelivery(actor, orderId, { otp: body.otp ?? '', cashCollected: body.cashCollected });
    default:
      throw new AppError('VALIDATION_ERROR', 400, 'Unknown action.');
  }
}

async function issueOtp(o: OrderRow) {
  await DeliveryOtp.updateMany({ orderId: o._id, verifiedAt: null }, { expiresAt: new Date() }); // retire older codes
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const expiresAt = new Date(Date.now() + config().OTP_TTL_SECONDS * 1000);
  await DeliveryOtp.create({
    orderId: o._id,
    customerId: o.customerId,
    partnerId: o.partnerId ?? undefined,
    otpHash: hashOtp(o._id, code),
    otpCipher: encryptOtp(code),
    expiresAt,
    purgeAt: new Date(expiresAt.getTime() + 24 * 3600_000),
  });
}

/** DELIVERED only after a valid code — or an audited admin override (docs/SECURITY.md §6). */
async function completeDelivery(actor: Actor, orderId: string, input: { otp?: string; cashCollected?: boolean; override?: string }) {
  const match = input.override ? {} : mine(actor);
  const o = await Order.findOne({ _id: orderId, ...match }).lean();
  if (!o) throw AppError.notFound('Assignment not found.', input.override ? 'ORDER_NOT_FOUND' : 'NOT_ASSIGNED');
  if (o.status !== 'OUT_FOR_DELIVERY') throw AppError.conflict('INVALID_ORDER_TRANSITION', 'This order is not out for delivery.');

  if (!input.override) {
    if (!/^\d{6}$/.test(input.otp ?? '')) throw new AppError('VALIDATION_ERROR', 400, 'Enter the 6-digit code from the customer.');
    if (o.paymentMethod === 'COD' && o.paymentStatus !== 'PAID' && input.cashCollected !== true) {
      throw new AppError('VALIDATION_ERROR', 400, 'Collect the cash and confirm it before completing this delivery.');
    }
    const max = config().OTP_MAX_ATTEMPTS;
    const otp = await DeliveryOtp.findOne({ orderId, verifiedAt: null }).sort({ createdAt: -1 }).select('+otpHash');
    if (!otp || otp.expiresAt < new Date()) throw new AppError('OTP_EXPIRED', 410, 'This code has expired. Request a new code for the customer.');
    if (otp.failedAttempts >= max) throw new AppError('OTP_LOCKED', 429, 'Too many wrong codes. Request a new code or call the kitchen.');
    const ok = timingSafeEqual(Buffer.from(otp.otpHash, 'hex'), Buffer.from(hashOtp(orderId, input.otp!), 'hex'));
    if (!ok) {
      const after = await DeliveryOtp.findOneAndUpdate({ _id: otp._id }, { $inc: { failedAttempts: 1 } }, { new: true });
      const left = Math.max(0, max - (after?.failedAttempts ?? max));
      await audit(actor, 'delivery.otp_failed', o._id, undefined, undefined, undefined, { attemptsRemaining: left });
      throw new AppError(left ? 'OTP_INVALID' : 'OTP_LOCKED', left ? 422 : 429, left ? `That code is wrong. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Too many wrong codes. Request a new code or call the kitchen.', { attemptsRemaining: left });
    }
    // Single use: only one request can flip verifiedAt (replay protection).
    const claimed = await DeliveryOtp.updateOne({ _id: otp._id, verifiedAt: null }, { verifiedAt: new Date() });
    if (!claimed.modifiedCount) throw AppError.conflict('INVALID_ORDER_TRANSITION', 'This order was already delivered.');
  }

  const cod = o.paymentMethod === 'COD' && o.paymentStatus !== 'PAID';
  const updated = await transition(actor, orderId, ['OUT_FOR_DELIVERY'], 'DELIVERED', {
    match,
    set: cod && (input.cashCollected || input.override) ? { paymentStatus: 'PAID', cashCollectedAt: new Date() } : {},
    reason: input.override,
  });
  if (cod && (input.cashCollected || input.override)) await Payment.updateMany({ orderId }, { status: 'PAID', paidAt: new Date() });
  await DeliveryAssignment.updateOne({ _id: o.deliveryAssignmentId }, { status: 'COMPLETED', completedAt: new Date() });
  if (input.override) await audit(actor, 'delivery.admin_override', o._id, 'OUT_FOR_DELIVERY', 'DELIVERED', input.override);
  await tellCustomer(updated);
  await notifyAdmins({ type: 'order.delivered', title: 'Delivered', message: updated.orderNumber, orderId: updated._id });
  return updated;
}

// ---------------------------------------------------------------- queries
export async function listForCustomer(actor: Actor) {
  const rows = await Order.find({ customerId: actor.userId }).sort({ createdAt: -1 }).limit(50).lean();
  return Promise.all(rows.map((o) => toOrderDto(o, 'CUSTOMER')));
}

export async function getForCustomer(actor: Actor, id: string) {
  const o = isValidObjectId(id) ? await Order.findOne({ _id: id, customerId: actor.userId }).lean() : null;
  if (!o) throw AppError.notFound('Order not found.', 'ORDER_NOT_FOUND');
  return toOrderDto(o, 'CUSTOMER', { withOtp: true });
}

export async function listForAdmin(q: { status?: string; search?: string; customerId?: string; partnerId?: string; page: number; limit: number }) {
  const filter: Record<string, unknown> = {};
  if (q.status === 'ACTIVE') filter.status = { $in: ['PLACED', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', ...ACTIVE_DELIVERY] };
  else if (q.status) filter.status = q.status;
  if (q.search) filter.orderNumber = { $regex: q.search.replace(/[^\w-]/g, ''), $options: 'i' };
  if (q.customerId) filter.customerId = q.customerId;
  if (q.partnerId) filter.partnerId = q.partnerId;
  const [rows, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    Order.countDocuments(filter),
  ]);
  return { items: await Promise.all(rows.map((o) => toOrderDto(o, 'ADMIN'))), meta: { page: q.page, limit: q.limit, total } };
}

export async function getForAdmin(id: string) {
  const o = isValidObjectId(id) ? await Order.findById(id).lean() : null;
  if (!o) throw AppError.notFound('Order not found.', 'ORDER_NOT_FOUND');
  return toOrderDto(o, 'ADMIN');
}

export async function adminSummary(): Promise<AdminSummaryDto> {
  const since = startOfTodayIST();
  const dayBefore = new Date(since.getTime() - 24 * 3600_000);
  const [recent, liveOrders] = await Promise.all([
    Order.find({ createdAt: { $gte: dayBefore } }).select('status paymentStatus totalPaise createdAt').lean(),
    Order.countDocuments({ status: { $in: ['PLACED', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', ...ACTIVE_DELIVERY] } }),
  ]);
  const today = recent.filter((o) => o.createdAt >= since);
  const yday = recent.filter((o) => o.createdAt < since);
  const byStatus: AdminSummaryDto['byStatus'] = {};
  for (const o of today) byStatus[o.status as OrderStatus] = (byStatus[o.status as OrderStatus] ?? 0) + 1;
  // Revenue counts only money actually received (no failed, pending or refunded payments).
  const revenue = (list: typeof recent) => list.filter((o) => o.paymentStatus === 'PAID').reduce((s, o) => s + o.totalPaise, 0);
  return {
    ordersToday: today.length,
    revenueTodayPaise: revenue(today),
    byStatus,
    liveOrders,
    yesterday: {
      orders: yday.length,
      revenuePaise: revenue(yday),
      delivered: yday.filter((o) => o.status === 'DELIVERED').length,
      cancelled: yday.filter((o) => o.status === 'CANCELLED' || o.status === 'REJECTED').length,
    },
  };
}

export async function listForPartner(actor: Actor, scope: 'active' | 'history') {
  if (scope === 'history') return partnerHistory(actor);
  const rows = await Order.find({ partnerId: actor.userId, status: { $in: ACTIVE_DELIVERY } })
    .sort({ updatedAt: -1 })
    .limit(10)
    .lean();
  return Promise.all(rows.map((o) => toOrderDto(o, 'DELIVERY_PARTNER')));
}

type PartnerOutcome = 'DELIVERED' | 'CANCELLED' | 'DECLINED';

/**
 * The partner's past runs, newest first, each tagged with what happened for THIS partner:
 * DELIVERED, CANCELLED (order cancelled while it was theirs) or DECLINED (they turned it down;
 * the order itself moved on to someone else).
 */
async function partnerHistory(actor: Actor) {
  const [assignments, own] = await Promise.all([
    DeliveryAssignment.find({ partnerId: actor.userId, status: { $in: ['DECLINED', 'CANCELLED'] } })
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean(),
    Order.find({ partnerId: actor.userId, status: { $in: ['DELIVERED', 'CANCELLED'] } })
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean(),
  ]);
  const entries = new Map<string, { order: (typeof own)[number]; outcome: PartnerOutcome; at: Date }>();
  for (const o of own) {
    const outcome: PartnerOutcome = o.status === 'DELIVERED' ? 'DELIVERED' : 'CANCELLED';
    entries.set(String(o._id), { order: o, outcome, at: (o.deliveredAt ?? o.updatedAt) as Date });
  }
  const missing = assignments.filter((a) => !entries.has(String(a.orderId)));
  const others = missing.length
    ? await Order.find({ _id: { $in: missing.map((a) => a.orderId) } }).lean()
    : [];
  const byId = new Map(others.map((o) => [String(o._id), o]));
  for (const a of missing) {
    const o = byId.get(String(a.orderId));
    if (!o || entries.has(String(o._id))) continue;
    const outcome: PartnerOutcome = a.status === 'DECLINED' ? 'DECLINED' : 'CANCELLED';
    entries.set(String(o._id), { order: o, outcome, at: (a.declinedAt ?? a.updatedAt) as Date });
  }
  const sorted = [...entries.values()].sort((x, y) => y.at.getTime() - x.at.getTime()).slice(0, 50);
  return Promise.all(
    sorted.map(async ({ order, outcome, at }) => ({
      ...(await toOrderDto(order, 'DELIVERY_PARTNER')),
      partnerOutcome: outcome,
      partnerOutcomeAt: at.toISOString(),
    })),
  );
}

export async function getForPartner(actor: Actor, id: string) {
  const o = isValidObjectId(id) ? await Order.findOne({ _id: id, partnerId: actor.userId }).lean() : null;
  if (!o) throw AppError.notFound('Assignment not found.', 'NOT_ASSIGNED');
  return toOrderDto(o, 'DELIVERY_PARTNER');
}

export async function partnerProfile(actor: Actor): Promise<DeliveryProfileDto> {
  const [user, profile, todayDelivered] = await Promise.all([
    User.findById(actor.userId).lean(),
    DeliveryPartnerProfile.findOne({ userId: actor.userId }).lean(),
    Order.countDocuments({ partnerId: actor.userId, status: 'DELIVERED', deliveredAt: { $gte: startOfTodayIST() } }),
  ]);
  if (!user) throw AppError.notFound('Account not found.');
  return {
    id: String(user._id),
    name: user.name,
    ...(user.email ? { email: user.email } : {}),
    phone: user.phone,
    availability: (profile?.availability ?? 'OFFLINE') as DeliveryProfileDto['availability'],
    ...(profile?.vehicleType ? { vehicleType: profile.vehicleType } : {}),
    ...(profile?.vehicleNumber ? { vehicleNumber: profile.vehicleNumber } : {}),
    todayDelivered,
    ...(profile?.bank?.accountNumber && profile.bank.holderName && profile.bank.ifsc
      ? {
          bank: {
            holderName: profile.bank.holderName,
            accountLast4: profile.bank.accountNumber.slice(-4),
            ifsc: profile.bank.ifsc,
            ...(profile.bank.upiId ? { upiId: profile.bank.upiId } : {}),
          },
        }
      : {}),
  };
}

/** Partner-editable profile fields. Phone and email are sign-in identifiers, so they stay as-is here. */
export async function updatePartnerProfile(
  actor: Actor,
  body: { name?: string; vehicleType?: string; vehicleNumber?: string },
) {
  if (body.name) await User.updateOne({ _id: actor.userId }, { name: body.name });
  const set: Record<string, string> = {};
  if (body.vehicleType !== undefined) set.vehicleType = body.vehicleType;
  if (body.vehicleNumber !== undefined) set.vehicleNumber = body.vehicleNumber;
  if (Object.keys(set).length) await DeliveryPartnerProfile.updateOne({ userId: actor.userId }, { $set: set }, { upsert: true });
  return partnerProfile(actor);
}

export async function updatePartnerBank(
  actor: Actor,
  body: { holderName: string; accountNumber: string; ifsc: string; upiId?: string },
) {
  await DeliveryPartnerProfile.updateOne(
    { userId: actor.userId },
    { $set: { bank: { ...body, updatedAt: new Date() } } },
    { upsert: true },
  );
  return partnerProfile(actor);
}

/**
 * Weekly (Mon–Sun, IST) earnings statements for the last [weeks] weeks, newest first.
 * Built from delivered orders — there is no separate payout ledger yet.
 */
export async function partnerWeeklyStatements(actor: Actor, weeks = 12): Promise<PartnerWeeklyStatementDto[]> {
  const IST = 5.5 * 3600_000;
  const DAY = 24 * 3600_000;
  const today = startOfTodayIST();
  const dow = (new Date(today.getTime() + IST).getUTCDay() + 6) % 7; // 0 = Monday
  const thisWeek = new Date(today.getTime() - dow * DAY);
  const since = new Date(thisWeek.getTime() - (weeks - 1) * 7 * DAY);
  const rows = await Order.find({ partnerId: actor.userId, status: 'DELIVERED', deliveredAt: { $gte: since } })
    .select('deliveredAt deliveryFeePaise totalPaise paymentMethod cashCollectedAt')
    .lean();
  const out: PartnerWeeklyStatementDto[] = [];
  for (let i = 0; i < weeks; i++) {
    const start = new Date(thisWeek.getTime() - i * 7 * DAY);
    const end = new Date(start.getTime() + 7 * DAY);
    const list = rows.filter((o) => o.deliveredAt && o.deliveredAt >= start && o.deliveredAt < end);
    if (!list.length && i > 0) continue;
    out.push({
      weekStart: start.toISOString(),
      weekEnd: end.toISOString(),
      current: i === 0,
      deliveredCount: list.length,
      earningsPaise: list.reduce((s, o) => s + (o.deliveryFeePaise ?? 0), 0),
      codCashCollectedPaise: list.reduce(
        (s, o) => s + (o.paymentMethod === 'COD' && o.cashCollectedAt ? o.totalPaise : 0),
        0,
      ),
    });
  }
  return out;
}

/**
 * Partner earnings = delivery fees of orders they delivered (no separate payout model yet).
 * Cash remittance isn't tracked yet, so "unremitted" is the COD cash collected today
 * (settled with the kitchen daily).
 */
export async function partnerEarnings(actor: Actor) {
  const today = startOfTodayIST();
  const week = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
  // Calendar month in IST (1st of this month, 00:00 IST).
  const ist = new Date(today.getTime() + 5.5 * 3600_000);
  const month = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1) - 5.5 * 3600_000);
  const since = month < week ? month : week;
  const [rows, totalDelivered] = await Promise.all([
    Order.find({ partnerId: actor.userId, status: 'DELIVERED', deliveredAt: { $gte: since } })
      .select('deliveredAt deliveryFeePaise totalPaise paymentMethod cashCollectedAt')
      .lean(),
    Order.countDocuments({ partnerId: actor.userId, status: 'DELIVERED' }),
  ]);
  const cash = (o: (typeof rows)[number]) => (o.paymentMethod === 'COD' && o.cashCollectedAt ? o.totalPaise : 0);
  const summarise = (list: typeof rows) => ({
    deliveredCount: list.length,
    earningsPaise: list.reduce((s, o) => s + (o.deliveryFeePaise ?? 0), 0),
    codCashCollectedPaise: list.reduce((s, o) => s + cash(o), 0),
  });
  const from = (d: Date) => rows.filter((o) => o.deliveredAt && o.deliveredAt >= d);
  const todaySummary = summarise(from(today));
  return {
    today: todaySummary,
    week: summarise(from(week)),
    month: summarise(from(month)),
    totalDelivered,
    unremittedCashPaise: todaySummary.codCashCollectedPaise,
  };
}

export async function setAvailability(actor: Actor, availability: 'ONLINE' | 'OFFLINE') {
  if (availability === 'OFFLINE' && (await activeCount(actor.userId)) > 0) {
    throw AppError.conflict('PARTNER_BUSY', 'Finish your current delivery before going offline.');
  }
  await DeliveryPartnerProfile.updateOne({ userId: actor.userId }, { availability, lastSeenAt: new Date() }, { upsert: true });
  return partnerProfile(actor);
}

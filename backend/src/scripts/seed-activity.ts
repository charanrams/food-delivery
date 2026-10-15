import type { OrderStatus, PaymentStatus } from '@a3/contracts';
import { Counter, DeliveryAssignment, DeliveryPartnerProfile, Order, Payment, Product, User } from '../models';
import { hashPassword } from '../modules/auth/auth.service';
import { logger } from '../utils/logger';
import { SEED_PASSWORD } from './seed-data';

// Demo activity for dev only: extra customers & riders plus ~30 days of orders so the admin
// dashboard, reports and payments have something to show. Not used by tests.
const CUSTOMERS = [
  ['Priya Sharma', '9100000001', 'priya@example.com'],
  ['Arjun Mehta', '9100000002', 'arjun@example.com'],
  ['Kavya Reddy', '9100000003', 'kavya@example.com'],
  ['Rahul Verma', '9100000004', undefined],
  ['Sneha Iyer', '9100000005', 'sneha@example.com'],
  ['Vikram Rao', '9100000006', undefined],
  ['Ananya Das', '9100000007', 'ananya@example.com'],
  ['Mohammed Irfan', '9100000008', 'irfan@example.com'],
] as const;
const RIDERS = [
  ['Ramesh K.', '9200000001', 'ramesh.rider@example.com', 'Scooter', 'TS09EK4521', 'ONLINE'],
  ['Imran S.', '9200000002', 'imran.rider@example.com', 'Bike', 'TS07GH1180', 'ONLINE'],
] as const;
const STREETS = ['Plot 12, Madhapur', 'Flat 304, Kondapur', '8-2-293, Jubilee Hills', 'H.No 45, Gachibowli', '2nd Floor, Banjara Hills'];
const PINS = ['500081', '500084', '500033', '500032', '500034'];

// Tiny deterministic PRNG so every boot shows the same demo data.
let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = <T>(a: readonly T[]) => a[Math.floor(rand() * a.length)]!;

const IST = 5.5 * 3600_000;
const istKey = (d: Date) => new Date(d.getTime() + IST).toISOString().slice(0, 10).replaceAll('-', '');

export async function seedDemoActivity(): Promise<void> {
  if (await Order.exists({})) return;
  const passwordHash = await hashPassword(SEED_PASSWORD);

  const customers: { _id: unknown; name: string; phone: string }[] = await User.insertMany(
    CUSTOMERS.map(([name, phone, email], i) => ({ name, phone: `+91${phone}`, ...(email && { email }), role: 'CUSTOMER', passwordHash, createdAt: new Date(Date.now() - (40 - i * 4) * 86_400_000) })),
  );
  const seeded = await User.findOne({ email: 'customer@a3kitchen.in' });
  if (seeded) customers.push(seeded);

  const riders = await User.insertMany(RIDERS.map(([name, phone, email]) => ({ name, phone: `+91${phone}`, email, role: 'DELIVERY_PARTNER', passwordHash })));
  await DeliveryPartnerProfile.insertMany(riders.map((r, i) => ({ userId: r._id, availability: RIDERS[i]![5], vehicleType: RIDERS[i]![3], vehicleNumber: RIDERS[i]![4] })));
  const admin = await User.findOne({ role: 'ADMIN' });
  const products = await Product.find({ isArchived: { $ne: true } }).lean();

  const now = Date.now();
  const perDay = new Map<string, number>();
  const orders: Record<string, unknown>[] = [];

  const makeOrder = (createdAt: Date, status: OrderStatus, paymentMethod: 'COD' | 'RAZORPAY', paymentStatus: PaymentStatus, extra: Record<string, unknown> = {}) => {
    const customer = pick(customers);
    const items = Array.from({ length: 1 + Math.floor(rand() * 3) }, () => {
      const p = pick(products);
      const v = p.variants?.length ? pick(p.variants) : undefined;
      const unit = v?.pricePaise ?? p.pricePaise;
      const quantity = 1 + Math.floor(rand() * 2);
      return { productId: p._id, productName: p.name, imageUrl: p.images?.[0], ...(v && { variantName: v.name }), quantity, unitPricePaise: unit, lineTotalPaise: unit * quantity };
    });
    const subtotal = items.reduce((s, i) => s + i.lineTotalPaise, 0);
    const fee = subtotal >= 49900 ? 0 : 3900;
    const tax = Math.round(subtotal * 0.05);
    const key = istKey(createdAt);
    const seq = (perDay.get(key) ?? 0) + 1;
    perDay.set(key, seq);
    const at = (mins: number) => new Date(createdAt.getTime() + mins * 60_000);
    const i = Math.floor(rand() * STREETS.length);
    const reached = (s: OrderStatus) => ORDER.indexOf(status) >= ORDER.indexOf(s) && status !== 'CANCELLED' && status !== 'REJECTED';
    orders.push({
      orderNumber: `A3-${key}-${String(seq).padStart(4, '0')}`,
      customerId: customer._id,
      items,
      deliveryAddress: { recipientName: customer.name, phone: customer.phone, line1: STREETS[i], city: 'Hyderabad', state: 'Telangana', postalCode: PINS[i] },
      subtotalPaise: subtotal,
      deliveryFeePaise: fee,
      taxPaise: tax,
      totalPaise: subtotal + fee + tax,
      status,
      paymentMethod,
      paymentStatus,
      createdAt,
      updatedAt: createdAt,
      ...(reached('ACCEPTED') && { acceptedAt: at(2) }),
      ...(reached('PREPARING') && { preparingAt: at(4) }),
      ...(reached('READY_FOR_PICKUP') && { readyAt: at(22) }),
      ...(reached('ASSIGNED') && { assignedAt: at(24) }),
      ...(reached('PICKED_UP') && { pickedUpAt: at(30) }),
      ...(reached('OUT_FOR_DELIVERY') && { outForDeliveryAt: at(31) }),
      ...(status === 'DELIVERED' && { deliveredAt: at(52), ...(paymentMethod === 'COD' && { cashCollectedAt: at(52) }) }),
      ...extra,
    });
  };

  // History: last 30 days, busier on weekends.
  for (let d = 30; d >= 1; d--) {
    const day = new Date(now - d * 86_400_000);
    const count = 3 + Math.floor(rand() * 5) + (new Date(day.getTime() + IST).getUTCDay() % 6 === 0 ? 3 : 0);
    for (let n = 0; n < count; n++) {
      const createdAt = new Date(day.getTime() - (day.getTime() % 86_400_000) + (6 + n * 1.3 + rand()) * 3600_000);
      const online = rand() < 0.55;
      const r = rand();
      if (r < 0.06) makeOrder(createdAt, 'CANCELLED', online ? 'RAZORPAY' : 'COD', online ? 'REFUNDED' : 'PENDING', { cancelledAt: createdAt, cancellationReason: 'Customer asked to cancel' });
      else if (r < 0.09) makeOrder(createdAt, 'REJECTED', online ? 'RAZORPAY' : 'COD', online ? 'REFUNDED' : 'PENDING', { rejectedAt: createdAt, rejectionReason: 'Item sold out for the day' });
      else makeOrder(createdAt, 'DELIVERED', online ? 'RAZORPAY' : 'COD', 'PAID');
    }
  }

  // Today: a live queue in every stage.
  const ago = (m: number) => new Date(now - m * 60_000);
  makeOrder(ago(95), 'DELIVERED', 'RAZORPAY', 'PAID');
  makeOrder(ago(80), 'DELIVERED', 'COD', 'PAID');
  makeOrder(ago(70), 'CANCELLED', 'RAZORPAY', 'REFUND_PENDING', { cancelledAt: ago(65), cancellationReason: 'Kitchen ran out of mutton' });
  makeOrder(ago(40), 'OUT_FOR_DELIVERY', 'COD', 'PENDING');
  makeOrder(ago(26), 'READY_FOR_PICKUP', 'RAZORPAY', 'PAID');
  makeOrder(ago(18), 'PREPARING', 'COD', 'PENDING');
  makeOrder(ago(12), 'ACCEPTED', 'RAZORPAY', 'PAID');
  makeOrder(ago(5), 'PLACED', 'COD', 'PENDING');
  makeOrder(ago(2), 'PLACED', 'RAZORPAY', 'PAID');

  // Raw insert keeps the back-dated createdAt values (mongoose would stamp "now").
  await Order.collection.insertMany(orders);
  const docs = await Order.find({}).lean();

  // The rider on the road is busy; the other one stays free so "Assign partner" works.
  const onRoad = docs.find((o) => o.status === 'OUT_FOR_DELIVERY');
  if (onRoad && admin) {
    const a = await DeliveryAssignment.create({ orderId: onRoad._id, partnerId: riders[1]!._id, status: 'PICKED_UP', assignedBy: admin._id, assignedAt: onRoad.assignedAt ?? undefined, acceptedAt: onRoad.assignedAt ?? undefined, pickedUpAt: onRoad.pickedUpAt ?? undefined });
    await Order.updateOne({ _id: onRoad._id }, { partnerId: riders[1]!._id, deliveryAssignmentId: (a as { _id: unknown })._id });
  }
  await Payment.insertMany(
    docs
      .filter((o) => o.paymentMethod === 'RAZORPAY')
      .map((o, i) => ({
        orderId: o._id,
        customerId: o.customerId,
        provider: 'RAZORPAY',
        providerOrderId: `order_demo${String(i).padStart(6, '0')}`,
        providerPaymentId: `pay_demo${String(i).padStart(6, '0')}`,
        amountPaise: o.totalPaise,
        status: o.paymentStatus,
        paidAt: o.createdAt,
        ...(o.paymentStatus === 'REFUNDED' && { refundedAt: o.cancelledAt ?? o.rejectedAt ?? o.createdAt }),
      })),
  );
  await Promise.all([...perDay].map(([k, seq]) => Counter.updateOne({ _id: `order-${k}` }, { $max: { seq } }, { upsert: true })));

  logger.info({ orders: docs.length, customers: customers.length, riders: riders.length }, 'seeded demo orders (dev only)');
}

const ORDER: OrderStatus[] = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'];

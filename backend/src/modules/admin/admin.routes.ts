import { Router } from 'express';
import { z } from 'zod';
import { PAYMENT_STATUSES } from '@a3/contracts';
import { Address, AuditLog, Order, Payment, RefreshSession, Settings, User } from '../../models';
import { serviceableCodes, toAddressDto } from '../addresses/addresses';
import { actorOf, authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { AppError } from '../../utils/app-error';
import { ok } from '../../utils/http';
import { adminDashboard } from './dashboard';

/** Admin read models for customers, payments, reports and kitchen settings. */
export const adminInsightsRouter = Router();
adminInsightsRouter.use(authenticate, requireRole('ADMIN'));

adminInsightsRouter.get('/dashboard', async (_req, res) => {
  ok(res, await adminDashboard());
});

const IST = 5.5 * 3600_000;
const istDay = (d: Date) => new Date(d.getTime() + IST).toISOString().slice(0, 10);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------- Customers ----------
adminInsightsRouter.get(
  '/customers',
  validate({ query: z.object({ search: z.string().trim().max(60).optional() }) }),
  async (_req, res) => {
    const { search } = res.locals.query as { search?: string };
    const filter: Record<string, unknown> = { role: 'CUSTOMER' };
    if (search) {
      const rx = new RegExp(escape(search), 'i');
      filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
    }
    const users = await User.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    const stats = await Order.aggregate<{ _id: unknown; orders: number; spent: number; last: Date }>([
      { $match: { customerId: { $in: users.map((u) => u._id) } } },
      {
        $group: {
          _id: '$customerId',
          orders: { $sum: 1 },
          spent: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'PAID'] }, '$totalPaise', 0] } },
          last: { $max: '$createdAt' },
        },
      },
    ]);
    const byId = new Map(stats.map((s) => [String(s._id), s]));
    ok(
      res,
      users.map((u) => {
        const s = byId.get(String(u._id));
        return {
          id: String(u._id),
          name: u.name,
          email: u.email ?? undefined,
          phone: u.phone,
          status: u.status,
          joinedAt: u.createdAt,
          orders: s?.orders ?? 0,
          spentPaise: s?.spent ?? 0,
          lastOrderAt: s?.last,
        };
      }),
    );
  },
);

/** One customer: profile, order stats and saved addresses (their orders come from /admin/orders?customerId=). */
adminInsightsRouter.get('/customers/:id', validate({ params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }) }), async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'CUSTOMER' }).lean();
  if (!user) throw AppError.notFound('Customer not found.');
  const [stats, addresses, codes] = await Promise.all([
    Order.aggregate<{ orders: number; spent: number; delivered: number; cancelled: number; first?: Date; last?: Date }>([
      { $match: { customerId: user._id } },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          spent: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'PAID'] }, '$totalPaise', 0] } },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $in: ['$status', ['CANCELLED', 'REJECTED']] }, 1, 0] } },
          first: { $min: '$createdAt' },
          last: { $max: '$createdAt' },
        },
      },
    ]),
    Address.find({ userId: user._id }).sort({ isDefault: -1, updatedAt: -1 }).lean(),
    serviceableCodes(),
  ]);
  const s = stats[0];
  ok(res, {
    id: String(user._id),
    name: user.name,
    email: user.email ?? undefined,
    phone: user.phone,
    status: user.status,
    joinedAt: user.createdAt,
    orders: s?.orders ?? 0,
    spentPaise: s?.spent ?? 0,
    delivered: s?.delivered ?? 0,
    cancelled: s?.cancelled ?? 0,
    averageOrderPaise: s?.orders ? Math.round((s.spent ?? 0) / Math.max(1, s.delivered || s.orders)) : 0,
    firstOrderAt: s?.first,
    lastOrderAt: s?.last,
    addresses: addresses.map((a) => toAddressDto(a, codes)),
  });
});

adminInsightsRouter.patch(
  '/customers/:id/status',
  validate({ params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }), body: z.object({ status: z.enum(['ACTIVE', 'SUSPENDED']) }) }),
  async (req, res) => {
    const actor = actorOf(req);
    const user = await User.findOneAndUpdate({ _id: req.params.id, role: 'CUSTOMER' }, { status: req.body.status }, { returnDocument: 'after' }).lean();
    if (!user) throw AppError.notFound('Customer not found.');
    if (user.status === 'SUSPENDED') await RefreshSession.updateMany({ userId: user._id, revokedAt: null }, { revokedAt: new Date() });
    await AuditLog.create({ actorId: actor.userId, actorRole: actor.role, action: 'customer.status', entityType: 'User', entityId: user._id, to: req.body.status });
    ok(res, { id: String(user._id), status: user.status });
  },
);

// ---------- Payments ----------
adminInsightsRouter.get(
  '/payments',
  validate({ query: z.object({ status: z.enum(PAYMENT_STATUSES).optional() }) }),
  async (_req, res) => {
    const { status } = res.locals.query as { status?: (typeof PAYMENT_STATUSES)[number] };
    const orders = await Order.find(status ? { paymentStatus: status } : {})
      .sort({ createdAt: -1 })
      .limit(200)
      .select('orderNumber customerId paymentMethod paymentStatus totalPaise createdAt status')
      .lean();
    const [customers, payments] = await Promise.all([
      User.find({ _id: { $in: orders.map((o) => o.customerId) } }).select('name').lean(),
      Payment.find({ orderId: { $in: orders.map((o) => o._id) } }).select('orderId providerPaymentId paidAt refundedAt').lean(),
    ]);
    const names = new Map(customers.map((c) => [String(c._id), c.name]));
    const pay = new Map(payments.map((p) => [String(p.orderId), p]));
    ok(
      res,
      orders.map((o) => {
        const p = pay.get(String(o._id));
        return {
          orderId: String(o._id),
          orderNumber: o.orderNumber,
          customer: names.get(String(o.customerId)) ?? 'Customer',
          method: o.paymentMethod,
          status: o.paymentStatus,
          orderStatus: o.status,
          amountPaise: o.totalPaise,
          providerPaymentId: p?.providerPaymentId,
          createdAt: o.createdAt,
          paidAt: p?.paidAt,
          refundedAt: p?.refundedAt,
        };
      }),
    );
  },
);

// ---------- Reports ----------
adminInsightsRouter.get(
  '/reports',
  validate({ query: z.object({ days: z.coerce.number().int().min(1).max(90).default(7) }) }),
  async (_req, res) => {
    const { days } = res.locals.query as { days: number };
    const todayStart = new Date(Date.parse(istDay(new Date())) - IST);
    const since = new Date(todayStart.getTime() - (days - 1) * 86_400_000);
    const orders = await Order.find({ createdAt: { $gte: since } }).select('status paymentStatus totalPaise items createdAt').lean();

    const daily = new Map<string, { date: string; orders: number; revenuePaise: number }>();
    for (let i = 0; i < days; i++) {
      const d = istDay(new Date(since.getTime() + i * 86_400_000));
      daily.set(d, { date: d, orders: 0, revenuePaise: 0 });
    }
    const dishes = new Map<string, { name: string; quantity: number; revenuePaise: number }>();
    let revenue = 0;
    let delivered = 0;
    let cancelled = 0;
    for (const o of orders) {
      const row = daily.get(istDay(o.createdAt));
      if (row) row.orders++;
      if (o.status === 'DELIVERED') delivered++;
      if (o.status === 'CANCELLED' || o.status === 'REJECTED') cancelled++;
      if (o.paymentStatus !== 'PAID') continue;
      revenue += o.totalPaise;
      if (row) row.revenuePaise += o.totalPaise;
      for (const i of o.items) {
        const d = dishes.get(i.productName) ?? { name: i.productName, quantity: 0, revenuePaise: 0 };
        d.quantity += i.quantity;
        d.revenuePaise += i.lineTotalPaise;
        dishes.set(i.productName, d);
      }
    }
    const paidCount = orders.filter((o) => o.paymentStatus === 'PAID').length;
    ok(res, {
      days,
      orders: orders.length,
      revenuePaise: revenue,
      averageOrderPaise: paidCount ? Math.round(revenue / paidCount) : 0,
      delivered,
      cancelled,
      daily: [...daily.values()],
      topDishes: [...dishes.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 8),
    });
  },
);

// ---------- Settings ----------
const toSettings = (s: Record<string, unknown> | null) => ({
  isAcceptingOrders: (s?.isAcceptingOrders as boolean | undefined) ?? true,
  deliveryFeePaise: (s?.deliveryFeePaise as number | undefined) ?? 0,
  freeDeliveryAbovePaise: (s?.freeDeliveryAbovePaise as number | undefined) ?? undefined,
  taxRateBps: (s?.taxRateBps as number | undefined) ?? 500,
  serviceablePostalCodes: (s?.serviceablePostalCodes as string[] | undefined) ?? [],
  kitchenHours: ((s?.kitchenHours as { day: number; open: string; close: string }[] | undefined) ?? []).map(({ day, open, close }) => ({ day, open, close })),
});

adminInsightsRouter.get('/settings', async (_req, res) => {
  ok(res, toSettings(await Settings.findById('kitchen').lean()));
});

const hhmm = z.string().regex(/^\d{2}:\d{2}$/);
adminInsightsRouter.patch(
  '/settings',
  validate({
    body: z
      .object({
        isAcceptingOrders: z.boolean(),
        deliveryFeePaise: z.number().int().min(0).max(100_000),
        freeDeliveryAbovePaise: z.number().int().min(0).max(10_000_000).nullable(),
        taxRateBps: z.number().int().min(0).max(5_000),
        serviceablePostalCodes: z.array(z.string().regex(/^\d{6}$/, 'PIN codes have 6 digits')).max(200),
        kitchenHours: z.array(z.object({ day: z.number().int().min(0).max(6), open: hhmm, close: hhmm })).max(7),
      })
      .partial()
      .strict(),
  }),
  async (req, res) => {
    const actor = actorOf(req);
    const { freeDeliveryAbovePaise, ...rest } = req.body as Record<string, unknown>;
    const update: Record<string, unknown> = { $set: rest };
    if (freeDeliveryAbovePaise === null) update.$unset = { freeDeliveryAbovePaise: 1 };
    else if (freeDeliveryAbovePaise !== undefined) (update.$set as Record<string, unknown>).freeDeliveryAbovePaise = freeDeliveryAbovePaise;
    const s = await Settings.findByIdAndUpdate('kitchen', update, { returnDocument: 'after', upsert: true, runValidators: true }).lean();
    await AuditLog.create({ actorId: actor.userId, actorRole: actor.role, action: 'settings.update', entityType: 'Settings', entityId: actor.userId, metadata: { fields: Object.keys(req.body) } });
    ok(res, toSettings(s as Record<string, unknown>));
  },
);

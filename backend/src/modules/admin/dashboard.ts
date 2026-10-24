import type { AdminDashboardDto, OrderStatus } from '@a3/contracts';
import { AuditLog, Category, DeliveryPartnerProfile, Order, Payment, Product, User } from '../../models';

const DAY = 24 * 3600_000;
const IST = 5.5 * 3600_000;

/** Start of the IST day `daysAgo` days back (0 = today). */
function istDayStart(daysAgo = 0): Date {
  const ist = new Date(Date.now() + IST);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - IST - daysAgo * DAY);
}

const IN_KITCHEN: OrderStatus[] = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP'];
const ON_THE_ROAD: OrderStatus[] = ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'];
const LIVE: OrderStatus[] = [...IN_KITCHEN, ...ON_THE_ROAD];
const VOID: OrderStatus[] = ['CANCELLED', 'REJECTED'];

/** Everything the admin Dashboard shows, in one round trip (all times IST). */
export async function adminDashboard(): Promise<AdminDashboardDto> {
  const today = istDayStart(0);
  const yesterday = istDayStart(1);
  const weekStart = istDayStart(6);
  const monthAgo = new Date(today.getTime() - 29 * DAY);

  const [week, live, partners, recent, newest, activity, refunds, month] = await Promise.all([
    Order.find({ createdAt: { $gte: weekStart } })
      .select('createdAt deliveredAt status totalPaise paymentMethod paymentStatus cashCollectedAt items')
      .lean(),
    Order.find({ status: { $in: LIVE } }).select('status partnerId').lean(),
    DeliveryPartnerProfile.find().select('userId availability').lean(),
    Order.find().sort({ createdAt: -1 }).limit(6).select('orderNumber customerId items totalPaise status createdAt').lean(),
    User.find({ role: 'CUSTOMER' }).sort({ createdAt: -1 }).limit(5).select('name createdAt').lean(),
    AuditLog.find().sort({ createdAt: -1 }).limit(7).select('action entityType to actorId createdAt').lean(),
    Payment.find({ status: 'REFUND_PENDING' }).select('amountPaise').lean(),
    // 30-day sales by product (for top categories).
    Order.aggregate<{ _id: unknown; quantity: number }>([
      { $match: { createdAt: { $gte: monthAgo }, status: { $nin: VOID } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.productId', quantity: { $sum: '$items.quantity' } } },
    ]),
  ]);

  // ---- KPIs
  const isPaid = (o: { paymentStatus?: string }) => o.paymentStatus === 'PAID';
  const todays = week.filter((o) => o.createdAt >= today);
  const yesterdays = week.filter((o) => o.createdAt >= yesterday && o.createdAt < today);
  const deliveredToday = week.filter((o) => o.status === 'DELIVERED' && o.deliveredAt && o.deliveredAt >= today);
  const minutes = deliveredToday.map((o) => ((o.deliveredAt as Date).getTime() - o.createdAt.getTime()) / 60_000);
  const busyRiders = new Set(live.filter((o) => ON_THE_ROAD.includes(o.status as OrderStatus) && o.partnerId).map((o) => String(o.partnerId)));
  const online = partners.filter((p) => p.availability === 'ONLINE');

  // ---- 7-day trend
  const trend = Array.from({ length: 7 }, (_, i) => {
    const from = istDayStart(6 - i);
    const to = new Date(from.getTime() + DAY);
    const day = week.filter((o) => o.createdAt >= from && o.createdAt < to);
    return {
      date: new Date(from.getTime() + IST).toISOString().slice(0, 10),
      orders: day.length,
      revenuePaise: day.filter(isPaid).reduce((s, o) => s + o.totalPaise, 0),
    };
  });

  // ---- best sellers (7 days) + top categories (30 days)
  const weekQty = new Map<string, number>();
  for (const o of week) {
    if (VOID.includes(o.status as OrderStatus)) continue;
    for (const it of o.items ?? []) weekQty.set(String(it.productId), (weekQty.get(String(it.productId)) ?? 0) + it.quantity);
  }
  const productIds = [...new Set([...weekQty.keys(), ...month.map((m) => String(m._id))])];
  const products = await Product.find({ _id: { $in: productIds } }).select('name images pricePaise categoryId').lean();
  const productById = new Map(products.map((p) => [String(p._id), p]));
  const bestSellers = [...weekQty.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .flatMap(([id, quantity]) => {
      const p = productById.get(id) as { name: string; images?: string[]; pricePaise?: number } | undefined;
      if (!p) return [];
      return [{ productId: id, name: p.name, ...(p.images?.[0] ? { imageUrl: p.images[0] } : {}), quantity, pricePaise: p.pricePaise ?? 0 }];
    });

  const byCategory = new Map<string, number>();
  for (const m of month) {
    const cat = (productById.get(String(m._id)) as { categoryId?: unknown } | undefined)?.categoryId;
    if (cat) byCategory.set(String(cat), (byCategory.get(String(cat)) ?? 0) + m.quantity);
  }
  const categories = await Category.find({ _id: { $in: [...byCategory.keys()] } }).select('name').lean();
  const totalQty = [...byCategory.values()].reduce((s, n) => s + n, 0) || 1;
  const topCategories = categories
    .map((c) => ({ name: c.name, quantity: byCategory.get(String(c._id)) ?? 0 }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 6)
    .map((c) => ({ ...c, percent: Math.round((c.quantity / totalQty) * 100) }));

  // ---- new customers with their order totals
  const customerStats = await Order.aggregate<{ _id: unknown; orders: number; spent: number }>([
    { $match: { customerId: { $in: newest.map((u) => u._id) }, status: { $nin: VOID } } },
    { $group: { _id: '$customerId', orders: { $sum: 1 }, spent: { $sum: '$totalPaise' } } },
  ]);
  const statsById = new Map(customerStats.map((c) => [String(c._id), c]));

  // ---- names for recent orders + activity
  const userIds = [...recent.map((o) => o.customerId), ...activity.map((a) => a.actorId)].filter(Boolean);
  const users = await User.find({ _id: { $in: userIds } }).select('name').lean();
  const nameById = new Map(users.map((u) => [String(u._id), u.name]));

  // ---- payments today
  const todayLive = todays.filter((o) => !VOID.includes(o.status as OrderStatus));
  const onlinePaise = todayLive.filter((o) => o.paymentMethod !== 'COD' && isPaid(o)).reduce((s, o) => s + o.totalPaise, 0);
  const codPaise = todayLive.filter((o) => o.paymentMethod === 'COD').reduce((s, o) => s + o.totalPaise, 0);
  // Cash remittance isn't tracked yet: cash riders collected today = cash still with riders.
  const cashWithRidersPaise = deliveredToday
    .filter((o) => o.paymentMethod === 'COD' && o.cashCollectedAt)
    .reduce((s, o) => s + o.totalPaise, 0);

  return {
    kpis: {
      ordersToday: todays.length,
      ordersYesterday: yesterdays.length,
      revenueTodayPaise: todays.filter(isPaid).reduce((s, o) => s + o.totalPaise, 0),
      revenueYesterdayPaise: yesterdays.filter(isPaid).reduce((s, o) => s + o.totalPaise, 0),
      liveOrders: live.length,
      newOrders: live.filter((o) => o.status === 'PLACED').length,
      cookingOrders: live.filter((o) => o.status === 'ACCEPTED' || o.status === 'PREPARING').length,
      deliveredToday: deliveredToday.length,
      avgDeliveryMinutes: minutes.length ? Math.round(minutes.reduce((s, m) => s + m, 0) / minutes.length) : null,
      ridersOnline: online.length,
      ridersTotal: partners.length,
      ridersBusy: busyRiders.size,
    },
    trend,
    byStatus: {
      delivered: todays.filter((o) => o.status === 'DELIVERED').length,
      inKitchen: todays.filter((o) => IN_KITCHEN.includes(o.status as OrderStatus)).length,
      onTheRoad: todays.filter((o) => ON_THE_ROAD.includes(o.status as OrderStatus)).length,
      cancelled: todays.filter((o) => VOID.includes(o.status as OrderStatus)).length,
    },
    topCategories,
    bestSellers,
    newCustomers: newest.map((u) => ({
      id: String(u._id),
      name: u.name,
      createdAt: (u.createdAt as Date).toISOString(),
      orders: statsById.get(String(u._id))?.orders ?? 0,
      spentPaise: statsById.get(String(u._id))?.spent ?? 0,
    })),
    partners: {
      online: online.filter((p) => !busyRiders.has(String(p.userId))).length,
      busy: busyRiders.size,
      offline: partners.filter((p) => p.availability !== 'ONLINE' && !busyRiders.has(String(p.userId))).length,
    },
    recentOrders: recent.map((o) => ({
      id: String(o._id),
      orderNumber: o.orderNumber,
      customerName: nameById.get(String(o.customerId)) ?? 'Customer',
      items: (o.items ?? []).reduce((s, it) => s + it.quantity, 0),
      totalPaise: o.totalPaise,
      status: o.status as OrderStatus,
      createdAt: o.createdAt.toISOString(),
    })),
    activity: activity.map((a) => ({
      id: String(a._id),
      action: a.action,
      entityType: a.entityType,
      ...(a.to ? { to: a.to } : {}),
      ...(a.actorId && nameById.get(String(a.actorId)) ? { actorName: nameById.get(String(a.actorId)) } : {}),
      createdAt: (a.createdAt as Date).toISOString(),
    })),
    payments: {
      onlinePaise,
      codPaise,
      cashWithRidersPaise,
      refundsPending: refunds.length,
      refundsPendingPaise: refunds.reduce((s, r) => s + (r.amountPaise ?? 0), 0),
    },
  };
}

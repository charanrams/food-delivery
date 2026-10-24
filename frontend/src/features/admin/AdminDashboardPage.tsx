import { Link, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Bar, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  ArrowRight,
  Bike,
  CheckCircle2,
  ChefHat,
  ClipboardList,
  Eye,
  Flame,
  IndianRupee,
  Plus,
  ShoppingBag,
  Tag,
} from 'lucide-react';
import { formatPaise, type AdminDashboardDto, type OrderStatus } from '@a3/contracts';
import { Button, Skeleton, StatusBadge, cx } from '@/components/ui';
import { useAuth } from '@/auth/AuthContext';
import { adminApi, adminKeys } from './admin-api';
import { NotificationBell } from './AdminNotificationsPage';
import { Avatar, PageHeader, SectionCard, StatCard, thCls, tdCls, timeAgo } from './admin-ui';

/** Brand chart colours (orange family + status hues), shared by the charts below. */
const C = { bar: '#ffd3ad', line: '#b4530a', green: '#2e7d4f', orange: '#f58220', blue: '#2563eb', red: '#c0392b', violet: '#7c3aed', amber: '#9a5700', grey: '#d8d1c6' };
const SERIES = [C.orange, C.line, C.green, C.blue, C.violet, C.amber];

/** "4 min", "2 h 5 min", "3 d" — old waiting orders stay readable. */
const waitLabel = (mins: number) =>
  mins < 60 ? `${mins} min` : mins < 24 * 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${Math.floor(mins / (24 * 60))} d`;

const rupees = (paise: number) => formatPaise(paise).replace(/\.00$/, '');
const change = (now: number, before: number) => (before ? Math.round(((now - before) / before) * 100) : null);

function Delta({ now, before, label }: { now: number; before: number; label: string }) {
  const pct = change(now, before);
  if (pct === null) return <>{label}</>;
  return (
    <>
      <span className={cx('font-semibold', pct >= 0 ? 'text-success' : 'text-danger')}>
        {pct >= 0 ? '↑' : '↓'} {Math.abs(pct)}%
      </span>{' '}
      {label}
    </>
  );
}

function LegendRow({ color, name, value }: { color: string; name: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[13px]">
      <span className="flex items-center gap-2 text-muted">
        <span className="size-2.5 rounded-[3px]" style={{ background: color }} aria-hidden />
        {name}
      </span>
      <span className="tabular font-semibold">{value}</span>
    </div>
  );
}

/** Ring chart (VSR style, Recharts): segments with a small gap, total in the middle, hover tooltip. */
function Donut({ data, label, size = 160 }: { data: { name: string; value: number; color: string }[]; label: string; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const shown = total ? data.filter((d) => d.value > 0) : [{ name: 'None', value: 1, color: '#eee9df' }];
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${data.map((d) => `${d.name} ${d.value}`).join(', ')}`}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={shown} dataKey="value" innerRadius="66%" outerRadius="100%" paddingAngle={total > 0 && shown.length > 1 ? 2 : 0} stroke="none" startAngle={90} endAngle={-270} isAnimationActive={false}>
            {shown.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          {total > 0 && <Tooltip contentStyle={TIP} />}
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="tabular font-display text-2xl font-bold leading-tight">{total}</div>
          <div className="text-[11px] text-muted">{label}</div>
        </div>
      </div>
    </div>
  );
}

const TIP = { borderRadius: 12, border: '1px solid #ece5dc', fontSize: 12, boxShadow: '0 6px 20px rgba(0,0,0,0.08)' } as const;
const AXIS = { tick: { fontSize: 11, fill: '#7a766f' }, axisLine: false, tickLine: false } as const;

/** Orders (bars) and paid revenue (line) for the last 7 days — VSR "Sales & Orders Trend". */
function TrendChart({ trend }: { trend: AdminDashboardDto['trend'] }) {
  const data = trend.map((t, i) => ({
    label: i === trend.length - 1 ? 'Today' : new Date(`${t.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' }),
    orders: t.orders,
    revenue: t.revenuePaise / 100,
  }));
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 10, right: 4, left: -14, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#f1ebe3" />
          <XAxis dataKey="label" {...AXIS} />
          <YAxis yAxisId="o" {...AXIS} allowDecimals={false} />
          <YAxis yAxisId="r" orientation="right" {...AXIS} tickFormatter={(v: number) => (v >= 1000 ? `₹${Math.round(v / 100) / 10}k` : `₹${v}`)} />
          <Tooltip
            cursor={{ fill: 'rgba(245,130,32,0.08)' }}
            contentStyle={TIP}
            formatter={(v: number, n: string) => (n === 'revenue' ? [rupees(Math.round(v * 100)), 'Revenue'] : [String(v), 'Orders'])}
          />
          <Bar yAxisId="o" dataKey="orders" fill={C.bar} radius={[6, 6, 0, 0]} barSize={26} />
          <Line yAxisId="r" dataKey="revenue" stroke={C.line} strokeWidth={2.5} dot={{ r: 3.5, fill: C.line }} activeDot={{ r: 5 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

const ACTION_LABEL: Record<string, string> = {
  'order.status': 'Order updated',
  'product.create': 'Dish added',
  'product.update': 'Dish updated',
  'product.available': 'Dish back in stock',
  'product.unavailable': 'Dish marked sold out',
  'product.archive': 'Dish archived',
  'category.create': 'Category added',
  'category.update': 'Category updated',
  'customer.status': 'Customer status changed',
  'settings.update': 'Settings changed',
};
const activityTitle = (a: string) => ACTION_LABEL[a] ?? a.replace(/[._]/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const q = useQuery({ queryKey: ['admin', 'dashboard'], queryFn: adminApi.dashboard, refetchInterval: 60_000 });
  // Orders that need someone right now: new ones and ready ones without a rider.
  const attention = useQuery({ queryKey: adminKeys.orders({ status: 'ACTIVE' }), queryFn: () => adminApi.orders({ status: 'ACTIVE' }) });
  const d = q.data;
  const needs = (attention.data?.items ?? [])
    .filter((o) => o.status === 'PLACED' || o.status === 'READY_FOR_PICKUP')
    .sort((a, b) => a.timeline.placedAt.localeCompare(b.timeline.placedAt))
    .slice(0, 4);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={`${greeting()}, ${user?.name?.split(' ')[0] ?? 'there'}`}
        description="Here’s how A3 Kitchen is doing today. Everything on this page updates live."
        actions={
          <>
            <Button onClick={() => navigate('/admin/menu/new')}>
              <Plus className="size-4" aria-hidden /> Add dish
            </Button>
            <Button variant="secondary" onClick={() => navigate('/admin/kitchen')}>
              <ChefHat className="size-4" aria-hidden /> Open live kitchen
            </Button>
            <Button variant="secondary" onClick={() => navigate('/admin/offer-sections')}>
              <Tag className="size-4" aria-hidden /> Create offer
            </Button>
            <Button variant="secondary" onClick={() => navigate('/admin/orders')}>
              <ClipboardList className="size-4" aria-hidden /> Manage orders
            </Button>
            <NotificationBell />
          </>
        }
      />

      {q.isError ? (
        <SectionCard>
          <div className="flex items-center justify-between gap-4 p-2">
            <p className="text-sm text-danger">Couldn’t load the dashboard.</p>
            <Button variant="secondary" size="sm" onClick={() => void q.refetch()}>
              Try again
            </Button>
          </div>
        </SectionCard>
      ) : !d ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-[104px] rounded-[20px]" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 [&>*]:min-w-0">
            <StatCard to="/admin/orders" tone="orange" icon={<ShoppingBag />} label="Orders today" value={String(d.kpis.ordersToday)} hint={<Delta now={d.kpis.ordersToday} before={d.kpis.ordersYesterday} label={`vs yesterday (${d.kpis.ordersYesterday})`} />} />
            <StatCard to="/admin/payments" tone="green" icon={<IndianRupee />} label="Paid revenue today" value={rupees(d.kpis.revenueTodayPaise)} hint={<Delta now={d.kpis.revenueTodayPaise} before={d.kpis.revenueYesterdayPaise} label={`vs yesterday (${rupees(d.kpis.revenueYesterdayPaise)})`} />} />
            <StatCard to="/admin/kitchen" tone="pink" icon={<Flame />} label="Live orders" value={String(d.kpis.liveOrders)} hint={`${d.kpis.newOrders} new · ${d.kpis.cookingOrders} cooking`} />
            <StatCard to="/admin/orders?status=DELIVERED" tone="blue" icon={<CheckCircle2 />} label="Delivered today" value={String(d.kpis.deliveredToday)} hint={d.kpis.avgDeliveryMinutes ? `Avg. ${d.kpis.avgDeliveryMinutes} min door-to-door` : 'No deliveries yet'} />
            <StatCard to="/admin/delivery-partners" tone="violet" icon={<Bike />} label="Riders online" value={`${d.kpis.ridersOnline} / ${d.kpis.ridersTotal}`} hint={`${d.kpis.ridersBusy} on a delivery`} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.45fr_1fr_1fr] [&>*]:min-w-0">
            <SectionCard title="Sales & orders · last 7 days" actions={<span className="flex gap-4 text-xs text-muted"><span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px]" style={{ background: C.bar }} />Orders</span><span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px]" style={{ background: C.line }} />Revenue</span></span>}>
              <TrendChart trend={d.trend} />
            </SectionCard>

            <SectionCard title="Today’s orders by status">
              <div className="flex flex-wrap items-center gap-5 px-2 pb-2">
                <Donut
                  label="orders"
                  data={[
                    { name: 'Delivered', value: d.byStatus.delivered, color: C.green },
                    { name: 'In the kitchen', value: d.byStatus.inKitchen, color: C.orange },
                    { name: 'On the road', value: d.byStatus.onTheRoad, color: C.blue },
                    { name: 'Cancelled', value: d.byStatus.cancelled, color: C.red },
                  ]}
                />
                <div className="grid min-w-36 flex-1 gap-2.5">
                  <LegendRow color={C.green} name="Delivered" value={d.byStatus.delivered} />
                  <LegendRow color={C.orange} name="In the kitchen" value={d.byStatus.inKitchen} />
                  <LegendRow color={C.blue} name="On the road" value={d.byStatus.onTheRoad} />
                  <LegendRow color={C.red} name="Cancelled" value={d.byStatus.cancelled} />
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Top categories · 30 days">
              <ul className="grid gap-3.5 px-2 pb-2">
                {d.topCategories.map((c, i) => (
                  <li key={c.name} className="grid grid-cols-[minmax(0,7.5rem)_1fr_2.5rem] items-center gap-3 text-[13px]">
                    <span className="truncate">{c.name}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-[#f4efe8]">
                      <span className="block h-full rounded-full" style={{ width: `${Math.max(c.percent, 3)}%`, background: SERIES[i % SERIES.length] }} />
                    </span>
                    <span className="tabular text-right text-muted">{c.percent}%</span>
                  </li>
                ))}
                {!d.topCategories.length && <p className="py-6 text-center text-sm text-muted">No sales in the last 30 days.</p>}
              </ul>
            </SectionCard>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4 [&>*]:min-w-0">
            <SectionCard
              title="Needs you now"
              actions={
                <Link to="/admin/kitchen" className="flex items-center gap-1 text-xs font-semibold text-primary-strong">
                  Live kitchen <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              }
            >
              <ul className="divide-y divide-line/70 px-2">
                {needs.map((o) => {
                  const mins = Math.floor((Date.now() - new Date(o.timeline.placedAt).getTime()) / 60_000);
                  const ready = o.status === 'READY_FOR_PICKUP';
                  return (
                    <li key={o.id}>
                      <Link to={`/admin/orders/${o.id}`} className="flex items-center gap-3 py-2.5 hover:text-primary-strong">
                        <span className="min-w-0 flex-1">
                          <span className="tabular block truncate text-[13.5px] font-semibold">{o.orderNumber}</span>
                          <span className="block truncate text-xs text-muted">
                            {o.items.reduce((s, i) => s + i.quantity, 0)} items · {rupees(o.totalPaise)} · {o.paymentMethod === 'COD' ? 'Cash' : 'Paid'}
                          </span>
                        </span>
                        <span className={cx('shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold', ready ? 'bg-[#fdf1dc] text-[#9a5700]' : mins >= 10 ? 'bg-danger/10 text-danger' : 'bg-primary-soft text-primary-strong')}>
                          {ready ? 'Needs rider' : waitLabel(mins)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
                {attention.isSuccess && !needs.length && <p className="py-8 text-center text-sm text-muted">All caught up. Nothing is waiting.</p>}
              </ul>
            </SectionCard>

            <SectionCard title="Best sellers · 7 days">
              <ul className="divide-y divide-line/70 px-2">
                {d.bestSellers.map((p) => (
                  <li key={p.productId} className="flex items-center gap-3 py-2.5">
                    {p.imageUrl ? <img src={p.imageUrl} alt="" className="size-10 shrink-0 rounded-xl object-cover" /> : <span className="size-10 shrink-0 rounded-xl bg-primary-soft" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold">{p.name}</span>
                      <span className="block text-xs text-muted">{p.quantity} sold</span>
                    </span>
                    <span className="tabular text-[13px] font-semibold">{rupees(p.pricePaise)}</span>
                  </li>
                ))}
                {!d.bestSellers.length && <p className="py-8 text-center text-sm text-muted">No sales this week yet.</p>}
              </ul>
            </SectionCard>

            <SectionCard title="New customers" actions={<Link to="/admin/customers" className="flex items-center gap-1 text-xs font-semibold text-primary-strong">View all <ArrowRight className="size-3.5" aria-hidden /></Link>}>
              <ul className="divide-y divide-line/70 px-2">
                {d.newCustomers.map((c) => (
                  <li key={c.id}>
                    <Link to={`/admin/customers/${c.id}`} className="flex items-center gap-3 py-2.5 hover:text-primary-strong">
                      <Avatar name={c.name} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-semibold">{c.name}</span>
                        <span className="block text-xs text-muted">
                          {c.orders} order{c.orders === 1 ? '' : 's'} · {rupees(c.spentPaise)}
                        </span>
                      </span>
                      <span className="text-xs text-muted">{timeAgo(c.createdAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </SectionCard>

            <SectionCard title="Delivery partners" actions={<Link to="/admin/delivery-partners" className="flex items-center gap-1 text-xs font-semibold text-primary-strong">View all <ArrowRight className="size-3.5" aria-hidden /></Link>}>
              <div className="flex flex-wrap items-center justify-center gap-4 px-2 pb-2 sm:justify-start">
                <Donut
                  size={120}
                  label="riders"
                  data={[
                    { name: 'Online, free', value: d.partners.online, color: C.green },
                    { name: 'On a delivery', value: d.partners.busy, color: C.blue },
                    { name: 'Offline', value: d.partners.offline, color: C.grey },
                  ]}
                />
                <div className="grid min-w-[9.5rem] flex-1 gap-2 text-[13px]">
                  <span className="whitespace-nowrap rounded-xl bg-success/10 px-3 py-2 text-success"><b className="tabular">{d.partners.online}</b> Online, free</span>
                  <span className="whitespace-nowrap rounded-xl bg-[#e4f0fd] px-3 py-2 text-[#1d5fa8]"><b className="tabular">{d.partners.busy}</b> On a delivery</span>
                  <span className="whitespace-nowrap rounded-xl bg-danger/10 px-3 py-2 text-danger"><b className="tabular">{d.partners.offline}</b> Offline</span>
                </div>
              </div>
            </SectionCard>
          </div>

          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1.6fr_1fr] [&>*]:min-w-0">
            <SectionCard title="Recent orders" actions={<Link to="/admin/orders" className="flex items-center gap-1 text-xs font-semibold text-primary-strong">View all <ArrowRight className="size-3.5" aria-hidden /></Link>}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] border-separate border-spacing-0 text-left text-sm">
                  <thead>
                    <tr>
                      {['Order', 'Customer', 'Items', 'Amount', 'Status', 'Time', ''].map((h) => (
                        <th key={h} className={thCls} scope="col">
                          {h || <span className="sr-only">Open</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {d.recentOrders.map((o) => (
                      <tr key={o.id} className="cursor-pointer hover:bg-primary-soft/40" onClick={() => navigate(`/admin/orders/${o.id}`)}>
                        <td className={cx(tdCls, 'tabular whitespace-nowrap font-semibold')}>{o.orderNumber}</td>
                        <td className={cx(tdCls, 'whitespace-nowrap')}>{o.customerName}</td>
                        <td className={cx(tdCls, 'tabular')}>{o.items}</td>
                        <td className={cx(tdCls, 'tabular whitespace-nowrap')}>{rupees(o.totalPaise)}</td>
                        <td className={tdCls}>
                          <StatusBadge status={o.status as OrderStatus} />
                        </td>
                        <td className={cx(tdCls, 'tabular whitespace-nowrap text-muted')}>
                          {new Date(o.createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                        </td>
                        <td className={tdCls}>
                          <Link to={`/admin/orders/${o.id}`} aria-label={`Open order ${o.orderNumber}`} className="grid size-9 place-items-center rounded-lg ring-1 ring-line hover:bg-primary-soft" onClick={(e) => e.stopPropagation()}>
                            <Eye className="size-4" aria-hidden />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            <SectionCard title="Latest activity">
              <ol className="relative ml-3 border-l-2 border-dashed border-line pl-5 pr-2 pb-1">
                {d.activity.map((a, i) => (
                  <li key={a.id} className="relative pb-3.5 last:pb-0">
                    <span className={cx('absolute -left-[27px] top-1 size-3 rounded-full ring-4 ring-surface', i === 0 ? 'bg-primary' : 'bg-success')} aria-hidden />
                    <p className="text-[13px] font-semibold">{activityTitle(a.action)}</p>
                    <p className="text-xs text-muted">
                      {[a.to && a.to.toLowerCase().replace(/_/g, ' '), a.actorName && `by ${a.actorName}`, timeAgo(a.createdAt)].filter(Boolean).join(' · ')}
                    </p>
                  </li>
                ))}
                {!d.activity.length && <p className="py-6 text-sm text-muted">No activity yet.</p>}
              </ol>
            </SectionCard>

            <SectionCard title="Payment mix · today">
              {(() => {
                const total = d.payments.onlinePaise + d.payments.codPaise || 1;
                const online = Math.round((d.payments.onlinePaise / total) * 100);
                return (
                  <div className="grid gap-4 px-2 pb-2">
                    <div>
                      <div className="mb-1.5 flex justify-between text-[13px]">
                        <span className="text-muted">Online (Razorpay)</span>
                        <b className="tabular">{rupees(d.payments.onlinePaise)} · {online}%</b>
                      </div>
                      <span className="block h-2 overflow-hidden rounded-full bg-[#f4efe8]">
                        <span className="block h-full rounded-full" style={{ width: `${online}%`, background: C.green }} />
                      </span>
                    </div>
                    <div>
                      <div className="mb-1.5 flex justify-between text-[13px]">
                        <span className="text-muted">Cash on delivery</span>
                        <b className="tabular">{rupees(d.payments.codPaise)} · {100 - online}%</b>
                      </div>
                      <span className="block h-2 overflow-hidden rounded-full bg-[#f4efe8]">
                        <span className="block h-full rounded-full" style={{ width: `${100 - online}%`, background: C.orange }} />
                      </span>
                    </div>
                    <div className="h-px bg-line/70" />
                    <div className="flex justify-between text-[13px]">
                      <span className="text-muted">Cash with riders (to hand in)</span>
                      <b className="tabular text-primary-strong">{rupees(d.payments.cashWithRidersPaise)}</b>
                    </div>
                    <Link to="/admin/payments" className="flex justify-between text-[13px] hover:text-primary-strong">
                      <span className="text-muted">Refunds pending</span>
                      <b className="tabular">
                        {d.payments.refundsPending} · {rupees(d.payments.refundsPendingPaise)}
                      </b>
                    </Link>
                  </div>
                );
              })()}
            </SectionCard>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

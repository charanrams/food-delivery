import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Bike,
  Check,
  CheckCircle2,
  ClipboardList,
  Eye,
  Flame,
  ShoppingBag,
  XCircle,
  MapPin,
  Phone,
  SearchX,
  ReceiptText,
  UserRound,
  UtensilsCrossed,
} from 'lucide-react';
import { formatPaise, type OrderDto, type OrderStatus } from '@a3/contracts';
import {
  Card,
  EmptyState,
  ErrorState,
  FoodImage,
  Skeleton,
  StatusBadge,
  cx,
} from '@/components/ui';
import { sized } from '@/lib/catalog-api';
import { ApiError } from '@/lib/api';
import { adminApi, adminKeys, type OrderFilter } from './admin-api';
import {
  Avatar,
  dateTime,
  itemsLabel,
  waitLabel,
  FilterTabs,
  localPhone,
  NoticeBar,
  PageHeader,
  PaymentBadge,
  SearchInput,
  SectionCard,
  StatCard,
  tdCls,
  thCls,
  type Notice,
} from './admin-ui';
import { OrderActions } from './OrderActions';

const FILTERS: { value: OrderFilter; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PLACED', label: 'New' },
  { value: 'PREPARING', label: 'Preparing' },
  { value: 'READY_FOR_PICKUP', label: 'Ready' },
  { value: 'OUT_FOR_DELIVERY', label: 'On the road' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REJECTED', label: 'Rejected' },
];

/** Admin · Orders (mockup 03) — KPI row, status chips + search, one table; rows open the order page. */
export function AdminOrdersPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const status = (params.get('status') as OrderFilter | null) ?? 'ACTIVE';
  // The top-bar search lands here with ?q=.
  const [search, setSearch] = useState(() => params.get('q') ?? '');
  const [debounced, setDebounced] = useState(() => params.get('q') ?? '');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const q = { status, search: debounced || undefined };
  const orders = useQuery({
    queryKey: adminKeys.orders(q),
    queryFn: () => adminApi.orders(q),
    refetchInterval: 30_000,
  });
  const summary = useQuery({ queryKey: adminKeys.summary, queryFn: adminApi.summary, refetchInterval: 30_000 });
  // Open orders (any day) for the live cards; today's summary for delivered / cancelled.
  const open = useQuery({ queryKey: adminKeys.orders({ status: 'ACTIVE' }), queryFn: () => adminApi.orders({ status: 'ACTIVE' }), refetchInterval: 30_000 });
  const by = summary.data?.byStatus ?? {};
  const live = (...k: OrderStatus[]) => (open.data?.items ?? []).filter((o) => k.includes(o.status)).length;
  const n = (...k: OrderStatus[]) => k.reduce((s, x) => s + (by[x] ?? 0), 0);
  const setStatus = (v: OrderFilter) => {
    const p = new URLSearchParams(params);
    p.set('status', v);
    setParams(p, { replace: true });
  };

  // Old links (?id=) open the order's own page.
  const legacy = params.get('id');
  if (legacy) return <Navigate to={`/admin/orders/${legacy}`} replace />;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        crumbs={[
          { label: 'Orders', to: '/admin/orders' },
          { label: FILTERS.find((f) => f.value === status)?.label ?? 'All' },
        ]}
        title="Orders"
        description="Every order, newest first. Open one to accept it, move it along or assign a rider."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6 xl:grid-cols-5 [&>*]:min-w-0 lg:[&>*:nth-child(-n+2)]:col-span-3 lg:[&>*:nth-child(n+3)]:col-span-2 xl:[&>*]:!col-span-1">
        <StatCard to="/admin/orders?status=PLACED" tone="orange" icon={<ShoppingBag />} label="New" value={String(live('PLACED'))} hint="Waiting to accept" />
        <StatCard to="/admin/orders?status=PREPARING" tone="pink" icon={<Flame />} label="In the kitchen" value={String(live('ACCEPTED', 'PREPARING'))} hint="Accepted & cooking" />
        <StatCard
          to="/admin/orders?status=OUT_FOR_DELIVERY"
          tone="blue"
          icon={<Bike />}
          label="Ready & on the road"
          value={String(live('READY_FOR_PICKUP', 'ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'))}
          hint={`${live('READY_FOR_PICKUP')} waiting for a rider`}
        />
        <StatCard
          to="/admin/orders?status=DELIVERED"
          tone="green"
          icon={<CheckCircle2 />}
          label="Delivered today"
          value={String(n('DELIVERED'))}
          hint={summary.data ? `Yesterday ${summary.data.yesterday.delivered}` : undefined}
        />
        <StatCard to="/admin/orders?status=CANCELLED" tone="red" icon={<XCircle />} label="Cancelled" value={String(n('CANCELLED', 'REJECTED'))} hint="Incl. rejected · today" />
      </div>

      <SectionCard>
        <div className="flex flex-col gap-3 px-1 pb-3 xl:flex-row xl:items-center xl:justify-between">
          <FilterTabs label="Order status" value={status} options={FILTERS} onChange={setStatus} />
          <SearchInput id="order-search" value={search} onChange={setSearch} placeholder="Search order number" className="xl:w-72 xl:shrink-0" />
        </div>

        {orders.isError ? (
          <ErrorState onRetry={() => orders.refetch()} />
        ) : orders.isPending ? (
          <div className="flex flex-col gap-2 px-1">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : orders.data.items.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="size-9" />}
            title={debounced ? 'No orders match' : 'Nothing here'}
            body={debounced ? 'Check the order number and try again.' : 'Orders in this state will show up here.'}
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr>
                    {['Order', 'Customer', 'Amount', 'Payment', 'Status', 'Rider'].map((h) => (
                      <th key={h || 'open'} scope="col" className={thCls}>
                        {h || <span className="sr-only">Open</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.data.items.map((o) => {
                    const waited = Math.floor((Date.now() - new Date(o.timeline.placedAt).getTime()) / 60_000);
                    const late = o.status === 'PLACED' && waited >= 10;
                    const name = o.customer?.name ?? o.deliveryAddress.recipientName;
                    return (
                      <tr
                        key={o.id}
                        className={cx('cursor-pointer hover:bg-primary-soft/40', late && 'bg-danger/[0.04]')}
                        onClick={() => navigate(`/admin/orders/${o.id}`)}
                      >
                        <td className={cx(tdCls, 'whitespace-nowrap')}>
                          <span className="tabular block font-semibold">{o.orderNumber}</span>
                          <span className="tabular block text-xs text-muted">{dateTime(o.timeline.placedAt)}</span>
                        </td>
                        <td className={tdCls}>
                          <span className="flex items-center gap-2.5">
                            <Avatar name={name} />
                            <span className="min-w-0">
                              <span className="block max-w-44 truncate font-medium">{name}</span>
                              <span className="tabular block text-xs text-muted">{localPhone(o.deliveryAddress.phone)}</span>
                            </span>
                          </span>
                        </td>
                        <td className={cx(tdCls, 'whitespace-nowrap')}>
                          <span className="tabular block font-semibold">{formatPaise(o.totalPaise)}</span>
                          <span className="block text-xs text-muted">{itemsLabel(o.items.reduce((s, i) => s + i.quantity, 0))}</span>
                        </td>
                        <td className={tdCls}>
                          <span className="flex flex-col items-start gap-1">
                            <span className="whitespace-nowrap text-xs text-muted">{o.paymentMethod === 'COD' ? 'Cash on delivery' : 'Online'}</span>
                            <PaymentBadge status={o.paymentStatus} />
                          </span>
                        </td>
                        <td className={tdCls}>
                          {late ? (
                            <span className="inline-flex h-6 items-center whitespace-nowrap rounded-full bg-danger/10 px-2.5 text-xs font-semibold text-danger">
                              Waiting {waitLabel(waited)}
                            </span>
                          ) : (
                            <StatusBadge status={o.status} />
                          )}
                        </td>
                        <td className={cx(tdCls, 'whitespace-nowrap')}>
                          {o.partner ? (
                            <span className="flex items-center gap-2">
                              <Bike className="size-4 text-muted" aria-hidden />
                              {o.partner.name}
                            </span>
                          ) : o.status === 'READY_FOR_PICKUP' ? (
                            <span className="rounded-full bg-[#fdf1dc] px-2.5 py-1 text-xs font-semibold text-[#9a5700]">Needs rider</span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ul className="flex flex-col divide-y divide-line/70 md:hidden">
              {orders.data.items.map((o) => {
                const waited = Math.floor((Date.now() - new Date(o.timeline.placedAt).getTime()) / 60_000);
                const late = o.status === 'PLACED' && waited >= 10;
                const name = o.customer?.name ?? o.deliveryAddress.recipientName;
                return (
                  <li key={o.id}>
                    <Link to={`/admin/orders/${o.id}`} className="flex flex-col gap-2 px-2 py-3 active:bg-primary-soft/40">
                      <span className="flex items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className="tabular block truncate text-sm font-semibold">{o.orderNumber}</span>
                          <span className="block truncate text-xs text-muted">
                            {name} · {itemsLabel(o.items.reduce((s, i) => s + i.quantity, 0))}
                          </span>
                        </span>
                        <span className="tabular shrink-0 text-sm font-bold">{formatPaise(o.totalPaise)}</span>
                      </span>
                      <span className="flex flex-wrap items-center gap-2">
                        {late ? (
                          <span className="inline-flex h-6 items-center rounded-full bg-danger/10 px-2.5 text-xs font-semibold text-danger">Waiting {waitLabel(waited)}</span>
                        ) : (
                          <StatusBadge status={o.status} />
                        )}
                        <PaymentBadge status={o.paymentStatus} />
                        <span className="ml-auto text-xs text-muted">{o.paymentMethod === 'COD' ? 'Cash' : 'Online'}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="px-2 pt-3 text-xs text-muted">
              Showing {orders.data.items.length} of {orders.data.meta.total} orders
              {orders.data.meta.total > orders.data.items.length ? '. Search by order number to find older ones.' : '.'}
            </p>
          </>
        )}
      </SectionCard>
    </div>
  );
}

/** Admin · One order (mockup 04): header + progress, items / people / timeline left, actions / payment / bill right. */
export function AdminOrderPage() {
  const { orderId = '' } = useParams();
  const [notice, setNotice] = useState<Notice>();
  return (
    <div className="flex w-full flex-col gap-4">
      <NoticeBar notice={notice} onDismiss={() => setNotice(undefined)} />
      <OrderDetail id={orderId} onMessage={(tone, text) => setNotice({ tone, text })} />
    </div>
  );
}

const FLOW: { label: string; key: keyof OrderDto['timeline'] }[] = [
  { label: 'Placed', key: 'placedAt' },
  { label: 'Accepted', key: 'acceptedAt' },
  { label: 'Cooking', key: 'preparingAt' },
  { label: 'Ready', key: 'readyAt' },
  { label: 'Rider assigned', key: 'assignedAt' },
  { label: 'Picked up', key: 'pickedUpAt' },
  { label: 'Delivered', key: 'deliveredAt' },
];

/** Horizontal order progress: done steps filled, current step ringed, with the time each happened. */
function Progress({ o }: { o: OrderDto }) {
  const t = o.timeline;
  const stopped = o.status === 'CANCELLED' || o.status === 'REJECTED';
  const lastDone = FLOW.reduce((n, s, i) => (t[s.key] ? i : n), 0);
  return (
    <ol className="no-scrollbar flex overflow-x-auto" aria-label="Order progress">
      {FLOW.map((s, i) => {
        const at = t[s.key];
        const done = !!at;
        const current = !stopped && i === lastDone + 1;
        return (
          <li key={s.key} className="relative flex min-w-24 flex-1 flex-col items-center gap-1.5 text-center" aria-current={current ? 'step' : undefined}>
            {i > 0 && <span className={cx('absolute right-1/2 top-[19px] h-0.5 w-full', done ? 'bg-success' : 'bg-line')} aria-hidden />}
            <span
              className={cx(
                'relative z-10 grid size-10 place-items-center rounded-full text-[13px] font-bold leading-none',
                done
                  ? 'bg-success text-surface'
                  : current
                    ? 'bg-primary text-surface shadow-[0_0_0_5px_rgb(255_240_227)]'
                    : 'bg-[#f4efe8] text-muted',
              )}
            >
              {done ? <Check className="size-[18px]" strokeWidth={3} aria-hidden /> : i + 1}
            </span>
            <span className={cx('text-[13px] font-semibold', !done && !current && 'text-muted')}>{s.label}</span>
            <span className="tabular text-xs text-muted">{at ? time(at) : current ? 'Next' : 'Pending'}</span>
          </li>
        );
      })}
    </ol>
  );
}

const time = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

function Panel({ title, actions, children, className }: { title: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <SectionCard title={title} actions={actions} className={className}>
      <div className="flex flex-col gap-3 px-2 pb-2">{children}</div>
    </SectionCard>
  );
}

function Row({ k, v, strong }: { k: ReactNode; v: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted">{k}</span>
      <span className={cx('tabular text-right', strong ? 'font-display text-xl font-bold' : 'font-semibold')}>{v}</span>
    </div>
  );
}

function OrderDetail({ id, onMessage }: { id: string; onMessage: (tone: 'success' | 'danger', text: string) => void }) {
  const order = useQuery({ queryKey: adminKeys.order(id), queryFn: () => adminApi.order(id), refetchInterval: 30_000 });
  if (order.isError)
    return (
      <Card>
        {order.error instanceof ApiError && order.error.status === 404 ? (
          <EmptyState icon={<SearchX className="size-9" />} title="Order not found" body="It may have been removed, or the link is wrong." />
        ) : (
          <ErrorState onRetry={() => order.refetch()} />
        )}
      </Card>
    );
  if (order.isPending)
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-24 rounded-[20px]" />
        <Skeleton className="h-28 rounded-[20px]" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <Skeleton className="h-96 rounded-[20px]" />
          <Skeleton className="h-96 rounded-[20px]" />
        </div>
      </div>
    );
  const o = order.data;
  const a = o.deliveryAddress;
  const reason = o.rejectionReason ?? o.cancellationReason;
  const itemCount = o.items.reduce((n, i) => n + i.quantity, 0);
  const name = o.customer?.name ?? a.recipientName;
  const timeline = FLOW.filter((s) => o.timeline[s.key]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        crumbs={[{ label: 'Orders', to: '/admin/orders' }, { label: o.orderNumber }]}
        title={`#${o.orderNumber}`}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <StatusBadge status={o.status} />
            <span>
              Placed {dateTime(o.timeline.placedAt)} · {itemsLabel(itemCount)} · {o.paymentMethod === 'COD' ? 'Cash on delivery' : 'Paid online'}
            </span>
          </span>
        }
        actions={
          <>
            <Link to="/admin/orders" className="inline-flex h-11 items-center gap-2 rounded-xl bg-surface px-4 text-sm font-semibold shadow-sm ring-1 ring-line hover:bg-primary-soft">
              <ArrowLeft className="size-4" aria-hidden /> Back to orders
            </Link>
            <Link to={`/admin/orders/${o.id}/bill`} className="inline-flex h-11 items-center gap-2 rounded-xl bg-surface px-4 text-sm font-semibold shadow-sm ring-1 ring-line hover:bg-primary-soft">
              <ReceiptText className="size-4" aria-hidden /> View bill
            </Link>
          </>
        }
      />

      {reason ? (
        <p role="status" className="rounded-2xl bg-danger/10 px-5 py-4 text-sm font-medium text-danger">
          {o.status === 'REJECTED' ? 'Rejected' : 'Cancelled'}: {reason}
        </p>
      ) : (
        <SectionCard>
          <div className="px-2 py-3">
            <Progress o={o} />
          </div>
        </SectionCard>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_380px] [&>*]:min-w-0">
        {/* Left: what to cook, who it's for, how it's going. */}
        <div className="flex min-w-0 flex-col gap-4">
          <SectionCard title={`Order items (${o.items.length})`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr>
                    {['Dish', 'Price', 'Qty', 'Total'].map((h) => (
                      <th key={h} scope="col" className={cx(thCls, h === 'Total' && 'text-right')}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {o.items.map((i, n) => (
                    <tr key={n}>
                      <td className={tdCls}>
                        <span className="flex items-center gap-3">
                          {i.imageUrl ? (
                            <FoodImage src={sized(i.imageUrl, 160)} alt="" className="size-14 shrink-0 rounded-xl" />
                          ) : (
                            <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-strong">
                              <UtensilsCrossed className="size-5" aria-hidden />
                            </span>
                          )}
                          <span className="min-w-0">
                            <span className="block font-semibold">{i.productName}</span>
                            {i.variantName && <span className="block text-xs text-muted">{i.variantName}</span>}
                          </span>
                        </span>
                      </td>
                      <td className={cx(tdCls, 'tabular whitespace-nowrap')}>{formatPaise(i.unitPricePaise)}</td>
                      <td className={cx(tdCls, 'tabular')}>×{i.quantity}</td>
                      <td className={cx(tdCls, 'tabular whitespace-nowrap text-right font-semibold')}>{formatPaise(i.lineTotalPaise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <div className="grid gap-4 md:grid-cols-2 [&>*]:min-w-0">
            <Panel
              title="Customer"
              actions={
                o.customer ? (
                  <Link to={`/admin/customers/${o.customer.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold ring-1 ring-line hover:bg-primary-soft">
                    <UserRound className="size-4" aria-hidden /> View profile
                  </Link>
                ) : undefined
              }
            >
              <div className="flex items-center gap-3">
                <Avatar name={name} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{name}</p>
                  {o.customer && o.customer.name !== a.recipientName && <p className="text-xs text-muted">Delivering to {a.recipientName}</p>}
                </div>
              </div>
              <a href={`tel:${a.phone}`} className="inline-flex h-10 items-center gap-2 self-start rounded-xl bg-primary-soft px-3.5 text-sm font-semibold text-primary-strong hover:bg-primary-soft-hover">
                <Phone className="size-4" aria-hidden /> {localPhone(a.phone)}
              </a>
            </Panel>

            <Panel title="Delivery address">
              <p className="flex gap-2 text-sm leading-relaxed">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary-strong" aria-hidden />
                <span>{[a.line1, a.line2, `${a.city} ${a.postalCode}`].filter(Boolean).join(', ')}</span>
              </p>
              {a.landmark && (
                <p className="rounded-xl bg-[#fdf1dc] px-3.5 py-2.5 text-sm text-[#7a4a00]">
                  <span className="font-semibold">Landmark:</span> {a.landmark}
                </p>
              )}
            </Panel>
          </div>

          <div className="grid gap-4 md:grid-cols-2 [&>*]:min-w-0">
            <Panel title="Delivery partner">
              {o.partner ? (
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e4f0fd] text-[#1d5fa8]">
                    <Bike className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link to={`/admin/delivery-partners/${o.partner.id}`} className="block truncate font-semibold hover:text-primary-strong hover:underline">
                      {o.partner.name}
                    </Link>
                    <p className="text-xs text-muted">{[o.partner.vehicleType, o.partner.vehicleNumber].filter(Boolean).join(', ') || 'Vehicle not set'}</p>
                  </div>
                  <a href={`tel:${o.partner.phone}`} aria-label={`Call ${o.partner.name}`} className="grid size-10 place-items-center rounded-full bg-primary-soft text-primary-strong hover:bg-primary-soft-hover">
                    <Phone className="size-4" aria-hidden />
                  </a>
                </div>
              ) : (
                <p className="text-sm text-muted">
                  {o.status === 'READY_FOR_PICKUP' ? 'Ready for a rider. Assign one from Next step.' : 'Assigned once the food is ready.'}
                </p>
              )}
            </Panel>

            <Panel title="Order timeline">
              <ol className="relative ml-2 border-l-2 border-dashed border-line pl-5">
                {timeline.map((s, i) => (
                  <li key={s.key} className="relative pb-3 last:pb-0">
                    <span className={cx('absolute -left-[27px] top-1 size-3 rounded-full ring-4 ring-surface', i === timeline.length - 1 ? 'bg-primary' : 'bg-success')} aria-hidden />
                    <p className="text-[13px] font-semibold">{s.label}</p>
                    <p className="tabular text-xs text-muted">{dateTime(o.timeline[s.key])}</p>
                  </li>
                ))}
              </ol>
            </Panel>
          </div>
        </div>

        {/* Right: what to do next, then the money. */}
        <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4">
          <Panel title="Next step">
            <OrderActions key={`${o.id}-${o.status}`} order={o} onMessage={onMessage} />
          </Panel>

          <Panel title="Payment" actions={<PaymentBadge status={o.paymentStatus} />}>
            <Row k="Method" v={o.paymentMethod === 'COD' ? 'Cash on delivery' : 'Online (Razorpay)'} />
            <Row k="Amount" v={formatPaise(o.totalPaise)} strong />
          </Panel>

          <Panel title="Price breakdown">
            <Row k={`Item total (${itemsLabel(itemCount)})`} v={formatPaise(o.subtotalPaise)} />
            {o.discountPaise > 0 && <Row k="Discount" v={<span className="text-success">- {formatPaise(o.discountPaise)}</span>} />}
            <Row k="Delivery fee" v={o.deliveryFeePaise ? formatPaise(o.deliveryFeePaise) : 'Free'} />
            {o.taxPaise > 0 && <Row k="GST" v={formatPaise(o.taxPaise)} />}
            <div className="mt-1 flex items-center justify-between rounded-xl bg-success/10 px-3.5 py-3 font-bold text-success">
              <span>Total</span>
              <span className="tabular font-display text-lg">{formatPaise(o.totalPaise)}</span>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

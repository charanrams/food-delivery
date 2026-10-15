import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Bike,
  Check,
  ClipboardList,
  MapPin,
  Phone,
  SearchX,
  ReceiptText,
  UserRound,
  UtensilsCrossed,
} from 'lucide-react';
import { formatPaise, type OrderDto } from '@a3/contracts';
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
  dateTime,
  FilterTabs,
  localPhone,
  NoticeBar,
  PageHeader,
  PaymentBadge,
  SearchInput,
  type Notice,
} from './admin-ui';
import { OrderActions } from './OrderActions';
import { OrderListItem } from './OrderList';

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

/** Admin · Orders — filterable queue; each order opens its own page. */
export function AdminOrdersPage() {
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
    refetchInterval: 15_000,
  });

  // Old links (?id=) open the order's own page.
  const legacy = params.get('id');
  if (legacy) return <Navigate to={`/admin/orders/${legacy}`} replace />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Orders"
        description="Open an order to accept it, move it along or assign a rider. Updates every 15 seconds."
      />

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <FilterTabs
          label="Order status"
          value={status}
          options={FILTERS}
          onChange={(v) => {
            const p = new URLSearchParams(params);
            p.set('status', v);
            setParams(p, { replace: true });
          }}
        />
        <SearchInput
          id="order-search"
          value={search}
          onChange={setSearch}
          placeholder="Search order number"
          className="xl:w-64 xl:shrink-0"
        />
      </div>

      {orders.isError ? (
        <Card className="rounded-[20px]">
          <ErrorState onRetry={() => orders.refetch()} />
        </Card>
      ) : orders.isPending ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : orders.data.items.length === 0 ? (
        <Card className="rounded-[20px]">
          <EmptyState
            icon={<ClipboardList className="size-9" />}
            title={debounced ? 'No orders match' : 'Nothing here'}
            body={
              debounced
                ? 'Check the order number and try again.'
                : 'Orders in this state will show up here.'
            }
          />
        </Card>
      ) : (
        <>
          <ul className="grid gap-3 lg:grid-cols-2">
            {orders.data.items.map((o) => (
              <li key={o.id} className="min-w-0">
                <OrderListItem order={o} />
              </li>
            ))}
          </ul>
          {orders.data.meta.total > orders.data.items.length && (
            <p className="text-center text-xs text-muted">
              Showing the latest {orders.data.items.length} of {orders.data.meta.total}. Search by
              order number to find older ones.
            </p>
          )}
        </>
      )}
    </div>
  );
}

/** Admin · One order — full-width page: progress across the top, items on the left, actions and people on the right. */
export function AdminOrderPage() {
  const { orderId = '' } = useParams();
  const [notice, setNotice] = useState<Notice>();
  return (
    <div className="flex w-full flex-col gap-5">
      <Link
        to="/admin/orders"
        className="inline-flex min-h-10 items-center gap-1.5 self-start rounded-full pr-3 text-sm font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> All orders
      </Link>
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
          <li
            key={s.key}
            className="relative flex min-w-28 flex-1 flex-col items-center gap-1.5 text-center"
            aria-current={current ? 'step' : undefined}
          >
            {i > 0 && (
              <span
                className={cx(
                  'absolute right-1/2 top-[15px] h-0.5 w-full',
                  done ? 'bg-success' : 'bg-line',
                )}
                aria-hidden
              />
            )}
            <span
              className={cx(
                'relative z-10 grid size-8 place-items-center rounded-full text-[13px] font-bold leading-none',
                done
                  ? 'bg-success text-surface'
                  : current
                    ? 'bg-surface text-primary-strong ring-2 ring-primary'
                    : 'bg-surface text-muted ring-1 ring-line',
              )}
            >
              {done ? <Check className="size-[18px]" strokeWidth={3} aria-hidden /> : i + 1}
            </span>
            <span className={cx('text-[13px] font-semibold', !done && !current && 'text-muted')}>
              {s.label}
            </span>
            <span className="tabular text-xs text-muted">
              {at ? time(at) : current ? 'Next' : ''}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card as="section" className={cx('flex flex-col gap-3 p-5', className)}>
      <h2 className="text-sm font-semibold text-muted">{title}</h2>
      {children}
    </Card>
  );
}

function OrderDetail({
  id,
  onMessage,
}: {
  id: string;
  onMessage: (tone: 'success' | 'danger', text: string) => void;
}) {
  const order = useQuery({
    queryKey: adminKeys.order(id),
    queryFn: () => adminApi.order(id),
    refetchInterval: 15_000,
  });
  if (order.isError)
    return (
      <Card>
        {order.error instanceof ApiError && order.error.status === 404 ? (
          <EmptyState
            icon={<SearchX className="size-9" />}
            title="Order not found"
            body="It may have been removed, or the link is wrong."
          />
        ) : (
          <ErrorState onRetry={() => order.refetch()} />
        )}
      </Card>
    );
  if (order.isPending)
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-36" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  const o = order.data;
  const a = o.deliveryAddress;
  const reason = o.rejectionReason ?? o.cancellationReason;
  const itemCount = o.items.reduce((n, i) => n + i.quantity, 0);

  return (
    <div className="flex flex-col gap-5">
      {/* Header: who, what, how much, and where it is in the flow. */}
      <Card as="section" className="flex flex-col gap-6 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="tabular font-display text-2xl font-semibold md:text-[1.75rem]">
                {o.orderNumber}
              </h1>
              <StatusBadge status={o.status} />
            </div>
            <p className="mt-1 text-sm text-muted">
              Placed {dateTime(o.timeline.placedAt)} by{' '}
              <span className="font-medium text-ink">{o.customer?.name ?? a.recipientName}</span>,{' '}
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </p>
          </div>
          <div className="flex items-start gap-4">
            <Link
              to={`/admin/orders/${o.id}/bill`}
              className="inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold ring-1 ring-inset ring-line hover:bg-background"
            >
              <ReceiptText className="size-4" aria-hidden /> View bill
            </Link>
            <div className="text-right">
              <p className="tabular font-display text-2xl font-semibold">
                {formatPaise(o.totalPaise)}
              </p>
              <p className="flex items-center justify-end gap-2 text-sm text-muted">
                {o.paymentMethod === 'COD' ? 'Cash on delivery' : 'Online'}{' '}
                <PaymentBadge status={o.paymentStatus} />
              </p>
            </div>
          </div>
        </div>
        {reason ? (
          <p role="status" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
            {o.status === 'REJECTED' ? 'Rejected' : 'Cancelled'}: {reason}
          </p>
        ) : (
          <Progress o={o} />
        )}
      </Card>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Left: what to cook. */}
        <Card as="section" className="overflow-hidden">
          <h2 className="border-b border-line px-5 py-4 font-semibold">Items</h2>
          <ul className="divide-y divide-line">
            {o.items.map((i, n) => (
              <li key={n} className="flex items-center gap-4 px-5 py-3.5">
                {i.imageUrl ? (
                  <FoodImage
                    src={sized(i.imageUrl, 160)}
                    alt=""
                    className="size-14 shrink-0 rounded-xl"
                  />
                ) : (
                  <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-strong">
                    <UtensilsCrossed className="size-5" aria-hidden />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{i.productName}</p>
                  <p className="text-sm text-muted">
                    {i.variantName ? `${i.variantName}, ` : ''}
                    {formatPaise(i.unitPricePaise)} each
                  </p>
                </div>
                <span className="tabular grid h-8 min-w-8 place-items-center rounded-lg bg-ink/[0.06] px-2 text-sm font-bold">
                  ×{i.quantity}
                </span>
                <span className="tabular w-20 text-right font-semibold">
                  {formatPaise(i.lineTotalPaise)}
                </span>
              </li>
            ))}
          </ul>
          <dl className="flex flex-col gap-1.5 border-t border-line bg-background/60 px-5 py-4 text-sm">
            {(
              [
                ['Subtotal', o.subtotalPaise],
                ['Discount', -(o.discountPaise ?? 0)],
                ['Delivery', o.deliveryFeePaise],
                ['GST', o.taxPaise],
              ] as const
            )
              .filter(([, v]) => v !== 0)
              .map(([k, v]) => (
                <div key={k} className="flex justify-between text-muted">
                  <dt>{k}</dt>
                  <dd className="tabular">{v < 0 ? `- ${formatPaise(-v)}` : formatPaise(v)}</dd>
                </div>
              ))}
            <div className="mt-1 flex justify-between border-t border-dashed border-line pt-2.5 text-base font-bold">
              <dt>Total</dt>
              <dd className="tabular">{formatPaise(o.totalPaise)}</dd>
            </div>
          </dl>
        </Card>

        {/* Right: what to do next, then the people involved. */}
        <div className="flex flex-col gap-5 lg:sticky lg:top-6">
          <Card as="section" className="flex flex-col gap-3 p-5 ring-primary/30">
            <h2 className="text-sm font-semibold text-muted">Next step</h2>
            <OrderActions key={`${o.id}-${o.status}`} order={o} onMessage={onMessage} />
          </Card>

          <Panel title="Customer">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft font-bold text-primary-strong">
                {(a.recipientName[0] ?? '?').toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold">{a.recipientName}</p>
                {o.customer && o.customer.name !== a.recipientName && (
                  <p className="text-xs text-muted">Ordered by {o.customer.name}</p>
                )}
              </div>
            </div>
            <p className="flex gap-2 text-sm">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
              {[a.line1, a.line2, a.landmark, `${a.city} ${a.postalCode}`]
                .filter(Boolean)
                .join(', ')}
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={`tel:${a.phone}`}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary-soft px-3.5 text-sm font-semibold text-primary-strong hover:bg-primary-soft-hover"
              >
                <Phone className="size-4" aria-hidden /> {localPhone(a.phone)}
              </a>
              {o.customer && (
                <Link
                  to={`/admin/customers/${o.customer.id}`}
                  className="inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold ring-1 ring-inset ring-line hover:bg-background"
                >
                  <UserRound className="size-4" aria-hidden /> Their orders
                </Link>
              )}
            </div>
          </Panel>

          <Panel title="Rider">
            {o.partner ? (
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink/[0.06]">
                  <Bike className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/admin/delivery-partners/${o.partner.id}`}
                    className="block truncate font-semibold hover:text-primary-strong hover:underline"
                  >
                    {o.partner.name}
                  </Link>
                  <p className="text-xs text-muted">
                    {[o.partner.vehicleType, o.partner.vehicleNumber].filter(Boolean).join(', ') ||
                      'Vehicle not set'}
                  </p>
                </div>
                <a
                  href={`tel:${o.partner.phone}`}
                  aria-label={`Call ${o.partner.name}`}
                  className="grid size-10 place-items-center rounded-full bg-primary-soft text-primary-strong hover:bg-primary-soft-hover"
                >
                  <Phone className="size-4" aria-hidden />
                </a>
              </div>
            ) : (
              <p className="text-sm text-muted">
                {o.status === 'READY_FOR_PICKUP'
                  ? 'Ready for a rider. Use Assign partner above.'
                  : 'Assigned once the food is ready.'}
              </p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

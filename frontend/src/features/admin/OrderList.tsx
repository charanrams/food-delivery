import { useState } from 'react';
import { Link } from 'react-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ChevronRight, ClipboardList } from 'lucide-react';
import { formatPaise, type OrderDto } from '@a3/contracts';
import { Button, EmptyState, ErrorState, Skeleton, StatusBadge, cx } from '@/components/ui';
import { api, qs } from '@/lib/api';
import { Avatar, FilterTabs, dateTime, timeAgo } from './admin-ui';

export const itemsLine = (o: OrderDto) =>
  o.items.length === 1
    ? `${o.items[0]!.quantity} × ${o.items[0]!.productName}`
    : `${o.items.reduce((n, i) => n + i.quantity, 0)} items`;

/** Age of the order; waiting too long in an early stage is flagged so it gets attention. */
export function WaitTime({ order: o }: { order: OrderDto }) {
  const mins = Math.round((Date.now() - Date.parse(o.timeline.placedAt)) / 60_000);
  const late = mins >= 10 && (o.status === 'PLACED' || o.status === 'ACCEPTED');
  return (
    <span
      className={cx(
        'whitespace-nowrap text-right text-xs',
        late ? 'font-bold text-danger' : 'text-muted',
      )}
    >
      {late
        ? `Waiting ${mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} h`}`
        : timeAgo(o.timeline.placedAt)}
    </span>
  );
}

const payLabel = (o: OrderDto) =>
  o.paymentMethod === 'COD'
    ? 'Cash'
    : o.paymentStatus === 'PAID'
      ? 'Paid online'
      : 'Awaiting payment';

/** One order as a clickable card → opens /admin/orders/:id. */
export function OrderListItem({
  order: o,
  showCustomer = true,
}: {
  order: OrderDto;
  showCustomer?: boolean;
}) {
  const who = o.customer?.name ?? 'Customer';
  return (
    <Link
      to={`/admin/orders/${o.id}`}
      className="group flex items-center gap-3 rounded-2xl bg-surface p-3.5 ring-1 ring-line/70 transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary"
    >
      {showCustomer && <Avatar name={who} />}
      <span className="grid min-w-0 flex-1 grid-cols-[1fr_auto] gap-x-3 gap-y-0.5">
        <span className="truncate font-semibold group-hover:text-primary-strong">
          {showCustomer ? who : `#${o.orderNumber.slice(-4)}`}
        </span>
        <span className="tabular text-right font-bold">{formatPaise(o.totalPaise)}</span>
        <span className="tabular truncate text-[13px] text-muted">
          {showCustomer ? `#${o.orderNumber.slice(-4)} · ` : `${dateTime(o.timeline.placedAt)} · `}
          {itemsLine(o)}
        </span>
        {showCustomer ? <WaitTime order={o} /> : <span />}
        <span className="col-span-2 mt-1.5 flex flex-wrap items-center gap-1.5">
          <StatusBadge status={o.status} />
          <span className="rounded-full bg-panel px-2 py-0.5 text-[11px] font-semibold text-muted">
            {payLabel(o)}
          </span>
          {o.partner && (
            <span className="rounded-full bg-panel px-2 py-0.5 text-[11px] font-semibold text-muted">
              Rider: {o.partner.name}
            </span>
          )}
        </span>
      </span>
      <ChevronRight
        className="size-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
}

type Scope = 'all' | 'active' | 'done';
const ACTIVE = new Set([
  'PLACED',
  'ACCEPTED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'ASSIGNED',
  'PICKED_UP',
  'OUT_FOR_DELIVERY',
]);

/** Every order for one customer or one rider, newest first, 50 at a time. */
export function OrderHistory({
  filter,
  title,
  showCustomer = true,
}: {
  filter: { customerId?: string; partnerId?: string };
  title: string;
  showCustomer?: boolean;
}) {
  const [scope, setScope] = useState<Scope>('all');
  const orders = useInfiniteQuery({
    queryKey: ['admin', 'orders', 'history', filter],
    queryFn: ({ pageParam }) =>
      api.page<OrderDto>(`/admin/orders${qs({ ...filter, page: pageParam, limit: 50 })}`),
    initialPageParam: 1,
    getNextPageParam: (last, all) =>
      all.reduce((n, p) => n + p.items.length, 0) < last.meta.total ? all.length + 1 : undefined,
    refetchInterval: 30_000,
  });
  const all = orders.data?.pages.flatMap((p) => p.items) ?? [];
  const total = orders.data?.pages[0]?.meta.total ?? 0;
  const list = all.filter((o) =>
    scope === 'all' ? true : scope === 'active' ? ACTIVE.has(o.status) : !ACTIVE.has(o.status),
  );

  return (
    <section
      className="flex flex-col gap-4 rounded-[20px] bg-surface p-4 ring-1 ring-line/70 md:p-5"
      aria-labelledby="history-h"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="history-h" className="text-lg font-bold">
          {title} <span className="tabular text-base font-semibold text-muted">({total})</span>
        </h2>
        <FilterTabs
          label="Show orders"
          value={scope}
          onChange={setScope}
          options={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Ongoing' },
            { value: 'done', label: 'Completed' },
          ]}
        />
      </header>
      {orders.isError ? (
        <ErrorState onRetry={() => orders.refetch()} />
      ) : orders.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-9" />}
          title="No orders here"
          body={
            scope === 'all'
              ? 'Orders will appear here once they’re placed.'
              : 'Nothing in this view.'
          }
        />
      ) : (
        <>
          <ul className="grid gap-2 xl:grid-cols-2">
            {list.map((o) => (
              <li key={o.id} className="min-w-0">
                <OrderListItem order={o} showCustomer={showCustomer} />
              </li>
            ))}
          </ul>
          {orders.hasNextPage && (
            <Button
              variant="secondary"
              className="self-center"
              loading={orders.isFetchingNextPage}
              onClick={() => orders.fetchNextPage()}
            >
              Show older orders
            </Button>
          )}
        </>
      )}
    </section>
  );
}

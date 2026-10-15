import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  BellRing,
  Bike,
  Check,
  ChefHat,
  ClipboardList,
  Clock,
  IndianRupee,
  PackageCheck,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { formatPaise, type OrderDto, type OrderStatus } from '@a3/contracts';
import { Button, ButtonLink, Card, ErrorState, Skeleton, Toggle, cx } from '@/components/ui';
import { adminApi, adminKeys } from './admin-api';
import { NoticeBar, PageHeader, StatCard, errorText, timeAgo, type Notice } from './admin-ui';
import { useOrderAction } from './OrderActions';

type Lane = {
  id: string;
  title: string;
  hint: string;
  empty: string;
  icon: typeof Check;
  statuses: OrderStatus[];
};
const LANES: Lane[] = [
  {
    id: 'new',
    title: 'New',
    hint: 'Accept or reject',
    empty: 'No new orders',
    icon: BellRing,
    statuses: ['PLACED'],
  },
  {
    id: 'kitchen',
    title: 'Cooking',
    hint: 'Start, then mark ready',
    empty: 'Nothing on the stove',
    icon: ChefHat,
    statuses: ['ACCEPTED', 'PREPARING'],
  },
  {
    id: 'ready',
    title: 'Ready',
    hint: 'Assign a rider',
    empty: 'Nothing waiting for pickup',
    icon: PackageCheck,
    statuses: ['READY_FOR_PICKUP'],
  },
  {
    id: 'road',
    title: 'On the road',
    hint: 'With the rider',
    empty: 'No riders out',
    icon: Bike,
    statuses: ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'],
  },
];

const NEXT: Partial<
  Record<OrderStatus, { action: 'accept' | 'prepare' | 'ready'; label: string; icon: typeof Check }>
> = {
  PLACED: { action: 'accept', label: 'Accept order', icon: Check },
  ACCEPTED: { action: 'prepare', label: 'Start cooking', icon: ChefHat },
  PREPARING: { action: 'ready', label: 'Mark ready', icon: PackageCheck },
};

const ROAD_LABEL: Partial<Record<OrderStatus, string>> = {
  ASSIGNED: 'heading to kitchen',
  PICKED_UP: 'picked up',
  OUT_FOR_DELIVERY: 'out for delivery',
};

/** Admin · Overview — a live kitchen board: one column per stage, one big button per ticket. */
export function AdminOverviewPage() {
  const [notice, setNotice] = useState<Notice>();
  const summary = useQuery({
    queryKey: adminKeys.summary,
    queryFn: adminApi.summary,
    refetchInterval: 15_000,
  });
  const queue = useQuery({
    queryKey: adminKeys.orders({ status: 'ACTIVE' }),
    queryFn: () => adminApi.orders({ status: 'ACTIVE' }),
    refetchInterval: 15_000,
  });
  const act = useOrderAction(
    (o, action) =>
      setNotice({
        tone: 'success',
        text: `${o.orderNumber} ${action === 'accept' ? 'accepted' : action === 'prepare' ? 'is cooking' : 'is ready for pickup'}.`,
      }),
    (text) => setNotice({ tone: 'danger', text }),
  );

  const items = queue.data?.items ?? [];
  const s = summary.data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Kitchen board"
        description="Every live order, by stage. Press the button on a ticket to move it along."
        actions={<KitchenSwitch onError={(text) => setNotice({ tone: 'danger', text })} />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard
          label="Live orders"
          value={s ? String(s.liveOrders ?? s.ordersToday) : '-'}
          to="/admin/orders?status=ACTIVE"
          icon={<ClipboardList className="size-[18px]" />}
          hint={
            s
              ? `${s.ordersToday} placed today · ${s.yesterday?.orders ?? 0} yesterday`
              : 'On the board now'
          }
        />
        <StatCard
          label="Revenue today"
          value={s ? formatPaise(s.revenueTodayPaise) : '-'}
          to="/admin/reports"
          tone="green"
          icon={<IndianRupee className="size-[18px]" />}
          hint={s ? `Yesterday ${formatPaise(s.yesterday?.revenuePaise ?? 0)}` : 'Money received'}
        />
        <StatCard
          label="Delivered today"
          value={s ? String(s.byStatus.DELIVERED ?? 0) : '-'}
          to="/admin/orders?status=DELIVERED"
          tone="blue"
          icon={<PackageCheck className="size-[18px]" />}
          hint={s ? `Yesterday ${s.yesterday?.delivered ?? 0}` : 'Completed'}
        />
        <StatCard
          label="Cancelled today"
          value={s ? String((s.byStatus.CANCELLED ?? 0) + (s.byStatus.REJECTED ?? 0)) : '-'}
          to="/admin/orders?status=CANCELLED"
          tone="pink"
          icon={<XCircle className="size-[18px]" />}
          hint={s ? `Yesterday ${s.yesterday?.cancelled ?? 0}` : 'Rejected or cancelled'}
        />
      </div>

      <NoticeBar notice={notice} onDismiss={() => setNotice(undefined)} />

      {queue.isError ? (
        <Card>
          <ErrorState onRetry={() => queue.refetch()} />
        </Card>
      ) : (
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:-mx-8 md:px-8 xl:mx-0 xl:grid xl:grid-cols-4 xl:overflow-visible xl:px-0">
          {LANES.map((lane) => {
            const orders = items
              .filter((o) => lane.statuses.includes(o.status))
              .sort((x, y) => Date.parse(x.timeline.placedAt) - Date.parse(y.timeline.placedAt));
            const tone = LANE_TONE[lane.id]!;
            const late = orders.filter((o) => waitLevel(o) === 'late').length;
            return (
              <section
                key={lane.id}
                aria-labelledby={`lane-${lane.id}`}
                className="flex w-[85vw] max-w-sm shrink-0 snap-start flex-col rounded-[24px] bg-surface ring-1 ring-line/70 sm:w-80 xl:w-auto xl:max-w-none"
              >
                <header className="flex items-center gap-3 border-b border-line/70 px-4 py-3.5">
                  <span
                    className={cx(
                      'grid size-9 shrink-0 place-items-center rounded-full',
                      tone.chip,
                    )}
                    aria-hidden
                  >
                    <lane.icon className="size-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 id={`lane-${lane.id}`} className="flex items-center gap-2 font-bold">
                      {lane.title}
                      <span
                        className={cx(
                          'tabular grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-xs font-bold',
                          orders.length ? tone.count : 'bg-panel text-muted',
                        )}
                      >
                        {queue.isPending ? '' : orders.length}
                      </span>
                    </h2>
                    <p className="truncate text-xs text-muted">
                      {late > 0 ? (
                        <span className="font-semibold text-danger">{late} running late</span>
                      ) : (
                        lane.hint
                      )}
                    </p>
                  </div>
                </header>
                <div className="flex min-h-48 flex-1 flex-col gap-2.5 p-2.5">
                  {queue.isPending ? (
                    <Skeleton className="h-32 rounded-2xl" />
                  ) : orders.length === 0 ? (
                    <div className="m-auto flex flex-col items-center gap-2 px-4 py-8 text-center">
                      <span className="grid size-11 place-items-center rounded-full bg-panel text-muted">
                        <lane.icon className="size-5" aria-hidden />
                      </span>
                      <p className="text-sm font-semibold">{lane.empty}</p>
                    </div>
                  ) : (
                    orders.map((o) => (
                      <Ticket
                        key={o.id}
                        order={o}
                        busy={act.isPending && act.variables?.id === o.id}
                        onAct={(action) => act.mutate({ id: o.id, action })}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <div className="flex justify-end">
        <ButtonLink to="/admin/orders" variant="ghost" size="sm">
          All orders and history <ArrowRight className="size-4" aria-hidden />
        </ButtonLink>
      </div>
    </div>
  );
}

const LANE_TONE: Record<string, { chip: string; count: string }> = {
  new: { chip: 'bg-primary-soft text-primary-strong', count: 'bg-primary-strong text-surface' },
  kitchen: { chip: 'bg-[#fff1d6] text-[#9a5b00]', count: 'bg-[#9a5b00] text-surface' },
  ready: { chip: 'bg-success/12 text-success', count: 'bg-success text-surface' },
  road: { chip: 'bg-[#e4f0fd] text-[#1d5fa8]', count: 'bg-[#1d5fa8] text-surface' },
};

/** How long the order has waited in the kitchen's hands (rider time isn't the kitchen's clock). */
function waitMinutes(o: OrderDto) {
  return Math.max(0, Math.round((Date.now() - Date.parse(o.timeline.placedAt)) / 60_000));
}
function waitLevel(o: OrderDto): 'ok' | 'soon' | 'late' {
  if (!['PLACED', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP'].includes(o.status)) return 'ok';
  const m = waitMinutes(o);
  return m >= 25 ? 'late' : m >= 12 ? 'soon' : 'ok';
}
const ago = (m: number) =>
  m < 60
    ? `${m} min`
    : m < 24 * 60
      ? `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} m` : ''}`.trim()
      : `${Math.floor(m / 1440)} d`;

function Ticket({
  order: o,
  busy,
  onAct,
}: {
  order: OrderDto;
  busy: boolean;
  onAct: (a: 'accept' | 'prepare' | 'ready') => void;
}) {
  const next = NEXT[o.status];
  const detail = `/admin/orders/${o.id}`;
  const unpaidOnline = o.paymentMethod === 'RAZORPAY' && o.paymentStatus !== 'PAID';
  const level = waitLevel(o);
  const mins = waitMinutes(o);
  const isNew = o.status === 'PLACED';
  return (
    <article
      className={cx(
        'relative flex flex-col gap-2.5 rounded-2xl bg-surface p-3.5 ring-1 transition-shadow hover:shadow-md',
        level === 'late' ? 'ring-2 ring-danger/50' : isNew ? 'ring-primary/40' : 'ring-line/80',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            to={detail}
            aria-label={`Open order ${o.orderNumber}`}
            className="tabular text-base font-bold outline-none after:absolute after:inset-0 after:rounded-2xl after:content-['']"
          >
            #{o.orderNumber.slice(-4)}
          </Link>
          <p className="truncate text-[13px] text-muted">{o.customer?.name ?? 'Customer'}</p>
        </div>
        <span
          className={cx(
            'tabular inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold',
            level === 'late'
              ? 'bg-danger/12 text-danger'
              : level === 'soon'
                ? 'bg-warning/15 text-warning'
                : 'bg-panel text-muted',
          )}
          title={`Placed ${new Date(o.timeline.placedAt).toLocaleString('en-IN')}`}
        >
          <Clock className="size-3" aria-hidden />
          {ago(mins)}
        </span>
      </div>

      <ul className="flex flex-col gap-0.5 text-[13px] leading-5">
        {o.items.slice(0, 3).map((i, n) => (
          <li key={n} className="flex gap-1.5">
            <span className="tabular w-6 shrink-0 font-bold">{i.quantity}×</span>
            <span className="min-w-0 truncate">
              {i.productName}
              {i.variantName && <span className="text-muted"> · {i.variantName}</span>}
            </span>
          </li>
        ))}
        {o.items.length > 3 && <li className="pl-7.5 text-muted">+{o.items.length - 3} more</li>}
      </ul>

      <div className="flex items-center justify-between gap-2">
        <span className="tabular text-sm font-bold">{formatPaise(o.totalPaise)}</span>
        <span
          className={cx(
            'rounded-full px-2 py-0.5 text-[11px] font-bold',
            o.paymentMethod === 'COD'
              ? 'bg-warning/12 text-warning'
              : unpaidOnline
                ? 'bg-danger/10 text-danger'
                : 'bg-success/12 text-success',
          )}
        >
          {o.paymentMethod === 'COD' ? 'Cash' : unpaidOnline ? 'Unpaid' : 'Paid'}
        </span>
      </div>

      {/* Actions sit above the stretched link so they stay clickable. */}
      <div className="relative z-10">
        {next && !(isNew && unpaidOnline) ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={isNew ? 'primary' : 'secondary'}
              className="flex-1"
              loading={busy}
              icon={<next.icon className="size-4" aria-hidden />}
              onClick={() => onAct(next.action)}
            >
              {next.label}
            </Button>
            {isNew && (
              <ButtonLink
                to={detail}
                size="sm"
                variant="ghost"
                className="text-muted hover:text-danger"
                aria-label={`Reject order ${o.orderNumber}`}
              >
                Reject
              </ButtonLink>
            )}
          </div>
        ) : o.status === 'READY_FOR_PICKUP' ? (
          <ButtonLink
            to={detail}
            size="sm"
            variant="secondary"
            className="w-full"
            icon={<UserPlus className="size-4" aria-hidden />}
          >
            Assign rider
          </ButtonLink>
        ) : o.partner ? (
          <p className="flex items-center gap-2 rounded-xl bg-panel px-3 py-2 text-[13px]">
            <Bike className="size-4 shrink-0 text-muted" aria-hidden />
            <span className="truncate">
              <span className="font-semibold">{o.partner.name}</span>{' '}
              <span className="text-muted">{ROAD_LABEL[o.status] ?? ''}</span>
            </span>
          </p>
        ) : (
          <p className="rounded-xl bg-panel px-3 py-2 text-[13px] text-muted">
            Waiting for the customer to pay online.
          </p>
        )}
      </div>
    </article>
  );
}

/** Open / pause new orders — the switch the kitchen reaches for most. */
function KitchenSwitch({ onError }: { onError: (text: string) => void }) {
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: adminKeys.settings, queryFn: adminApi.settings });
  const toggle = useMutation({
    mutationFn: (open: boolean) => adminApi.updateSettings({ isAcceptingOrders: open }),
    onSuccess: (s) => qc.setQueryData(adminKeys.settings, s),
    onError: (e) => onError(errorText(e)),
  });
  if (!settings.data) return null;
  const open = settings.data.isAcceptingOrders;
  return (
    <label
      className={cx(
        'inline-flex min-h-11 cursor-pointer items-center gap-3 rounded-full py-2 pl-2 pr-4 text-sm font-semibold ring-1 ring-inset',
        open
          ? 'bg-success/10 text-success ring-success/25'
          : 'bg-danger/10 text-danger ring-danger/25',
      )}
    >
      <Toggle
        checked={open}
        label="Taking new orders"
        disabled={toggle.isPending}
        onChange={(v) => toggle.mutate(v)}
      />
      <span aria-hidden>{open ? 'Taking orders' : 'Orders paused'}</span>
    </label>
  );
}

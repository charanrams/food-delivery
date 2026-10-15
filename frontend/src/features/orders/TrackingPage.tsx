import { useState, type ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bike, Check, ChevronRight, CircleX, ClipboardList, CreditCard, Download, KeyRound, MapPin, Phone, RefreshCw, SearchX } from 'lucide-react';
import { formatPaise, type OrderDto, type OrderStatus } from '@a3/contracts';
import { Button, ButtonLink, EmptyState, ErrorState, FoodImage, Skeleton, StatusBadge, cx } from '@/components/ui';
import { PageFrame } from '@/components/frame';
import { ApiError } from '@/lib/api';
import { sized } from '@/lib/catalog-api';
import { ACTIVE, addressLine, orderQuery, ordersQuery, reopenPayment } from '@/lib/orders-api';
import { payWithRazorpay } from '@/lib/razorpay';

// Customer-facing timeline (ASSIGNED is folded into "Ready" to keep it short).
const STEPS: { status: OrderStatus; label: string; at: keyof OrderDto['timeline']; hint?: string }[] = [
  { status: 'PLACED', label: 'Order placed', at: 'placedAt' },
  { status: 'ACCEPTED', label: 'Accepted by kitchen', at: 'acceptedAt' },
  { status: 'PREPARING', label: 'Preparing your food', at: 'preparingAt' },
  { status: 'READY_FOR_PICKUP', label: 'Ready for pickup', at: 'readyAt' },
  { status: 'PICKED_UP', label: 'Picked up by your delivery partner', at: 'pickedUpAt' },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for delivery', at: 'outForDeliveryAt', hint: 'Share your delivery code at the door' },
  { status: 'DELIVERED', label: 'Delivered', at: 'deliveredAt' },
];
const stepIndex = (s: OrderStatus) => (s === 'ASSIGNED' ? 3 : STEPS.findIndex((x) => x.status === s));
const time = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '');
const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const headline = (o: OrderDto) =>
  ({
    PLACED: o.paymentMethod === 'RAZORPAY' && o.paymentStatus !== 'PAID' ? 'Waiting for payment' : 'Waiting for the kitchen',
    ACCEPTED: 'The kitchen accepted your order',
    PREPARING: 'Your food is being prepared',
    READY_FOR_PICKUP: 'Packed and ready',
    ASSIGNED: 'A delivery partner is on the way to the kitchen',
    PICKED_UP: 'Your order has been picked up',
    OUT_FOR_DELIVERY: 'On the way to you',
    DELIVERED: 'Delivered. Enjoy your meal!',
    REJECTED: 'The kitchen couldn’t take this order',
    CANCELLED: 'This order was cancelled',
  })[o.status];

const PAY_METHOD: Record<string, string> = { RAZORPAY: 'Online (Razorpay)', COD: 'Cash on delivery' };
const PAY_STATUS: Record<string, string> = {
  PAID: 'Paid',
  PENDING: 'Pending',
  AUTHORIZED: 'Authorised',
  FAILED: 'Failed',
  REFUND_PENDING: 'Refund in progress',
  PARTIALLY_REFUNDED: 'Partly refunded',
  REFUNDED: 'Refunded',
};

function Row({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className={strong ? 'font-bold' : 'text-muted'}>{label}</dt>
      <dd className={cx('tabular text-right', strong ? 'font-bold' : 'font-medium')}>{value}</dd>
    </div>
  );
}

/** Full order summary: items, price breakdown, payment and delivery details. */
function ItemsSummary({ o }: { o: OrderDto }) {
  const count = o.items.reduce((n, i) => n + i.quantity, 0);
  return (
    <section className="flex flex-col overflow-hidden rounded-[20px] border border-line/70 bg-surface" aria-labelledby="sum-h">
      <header className="flex items-baseline justify-between gap-3 px-5 pt-5">
        <h3 id="sum-h" className="text-lg font-bold">Order summary</h3>
        <span className="text-[13px] text-muted">
          {count} item{count === 1 ? '' : 's'}
        </span>
      </header>

      <ul className="flex flex-col divide-y divide-line/60 px-5">
        {o.items.map((i) => (
          <li key={i.productId + (i.variantName ?? '')} className="flex items-center gap-3 py-3.5">
            {i.imageUrl ? (
              <FoodImage src={sized(i.imageUrl, 120)} alt="" className="size-12 shrink-0 rounded-xl" />
            ) : (
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-soft">
                <ClipboardList className="size-5 text-primary-strong" aria-hidden />
              </span>
            )}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-semibold">{i.productName}</span>
              {i.variantName && <span className="text-[13px] text-muted">{i.variantName}</span>}
              <span className="tabular text-[13px] text-muted">
                {i.quantity} × {formatPaise(i.unitPricePaise)}
              </span>
            </span>
            <span className="tabular font-semibold">{formatPaise(i.lineTotalPaise)}</span>
          </li>
        ))}
      </ul>

      <dl className="mx-5 flex flex-col gap-2 border-t border-dashed border-line py-4 text-sm">
        <Row label="Item total" value={formatPaise(o.subtotalPaise)} />
        {o.discountPaise > 0 && <Row label="Discount" value={<span className="text-success">− {formatPaise(o.discountPaise)}</span>} />}
        <Row label="Delivery fee" value={o.deliveryFeePaise ? formatPaise(o.deliveryFeePaise) : 'Free'} />
        <Row label="GST" value={formatPaise(o.taxPaise)} />
      </dl>
      <div className="mx-5 mb-4 flex items-baseline justify-between rounded-xl bg-primary-soft px-4 py-3">
        <span className="font-bold">{o.paymentStatus === 'PAID' ? 'Total paid' : o.paymentMethod === 'COD' ? 'To pay on delivery' : 'Total'}</span>
        <span className="tabular font-display text-xl font-bold text-primary-strong">{formatPaise(o.totalPaise)}</span>
      </div>

      <dl className="flex flex-col gap-2 border-t border-line/60 bg-card/50 px-5 py-4 text-sm">
        <Row label="Order number" value={o.orderNumber} />
        <Row label="Placed on" value={when(o.timeline.placedAt)} />
        <Row label="Payment" value={PAY_METHOD[o.paymentMethod] ?? o.paymentMethod} />
        <Row label="Payment status" value={PAY_STATUS[o.paymentStatus] ?? o.paymentStatus} />
        {o.timeline.deliveredAt && <Row label="Delivered at" value={when(o.timeline.deliveredAt)} />}
      </dl>

      <div className="flex items-start gap-3 border-t border-line/60 px-5 py-4 text-sm">
        <MapPin className="mt-0.5 size-5 shrink-0 text-primary-strong" aria-hidden />
        <div className="flex min-w-0 flex-col">
          <span className="font-semibold">Delivering to</span>
          <span className="text-muted">{addressLine(o.deliveryAddress)}</span>
        </div>
      </div>
    </section>
  );
}

/** W08 · Order tracking + delivery code (mockup screen 15) */
export function TrackingPage() {
  const { orderId = '' } = useParams();
  const location = useLocation();
  const qc = useQueryClient();
  const order = useQuery(orderQuery(orderId));
  const [busy, setBusy] = useState<'pay'>();
  const [notice, setNotice] = useState<string | undefined>((location.state as { paymentMessage?: string } | null)?.paymentMessage);

  if (order.isError)
    return (
      <PageFrame title="Track order">
        {order.error instanceof ApiError && order.error.status === 404 ? (
          <EmptyState icon={<SearchX className="size-9" />} title="Order not found" body="We couldn’t find this order on your account." action={<ButtonLink to="/orders">Your orders</ButtonLink>} />
        ) : (
          <ErrorState onRetry={() => order.refetch()} />
        )}
      </PageFrame>
    );
  if (order.isPending)
    return (
      <PageFrame title="Track order">
        <Skeleton className="h-96" />
      </PageFrame>
    );

  const o = order.data;
  const ended = o.status === 'CANCELLED' || o.status === 'REJECTED';
  const current = stepIndex(o.status);
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['order', o.id] });
    void qc.invalidateQueries({ queryKey: ordersQuery.queryKey });
  };

  const pay = async () => {
    setBusy('pay');
    setNotice(undefined);
    try {
      const r = await payWithRazorpay(o.id, await reopenPayment(o.id));
      setNotice(r.result === 'paid' ? 'Payment received. The kitchen will accept your order shortly.' : r.message);
    } catch (e) {
      setNotice(e instanceof ApiError ? e.message : 'Couldn’t start the payment.');
    } finally {
      setBusy(undefined);
      refresh();
    }
  };

  return (
    <PageFrame
      title="Track order"
      actions={
        <Link
          to={`/orders/${o.id}/bill?download=1`}
          aria-label="Download bill"
          title="Download bill"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-surface ring-[1.5px] ring-surface/70 hover:bg-surface/15 focus-visible:outline-2 focus-visible:outline-surface"
        >
          <Download className="size-5" aria-hidden />
          <span className="hidden sm:inline">Bill</span>
        </Link>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div className="flex flex-col items-start gap-2">
            <StatusBadge status={o.status} />
            <h2 className="font-display text-[1.75rem] leading-tight md:text-4xl">{headline(o)}</h2>
            <p className="text-[15px] text-muted">
              Order <span className="tabular">{o.orderNumber}</span> · placed {when(o.timeline.placedAt)}
            </p>
          </div>
          {ACTIVE(o) && (
            <p className="flex items-center gap-1.5 text-[13px] text-muted" aria-live="polite">
              <RefreshCw className={cx('size-4', order.isFetching && 'animate-spin')} aria-hidden /> Live · refreshes every 10 s
            </p>
          )}
        </div>

        {notice && (
          <p role="status" className="rounded-[14px] bg-primary-soft p-4 text-sm font-medium">
            {notice}
          </p>
        )}

        {o.actions.includes('pay') && (
          <div>
            <Button onClick={pay} loading={busy === 'pay'} icon={<CreditCard className="size-[18px]" />}>
              Pay {formatPaise(o.totalPaise)}
            </Button>
          </div>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-[1fr_400px] lg:gap-8">
          <section className="rounded-[18px] bg-card p-6" aria-labelledby="prog-h">
            <h3 id="prog-h" className="mb-5 text-lg font-bold">
              Order progress
            </h3>
            {ended ? (
              <p className="flex items-start gap-3 text-[15px]">
                <CircleX className="size-6 shrink-0 text-danger" aria-hidden />
                <span>
                  {o.rejectionReason ?? o.cancellationReason ?? 'This order won’t be delivered.'}
                  {o.paymentStatus === 'REFUNDED' || o.paymentStatus === 'REFUND_PENDING' ? ' Your refund is on its way.' : ''}
                </span>
              </p>
            ) : (
              <ol>
                {STEPS.map((s, i) => {
                  const state = i < current || o.status === 'DELIVERED' ? 'done' : i === current ? 'current' : 'pending';
                  const last = i === STEPS.length - 1;
                  return (
                    <li key={s.status} className="flex gap-4" aria-current={state === 'current' ? 'step' : undefined}>
                      <div className="flex w-7 flex-col items-center">
                        <span
                          className={cx(
                            'grid size-7 shrink-0 place-items-center rounded-full',
                            state === 'done' && 'bg-success text-surface',
                            state === 'current' && 'bg-primary text-surface',
                            state === 'pending' && 'bg-surface ring-2 ring-inset ring-line',
                          )}
                        >
                          {state === 'done' && <Check className="size-4" strokeWidth={2.6} aria-hidden />}
                          {state === 'current' && <Bike className="size-4" aria-hidden />}
                        </span>
                        {!last && <span className={cx('min-h-7 w-0.5 flex-1', state === 'done' ? 'bg-success' : 'bg-line')} />}
                      </div>
                      <div className="flex flex-1 items-start justify-between gap-3 pb-4 pt-1">
                        <span className="flex flex-col gap-0.5">
                          <span className={cx('text-[15px]', state === 'current' ? 'font-bold' : state === 'done' ? 'font-medium' : 'text-muted')}>
                            {s.label}
                            <span className="sr-only">, {state === 'done' ? 'completed' : state === 'current' ? 'in progress' : 'not yet'}</span>
                          </span>
                          {s.hint && state === 'current' && <span className="text-[13px] text-primary-strong">{s.hint}</span>}
                        </span>
                        <span className="tabular text-[13px] text-muted">{time(o.timeline[s.at])}</span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <div className="flex flex-col gap-5">
            {o.deliveryOtp && (
              <section className="flex flex-col gap-3.5 rounded-[18px] bg-primary-soft p-6" aria-labelledby="otp-h">
                <h3 id="otp-h" className="flex items-center gap-2 font-bold text-primary-strong">
                  <KeyRound className="size-[18px]" aria-hidden /> Your delivery code
                </h3>
                <p className="grid grid-cols-6 gap-2" aria-label={`Delivery code ${o.deliveryOtp.split('').join(' ')}`}>
                  {o.deliveryOtp.split('').map((d, i) => (
                    <span key={i} aria-hidden className="tabular grid h-16 place-items-center rounded-[10px] bg-surface font-display text-[2rem]">
                      {d}
                    </span>
                  ))}
                </p>
                <p className="text-[13px] leading-[19px]">Give this code to your delivery partner only when you have your food. A3 Kitchen will never ask for it on a call.</p>
              </section>
            )}

            {o.partner && ACTIVE(o) && (
              <section className="flex items-center gap-3.5 rounded-[18px] bg-card p-5">
                <span className="grid size-12 place-items-center rounded-full bg-surface font-bold text-primary-strong" aria-hidden>
                  {o.partner.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                </span>
                <div className="flex-1">
                  <p className="font-bold">{o.partner.name}</p>
                  <p className="text-[13px] text-muted">Your delivery partner{o.partner.vehicleNumber ? ` · ${o.partner.vehicleNumber}` : ''}</p>
                </div>
                <a href={`tel:${o.partner.phone}`} className="inline-flex min-h-10 items-center gap-2 rounded-[10px] bg-surface px-3.5 text-[13px] font-semibold text-primary-strong ring-1 ring-inset ring-primary hover:bg-primary-soft">
                  <Phone className="size-4" aria-hidden /> Call
                </a>
              </section>
            )}

            <ItemsSummary o={o} />
          </div>
        </div>
      </div>
    </PageFrame>
  );
}

/** W09 · Order history — Ongoing/Past tabs. */
export function OrdersPage() {
  const orders = useQuery(ordersQuery);
  const [tab, setTab] = useState<'active' | 'past'>('active');
  const all = orders.data ?? [];
  const activeCount = all.filter(ACTIVE).length;
  const counts = { active: activeCount, past: all.length - activeCount };
  const list = all.filter((o) => (tab === 'active') === ACTIVE(o));

  return (
    <PageFrame title="My Orders" back={false}>
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <div role="tablist" aria-label="Orders" className="grid grid-cols-2 gap-1 rounded-2xl bg-card p-1">
          {(['active', 'past'] as const).map((t) => (
            <button
              key={t}
              role="tab"
              type="button"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cx(
                'flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-primary',
                tab === t ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
              )}
            >
              {t === 'active' ? 'Ongoing' : 'Past orders'}
              {orders.data && (
                <span className={cx('tabular rounded-full px-2 py-0.5 text-xs', tab === t ? 'bg-primary-soft text-primary-strong' : 'bg-surface/70')}>
                  {counts[t]}
                </span>
              )}
            </button>
          ))}
        </div>

        {orders.isError ? (
          <ErrorState onRetry={() => orders.refetch()} />
        ) : orders.isPending ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="size-9" />}
            title={tab === 'active' ? 'No ongoing orders' : 'No past orders yet'}
            body={tab === 'active' ? 'When you place an order, you can follow it here.' : 'Your delivered and cancelled orders will show up here.'}
            action={<ButtonLink to="/menu">Browse the menu</ButtonLink>}
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {list.map((o) => (
              <li key={o.id} className="min-w-0">
                <Link to={`/orders/${o.id}`} className="flex items-center gap-3.5 rounded-[20px] border border-line/70 bg-surface p-4 transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-primary">
                  {o.items[0]?.imageUrl ? (
                    <FoodImage src={sized(o.items[0].imageUrl, 160)} alt="" className="size-16 shrink-0 rounded-[14px]" />
                  ) : (
                    <span className="grid size-16 shrink-0 place-items-center rounded-[14px] bg-primary-soft">
                      <ClipboardList className="size-6 text-primary-strong" aria-hidden />
                    </span>
                  )}
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="tabular truncate font-bold">{o.orderNumber}</span>
                      <StatusBadge status={o.status} />
                    </span>
                    <span className="truncate text-[13px] text-muted">{o.items.map((i) => `${i.quantity}× ${i.productName}`).join(', ')}</span>
                    <span className="flex justify-between text-[13px]">
                      <span className="text-muted">{when(o.timeline.placedAt)}</span>
                      <span className="tabular font-bold">{formatPaise(o.totalPaise)}</span>
                    </span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageFrame>
  );
}

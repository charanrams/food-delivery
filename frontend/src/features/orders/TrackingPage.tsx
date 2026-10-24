import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bike, CalendarDays, Check, ChefHat, ChevronRight, CircleCheck, CircleX, ClipboardList, Clock, CookingPot, CreditCard, Download, Headset, House, KeyRound, MapPin, Navigation, Phone, RefreshCw, RotateCcw, Search, SearchX, ShoppingBag, Star, X } from 'lucide-react';
import { formatPaise, type OrderDto, type OrderStatus, type ProductDto } from '@a3/contracts';
import { Button, ButtonLink, EmptyState, ErrorState, FoodImage, Skeleton, StatusBadge, cx } from '@/components/ui';
import { ArtIconButton, PageFrame } from '@/components/frame';
import { ApiError, api } from '@/lib/api';
import { useCart } from '@/features/cart/CartContext';
import { sized } from '@/lib/catalog-api';
import { ACTIVE, addressLine, orderQuery, ordersQuery, reopenPayment } from '@/lib/orders-api';
import { payWithRazorpay } from '@/lib/razorpay';

// Customer-facing timeline (ASSIGNED is folded into "Ready" to keep it short).
const STEPS: { status: OrderStatus; label: string; at: keyof OrderDto['timeline']; icon: typeof Check }[] = [
  { status: 'PLACED', label: 'Order Placed', at: 'placedAt', icon: ChefHat },
  { status: 'ACCEPTED', label: 'Accepted by Kitchen', at: 'acceptedAt', icon: CircleCheck },
  { status: 'PREPARING', label: 'Preparing your Food', at: 'preparingAt', icon: CookingPot },
  { status: 'READY_FOR_PICKUP', label: 'Ready for Pickup', at: 'readyAt', icon: ShoppingBag },
  { status: 'PICKED_UP', label: 'Picked up by Partner', at: 'pickedUpAt', icon: Bike },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', at: 'outForDeliveryAt', icon: MapPin },
  { status: 'DELIVERED', label: 'Delivered', at: 'deliveredAt', icon: House },
];
const stepIndex = (s: OrderStatus) => (s === 'ASSIGNED' ? 3 : STEPS.findIndex((x) => x.status === s));
const time = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '');
const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const unpaid = (o: OrderDto) => o.paymentMethod === 'RAZORPAY' && o.paymentStatus !== 'PAID';
const headline = (o: OrderDto) =>
  ({
    PLACED: unpaid(o) ? 'Waiting for payment' : 'Waiting for the kitchen',
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
const blurb = (o: OrderDto) =>
  ({
    PLACED: unpaid(o) ? 'Complete the payment so the kitchen can start on your order.' : 'Your order has been placed and is waiting for the kitchen to accept it.',
    ACCEPTED: 'The kitchen will start cooking in a moment.',
    PREPARING: 'Your food is being freshly prepared by the kitchen.',
    READY_FOR_PICKUP: 'Your order is packed and waiting for a delivery partner.',
    ASSIGNED: 'Your delivery partner will collect it shortly.',
    PICKED_UP: 'Your delivery partner has your food.',
    OUT_FOR_DELIVERY: 'Share your delivery code at the door.',
    DELIVERED: 'Thanks for ordering from A3 Kitchen.',
    REJECTED: 'This order won’t be delivered.',
    CANCELLED: 'This order won’t be delivered.',
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
// Same support line as Account → Help.
const SUPPORT_PHONE = '+9118001234567';
const card = 'rounded-[20px] border border-line/70 bg-surface p-5';

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="tabular text-right font-medium">{value}</dd>
    </div>
  );
}

/** Horizontal progress: round icons joined by dashes, label + time under each. Scrolls sideways on narrow phones. */
function Progress({ o }: { o: OrderDto }) {
  const current = stepIndex(o.status);
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
      <ol className="flex min-w-[560px] items-start">
        {STEPS.map((s, i) => {
          const state = i < current || o.status === 'DELIVERED' ? 'done' : i === current ? 'current' : 'pending';
          const Icon = s.icon;
          return (
            <li key={s.status} className="relative flex flex-1 flex-col items-center gap-2 text-center" aria-current={state === 'current' ? 'step' : undefined}>
              {i > 0 && (
                <span
                  aria-hidden
                  className={cx('absolute right-[calc(50%+1.75rem)] top-7 w-[calc(100%-3.5rem)] border-t-2 border-dashed', state === 'pending' ? 'border-line' : 'border-primary')}
                />
              )}
              <span
                className={cx(
                  'grid size-14 place-items-center rounded-full',
                  state === 'current' && 'bg-primary text-surface shadow-[0_6px_16px_-6px_var(--color-primary)]',
                  state === 'done' && 'bg-primary-soft text-primary-strong',
                  state === 'pending' && 'bg-card text-muted',
                )}
              >
                <Icon className="size-6" aria-hidden />
              </span>
              <span className={cx('px-0.5 text-xs leading-4', state === 'pending' ? 'text-muted' : 'font-bold text-primary-strong')}>
                {s.label}
                <span className="sr-only">, {state === 'done' ? 'completed' : state === 'current' ? 'in progress' : 'not yet'}</span>
              </span>
              {o.timeline[s.at] && <span className="tabular -mt-1 text-[11px] text-muted">{time(o.timeline[s.at])}</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** W08 · Track order (VSR layout): status + ETA, horizontal steps, summary, details, address, help. */
export function TrackingPage() {
  const { orderId = '' } = useParams();
  const location = useLocation();
  const qc = useQueryClient();
  const order = useQuery(orderQuery(orderId));
  const [busy, setBusy] = useState<'pay'>();
  const [notice, setNotice] = useState<string | undefined>((location.state as { paymentMessage?: string } | null)?.paymentMessage);

  if (order.isError)
    return (
      <PageFrame title="Track Order">
        {order.error instanceof ApiError && order.error.status === 404 ? (
          <EmptyState icon={<SearchX className="size-9" />} title="Order not found" body="We couldn’t find this order on your account." action={<ButtonLink to="/orders">Your orders</ButtonLink>} />
        ) : (
          <ErrorState onRetry={() => order.refetch()} />
        )}
      </PageFrame>
    );
  if (order.isPending)
    return (
      <PageFrame title="Track Order">
        <Skeleton className="h-96" />
      </PageFrame>
    );

  const o = order.data;
  const ended = o.status === 'CANCELLED' || o.status === 'REJECTED';
  const count = o.items.reduce((n, i) => n + i.quantity, 0);
  const address = addressLine(o.deliveryAddress);
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
      art
      title="Track Order"
      subtitle={`Order #${o.orderNumber}`}
      actions={
        <Link
          to={`/orders/${o.id}/bill?download=1`}
          aria-label="Download bill"
          title="Download bill"
          className="grid size-11 place-items-center rounded-full bg-surface text-primary-strong shadow-md hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-surface"
        >
          <Download className="size-5" aria-hidden />
        </Link>
      }
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col items-start gap-2">
            <StatusBadge status={o.status} />
            <h2 className="flex items-center gap-2 font-display text-[1.6rem] leading-tight md:text-3xl">
              {headline(o)}
              {!ended && <ChefHat className="size-6 shrink-0 text-primary" aria-hidden />}
            </h2>
            <p className="text-[15px] text-muted">{blurb(o)}</p>
            {ACTIVE(o) && (
              <p className="flex items-center gap-1.5 text-xs text-muted" aria-live="polite">
                <RefreshCw className={cx('size-3.5', order.isFetching && 'animate-spin')} aria-hidden /> Updates live
              </p>
            )}
          </div>
          {!ended && (
            <div className="flex shrink-0 items-center gap-3 rounded-2xl bg-primary-soft/60 px-4 py-3">
              <Clock className="size-7 text-primary-strong" aria-hidden />
              <div>
                <p className="text-xs text-muted">{o.status === 'DELIVERED' ? 'Delivered at' : 'Estimated arrival'}</p>
                <p className="tabular font-display text-xl font-bold text-primary-strong">{o.status === 'DELIVERED' ? time(o.timeline.deliveredAt) : '30–40 mins'}</p>
                <p className="flex items-center gap-1 text-xs text-muted">
                  <CalendarDays className="size-3.5" aria-hidden /> Placed on {when(o.timeline.placedAt)}
                </p>
              </div>
            </div>
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

        {ended ? (
          <p className="flex items-start gap-3 rounded-[20px] bg-danger/8 p-5 text-[15px]">
            <CircleX className="size-6 shrink-0 text-danger" aria-hidden />
            <span>
              {o.rejectionReason ?? o.cancellationReason ?? 'This order won’t be delivered.'}
              {o.paymentStatus === 'REFUNDED' || o.paymentStatus === 'REFUND_PENDING' ? ' Your refund is on its way.' : ''}
            </span>
          </p>
        ) : (
          <Progress o={o} />
        )}

        {o.deliveryOtp && (
          <section className="flex flex-col gap-3.5 rounded-[20px] bg-primary-soft p-5" aria-labelledby="otp-h">
            <h3 id="otp-h" className="flex items-center gap-2 font-bold text-primary-strong">
              <KeyRound className="size-[18px]" aria-hidden /> Your delivery code
            </h3>
            <p className="grid grid-cols-6 gap-2" aria-label={`Delivery code ${o.deliveryOtp.split('').join(' ')}`}>
              {o.deliveryOtp.split('').map((d, i) => (
                <span key={i} aria-hidden className="tabular grid h-14 place-items-center rounded-[10px] bg-surface font-display text-[1.75rem]">
                  {d}
                </span>
              ))}
            </p>
            <p className="text-[13px] leading-[19px]">Give this code to your delivery partner only when you have your food. A3 Kitchen will never ask for it on a call.</p>
          </section>
        )}

        {o.partner && ACTIVE(o) && (
          <section className={cx(card, 'flex items-center gap-3.5')}>
            <span className="grid size-12 place-items-center rounded-full bg-primary-soft font-bold text-primary-strong" aria-hidden>
              {o.partner.name
                .split(' ')
                .map((w) => w[0])
                .slice(0, 2)
                .join('')}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{o.partner.name}</p>
              <p className="text-[13px] text-muted">Your delivery partner{o.partner.vehicleNumber ? ` · ${o.partner.vehicleNumber}` : ''}</p>
            </div>
            <a href={`tel:${o.partner.phone}`} className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-primary-strong ring-1 ring-inset ring-primary hover:bg-primary-soft">
              <Phone className="size-4" aria-hidden /> Call
            </a>
          </section>
        )}

        <section className={card} aria-labelledby="sum-h">
          <header className="flex items-baseline justify-between gap-3">
            <h3 id="sum-h" className="text-lg font-bold">
              Order Summary
            </h3>
            <span className="text-sm font-semibold text-primary-strong">
              {count} Item{count === 1 ? '' : 's'}
            </span>
          </header>
          <ul className="mt-3 flex flex-col divide-y divide-line/60">
            {o.items.map((i) => (
              <li key={i.productId + (i.variantName ?? '')} className="flex items-center gap-4 py-3">
                {i.imageUrl ? (
                  <FoodImage src={sized(i.imageUrl, 240)} alt="" className="h-20 w-28 shrink-0 rounded-2xl" />
                ) : (
                  <span className="grid h-20 w-28 shrink-0 place-items-center rounded-2xl bg-primary-soft">
                    <ClipboardList className="size-6 text-primary-strong" aria-hidden />
                  </span>
                )}
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="font-bold">{i.productName}</span>
                  {i.variantName && <span className="text-[13px] text-muted">{i.variantName}</span>}
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="tabular text-sm text-muted">
                      {i.quantity} × {formatPaise(i.unitPricePaise)}
                    </span>
                    <span className="tabular font-bold">{formatPaise(i.lineTotalPaise)}</span>
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <dl className="flex flex-col gap-2 border-t border-line/60 pt-4 text-sm">
            <Row label="Item total" value={formatPaise(o.subtotalPaise)} />
            {o.discountPaise > 0 && <Row label="Discount" value={<span className="text-success">− {formatPaise(o.discountPaise)}</span>} />}
            <Row label="Delivery fee" value={o.deliveryFeePaise ? formatPaise(o.deliveryFeePaise) : 'Free'} />
            <Row label="GST" value={formatPaise(o.taxPaise)} />
          </dl>
          <div className="mt-4 flex items-baseline justify-between rounded-2xl bg-primary-soft px-4 py-3.5">
            <span className="font-bold text-primary-strong">{o.paymentStatus === 'PAID' ? 'Total paid' : o.paymentMethod === 'COD' ? 'To pay on delivery' : 'Total'}</span>
            <span className="tabular font-display text-2xl font-bold text-primary-strong">{formatPaise(o.totalPaise)}</span>
          </div>
        </section>

        <section className={card} aria-labelledby="det-h">
          <h3 id="det-h" className="mb-3 text-lg font-bold">
            Order Details
          </h3>
          <dl className="flex flex-col gap-2.5 text-sm">
            <Row label="Order number" value={o.orderNumber} />
            <Row label="Placed on" value={when(o.timeline.placedAt)} />
            <Row label="Payment method" value={PAY_METHOD[o.paymentMethod] ?? o.paymentMethod} />
            <Row
              label="Payment status"
              value={
                <span className={cx('rounded-full px-3 py-1 text-[13px] font-semibold', o.paymentStatus === 'PAID' ? 'bg-success/12 text-success' : 'bg-primary-soft text-primary-strong')}>
                  {PAY_STATUS[o.paymentStatus] ?? o.paymentStatus}
                </span>
              }
            />
            {o.timeline.deliveredAt && <Row label="Delivered at" value={when(o.timeline.deliveredAt)} />}
          </dl>
        </section>

        <section className={cx(card, 'flex flex-col gap-3 sm:flex-row sm:items-center')}>
          <div className="flex min-w-0 flex-1 gap-3">
            <MapPin className="size-6 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0">
              <p className="font-bold">Delivering to</p>
              <p className="text-sm text-muted">{address}</p>
            </div>
          </div>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-full bg-primary-soft px-4 text-sm font-semibold text-primary-strong hover:brightness-95 sm:self-auto"
          >
            <Navigation className="size-4" aria-hidden /> View on Map
          </a>
        </section>

        <section className="flex flex-col gap-3 rounded-[20px] bg-primary-soft/60 p-5 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-surface text-primary-strong">
              <Headset className="size-6" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="font-bold text-primary-strong">Need help with your order?</p>
              <p className="text-sm text-muted">Contact our support team for any issues.</p>
            </div>
          </div>
          <a
            href={`tel:${SUPPORT_PHONE}`}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-surface px-5 text-sm font-semibold text-primary-strong ring-1 ring-inset ring-primary hover:bg-primary-soft"
          >
            Contact Support
          </a>
        </section>
      </div>
    </PageFrame>
  );
}

// Short progress shown on each order card.
const MINI: { label: string; done: (s: OrderStatus) => boolean; icon: typeof Check }[] = [
  { label: 'Placed', done: () => true, icon: ClipboardList },
  { label: 'Accepted', done: (s) => s !== 'PLACED', icon: CircleCheck },
  { label: 'Preparing', done: (s) => !['PLACED', 'ACCEPTED'].includes(s), icon: ChefHat },
  { label: 'Out for Delivery', done: (s) => ['PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(s), icon: Bike },
  { label: 'Delivered', done: (s) => s === 'DELIVERED', icon: House },
];

function MiniProgress({ o }: { o: OrderDto }) {
  const delivered = o.status === 'DELIVERED';
  const reached = MINI.filter((m) => m.done(o.status)).length - 1;
  return (
    <ol className="flex items-start" aria-label="Progress">
      {MINI.map((m, i) => {
        const state = i < reached || delivered ? 'done' : i === reached ? 'current' : 'pending';
        const Icon = state === 'done' && !(delivered && i === MINI.length - 1) ? Check : m.icon;
        return (
          <li key={m.label} className="relative flex flex-1 flex-col items-center gap-1 text-center" aria-current={state === 'current' ? 'step' : undefined}>
            {i > 0 && (
              <span
                aria-hidden
                className={cx('absolute right-[calc(50%+1rem)] top-4 h-0.5 w-[calc(100%-2rem)]', state === 'pending' ? 'bg-line' : delivered ? 'bg-success/50' : 'bg-primary/50')}
              />
            )}
            <span
              className={cx(
                'grid size-8 place-items-center rounded-full',
                state === 'pending' && 'bg-card text-muted',
                state !== 'pending' && (delivered ? 'bg-success text-surface' : 'bg-primary text-surface'),
              )}
            >
              <Icon className="size-4" strokeWidth={state === 'pending' ? 2 : 2.6} aria-hidden />
            </span>
            <span className={cx('text-[11px] leading-[14px]', state === 'pending' ? 'text-muted' : delivered ? 'font-semibold text-success' : 'font-semibold text-primary-strong')}>
              {m.label}
              <span className="sr-only">, {state === 'pending' ? 'not yet' : 'done'}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Delivered order card footer: rate the order (inline, once) and reorder into the cart. */
function DeliveredStrip({ o }: { o: OrderDto }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { add } = useCart();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState<'review' | 'reorder'>();
  const [msg, setMsg] = useState<string>();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!rating) return setMsg('Pick a star rating first.');
    setBusy('review');
    setMsg(undefined);
    try {
      await api.post(`/orders/${o.id}/review`, { rating, comment: comment.trim() || undefined });
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ordersQuery.queryKey });
      void qc.invalidateQueries({ queryKey: ['order', o.id] });
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : 'Couldn’t save your review.');
    } finally {
      setBusy(undefined);
    }
  };

  // Current menu prices; dishes no longer available are skipped.
  const reorder = async () => {
    setBusy('reorder');
    setMsg(undefined);
    let added = 0;
    for (const i of o.items) {
      try {
        const p = await api.get<ProductDto>(`/products/${i.productId}`);
        const v = p.variants.length ? p.variants.find((x) => x.name === i.variantName) : undefined;
        if (!p.isAvailable || (p.variants.length && !v?.isAvailable)) continue;
        add(p, v?.id, i.quantity);
        added++;
      } catch {
        /* skipped */
      }
    }
    setBusy(undefined);
    if (added) navigate('/cart');
    else setMsg('These dishes aren’t available right now.');
  };

  return (
    <div className="flex flex-col gap-3 border-t border-line/60 bg-primary-soft/40 px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface text-primary" aria-hidden>
          <Star className="size-5 fill-current" />
        </span>
        <div className="min-w-0 flex-1">
          {o.review ? (
            <>
              <p className="text-sm font-bold">Thanks for your feedback!</p>
              <p className="flex items-center gap-0.5 text-primary" aria-label={`You rated ${o.review.rating} out of 5`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className={cx('size-4', n <= o.review!.rating ? 'fill-current' : 'text-line')} aria-hidden />
                ))}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-primary-strong">How was your order?</p>
              <p className="text-[13px] text-muted">Help us improve with your feedback</p>
            </>
          )}
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          {!o.review && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-surface px-4 text-sm font-semibold text-primary-strong ring-1 ring-inset ring-primary hover:bg-primary-soft sm:flex-none"
            >
              <Star className="size-4" aria-hidden /> Review
            </button>
          )}
          <Button onClick={reorder} loading={busy === 'reorder'} className="flex-1 rounded-full sm:flex-none" icon={<RotateCcw className="size-4" />}>
            Reorder
          </Button>
        </div>
      </div>

      {open && !o.review && (
        <form onSubmit={submit} className="flex flex-col gap-2.5">
          <div role="radiogroup" aria-label="Rating" className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n === 1 ? '' : 's'}`}
                onClick={() => setRating(n)}
                className="grid size-11 place-items-center rounded-full text-primary hover:bg-surface"
              >
                <Star className={cx('size-7', n <= rating ? 'fill-current' : 'text-line')} aria-hidden />
              </button>
            ))}
          </div>
          <label className="sr-only" htmlFor={`rv-${o.id}`}>
            Comment (optional)
          </label>
          <textarea
            id={`rv-${o.id}`}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Tell us what you liked (optional)"
            className="rounded-xl bg-surface px-3.5 py-2.5 text-sm outline-none ring-1 ring-line placeholder:text-muted focus:ring-2 focus:ring-primary"
          />
          <div>
            <Button type="submit" loading={busy === 'review'}>
              Submit review
            </Button>
          </div>
        </form>
      )}
      {msg && (
        <p role="status" className="text-[13px] text-danger">
          {msg}
        </p>
      )}
    </div>
  );
}

/** W09 · My Orders (VSR layout): artwork app bar with search, Ongoing/Past tabs, cards with mini progress. */
export function OrdersPage() {
  const orders = useQuery(ordersQuery);
  const [tab, setTab] = useState<'active' | 'past'>('active');
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState('');
  const all = orders.data ?? [];
  const activeCount = all.filter(ACTIVE).length;
  const counts = { active: activeCount, past: all.length - activeCount };
  const needle = q.trim().toLowerCase();
  const list = all
    .filter((o) => (tab === 'active') === ACTIVE(o))
    .filter((o) => !needle || o.orderNumber.toLowerCase().includes(needle) || o.items.some((i) => i.productName.toLowerCase().includes(needle)));

  return (
    <PageFrame
      art
      back={false}
      title="My Orders"
      subtitle="Track, manage and reorder your favourite food"
      actions={
        <ArtIconButton label={searching ? 'Close search' : 'Search orders'} onClick={() => (setSearching((v) => !v), setQ(''))}>
          {searching ? <X className="size-5" aria-hidden /> : <Search className="size-5" aria-hidden />}
        </ArtIconButton>
      }
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <div role="tablist" aria-label="Orders" className="grid grid-cols-2 border-b border-line">
          {(['active', 'past'] as const).map((t) => {
            const Icon = t === 'active' ? ClipboardList : Clock;
            return (
              <button
                key={t}
                role="tab"
                type="button"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={cx(
                  '-mb-px flex min-h-12 items-center justify-center gap-2 border-b-[3px] text-[15px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-primary',
                  tab === t ? 'border-primary text-primary-strong' : 'border-transparent text-muted hover:text-ink',
                )}
              >
                <Icon className="size-5" aria-hidden />
                {t === 'active' ? 'Ongoing' : 'Past Orders'}
                {orders.data && <span className="tabular">({counts[t]})</span>}
              </button>
            );
          })}
        </div>

        {searching && (
          <label className="flex h-12 items-center gap-2.5 rounded-2xl bg-card px-4 ring-1 ring-line focus-within:ring-2 focus-within:ring-primary">
            <Search className="size-5 shrink-0 text-muted" aria-hidden />
            <span className="sr-only">Search by order number or dish</span>
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order number or dish" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted" />
          </label>
        )}

        {orders.isError ? (
          <ErrorState onRetry={() => orders.refetch()} />
        ) : orders.isPending ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-44 rounded-[20px]" />
            <Skeleton className="h-44 rounded-[20px]" />
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="size-9" />}
            title={needle ? 'No matching orders' : tab === 'active' ? 'No ongoing orders' : 'No past orders yet'}
            body={needle ? 'Try another order number or dish name.' : tab === 'active' ? 'When you place an order, you can follow it here.' : 'Your delivered and cancelled orders will show up here.'}
            action={needle ? undefined : <ButtonLink to="/menu">Browse the menu</ButtonLink>}
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {list.map((o) => {
              const count = o.items.reduce((n, i) => n + i.quantity, 0);
              const ended = o.status === 'CANCELLED' || o.status === 'REJECTED';
              return (
                <li key={o.id} className="min-w-0 overflow-hidden rounded-[20px] bg-surface shadow-[0_6px_20px_-10px_rgb(30_29_27/0.2)] ring-1 ring-line/70 transition-shadow hover:ring-primary/50">
                  <Link to={`/orders/${o.id}`} className="flex flex-col gap-4 p-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary">
                    <div className="flex gap-3.5">
                      {o.items[0]?.imageUrl ? (
                        <FoodImage src={sized(o.items[0].imageUrl, 200)} alt="" className="size-20 shrink-0 rounded-2xl" />
                      ) : (
                        <span className="grid size-20 shrink-0 place-items-center rounded-2xl bg-primary-soft">
                          <ClipboardList className="size-6 text-primary-strong" aria-hidden />
                        </span>
                      )}
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="tabular truncate font-bold">Order #{o.orderNumber}</span>
                          <StatusBadge status={o.status} />
                        </div>
                        <span className="truncate text-sm text-muted">
                          {o.items[0]?.productName}
                          {o.items.length > 1 ? ` + ${o.items.length - 1} more` : ''}
                        </span>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] text-muted">
                            {when(o.timeline.placedAt)} · {count} item{count === 1 ? '' : 's'}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="tabular font-bold">{formatPaise(o.totalPaise)}</span>
                            <ChevronRight className="size-5 text-muted" aria-hidden />
                          </span>
                        </div>
                      </div>
                    </div>
                    {ended ? (
                      <p className="flex items-center gap-2 text-[13px] text-danger">
                        <CircleX className="size-4" aria-hidden /> {o.status === 'REJECTED' ? 'The kitchen couldn’t take this order' : 'This order was cancelled'}
                      </p>
                    ) : (
                      <MiniProgress o={o} />
                    )}
                  </Link>
                  {o.status === 'DELIVERED' && <DeliveredStrip o={o} />}
                </li>
              );
            })}
          </ul>
        )}

      </div>
    </PageFrame>
  );
}

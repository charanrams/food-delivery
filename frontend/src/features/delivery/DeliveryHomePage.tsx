import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Banknote, Check, ChevronRight, History, LogOut, MapPin, Navigation, Package, PackageCheck, Phone, Bike } from 'lucide-react';
import { formatPaise, type DeliveryProfileDto, type OrderDto } from '@a3/contracts';
import { Button, ButtonLink, EmptyState, ErrorState, Skeleton, StatusBadge, cx } from '@/components/ui';
import { PageFrame } from '@/components/frame';
import { useAuth } from '@/auth/AuthContext';
import { api, ApiError } from '@/lib/api';
import { addressLine } from '@/lib/orders-api';

// Same endpoints as the mobile-delivery app.
const meQuery = { queryKey: ['delivery', 'me'], queryFn: () => api.get<DeliveryProfileDto>('/delivery/me') };
const activeQuery = { queryKey: ['delivery', 'orders'], queryFn: () => api.get<OrderDto[]>('/delivery/orders'), refetchInterval: 15_000 };
const historyQuery = { queryKey: ['delivery', 'history'], queryFn: () => api.get<OrderDto[]>('/delivery/history') };
const deliveryQuery = (id: string) => ({ queryKey: ['delivery', 'order', id], queryFn: () => api.get<OrderDto>(`/delivery/orders/${id}`), refetchInterval: 15_000 });

const collectCash = (o: OrderDto) => o.paymentMethod === 'COD' && o.paymentStatus !== 'PAID';
const recipient = (o: OrderDto) => o.deliveryAddress.recipientName || o.customer?.name || 'Customer';
const recipientPhone = (o: OrderDto) => o.deliveryAddress.phone || o.customer?.phone || '';
const mapsUrl = (o: OrderDto) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addressLine(o.deliveryAddress))}`;
const stepOf = (o: OrderDto) => (o.actions.includes('accept') ? 0 : o.actions.includes('pickup') ? 1 : o.actions.includes('out-for-delivery') ? 2 : 3);
const STEP_LABEL = ['New: accept or decline', 'Pick up at the kitchen', 'Start the delivery', 'Deliver & enter the code'];

/** Delivery partner · Assignments */
export function DeliveryHomePage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const me = useQuery(meQuery);
  const online = me.data?.availability === 'ONLINE';
  const orders = useQuery({ ...activeQuery, enabled: !!me.data });
  const toggle = useMutation({
    mutationFn: (next: boolean) => api.patch<DeliveryProfileDto>('/delivery/availability', { availability: next ? 'ONLINE' : 'OFFLINE' }),
    onSuccess: (p) => qc.setQueryData(meQuery.queryKey, p),
  });

  return (
    <PageFrame
      title={`Hi, ${(me.data?.name ?? user?.name ?? 'there').split(' ')[0]}`}
      back={false}
      actions={
        me.data && (
          <button
            role="switch"
            aria-checked={online}
            disabled={toggle.isPending}
            onClick={() => toggle.mutate(!online)}
            className={cx('flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold', online ? 'bg-surface text-success' : 'bg-ink text-surface')}
          >
            <span className={cx('size-2.5 rounded-full', online ? 'bg-success' : 'bg-surface/70')} aria-hidden />
            {online ? 'Online' : 'Offline'}
          </button>
        )
      }
    >
      {me.isError ? (
        <ErrorState onRetry={() => me.refetch()} />
      ) : me.isPending ? (
        <Skeleton className="h-40" />
      ) : (
        <div className="flex flex-col gap-5">
          {toggle.isError && (
            <p role="alert" className="text-sm text-danger">
              {toggle.error instanceof ApiError ? toggle.error.message : 'Couldn’t change your status.'}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[18px] bg-card p-4">
              <p className="text-[13px] text-muted">Delivered today</p>
              <p className="tabular font-display text-3xl">{me.data.todayDelivered}</p>
            </div>
            <div className="rounded-[18px] bg-card p-4">
              <p className="text-[13px] text-muted">Active now</p>
              <p className="tabular font-display text-3xl">{orders.data?.length ?? 0}</p>
            </div>
          </div>
          {orders.isError ? (
            <ErrorState onRetry={() => orders.refetch()} />
          ) : orders.isPending ? (
            <Skeleton className="h-28" />
          ) : orders.data.length === 0 ? (
            <EmptyState
              icon={<Package className="size-9" />}
              title={online ? 'No deliveries right now' : 'You’re offline'}
              body={online ? 'New assignments appear here automatically.' : 'Go online to start receiving deliveries.'}
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {orders.data.map((o) => (
                <li key={o.id}>
                  <Link to={`/delivery/orders/${o.id}`} className="flex items-center gap-3 rounded-[18px] bg-card p-4 hover:ring-1 hover:ring-primary">
                    <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="flex items-center justify-between gap-2">
                        <span className="tabular font-bold">{o.orderNumber}</span>
                        <StatusBadge status={o.status} />
                      </span>
                      <span className="text-sm font-semibold text-primary-strong">{STEP_LABEL[stepOf(o)]}</span>
                      <span className="flex items-start gap-1.5 text-[13px] text-muted">
                        <MapPin className="mt-px size-4 shrink-0" aria-hidden /> <span className="truncate">{addressLine(o.deliveryAddress)}</span>
                      </span>
                      <span className={cx('text-[13px] font-bold', collectCash(o) ? 'text-warning' : 'text-success')}>
                        {collectCash(o) ? `Collect ${formatPaise(o.totalPaise)} cash` : 'Prepaid'}
                      </span>
                    </span>
                    <ChevronRight className="size-5 text-muted" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </PageFrame>
  );
}

function Steps({ current }: { current: number }) {
  const labels = ['Accept', 'Pick up', 'On the way', 'Hand over'];
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Delivery steps">
      {labels.map((l, i) => (
        <li key={l} aria-current={i === current ? 'step' : undefined} className="flex flex-col items-center gap-1.5 text-center">
          <span className={cx('grid size-8 place-items-center rounded-full text-sm font-bold', i < current ? 'bg-success text-surface' : i === current ? 'bg-primary text-surface' : 'bg-card text-muted')}>
            {i < current ? <Check className="size-4" aria-hidden /> : i + 1}
          </span>
          <span className={cx('text-xs', i === current ? 'font-bold' : 'text-muted')}>{l}</span>
        </li>
      ))}
    </ol>
  );
}

/** One delivery, step by step: accept → pick up → start → customer's code (+ cash). */
export function DeliveryOrderPage() {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const delivery = useQuery(deliveryQuery(orderId));
  const [error, setError] = useState<string>();
  const [code, setCode] = useState('');
  const [cash, setCash] = useState(false);

  const act = useMutation({
    mutationFn: ({ action, body }: { action: string; body?: unknown }) => api.post<OrderDto>(`/delivery/orders/${orderId}/${action}`, body),
    onMutate: () => setError(undefined),
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ['delivery'] });
      if (v.action === 'decline') navigate('/delivery');
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Something went wrong. Try again.'),
  });

  if (delivery.isError)
    return (
      <PageFrame title="Delivery">
        {delivery.error instanceof ApiError && delivery.error.status === 404 ? (
          <EmptyState icon={<Package className="size-9" />} title="No longer assigned to you" body="The kitchen may have reassigned this order." action={<ButtonLink to="/delivery">Back to assignments</ButtonLink>} />
        ) : (
          <ErrorState onRetry={() => delivery.refetch()} />
        )}
      </PageFrame>
    );
  if (delivery.isPending)
    return (
      <PageFrame title="Delivery">
        <Skeleton className="h-80" />
      </PageFrame>
    );

  const o = delivery.data;
  if (o.status === 'DELIVERED')
    return (
      <PageFrame title={o.orderNumber}>
        <EmptyState icon={<BadgeCheck className="size-9" />} title="Delivered" body={collectCash(o) ? 'Hand the cash to the kitchen at the end of your shift.' : 'Nice work. This order is complete.'} action={<ButtonLink to="/delivery">Back to assignments</ButtonLink>} />
      </PageFrame>
    );

  const step = stepOf(o);
  const busy = act.isPending;
  const verify = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) return setError('Enter the 6-digit code from the customer.');
    if (collectCash(o) && !cash) return setError('Collect the cash and tick the box first.');
    act.mutate({ action: 'verify-otp', body: { otp: code, ...(collectCash(o) && { cashCollected: true }) } });
  };

  return (
    <PageFrame title={o.orderNumber}>
      <div className="flex flex-col gap-5">
        <Steps current={step} />

        <section className="flex flex-col gap-2 rounded-[18px] bg-card p-5">
          <p className="text-[13px] text-muted">{step <= 1 ? 'Pick up at A3 Kitchen' : 'Deliver to'}</p>
          <p className="text-base font-bold">{step <= 1 ? 'Collect the packed order at the kitchen counter.' : recipient(o)}</p>
          {step >= 2 && (
            <>
              <p className="text-[15px] leading-6">{addressLine(o.deliveryAddress)}</p>
              {o.deliveryAddress.landmark && <p className="text-[13px] text-muted">Landmark: {o.deliveryAddress.landmark}</p>}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <a href={mapsUrl(o)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-surface font-semibold text-primary-strong ring-1 ring-inset ring-primary hover:bg-primary-soft">
                  <Navigation className="size-4" aria-hidden /> Navigate
                </a>
                <a href={`tel:${recipientPhone(o)}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-surface font-semibold text-primary-strong ring-1 ring-inset ring-primary hover:bg-primary-soft">
                  <Phone className="size-4" aria-hidden /> Call
                </a>
              </div>
            </>
          )}
        </section>

        <section className="flex flex-col gap-2 rounded-[18px] bg-card p-5">
          <h2 className="font-bold">Items</h2>
          {o.items.map((i) => (
            <p key={i.productId + (i.variantName ?? '')} className="text-[15px]">
              {i.quantity} × {i.productName}
              {i.variantName && <span className="text-muted"> ({i.variantName})</span>}
            </p>
          ))}
          <p className={cx('mt-2 flex items-center gap-2 border-t border-line pt-3 font-bold', collectCash(o) ? 'text-warning' : 'text-success')}>
            {collectCash(o) ? <Banknote className="size-5" aria-hidden /> : <BadgeCheck className="size-5" aria-hidden />}
            {collectCash(o) ? `Collect ${formatPaise(o.totalPaise)} in cash` : 'Prepaid. Don’t collect money'}
          </p>
        </section>

        {error && (
          <p role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        )}

        {step === 0 ? (
          <div className="flex flex-col gap-2">
            <Button loading={busy} onClick={() => act.mutate({ action: 'accept' })}>
              Accept delivery
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => {
                const reason = window.prompt('Reason for declining (for the kitchen):')?.trim();
                if (reason && reason.length >= 3) act.mutate({ action: 'decline', body: { reason } });
              }}
            >
              Decline
            </Button>
          </div>
        ) : step === 1 ? (
          <Button loading={busy} icon={<PackageCheck className="size-5" />} onClick={() => act.mutate({ action: 'pickup' })}>
            I’ve picked up the order
          </Button>
        ) : step === 2 ? (
          <Button loading={busy} icon={<Bike className="size-5" />} onClick={() => act.mutate({ action: 'out-for-delivery' })}>
            Start delivery
          </Button>
        ) : (
          <form onSubmit={verify} className="flex flex-col gap-3 rounded-[18px] bg-primary-soft p-5">
            <label htmlFor="otp" className="font-bold">
              Customer’s delivery code
            </label>
            <input
              id="otp"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit code"
              className="tabular h-14 rounded-[12px] bg-surface px-4 text-center font-display text-2xl tracking-[0.4em] outline-none focus:ring-2 focus:ring-ink"
            />
            {collectCash(o) && (
              <label className="flex min-h-11 items-center gap-3 text-[15px] font-semibold">
                <input type="checkbox" checked={cash} onChange={(e) => setCash(e.target.checked)} className="size-5 accent-primary-strong" />I collected {formatPaise(o.totalPaise)} in cash
              </label>
            )}
            <Button type="submit" loading={busy}>
              Confirm delivery
            </Button>
            {o.actions.includes('regenerate-otp') && (
              <button type="button" disabled={busy} onClick={() => act.mutate({ action: 'regenerate-otp' })} className="min-h-11 text-sm font-semibold text-primary-strong hover:underline">
                Customer can’t find the code? Send a new one
              </button>
            )}
          </form>
        )}
      </div>
    </PageFrame>
  );
}

export function DeliveryHistoryPage() {
  const history = useQuery(historyQuery);
  return (
    <PageFrame title="History" back={false}>
      {history.isError ? (
        <ErrorState onRetry={() => history.refetch()} />
      ) : history.isPending ? (
        <Skeleton className="h-40" />
      ) : history.data.length === 0 ? (
        <EmptyState icon={<History className="size-9" />} title="No deliveries yet" body="Completed deliveries will show up here." />
      ) : (
        <ul className="flex flex-col gap-3">
          {history.data.map((o) => (
            <li key={o.id} className="flex flex-col gap-1 rounded-[18px] bg-card p-4">
              <span className="flex justify-between gap-2">
                <span className="tabular font-bold">{o.orderNumber}</span>
                <StatusBadge status={o.status} />
              </span>
              <span className="truncate text-[13px] text-muted">{addressLine(o.deliveryAddress)}</span>
              <span className="flex justify-between text-[13px]">
                <span className="text-muted">{o.timeline.deliveredAt ? new Date(o.timeline.deliveredAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : ''}</span>
                <span className="tabular font-bold">{formatPaise(o.totalPaise)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </PageFrame>
  );
}

export function DeliveryProfilePage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const me = useQuery(meQuery);
  return (
    <PageFrame title="Profile" back={false}>
      {me.isError ? (
        <ErrorState onRetry={() => me.refetch()} />
      ) : me.isPending ? (
        <Skeleton className="h-40" />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="grid size-22 place-items-center rounded-full bg-primary-soft font-display text-4xl text-primary-strong" aria-hidden>
              {me.data.name.charAt(0).toUpperCase()}
            </span>
            <h2 className="font-display text-2xl">{me.data.name}</h2>
            <p className="text-muted">{[me.data.phone, me.data.email].filter(Boolean).join(' · ')}</p>
          </div>
          <dl className="flex flex-col gap-3 rounded-[18px] bg-card p-5">
            {[
              ['Vehicle', [me.data.vehicleType, me.data.vehicleNumber].filter(Boolean).join(' · ') || 'Not set'],
              ['Status', me.data.availability.charAt(0) + me.data.availability.slice(1).toLowerCase()],
              ['Delivered today', String(me.data.todayDelivered)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-muted">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <Button
            variant="secondary"
            icon={<LogOut className="size-5" />}
            onClick={async () => {
              if (!window.confirm('Log out?')) return;
              await logout();
              navigate('/login');
            }}
          >
            Log out
          </Button>
        </div>
      )}
    </PageFrame>
  );
}

import { useMemo, useState, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Lock, MapPin, MapPinPlus, Wallet } from 'lucide-react';
import { formatPaise, type PaymentMethod } from '@a3/contracts';
import { Button, Skeleton, cx } from '@/components/ui';
import { PageFrame } from '@/components/frame';
import { ApiError } from '@/lib/api';
import { addressesQuery, ordersQuery, placeOrder, quoteQuery } from '@/lib/orders-api';
import { payWithRazorpay } from '@/lib/razorpay';
import { useCart } from '@/features/cart/CartContext';
import { TotalsRows } from '@/features/cart/OrderSummary';
import { AddressCard, AddressForm } from '@/features/account/AddressesPage';

const PAYMENT_OPTIONS: { id: PaymentMethod; title: string; sub: string }[] = [
  { id: 'RAZORPAY', title: 'Pay online', sub: 'UPI, cards, netbanking · secured by Razorpay' },
  { id: 'COD', title: 'Cash on delivery', sub: 'Pay the delivery partner when your food arrives' },
];

/** W06 · Checkout (mockup screen 13) — server-priced, idempotent, Razorpay for online orders. */
export function CheckoutPage() {
  const { lines, clear } = useCart();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const items = useMemo(() => lines.map((l) => ({ productId: l.product.id, variantId: l.variantId, quantity: l.quantity })), [lines]);
  const addresses = useQuery(addressesQuery);
  const quote = useQuery(quoteQuery(items));
  const [picked, setPicked] = useState<string>();
  const [adding, setAdding] = useState(false);
  const [payment, setPayment] = useState<PaymentMethod>('RAZORPAY');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string>();
  // One key per checkout attempt: a double-click or retry can't create two orders.
  const [idemKey] = useState(() => crypto.randomUUID());
  const placed = useRef(false);

  // `placed` stops the empty-cart redirect from beating the navigation to the Order placed screen.
  if (lines.length === 0 && !placing && !placed.current) return <Navigate to="/cart" replace />;

  const list = addresses.data ?? [];
  const address = list.find((a) => a.id === picked) ?? list.find((a) => a.isDefault && a.isServiceable) ?? list.find((a) => a.isServiceable);
  const q = quote.data;

  const submit = async () => {
    if (!address) return;
    setPlacing(true);
    setError(undefined);
    try {
      const order = await placeOrder({ items, addressId: address.id, paymentMethod: payment }, idemKey);
      void qc.invalidateQueries({ queryKey: ordersQuery.queryKey });
      if (order.razorpay) {
        const r = await payWithRazorpay(order.id, order.razorpay);
        if (r.result !== 'paid') {
          navigate(`/orders/${order.id}`, { state: { paymentMessage: r.message } });
          return;
        }
      }
      placed.current = true;
      navigate(`/orders/${order.id}/confirmed`, { replace: true });
      clear();
      return;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Couldn’t place the order. Please try again.');
      if (e instanceof ApiError && e.code === 'PRODUCT_UNAVAILABLE') void quote.refetch();
    } finally {
      setPlacing(false);
    }
  };

  const placeButton = (
    <Button onClick={submit} loading={placing} disabled={!address || !q || quote.isFetching} icon={<Lock className="size-[18px]" />} className="w-full">
      Place order{q && <> · <span className="tabular">{formatPaise(q.totalPaise)}</span></>}
    </Button>
  );

  return (
    <PageFrame title="Checkout" bottom={<div className="lg:hidden">{placeButton}</div>}>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3" aria-labelledby="addr-h">
            <div className="flex items-center justify-between gap-3">
              <h2 id="addr-h" className="flex items-center gap-2 text-lg font-bold">
                <MapPin className="size-5 text-primary-strong" aria-hidden /> Delivery address
              </h2>
              {!adding && (
                <Button variant="ghost" size="sm" icon={<MapPinPlus className="size-4" />} onClick={() => setAdding(true)}>
                  Add new
                </Button>
              )}
            </div>
            {adding ? (
              <AddressForm
                onDone={(a) => {
                  setPicked(a.id);
                  setAdding(false);
                }}
                onCancel={() => setAdding(false)}
              />
            ) : addresses.isPending ? (
              <Skeleton className="h-24" />
            ) : list.length === 0 ? (
              <p className="rounded-[18px] bg-card p-4 text-[15px]">Add an address so we know where to deliver.</p>
            ) : (
              <div role="radiogroup" aria-label="Delivery address" className="grid gap-3 md:grid-cols-2">
                {list.map((a) => (
                  <label key={a.id} className={cx('cursor-pointer', !a.isServiceable && 'cursor-not-allowed opacity-60')}>
                    <input type="radio" name="address" className="sr-only" disabled={!a.isServiceable} checked={a.id === address?.id} onChange={() => setPicked(a.id)} />
                    <AddressCard a={a} selected={a.id === address?.id} />
                  </label>
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3" aria-labelledby="pay-h">
            <h2 id="pay-h" className="flex items-center gap-2 text-lg font-bold">
              <Wallet className="size-5 text-primary-strong" aria-hidden /> Payment method
            </h2>
            <div role="radiogroup" aria-label="Payment method" className="flex flex-col gap-3">
              {PAYMENT_OPTIONS.map((o) => (
                <label key={o.id} className={cx('flex cursor-pointer items-center gap-3 rounded-[18px] bg-card p-4', o.id === payment ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-line')}>
                  <input type="radio" name="payment" checked={o.id === payment} onChange={() => setPayment(o.id)} className="size-5 accent-primary-strong" />
                  <span className="flex flex-1 flex-col gap-0.5">
                    <span className="font-bold">{o.title}</span>
                    <span className="text-[13px] text-muted">{o.sub}</span>
                  </span>
                </label>
              ))}
            </div>
          </section>
        </div>

        <section className="flex flex-col gap-4 lg:sticky lg:top-28" aria-labelledby="sum-h">
          <div className="flex flex-col gap-3.5 rounded-[18px] bg-card p-5">
            <h2 id="sum-h" className="text-lg font-bold">
              Order summary
            </h2>
            {quote.isPending ? (
              <Skeleton className="h-40" />
            ) : quote.isError ? (
              <p role="alert" className="text-sm text-danger">
                Couldn’t price your cart. <button className="font-semibold underline" onClick={() => quote.refetch()}>Retry</button>
              </p>
            ) : (
              <>
                <ul className="flex flex-col gap-2.5 border-b border-line pb-3.5">
                  {q!.items.map((i) => (
                    <li key={i.productId + (i.variantName ?? '')} className="flex justify-between gap-3 text-sm">
                      <span className="text-muted">
                        {i.quantity} × {i.productName}
                        {i.variantName && ` (${i.variantName})`}
                      </span>
                      <span className="tabular">{formatPaise(i.lineTotalPaise)}</span>
                    </li>
                  ))}
                </ul>
                {q!.warnings.map((w) => (
                  <p key={w} className="flex gap-2 text-[13px] text-warning">
                    <AlertTriangle className="size-4 shrink-0" aria-hidden /> {w}
                  </p>
                ))}
                <TotalsRows totals={{ itemTotalPaise: q!.subtotalPaise, discountPaise: q!.discountPaise, deliveryFeePaise: q!.deliveryFeePaise, taxPaise: q!.taxPaise, totalPaise: q!.totalPaise }} />
              </>
            )}
          </div>
          {error && (
            <p role="alert" className="text-sm font-medium text-danger">
              {error}
            </p>
          )}
          <div className="max-lg:hidden">{placeButton}</div>
          <p className="text-xs leading-[18px] text-muted">Prices are calculated by the kitchen. By placing this order you agree to the cancellation and refund policy.</p>
        </section>
      </div>
    </PageFrame>
  );
}

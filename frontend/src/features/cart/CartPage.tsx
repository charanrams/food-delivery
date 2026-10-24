import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Check, ChevronRight, Info, Percent, PiggyBank, ShoppingBag, Truck, X } from 'lucide-react';
import { formatPaise } from '@a3/contracts';
import { ButtonLink, EmptyState, FoodImage, Stepper, VegMark, cx } from '@/components/ui';
import { PageFrame } from '@/components/frame';
import { useAuth } from '@/auth/AuthContext';
import { PRICING } from '@/lib/mock-data';
import { productImage, sized } from '@/lib/catalog-api';
import { useCart, type CartTotals } from './CartContext';
import { TotalsRows } from './OrderSummary';

/** "Add ₹X more for FREE delivery" with progress, or a tick once the order qualifies (VSR). */
function FreeDeliveryBar({ totals }: { totals: CartTotals }) {
  const above = PRICING.freeDeliveryAbovePaise;
  const free = totals.deliveryFeePaise === 0;
  const left = Math.max(0, above - (totals.itemTotalPaise - (totals.discountPaise ?? 0)));
  const pct = Math.min(100, Math.round(((above - left) / above) * 100));
  return (
    <div className={cx('flex items-center gap-3 rounded-2xl p-4 ring-1', free ? 'bg-success/10 ring-success/30' : 'bg-surface ring-line')}>
      <Truck className={cx('size-7 shrink-0', free ? 'text-success' : 'text-primary-strong')} aria-hidden />
      <div className="min-w-0 flex-1">
        {free ? (
          <>
            <p className="font-extrabold">Free delivery</p>
            <p className="text-[13px] text-muted">Your order qualifies for free delivery.</p>
          </>
        ) : (
          <>
            <p className="font-bold">
              Add <span className="tabular text-primary-strong">{formatPaise(left)}</span> more for FREE delivery
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f4efe8]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to free delivery">
              <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${pct}%` }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** "Apply coupon" card that opens the code box. No promotions exist yet, so it says so honestly. */
function CouponCard() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<string>();
  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl bg-primary/[0.07] p-3.5 text-left ring-1 ring-primary/40 transition-colors hover:ring-primary"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-surface">
          <Percent className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-extrabold">Apply coupon</span>
          <span className="block text-[13px] text-muted">Get discounts on your order</span>
        </span>
        <span className="flex shrink-0 items-center text-sm font-bold text-primary-strong">
          View offers <ChevronRight className="size-4" aria-hidden />
        </span>
      </button>
    );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(code.trim() ? 'No offers are running right now.' : 'Enter a code first.');
      }}
      className="flex flex-col gap-2 rounded-2xl bg-surface p-3.5 ring-1 ring-line"
    >
      <div className="flex items-center justify-between">
        <p className="font-extrabold">Apply coupon</p>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close coupon" className="grid size-9 place-items-center rounded-full text-muted hover:bg-primary-soft">
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <div className="flex gap-2">
        <label htmlFor="coupon" className="sr-only">
          Coupon code
        </label>
        <input
          id="coupon"
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter coupon code"
          className="h-12 min-w-0 flex-1 rounded-xl bg-[#faf6f1] px-3.5 text-sm uppercase outline-none ring-1 ring-line placeholder:normal-case placeholder:text-muted focus:ring-2 focus:ring-primary"
        />
        <button className="min-h-12 rounded-xl bg-ink px-5 text-sm font-semibold text-surface hover:brightness-125">Apply</button>
      </div>
      {msg && (
        <p role="status" className="text-[13px] text-muted">
          {msg}
        </p>
      )}
    </form>
  );
}

/** W05 · Cart (VSR layout): free-delivery bar, item cards, coupon, bill, savings. */
export function CartPage() {
  const { lines, totals, count, setQuantity, remove } = useCart();
  const { user } = useAuth();
  const checkoutTo = user ? '/checkout' : '/login';
  const checkoutState = user ? undefined : { from: '/checkout' };
  const deliverySaved = totals.deliveryFeePaise === 0 ? PRICING.deliveryFeePaise : 0;
  const saved = (totals.discountPaise ?? 0) + deliverySaved;
  const removeLine = (key: string, name: string) => window.confirm(`Remove ${name} from your cart?`) && remove(key);

  return (
    <PageFrame
      art
      subtitle="Review your dishes and check out"
      title="My Cart"
    >
      {lines.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="size-9" />}
          title="Your cart is empty"
          body="Add a few dishes from the menu and they’ll show up here."
          action={<ButtonLink to="/menu">Browse the menu</ButtonLink>}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            {count} item{count === 1 ? '' : 's'} in your cart
          </p>
          <div className="grid items-start gap-5 lg:grid-cols-[1fr_380px] lg:gap-8">
            <div className="flex flex-col gap-3">
              <FreeDeliveryBar totals={totals} />
              <ul className="flex flex-col gap-3">
                {lines.map((l) => (
                  <li key={l.key} className="flex gap-3.5 rounded-2xl bg-surface p-3 shadow-[0_4px_14px_-8px_rgb(30_29_27/0.18)] ring-1 ring-line/70">
                    <Link to={`/product/${l.product.slug}`} className="shrink-0">
                      <FoodImage src={sized(productImage(l.product), 200)} alt="" className="size-22 rounded-xl" />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <Link to={`/product/${l.product.slug}`} className="flex min-w-0 items-center gap-2 font-bold hover:text-primary-strong">
                        <VegMark veg={!!l.product.isVegetarian} /> <span className="line-clamp-2">{l.product.name}</span>
                      </Link>
                      {l.variant && <span className="text-[13px] text-muted">{l.variant.name}</span>}
                      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                        <div>
                          <span className="tabular block text-lg font-extrabold leading-tight">{formatPaise(l.lineTotalPaise)}</span>
                          {l.quantity > 1 && <span className="tabular text-xs text-muted">{formatPaise(Math.round(l.lineTotalPaise / l.quantity))} each</span>}
                        </div>
                        <Stepper value={l.quantity} onChange={(v) => (v === 0 ? removeLine(l.key, l.product.name) : setQuantity(l.key, v))} label={l.product.name} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <Link to="/menu" className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-bold text-primary-strong hover:underline">
                + Add more dishes
              </Link>
            </div>

            <section className="flex flex-col gap-3 lg:sticky lg:top-28">
              <CouponCard />
              <div className="rounded-2xl bg-surface p-5 ring-1 ring-line">
                <p className="mb-3.5 font-extrabold">Bill details</p>
                <TotalsRows totals={totals} />
              </div>
              {saved > 0 && (
                <p className="flex items-center gap-3 rounded-2xl bg-success/10 px-4 py-3 text-sm font-semibold">
                  <PiggyBank className="size-5 shrink-0 text-success" aria-hidden />
                  <span>
                    You are saving <span className="tabular font-extrabold text-success">{formatPaise(saved)}</span> on this order
                  </span>
                </p>
              )}
              <ButtonLink to={checkoutTo} state={checkoutState} className="w-full">
                <span className="flex w-full items-center justify-between gap-3">
                  <span className="tabular">{formatPaise(totals.totalPaise)}</span>
                  <span className="flex items-center gap-1.5">
                    {user ? 'Proceed to checkout' : 'Log in to checkout'} <ArrowRight className="size-4" aria-hidden />
                  </span>
                </span>
              </ButtonLink>
              <p className="flex gap-2 text-xs leading-[18px] text-muted">
                {totals.deliveryFeePaise === 0 ? <Check className="mt-px size-4 shrink-0 text-success" aria-hidden /> : <Info className="mt-px size-4 shrink-0" aria-hidden />}
                Prices, delivery fee and taxes are confirmed again by the kitchen when you place the order.
              </p>
            </section>
          </div>
        </div>
      )}
    </PageFrame>
  );
}

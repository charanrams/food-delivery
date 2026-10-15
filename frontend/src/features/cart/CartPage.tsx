import { useState } from 'react';
import { Link } from 'react-router';
import { Info, ShoppingBag, Tag, Trash2 } from 'lucide-react';
import { formatPaise } from '@a3/contracts';
import { ButtonLink, EmptyState, FoodImage, Stepper, VegMark } from '@/components/ui';
import { FrameIconButton, PageFrame } from '@/components/frame';
import { useAuth } from '@/auth/AuthContext';
import { useCart } from './CartContext';
import { TotalsRows } from './OrderSummary';
import { productImage, sized } from '@/lib/catalog-api';

/** Offer code box. No promotions exist in the backend yet, so it says so honestly. */
function CouponBox() {
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<string>();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(code.trim() ? 'No offers are running right now.' : 'Enter a code first.');
      }}
      className="flex flex-col gap-1.5"
    >
      <div className="flex gap-2">
        <div className="flex flex-1 items-center gap-2.5 rounded-[14px] bg-card px-3.5 focus-within:ring-2 focus-within:ring-ink">
          <Tag className="size-[18px] text-muted" aria-hidden />
          <label htmlFor="coupon" className="sr-only">
            Offer code
          </label>
          <input id="coupon" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Offer code" className="h-12 flex-1 bg-transparent text-sm uppercase outline-none placeholder:normal-case placeholder:text-muted" />
        </div>
        <button className="min-h-12 rounded-[12px] bg-ink px-5 text-sm font-semibold text-surface hover:brightness-125">Apply</button>
      </div>
      {msg && (
        <p role="status" className="pl-1 text-[13px] text-muted">
          {msg}
        </p>
      )}
    </form>
  );
}

/** W05 · Cart (mockup screen 11) */
export function CartPage() {
  const { lines, totals, setQuantity, remove, clear } = useCart();
  const { user } = useAuth();

  return (
    <PageFrame
      title="My Cart"
      back={false}
      actions={
        lines.length > 0 && (
          <FrameIconButton label="Clear cart" onClick={() => window.confirm('Remove all dishes from your cart?') && clear()}>
            <Trash2 className="size-5" aria-hidden />
          </FrameIconButton>
        )
      }
      bottom={
        lines.length > 0 && (
          <ButtonLink to={user ? '/checkout' : '/login'} state={user ? undefined : { from: '/checkout' }} className="w-full lg:hidden">
            {user ? `Checkout · ${formatPaise(totals.totalPaise)}` : 'Log in to checkout'}
          </ButtonLink>
        )
      }
    >
      {lines.length === 0 ? (
        <EmptyState icon={<ShoppingBag className="size-9" />} title="Your cart is empty" body="Add a few dishes from the menu and they’ll show up here." action={<ButtonLink to="/menu">Browse the menu</ButtonLink>} />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
          <ul className="flex flex-col gap-3">
            {lines.map((l) => (
              <li key={l.key} className="flex items-center gap-3.5 rounded-[18px] bg-card p-3">
                <FoodImage src={sized(productImage(l.product), 200)} alt="" className="size-20 shrink-0 rounded-[14px] md:size-22" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Link to={`/product/${l.product.slug}`} className="flex items-center gap-2 font-bold hover:text-primary-strong">
                    <VegMark veg={!!l.product.isVegetarian} /> <span className="truncate">{l.product.name}</span>
                  </Link>
                  {l.variant && <span className="text-[13px] text-muted">{l.variant.name}</span>}
                  <span className="tabular font-extrabold text-primary-strong">{formatPaise(l.lineTotalPaise)}</span>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <button onClick={() => remove(l.key)} aria-label={`Remove ${l.product.name}`} className="grid size-10 place-items-center rounded-full text-muted hover:bg-surface hover:text-danger">
                    <Trash2 className="size-[18px]" aria-hidden />
                  </button>
                  <Stepper value={l.quantity} onChange={(v) => setQuantity(l.key, v)} label={l.product.name} />
                </div>
              </li>
            ))}
          </ul>

          <section className="flex flex-col gap-4 lg:sticky lg:top-28">
            <CouponBox />
            <div className="rounded-[18px] bg-card p-5">
              <TotalsRows totals={totals} />
            </div>
            <ButtonLink to={user ? '/checkout' : '/login'} state={user ? undefined : { from: '/checkout' }} className="w-full max-lg:hidden">
              {user ? `Checkout · ${formatPaise(totals.totalPaise)}` : 'Log in to checkout'}
            </ButtonLink>
            <p className="flex gap-2 text-xs leading-[18px] text-muted">
              <Info className="mt-px size-4 shrink-0" aria-hidden />
              Prices, delivery fee and taxes are recalculated by the kitchen when you place the order.
            </p>
          </section>
        </div>
      )}
    </PageFrame>
  );
}

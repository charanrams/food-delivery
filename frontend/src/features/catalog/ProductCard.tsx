import { Link, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { BadgePercent, Clock, Plus } from 'lucide-react';
import { formatPaise, type ProductDto, type SpecialDto } from '@a3/contracts';
import { FoodImage, Stepper, VegMark } from '@/components/ui';
import { productImage, sized, specialsQuery } from '@/lib/catalog-api';
import { useCart } from '@/features/cart/CartContext';

/** Default portion shown on cards: "Full" if offered, else the first available variant. */
export const defaultVariant = (p: ProductDto) =>
  p.variants.find((v) => v.isAvailable && v.name === 'Full') ?? p.variants.find((v) => v.isAvailable);

export const price = (p: ProductDto) => formatPaise(defaultVariant(p)?.pricePaise ?? p.pricePaise);

/** Compute discount info from live specials or compareAtPricePaise. */
export function useProductDiscount(product: ProductDto) {
  const specials = useQuery(specialsQuery);
  const special = specials.data?.find((s) => s.isLive && s.product.id === product.id);
  const currentPrice = defaultVariant(product)?.pricePaise ?? product.pricePaise;

  if (special) {
    const orig = currentPrice;
    const discounted = special.specialPricePaise ?? Math.round((orig * (100 - special.discountPercent)) / 100);
    return {
      discountPercent: special.discountPercent,
      finalPrice: discounted,
      originalPrice: orig,
      hasDiscount: true,
      label: special.label || `${special.discountPercent}% OFF`,
    };
  }

  if (product.compareAtPricePaise && product.compareAtPricePaise > currentPrice) {
    const pct = Math.round(((product.compareAtPricePaise - currentPrice) / product.compareAtPricePaise) * 100);
    return {
      discountPercent: pct,
      finalPrice: currentPrice,
      originalPrice: product.compareAtPricePaise,
      hasDiscount: true,
      label: `${pct}% OFF`,
    };
  }

  return {
    discountPercent: 0,
    finalPrice: currentPrice,
    originalPrice: currentPrice,
    hasDiscount: false,
    label: undefined,
  };
}

/**
 * Add control. Single-price dishes turn into an inline stepper once in the cart.
 */
export function CartControl({ product }: { product: ProductDto }) {
  const { lines, add, setQuantity } = useCart();
  const navigate = useNavigate();
  const multi = product.variants.length > 1;
  const variant = defaultVariant(product);
  const inCart = lines.filter((l) => l.product.id === product.id);
  const qty = inCart.reduce((n, l) => n + l.quantity, 0);

  if (!product.isAvailable) return <span className="text-[13px] font-semibold text-muted">Unavailable</span>;

  if (qty > 0 && !multi) {
    return <Stepper tone="solid" size="sm" value={qty} label={product.name} onChange={(v) => setQuantity(inCart[0]!.key, v)} />;
  }
  return (
    <button
      type="button"
      onClick={() => (multi ? navigate(`/product/${product.slug}`) : add(product, variant?.id, 1))}
      aria-label={multi ? `Choose a portion of ${product.name}` : `Add ${product.name} to cart`}
      className="inline-flex h-9 items-center gap-1 rounded-full bg-primary px-3.5 text-sm font-bold text-surface shadow-press transition-[background-color,transform] duration-150 hover:bg-brand-hover active:scale-90"
    >
      <Plus className="size-4" strokeWidth={2.75} aria-hidden />
    Add
    </button>
  );
}

/**
 * Unified dish card matching Today's Specials design:
 * Photo with aspect-[16/10], discount badge, prep time badge, VegMark + Title, 1-line description,
 * discounted price + strikethrough original price, and square orange plus button / stepper.
 */
export function DishCard({ product }: { product: ProductDto }) {
  const { lines, add, setQuantity } = useCart();
  const navigate = useNavigate();
  const multi = product.variants.length > 1;
  const inCart = lines.filter((l) => l.product.id === product.id);
  const qty = inCart.reduce((n, l) => n + l.quantity, 0);
  const unavailable = !product.isAvailable;
  const { finalPrice, originalPrice, hasDiscount, label } = useProductDiscount(product);

  return (
    <article className="group/card relative flex w-full flex-col overflow-hidden rounded-[20px] bg-surface shadow-[0_6px_18px_-6px_rgb(30_29_27/0.16)] ring-1 ring-line/60 transition-[box-shadow,transform] duration-200 ease-out hover:shadow-lift motion-safe:hover:-translate-y-0.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-strong">
      <div className="relative">
        <FoodImage src={sized(productImage(product), 600)} alt="" dimmed={unavailable} zoom className="aspect-[16/10] w-full" />
        {hasDiscount && (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-xs font-extrabold text-surface shadow-sm">
            <BadgePercent className="size-3" aria-hidden />
            {label}
          </span>
        )}
        {unavailable && (
          <span className="absolute bottom-2.5 left-2.5 rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-bold text-surface">
            Sold out
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="flex items-center gap-1.5 text-[15px] font-bold">
          <VegMark veg={!!product.isVegetarian} />
          <Link to={`/product/${product.slug}`} className="min-w-0 truncate outline-none after:absolute after:inset-0 after:content-['']">
            {product.name}
          </Link>
        </h3>
        {product.description && <p className="line-clamp-1 text-xs text-muted">{product.description}</p>}
        <div className="relative z-10 mt-auto flex items-center justify-between gap-2 pt-1.5">
          <div className="flex items-baseline gap-1.5">
            <span className="tabular text-base font-extrabold text-primary-strong">{formatPaise(finalPrice)}</span>
            {hasDiscount && (
              <span className="tabular text-xs text-muted line-through">{formatPaise(originalPrice)}</span>
            )}
          </div>
          {unavailable ? (
            <span className="text-xs font-semibold text-muted">Sold out</span>
          ) : qty > 0 && !multi ? (
            <Stepper tone="solid" size="sm" value={qty} label={product.name} onChange={(v) => setQuantity(inCart[0]!.key, v)} />
          ) : (
            <button
              type="button"
              onClick={() => (multi ? navigate(`/product/${product.slug}`) : add(product, defaultVariant(product)?.id, 1))}
              aria-label={multi ? `Choose a portion of ${product.name}` : `Add ${product.name} to cart`}
              className="inline-flex h-9 items-center gap-1 rounded-full bg-primary px-3.5 text-sm font-bold text-surface shadow-press transition-[background-color,transform] duration-150 hover:bg-brand-hover active:scale-90"
            >
              <Plus className="size-4" strokeWidth={2.75} aria-hidden />
            Add
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * Fixed-width horizontal card for "Popular Near You" row, matching Today's Specials card layout.
 */
export function PopularCard({ product }: { product: ProductDto }) {
  const { lines, add, setQuantity } = useCart();
  const navigate = useNavigate();
  const multi = product.variants.length > 1;
  const inCart = lines.filter((l) => l.product.id === product.id);
  const qty = inCart.reduce((n, l) => n + l.quantity, 0);
  const unavailable = !product.isAvailable;
  const { finalPrice, originalPrice, hasDiscount, label } = useProductDiscount(product);

  return (
    <article className="group/card relative flex w-[240px] shrink-0 flex-col overflow-hidden rounded-[20px] bg-surface shadow-[0_6px_18px_-6px_rgb(30_29_27/0.16)] ring-1 ring-line/60 transition-[box-shadow,transform] duration-200 ease-out hover:shadow-lift motion-safe:hover:-translate-y-0.5 sm:w-[260px] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-strong">
      <div className="relative">
        <FoodImage src={sized(productImage(product), 600)} alt="" dimmed={unavailable} zoom className="aspect-[16/10] w-full" />
        {hasDiscount && (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-xs font-extrabold text-surface shadow-sm">
            <BadgePercent className="size-3" aria-hidden />
            {label}
          </span>
        )}
        {unavailable && (
          <span className="absolute bottom-2.5 left-2.5 rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-bold text-surface">
            Sold out
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="flex items-center gap-1.5 text-[15px] font-bold">
          <VegMark veg={!!product.isVegetarian} />
          <Link to={`/product/${product.slug}`} className="min-w-0 truncate outline-none after:absolute after:inset-0 after:content-['']">
            {product.name}
          </Link>
        </h3>
        {product.description && <p className="line-clamp-1 text-xs text-muted">{product.description}</p>}
        <div className="relative z-10 mt-auto flex items-center justify-between gap-2 pt-1.5">
          <div className="flex items-baseline gap-1.5">
            <span className="tabular text-base font-extrabold text-primary-strong">{formatPaise(finalPrice)}</span>
            {hasDiscount && (
              <span className="tabular text-xs text-muted line-through">{formatPaise(originalPrice)}</span>
            )}
          </div>
          {unavailable ? (
            <span className="text-xs font-semibold text-muted">Sold out</span>
          ) : qty > 0 && !multi ? (
            <Stepper tone="solid" size="sm" value={qty} label={product.name} onChange={(v) => setQuantity(inCart[0]!.key, v)} />
          ) : (
            <button
              type="button"
              onClick={() => (multi ? navigate(`/product/${product.slug}`) : add(product, defaultVariant(product)?.id, 1))}
              aria-label={multi ? `Choose a portion of ${product.name}` : `Add ${product.name} to cart`}
              className="inline-flex h-9 items-center gap-1 rounded-full bg-primary px-3.5 text-sm font-bold text-surface shadow-press transition-[background-color,transform] duration-150 hover:bg-brand-hover active:scale-90"
            >
              <Plus className="size-4" strokeWidth={2.75} aria-hidden />
            Add
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/** ProductCard aliases DishCard for uniform appearance. */
export const ProductCard = DishCard;

/** ProductRow aliases DishCard for uniform appearance. */
export const ProductRow = DishCard;


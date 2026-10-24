import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  MapPinned,
  Plus,
  Search,
  Truck,
  Wallet,
} from 'lucide-react';
import { formatPaise, type CategoryDto, type ProductDto } from '@a3/contracts';
import { ButtonLink, FoodImage, Skeleton, ErrorState, Stepper, VegMark, cx } from '@/components/ui';
import { Reveal } from '@/components/Reveal';
import { useAuth } from '@/auth/AuthContext';
import { NotificationLink } from '@/layouts/CustomerLayout';
import { useCart } from '@/features/cart/CartContext';
import {
  bannerHref,
  bannersQuery,
  categoriesQuery,
  categoryImage,
  offerSectionsQuery,
  popularQuery,
  productImage,
  productsQuery,
  sized,
} from '@/lib/catalog-api';
import { addressesQuery } from '@/lib/orders-api';
import { HERO_BIRYANI, PRICING } from '@/lib/mock-data';
import { defaultVariant, PopularCard } from './ProductCard';
export { PopularCard };
import { SpecialsRow } from './SpecialsRow';

/** Orange pin, bold area line + small detail line (mockup screen 7). */
function AddressBar({ light = false }: { light?: boolean }) {
  const { user } = useAuth();
  const addresses = useQuery({ ...addressesQuery, enabled: !!user });
  const a = addresses.data?.find((x) => x.isDefault) ?? addresses.data?.[0];
  const title = user && a ? a.city : 'Set delivery location';
  const detail = !user
    ? 'Log in to choose your address'
    : a
      ? `${a.line1}, ${a.postalCode}`
      : 'Add a delivery address';
  return (
    <Link
      to={user ? '/addresses' : '/login'}
      className="flex min-w-0 items-center gap-2 rounded-xl py-1 pr-2"
    >
      <MapPin
        className={light ? 'size-8 shrink-0 text-surface' : 'size-8 shrink-0 text-primary'}
        aria-hidden
        fill="currentColor"
        stroke={light ? 'var(--color-primary)' : 'var(--color-surface)'}
        strokeWidth={1.5}
      />
      <span className="flex min-w-0 flex-col">
        <span className={light ? 'flex items-center gap-0.5 text-[17px] font-bold leading-tight text-surface' : 'flex items-center gap-0.5 text-[17px] font-bold leading-tight'}>
          <span className="truncate">{title}</span>
          <ChevronDown className="size-4 shrink-0" aria-hidden />
        </span>
        <span className={light ? 'truncate text-[13px] text-surface/90' : 'truncate text-[13px] text-muted'}>{detail}</span>
      </span>
    </Link>
  );
}

/** Round category photo + name (Categories screen). */
export function CategoryAvatar({ c, size = 'md' }: { c: CategoryDto; size?: 'md' | 'lg' }) {
  return (
    <Link to={`/menu/${c.slug}`} className="group flex w-20 flex-col items-center gap-2 md:w-24">
      <span
        className={
          size === 'lg'
            ? 'rounded-full bg-primary-soft p-1 size-22 md:size-24'
            : 'rounded-full bg-primary-soft p-1 size-16 md:size-20'
        }
      >
        <FoodImage
          src={sized(categoryImage(c), 200)}
          alt=""
          className="size-full rounded-full transition-transform duration-300 ease-out group-hover:scale-[1.04]"
        />
      </span>
      <span className="w-full truncate text-center text-[13px] font-semibold group-hover:text-primary-strong">
        {c.name}
      </span>
    </Link>
  );
}

/** Rounded-square category tile (Home strip). */
function CategoryTile({ c }: { c: CategoryDto }) {
  return (
    <Link
      to={`/menu/${c.slug}`}
      className="group flex w-[76px] flex-col items-center gap-1.5 md:w-24"
    >
      <span className="size-[76px] rounded-[18px] bg-primary-soft p-1.5 transition-transform duration-200 ease-out group-hover:-translate-y-0.5 md:size-24">
        <FoodImage src={sized(categoryImage(c), 240)} alt="" className="size-full rounded-[14px]" />
      </span>
      <span className="w-full truncate text-center text-[13px] font-semibold group-hover:text-primary-strong">
        {c.name}
      </span>
    </Link>
  );
}

type Slide = { id: string; title: string; highlight?: string; subtitle?: string; buttonText?: string; to?: string; image: string };

/** Shown when no admin banner is live. */
const DEFAULT_SLIDE: Slide = {
  id: 'default',
  title: 'Freshly Prepared',
  highlight: 'Delicious Food',
  subtitle: 'Authentic taste, made with love. Delivered to your doorstep.',
  buttonText: 'Order Now',
  to: '/menu',
  image: HERO_BIRYANI,
};

/** W01 · Home (mockup screen 7): white page, address, search + filter, peach banner, tiles, popular grid. */
export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const categories = useQuery(categoriesQuery);
  const products = useQuery(popularQuery);
  const sections = useQuery(offerSectionsQuery);
  const banners = useQuery(bannersQuery);
  // Admin banners slide here (VSR); with none live, the standard welcome banner shows.
  const slides: Slide[] = banners.data?.length
    ? banners.data.map((b) => ({
        id: b.id,
        title: b.title,
        highlight: b.highlight,
        subtitle: b.subtitle,
        buttonText: b.buttonText,
        to: bannerHref(b),
        image: b.image,
      }))
    : [DEFAULT_SLIDE];
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const at = slides[slide % slides.length]!;
  useEffect(() => {
    if (slides.length < 2 || paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setSlide((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length, paused]);
  const popular = products.data ?? [];

  const { count, totals } = useCart();
  const featured = popular.slice(0, 2);

  return (
    <div className="bg-surface">
      <div className="w-full px-4 md:px-8 xl:px-12 flex flex-col gap-6 pb-14 pt-4 md:gap-12 md:pt-8">
        {/* Phones follow the app mockup (address + search here). Desktop already has both in the header. */}
        <div className="sticky top-0 z-30 -mx-4 -mt-4 md:hidden">
          <div
            className="flex flex-col gap-1.5 bg-cover bg-right-top bg-no-repeat px-4 pb-16 pt-4"
            style={{ backgroundImage: "url('/images/home-header.jpg')" }}
          >
            <div className="flex items-center justify-between gap-3">
              <AddressBar light />
              {user && <NotificationLink className="bg-surface/20 text-surface ring-1 ring-surface/40 hover:bg-surface/30" />}
            </div>
            <p className="font-display text-[22px] font-bold leading-tight text-surface [text-shadow:0_1px_8px_rgb(0_0_0/0.2)]">
              Hi {user?.name?.split(' ')[0] ?? 'there'}
            </p>
            <p className="text-sm font-medium text-surface/95">What would you like to eat today?</p>
          </div>
          {/* Search sits on the artwork's white wave; the whole header stays pinned (VSR). */}
          <div className="relative -mt-10 bg-gradient-to-b from-transparent via-surface/90 to-surface px-4 pb-2.5 pt-2">
            <button
              type="button"
              onClick={() => navigate('/search')}
              className="flex h-13 min-w-0 w-full items-center gap-2.5 rounded-2xl bg-surface px-4 text-left text-[15px] text-muted shadow-[0_4px_16px_-6px_rgb(30_29_27/0.18)] ring-1 ring-line hover:ring-ink/20"
            >
              <Search className="size-5 shrink-0 text-ink" aria-hidden />
              <span className="truncate">Search for biryani, dosa, meals…</span>
            </button>
          </div>
        </div>

        <section
          aria-labelledby="hero-h"
          aria-roledescription={slides.length > 1 ? 'carousel' : undefined}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-[#ffe2c7] via-[#fff0e2] to-[#fff8f1] md:rounded-[32px]"
        >
          {/* soft brand glow behind the bowl */}
          <div
            className="pointer-events-none absolute -right-24 -top-24 -z-10 hidden size-[34rem] rounded-full bg-primary/15 blur-3xl md:block"
            aria-hidden
          />

          <div className="relative z-10 flex min-h-46 max-w-[60%] flex-col items-start justify-center gap-2 p-5 md:min-h-[30rem] md:max-w-[54%] md:gap-5 md:p-12 xl:min-h-[34rem] xl:p-16">
            <div className="hidden md:block">
              <AddressPill />
            </div>
            <h1
              id="hero-h"
              className="text-balance font-display text-[1.375rem] font-bold leading-[1.08] md:text-5xl xl:text-[4.25rem]"
            >
              {at.title}
              {at.highlight && (
                <>
                  <br />
                  <span className="text-primary-strong">{at.highlight}</span>
                </>
              )}
            </h1>
            {at.subtitle && <p className="max-w-[38ch] text-[13px] leading-snug text-muted md:text-lg">{at.subtitle}</p>}
            <div className="mt-1 flex flex-wrap items-center gap-3">
              {at.to && at.buttonText && (
                <ButtonLink
                  to={at.to}
                  size="sm"
                  className="bg-primary hover:bg-brand-hover md:min-h-13 md:px-7 md:text-base"
                  icon={null}
                >
                  {at.buttonText} <Plus className="size-4" strokeWidth={2.5} aria-hidden />
                </ButtonLink>
              )}
              <ButtonLink
                to="/categories"
                variant="secondary"
                className="hidden md:inline-flex md:min-h-13 md:px-6 md:text-base"
              >
                Browse categories
              </ButtonLink>
            </div>
            <ul className="mt-2 hidden flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-ink/80 md:flex">
              {[
                [Truck, `Free delivery above ${formatPaise(PRICING.freeDeliveryAbovePaise)}`],
                [Wallet, 'Pay online or cash'],
                [MapPinned, 'Live order tracking'],
              ].map(([Icon, text]) => {
                const I = Icon as typeof Truck;
                return (
                  <li key={text as string} className="flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-full bg-surface text-primary-strong shadow-sm">
                      <I className="size-4" aria-hidden />
                    </span>
                    {text as string}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="absolute -bottom-8 -right-10 top-3 aspect-square motion-safe:animate-[float_6s_ease-in-out_infinite] md:-bottom-20 md:right-8 md:top-10 xl:right-24">
            <div className="size-full overflow-hidden rounded-full shadow-[0_24px_50px_-18px_rgb(180_83_10/0.55)] ring-8 ring-surface/70">
              <img
                key={at.id}
                src={at.id === DEFAULT_SLIDE.id ? at.image : sized(at.image, 900)}
                alt=""
                className={cx(
                  'size-full object-cover motion-safe:animate-[fade_400ms_ease-out]',
                  at.id === DEFAULT_SLIDE.id && 'scale-[1.55] object-[41%_53%]',
                )}
              />
            </div>
          </div>

          {slides.length > 1 && (
            <div className="absolute bottom-3 left-5 z-20 flex items-center gap-1 md:bottom-6 md:left-12 xl:left-16">
              <button
                type="button"
                onClick={() => setSlide((i) => (i - 1 + slides.length) % slides.length)}
                aria-label="Previous banner"
                className="hidden size-9 place-items-center rounded-full bg-surface/80 text-ink hover:bg-surface md:grid"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              {slides.map((x, i) => (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => setSlide(i)}
                  aria-label={`Show banner ${i + 1} of ${slides.length}`}
                  aria-current={i === slide % slides.length}
                  className="grid h-6 place-items-center px-0.5"
                >
                  <span className={cx('block h-2 rounded-full transition-all duration-300', i === slide % slides.length ? 'w-6 bg-primary' : 'w-2 bg-ink/20')} />
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSlide((i) => (i + 1) % slides.length)}
                aria-label="Next banner"
                className="hidden size-9 place-items-center rounded-full bg-surface/80 text-ink hover:bg-surface md:grid"
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
            </div>
          )}

          {/* Real dishes you can add straight from the banner (desktop). */}
          {featured.length > 0 && (
            <ul className="absolute bottom-12 right-[22%] z-10 hidden flex-col gap-3 xl:flex 2xl:right-[24%]">
              {featured.map((p, i) => (
                <li key={p.id} className={i === 1 ? '-translate-x-10' : ''}>
                  <HeroDish product={p} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <Reveal as="section" className="flex flex-col gap-3">
          <h2 className="font-display text-[1.375rem] font-semibold md:text-[1.75rem]">
            What are you craving?
          </h2>
          {categories.isError ? (
            <ErrorState onRetry={() => categories.refetch()} />
          ) : (
            <ul className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 md:mx-0 md:gap-6 md:px-0">
              {(categories.data ?? Array.from({ length: 6 }, () => null)).map((c, i) => (
                <li key={c?.id ?? i} className="shrink-0">
                  {c ? (
                    <CategoryTile c={c} />
                  ) : (
                    <Skeleton className="size-[76px] rounded-[18px] md:size-24" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </Reveal>

        {(sections.data ?? []).map((x) =>
          x.kind === 'POPULAR' ? (
            <PopularRow key={x.id} title={x.title} />
          ) : x.kind === 'CATEGORY' ? (
            <CategoryRow key={x.id} slug={x.categorySlug ?? ''} title={x.title} />
          ) : (
            <SpecialsRow key={x.id} sectionId={x.id} title={x.title} />
          ),
        )}
      </div>
      <CartPeek count={count} totalPaise={totals.itemTotalPaise} />
    </div>
  );
}

/** Compact delivery-address pill for the desktop banner. */
function AddressPill() {
  const { user } = useAuth();
  const addresses = useQuery({ ...addressesQuery, enabled: !!user });
  const a = addresses.data?.find((x) => x.isDefault) ?? addresses.data?.[0];
  const text = !user
    ? 'Log in to set your delivery address'
    : a
      ? `Delivering to ${a.line1}, ${a.city}`
      : 'Add a delivery address';
  return (
    <Link
      to={user ? '/addresses' : '/login'}
      className="inline-flex h-10 max-w-full items-center gap-2 rounded-full bg-surface/90 pl-2 pr-4 text-sm font-semibold shadow-sm ring-1 ring-line/70 backdrop-blur-sm hover:ring-primary/40"
    >
      <span className="grid size-7 place-items-center rounded-full bg-primary-soft text-primary-strong">
        <MapPin className="size-4" aria-hidden />
      </span>
      <span className="truncate">{text}</span>
      <ChevronDown className="size-4 shrink-0 text-muted" aria-hidden />
    </Link>
  );
}

/** Floating "add from the banner" card for a real popular dish. */
function HeroDish({ product: p }: { product: ProductDto }) {
  const { lines, add } = useCart();
  const navigate = useNavigate();
  const qty = lines.filter((l) => l.product.id === p.id).reduce((n, l) => n + l.quantity, 0);
  const multi = p.variants.length > 1;
  return (
    <div className="flex w-72 items-center gap-3 rounded-2xl bg-surface/95 p-2.5 pr-3 shadow-[0_16px_36px_-14px_rgb(30_29_27/0.35)] ring-1 ring-line/60 backdrop-blur-sm">
      <Link to={`/product/${p.slug}`} className="shrink-0" tabIndex={-1} aria-hidden>
        <FoodImage src={sized(productImage(p), 160)} alt="" className="size-14 rounded-xl" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          to={`/product/${p.slug}`}
          className="block truncate text-sm font-bold hover:text-primary-strong"
        >
          {p.name}
        </Link>
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <span className="tabular font-bold text-ink">
            {formatPaise(defaultVariant(p)?.pricePaise ?? p.pricePaise)}
          </span>
        </p>
      </div>
      <button
        type="button"
        onClick={() => (multi ? navigate(`/product/${p.slug}`) : add(p, defaultVariant(p)?.id, 1))}
        aria-label={multi ? `Choose a portion of ${p.name}` : `Add ${p.name} to cart`}
        className="relative inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-primary px-3.5 text-sm font-bold text-surface shadow-press transition-transform hover:bg-brand-hover active:scale-90"
      >
        <Plus className="size-4" strokeWidth={2.75} aria-hidden />
        Add
        {qty > 0 && (
          <span className="tabular absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-ink text-[10px] font-bold text-surface ring-2 ring-surface">
            {qty}
          </span>
        )}
      </button>
    </div>
  );
}

/** Desktop: floating cart summary once something is in the cart (phones have the cart button in the bottom bar). */
function CartPeek({ count, totalPaise }: { count: number; totalPaise: number }) {
  if (count === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-30 hidden justify-center md:flex">
      <Link
        to="/cart"
        className="pointer-events-auto inline-flex h-14 items-center gap-4 rounded-full bg-ink pl-2 pr-6 text-surface shadow-[0_18px_40px_-12px_rgb(30_29_27/0.6)] transition-transform motion-safe:animate-[pop_240ms_ease-out] hover:-translate-y-0.5"
      >
        <span className="tabular grid size-10 place-items-center rounded-full bg-primary text-sm font-bold">
          {count}
        </span>
        <span className="text-[15px] font-semibold">
          {count === 1 ? '1 item' : `${count} items`} in your cart
        </span>
        <span className="tabular text-[15px] font-bold">{formatPaise(totalPaise)}</span>
        <span className="inline-flex items-center gap-1 font-bold text-primary">
          View cart <ArrowRight className="size-4" aria-hidden />
        </span>
      </Link>
    </div>
  );
}

/** A category the admin switched "Row on Home" on: its dishes in a horizontal row + See All. */
function CategoryRow({ slug, title }: { slug: string; title: string }) {
  const products = useQuery(productsQuery({ categorySlug: slug }));
  const list = products.data?.filter((p) => p.isAvailable).slice(0, 10) ?? [];
  if (products.isError || (products.data && list.length === 0)) return null;
  return (
    <Reveal as="section" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-[1.375rem] font-semibold md:text-[1.75rem]">{title}</h2>
        <Link
          to={`/menu/${slug}`}
          className="inline-flex min-h-11 items-center text-[15px] font-bold text-primary-strong hover:underline"
        >
          See All
        </Link>
      </div>
      {products.isPending ? (
        <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:gap-5 md:px-0">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-64 w-[240px] shrink-0 rounded-[20px] sm:w-[260px]" />
          ))}
        </div>
      ) : (
        <ul className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:gap-5 md:px-0">
          {list.map((p) => (
            <li key={p.id} className="flex shrink-0">
              <PopularCard product={p} />
            </li>
          ))}
        </ul>
      )}
    </Reveal>
  );
}

/** Popular Near You: an automatic offer section (best sellers), placed wherever the admin ordered it. */
function PopularRow({ title }: { title: string }) {
  const products = useQuery(popularQuery);
  const popular = products.data ?? [];
  return (
    <Reveal as="section" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-[1.375rem] font-semibold md:text-[1.75rem]">{title}</h2>
        <Link
          to="/menu"
          className="inline-flex min-h-11 items-center text-[15px] font-bold text-primary-strong hover:underline"
        >
          See All
        </Link>
      </div>
      {products.isError ? (
        <ErrorState onRetry={() => products.refetch()} />
      ) : products.isPending ? (
        <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:gap-5 md:px-0">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-64 w-[240px] shrink-0 rounded-[20px] sm:w-[260px]" />
          ))}
        </div>
      ) : popular.length === 0 ? (
        <p className="py-10 text-center text-muted">The kitchen is resting. Check back soon.</p>
      ) : (
        <ul className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:gap-5 md:px-0">
          {popular.map((p) => (
            <li key={p.id} className="flex shrink-0">
              <PopularCard product={p} />
            </li>
          ))}
        </ul>
      )}
    </Reveal>
  );
}

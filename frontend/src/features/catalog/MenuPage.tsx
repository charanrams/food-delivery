import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpDown, Check, ChevronDown, Clock, Heart, Search, SlidersHorizontal, Trash2, UtensilsCrossed } from 'lucide-react';
import { cx, Skeleton, ErrorState, EmptyState, ButtonLink, FoodImage, VegMark } from '@/components/ui';
import type { ProductDto } from '@a3/contracts';
import { FrameIconButton, PageFrame, PillChip } from '@/components/frame';
import { categoriesQuery, categoryImage, productImage, productsQuery, sized, specialsQuery } from '@/lib/catalog-api';
import { useFavorites } from '@/lib/favorites';
import { CartControl, DishCard, price, ProductRow } from './ProductCard';
import { CategoryAvatar, PopularCard } from './HomePage';
import type { SpecialDto } from '@a3/contracts';

type Sort = 'popular' | 'discount-desc' | 'discount-asc' | 'price-asc' | 'price-desc' | 'rating-desc';
type Diet = 'all' | 'veg' | 'nonveg';

function RowsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 md:gap-4">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-64 rounded-[20px]" />
      ))}
    </div>
  );
}

const SORTS: { value: Sort; label: string }[] = [
  { value: 'popular', label: 'Popular' },
  { value: 'rating-desc', label: 'Rating: High to Low' },
  { value: 'discount-desc', label: 'Discount: High to Low' },
  { value: 'discount-asc', label: 'Discount: Low to High' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
];

/** Sort pill with its own menu, right-aligned under the pill (the native select popup didn't line up). */
function SortMenu({ value, onChange }: { value: Sort; onChange: (s: Sort) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);
  const current = SORTS.find((x) => x.value === value) ?? SORTS[0]!;
  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Sort by: ${current.label}`}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-surface px-4 text-sm font-semibold ring-1 ring-inset ring-line hover:ring-ink/25 focus-visible:outline-2 focus-visible:outline-primary"
      >
        <ArrowUpDown className="size-4 text-primary-strong" aria-hidden />
        <span className="max-w-[9.5rem] truncate">{current.label}</span>
        <ChevronDown className={cx('size-4 text-muted transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <ul role="listbox" aria-label="Sort by" className="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-2xl bg-surface py-1.5 shadow-xl ring-1 ring-line">
          {SORTS.map((o) => (
            <li key={o.value} role="option" aria-selected={o.value === value}>
              <button
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={cx(
                  'flex min-h-11 w-full items-center justify-between gap-2 px-4 text-left text-sm hover:bg-primary-soft',
                  o.value === value ? 'font-bold text-primary-strong' : 'font-medium',
                )}
              >
                {o.label}
                {o.value === value && <Check className="size-4" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** W02 · Product list (mockup screen 9): clean dishes grid, sort/filter by discount, price, rating. */
export function MenuPage() {
  const { categorySlug } = useParams();
  const navigate = useNavigate();
  const categories = useQuery(categoriesQuery);
  const products = useQuery(productsQuery({ categorySlug }));
  const specials = useQuery(specialsQuery);
  const [diet, setDiet] = useState<Diet>('all');
  const [sort, setSort] = useState<Sort>('popular');

  const specialsMap = useMemo(() => {
    const map = new Map<string, SpecialDto>();
    for (const s of specials.data ?? []) {
      if (s.isLive) map.set(s.product.id, s);
    }
    return map;
  }, [specials.data]);

  const current = categories.data?.find((c) => c.slug === categorySlug);
  const visible = useMemo(() => {
    const list = (products.data ?? []).filter((p) => diet === 'all' || (diet === 'veg') === !!p.isVegetarian);
    const getPrice = (p: ProductDto) => p.variants.find((v) => v.isAvailable && v.name === 'Full')?.pricePaise ?? p.variants.find((v) => v.isAvailable)?.pricePaise ?? p.pricePaise;
    const getDiscount = (p: ProductDto) => {
      const sp = specialsMap.get(p.id);
      if (sp) return sp.discountPercent;
      const curPrice = getPrice(p);
      if (p.compareAtPricePaise && p.compareAtPricePaise > curPrice) {
        return Math.round(((p.compareAtPricePaise - curPrice) / p.compareAtPricePaise) * 100);
      }
      return 0;
    };
    const getRating = (p: ProductDto) => p.rating ?? 0;

    if (sort === 'discount-desc') return [...list].sort((a, b) => getDiscount(b) - getDiscount(a) || getPrice(a) - getPrice(b));
    if (sort === 'discount-asc') return [...list].sort((a, b) => getDiscount(a) - getDiscount(b) || getPrice(a) - getPrice(b));
    if (sort === 'price-asc') return [...list].sort((a, b) => getPrice(a) - getPrice(b));
    if (sort === 'price-desc') return [...list].sort((a, b) => getPrice(b) - getPrice(a));
    if (sort === 'rating-desc') return [...list].sort((a, b) => getRating(b) - getRating(a));
    return list;
  }, [products.data, diet, sort, specialsMap]);

  return (
    <>
    <div className="hidden md:block">
      <DesktopMenu
        categorySlug={categorySlug}
        diet={diet}
        setDiet={setDiet}
        sort={sort}
        setSort={setSort}
        visible={visible}
        loading={products.isPending}
        error={products.isError}
        retry={() => products.refetch()}
      />
    </div>
    <div className="md:hidden">
    <PageFrame
      title={current?.name ?? 'Dishes'}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted">
            {products.data ? `${visible.length} ${visible.length === 1 ? 'dish' : 'dishes'}` : 'Loading dishes…'}
          </p>
          <SortMenu value={sort} onChange={setSort} />
        </div>

        {products.isError ? (
          <ErrorState onRetry={() => products.refetch()} />
        ) : products.isPending ? (
          <RowsSkeleton />
        ) : visible.length === 0 ? (
          <EmptyState icon={<UtensilsCrossed className="size-9" />} title="Nothing matches" body="Try another filter or browse categories." action={<ButtonLink to="/categories" variant="secondary">Browse categories</ButtonLink>} />
        ) : (
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
            {visible.map((p) => (
              <DishCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </PageFrame>
    </div>
    </>
  );
}

/** Desktop menu: sticky category sidebar with counts, header with filters, big photo-card grid. */
function DesktopMenu({ categorySlug, diet, setDiet, sort, setSort, visible, loading, error, retry }: {
  categorySlug?: string;
  diet: Diet;
  setDiet: (d: Diet) => void;
  sort: Sort;
  setSort: (s: Sort) => void;
  visible: ProductDto[];
  loading: boolean;
  error: boolean;
  retry: () => void;
}) {
  const navigate = useNavigate();
  const categories = useQuery(categoriesQuery);
  const all = useQuery(productsQuery());
  const count = (id?: string) => (all.data ?? []).filter((p) => p.isAvailable && (!id || p.categoryId === id)).length;
  const current = categories.data?.find((c) => c.slug === categorySlug);

  return (
    <div className="w-full bg-surface px-8 pb-16 pt-8 xl:px-12">
      <div className="grid items-start gap-10 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]">
        {/* Sidebar */}
        <aside className="flex flex-col gap-6 lg:sticky lg:top-28">
          <div>
            <h1 className="font-display text-[2rem] font-semibold leading-tight">Our menu</h1>
            <p className="mt-1 text-sm text-muted">Cooked fresh when you order.</p>
          </div>
          <nav aria-label="Categories" className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
            {[{ id: undefined, slug: undefined, name: 'All dishes', imageUrl: undefined }, ...(categories.data ?? [])].map((c) => {
              const on = (c.slug ?? undefined) === (categorySlug ?? undefined);
              return (
                <button
                  key={c.slug ?? 'all'}
                  type="button"
                  onClick={() => navigate(c.slug ? `/menu/${c.slug}` : '/menu')}
                  aria-current={on ? 'page' : undefined}
                  className={cx(
                    'group flex min-h-13 shrink-0 items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition-colors',
                    on ? 'bg-primary-soft text-primary-strong' : 'hover:bg-card',
                  )}
                >
                  {c.slug ? (
                    <FoodImage src={sized(categoryImage(c as never), 120)} alt="" className="size-10 shrink-0 rounded-xl" />
                  ) : (
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-card text-ink group-aria-[current=page]:bg-surface"><UtensilsCrossed className="size-5" aria-hidden /></span>
                  )}
                  <span className="flex-1 truncate text-[15px] font-semibold">{c.name}</span>
                  {all.data && <span className={cx('tabular rounded-full px-2 py-0.5 text-xs font-bold', on ? 'bg-surface' : 'bg-card text-muted')}>{count(c.id)}</span>}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Results */}
        <section aria-labelledby="menu-h" className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
            <div>
              <h2 id="menu-h" className="font-display text-3xl font-semibold">{current?.name ?? 'All dishes'}</h2>
              {!loading && <p className="mt-1 text-sm text-muted">{visible.length} {visible.length === 1 ? 'dish' : 'dishes'}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div role="radiogroup" aria-label="Diet" className="inline-flex rounded-full bg-card p-1">
                {(
                  [
                    ['all', 'All'],
                    ['veg', 'Veg'],
                    ['nonveg', 'Non-veg'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    role="radio"
                    aria-checked={diet === id}
                    onClick={() => setDiet(id)}
                    className={cx('inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors', diet === id ? 'bg-ink text-surface' : 'text-ink hover:bg-primary-soft')}
                  >
                    {id !== 'all' && <VegMark veg={id === 'veg'} />}
                    {label}
                  </button>
                ))}
              </div>
              <SortMenu value={sort} onChange={setSort} />
            </div>
          </div>

          {error ? (
            <ErrorState onRetry={retry} />
          ) : loading ? (
            <div className="grid grid-cols-2 gap-5 xl:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-72" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <EmptyState icon={<Search className="size-9" />} title="Nothing matches" body="Try another filter or category." action={<ButtonLink to="/menu" variant="secondary">Show all dishes</ButtonLink>} />
          ) : (
            <ul className="grid grid-cols-2 gap-5 xl:grid-cols-3 2xl:grid-cols-4">
              {visible.map((p) => (
                <li key={p.id} className="flex">
                  <PopularCard product={p} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/** Categories (same layout as the app): search, a rail of round category photos, then the chosen category's dishes. */
export function CategoriesPage() {
  const navigate = useNavigate();
  const categories = useQuery(categoriesQuery);
  const products = useQuery(productsQuery());
  const specials = useQuery(specialsQuery);
  const [selectedId, setSelectedId] = useState<string>();
  const [sort, setSort] = useState<Sort>('popular');

  const specialsMap = useMemo(() => {
    const map = new Map<string, SpecialDto>();
    for (const s of specials.data ?? []) {
      if (s.isLive) map.set(s.product.id, s);
    }
    return map;
  }, [specials.data]);

  const cats = categories.data ?? [];
  // Start on the middle category so the wheel opens centred, with neighbours on both sides.
  const current = cats.find((c) => c.id === selectedId) ?? cats[Math.floor(cats.length / 2)];
  const index = Math.max(0, cats.findIndex((c) => c.id === current?.id));
  const touch = useRef<{ x: number; y: number; horizontal?: boolean } | null>(null);
  const [drag, setDrag] = useState(0); // px the dishes follow the finger
  const [dir, setDir] = useState<1 | -1>(1); // which side the next category slides in from
  const [leaving, setLeaving] = useState(false);
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const select = (i: number) => {
    const next = cats[Math.min(cats.length - 1, Math.max(0, i))];
    if (!next || next.id === current?.id) {
      setDrag(0);
      return;
    }
    setDir(i > index ? 1 : -1);
    if (reduceMotion) {
      setDrag(0);
      setSelectedId(next.id);
      return;
    }
    // Slide the current dishes out, then bring the next category in from the other side.
    setLeaving(true);
    setDrag((i > index ? -1 : 1) * Math.min(window.innerWidth, 480));
    window.setTimeout(() => {
      setSelectedId(next.id);
      setLeaving(false);
      setDrag(0);
    }, 180);
  };
  const go = select;
  const dishes = useMemo(() => {
    const list = (products.data ?? []).filter((p) => p.categoryId === current?.id);
    const getPrice = (p: (typeof list)[number]) => p.variants.find((v) => v.isAvailable && v.name === 'Full')?.pricePaise ?? p.variants.find((v) => v.isAvailable)?.pricePaise ?? p.pricePaise;
    const getDiscount = (p: (typeof list)[number]) => {
      const sp = specialsMap.get(p.id);
      if (sp) return sp.discountPercent;
      const curPrice = getPrice(p);
      if (p.compareAtPricePaise && p.compareAtPricePaise > curPrice) {
        return Math.round(((p.compareAtPricePaise - curPrice) / p.compareAtPricePaise) * 100);
      }
      return 0;
    };
    const getRating = (p: (typeof list)[number]) => p.rating ?? 0;

    if (sort === 'discount-desc') list.sort((a, b) => getDiscount(b) - getDiscount(a) || getPrice(a) - getPrice(b));
    else if (sort === 'discount-asc') list.sort((a, b) => getDiscount(a) - getDiscount(b) || getPrice(a) - getPrice(b));
    else if (sort === 'price-asc') list.sort((a, b) => getPrice(a) - getPrice(b));
    else if (sort === 'price-desc') list.sort((a, b) => getPrice(b) - getPrice(a));
    else if (sort === 'rating-desc') list.sort((a, b) => getRating(b) - getRating(a));

    // Sold-out dishes sink to the bottom.
    return list.sort((a, b) => Number(b.isAvailable) - Number(a.isAvailable));
  }, [products.data, current?.id, sort, specialsMap]);

  return (
    <PageFrame
      art
      subtitle="Explore dishes by category"
      title="Categories"
    >
      {categories.isError ? (
        <ErrorState onRetry={() => categories.refetch()} />
      ) : categories.data?.length === 0 ? (
        <EmptyState icon={<UtensilsCrossed className="size-9" />} title="No categories yet" body="The menu is being prepared." />
      ) : (
        <div className="flex flex-col gap-6">

          {categories.data ? (
            <ul className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0" aria-label="Categories">
              {cats.map((c, i) => {
                const on = c.id === current?.id;
                const n = (products.data ?? []).filter((p) => p.categoryId === c.id).length;
                return (
                  <li key={c.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => select(i)}
                      aria-pressed={on}
                      className={cx(
                        'flex w-24 flex-col items-center gap-1.5 rounded-[22px] p-2 pb-2.5 ring-inset transition-all active:scale-95 sm:w-28',
                        on
                          ? 'bg-primary-soft shadow-sm ring-[2px] ring-primary'
                          : 'bg-card hover:ring-1 hover:ring-primary/40',
                      )}
                    >
                      <FoodImage
                        src={sized(categoryImage(c), 240)}
                        alt=""
                        className="aspect-square w-full rounded-full object-cover shadow-sm"
                      />
                      <span className={cx('w-full truncate text-center text-[13px] font-bold', on ? 'text-primary-strong' : 'text-ink')}>
                        {c.name}
                      </span>
                      {products.data && (
                        <span className="-mt-1 text-[11px] text-muted">
                          {n} {n === 1 ? 'dish' : 'dishes'}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex justify-center gap-4 py-4">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="size-[72px] rounded-full" />
              ))}
            </div>
          )}

          {current && (
            <section
              aria-labelledby="cat-dishes"
              className="flex touch-pan-y flex-col gap-4"
              // Swipe left/right on the dishes to move between categories (like the app).
              onTouchStart={(e) => (touch.current = { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY })}
              onTouchMove={(e) => {
                const t = touch.current;
                if (!t || leaving) return;
                const dx = e.touches[0]!.clientX - t.x;
                const dy = e.touches[0]!.clientY - t.y;
                // Decide once per gesture: horizontal = category swipe, vertical = normal page scroll.
                t.horizontal ??= Math.abs(dx) > 8 || Math.abs(dy) > 8 ? Math.abs(dx) > Math.abs(dy) * 1.2 : undefined;
                if (!t.horizontal) return;
                const atEdge = (dx > 0 && index === 0) || (dx < 0 && index === cats.length - 1);
                setDrag(atEdge ? dx * 0.25 : dx); // rubber-band at the first/last category
              }}
              onTouchEnd={(e) => {
                const t = touch.current;
                touch.current = null;
                if (!t?.horizontal) return;
                const dx = e.changedTouches[0]!.clientX - t.x;
                if (Math.abs(dx) > 60) go(index + (dx < 0 ? 1 : -1));
                else setDrag(0);
              }}
              onTouchCancel={() => {
                touch.current = null;
                setDrag(0);
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 id="cat-dishes" key={current.id} className={cx("truncate text-2xl font-extrabold tracking-[-0.02em] md:text-[1.75rem]", dir > 0 ? "motion-safe:animate-[slide-in-right_260ms_cubic-bezier(0.16,1,0.3,1)]" : "motion-safe:animate-[slide-in-left_260ms_cubic-bezier(0.16,1,0.3,1)]")}>
                    {current.name}
                  </h2>
                  <p className="text-sm text-muted">{products.data ? `${dishes.length} ${dishes.length === 1 ? 'dish' : 'dishes'} available` : 'Loading dishes…'}</p>
                </div>
                <SortMenu value={sort} onChange={setSort} />
              </div>
              {products.isError ? (
                <ErrorState onRetry={() => products.refetch()} />
              ) : products.isPending ? (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
                  {Array.from({ length: 4 }, (_, i) => (
                    <Skeleton key={i} className="h-72 rounded-[20px]" />
                  ))}
                </div>
              ) : dishes.length === 0 ? (
                <EmptyState icon={<UtensilsCrossed className="size-9" />} title="Nothing here yet" body="Swipe or pick another category." />
              ) : (
                <div className="overflow-hidden">
                <div
                  key={current.id}
                  style={{ transform: drag ? `translateX(${drag}px)` : undefined, opacity: leaving ? 0 : 1 - Math.min(Math.abs(drag) / 900, 0.35) }}
                  className={cx(
                    'grid grid-cols-2 gap-3 will-change-transform md:grid-cols-3 md:gap-4 xl:grid-cols-4',
                    // No transition while the finger is down, so the cards track it 1:1.
                    touch.current ? '' : 'transition-[transform,opacity] duration-200 ease-out',
                    !drag && !leaving && (dir > 0 ? 'motion-safe:animate-[slide-in-right_320ms_cubic-bezier(0.16,1,0.3,1)]' : 'motion-safe:animate-[slide-in-left_320ms_cubic-bezier(0.16,1,0.3,1)]'),
                  )}
                >
                  {dishes.map((p) => (
                    <DishCard key={p.id} product={p} />
                  ))}
                </div>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </PageFrame>
  );
}

/** Dedicated Favourite dish card with quick remove and cart actions. */
function FavoriteCard({
  product,
  onRemove,
}: {
  product: ProductDto;
  onRemove: () => void;
}) {
  const unavailable = !product.isAvailable;
  return (
    <article className="group relative flex flex-col sm:flex-row gap-4 rounded-2xl border border-line/70 bg-surface p-3.5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
      {/* Dish photo with veg badge */}
      <div className="relative shrink-0 overflow-hidden rounded-xl sm:w-36 aspect-[4/3] sm:aspect-square bg-card">
        <Link to={`/product/${product.slug}`} className="block size-full" aria-label={product.name}>
          <FoodImage
            src={sized(productImage(product), 400)}
            alt={product.name}
            dimmed={unavailable}
            zoom
            className="size-full object-cover"
          />
        </Link>
        <span className="absolute left-2.5 top-2.5 z-10 rounded-md bg-surface/90 p-1 backdrop-blur shadow-sm">
          <VegMark veg={!!product.isVegetarian} />
        </span>
        {unavailable && (
          <span className="absolute bottom-2 left-2 z-10 rounded-full bg-ink/80 px-2 py-0.5 text-[10px] font-bold text-surface">
            Sold out
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-bold text-ink">
              <Link
                to={`/product/${product.slug}`}
                className="hover:text-primary transition-colors line-clamp-1"
              >
                {product.name}
              </Link>
            </h3>
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted sm:text-sm">
            {product.description}
          </p>
        </div>

        {/* Pricing, prep time & actions */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-line/40 pt-3">
          <div className="flex items-baseline gap-2">
            <span className="tabular font-display text-lg font-extrabold text-ink">
              {price(product)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct Remove from Wishlist button */}
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-1.5 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-100 hover:text-rose-700 active:scale-95"
              title="Remove from favourites"
              aria-label={`Remove ${product.name} from favourites`}
            >
              <Trash2 className="size-3.5" aria-hidden />
              <span>Remove</span>
            </button>

            {/* Cart control */}
            <CartControl product={product} />
          </div>
        </div>
      </div>
    </article>
  );
}

/** Favourite dishes (kept on this device, with instant remove and clear support). */
export function FavoritesPage() {
  const { ids, remove, clear } = useFavorites();
  const products = useQuery(productsQuery());
  const [diet, setDiet] = useState<Diet>('all');
  const [removedToast, setRemovedToast] = useState<string | null>(null);

  const list = useMemo(() => {
    return (products.data ?? []).filter((p) => ids.includes(p.id));
  }, [products.data, ids]);

  const filtered = useMemo(() => {
    if (diet === 'all') return list;
    return list.filter((p) => (diet === 'veg') === !!p.isVegetarian);
  }, [list, diet]);

  const handleRemove = (product: ProductDto) => {
    remove(product.id);
    setRemovedToast(`Removed "${product.name}" from favourites`);
    setTimeout(() => setRemovedToast(null), 3000);
  };

  return (
    <PageFrame art title="Favourites" subtitle="Dishes you love, saved for later">
      {products.isError ? (
        <ErrorState onRetry={() => products.refetch()} />
      ) : products.isPending ? (
        <RowsSkeleton />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<Heart className="size-10 fill-rose-100 text-rose-500" />}
          title="Your wishlist is empty"
          body="Explore our chef-crafted biryanis, curries, and fresh breads. Tap the heart icon on any dish to save it here for fast reordering!"
          action={<ButtonLink to="/menu">Browse the menu</ButtonLink>}
        />
      ) : (
        <div className="flex flex-col">
          {/* Header Bar */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-muted">
                <strong className="text-ink">{list.length}</strong> {list.length === 1 ? 'dish' : 'dishes'} saved
              </span>
              {list.length > 1 && (
                <div className="flex items-center gap-1 rounded-full bg-card p-1">
                  {(
                    [
                      ['all', 'All'],
                      ['veg', 'Veg'],
                      ['nonveg', 'Non-veg'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setDiet(id)}
                      className={cx(
                        'rounded-full px-3 py-1 text-xs font-bold transition-colors',
                        diet === id ? 'bg-ink text-surface shadow-sm' : 'text-muted hover:text-ink',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                if (window.confirm('Clear all dishes from your favourites?')) {
                  clear();
                  setRemovedToast('Wishlist cleared');
                  setTimeout(() => setRemovedToast(null), 3000);
                }
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline"
            >
              <Trash2 className="size-3.5" />
              <span>Clear all</span>
            </button>
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-semibold text-muted">
                No {diet === 'veg' ? 'vegetarian' : 'non-vegetarian'} dishes in your favourites.
              </p>
              <button
                type="button"
                onClick={() => setDiet('all')}
                className="mt-2 text-xs font-bold text-primary hover:underline"
              >
                Show all favourites
              </button>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filtered.map((p) => (
                <FavoriteCard
                  key={p.id}
                  product={p}
                  onRemove={() => handleRemove(p)}
                />
              ))}
            </div>
          )}

          {/* Floating Removal Feedback Toast */}
          {removedToast && (
            <div
              role="status"
              className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-bold text-surface shadow-xl motion-safe:animate-[pop_180ms_ease-out]"
            >
              <Trash2 className="size-3.5 text-rose-400" />
              <span>{removedToast}</span>
            </div>
          )}
        </div>
      )}
    </PageFrame>
  );
}

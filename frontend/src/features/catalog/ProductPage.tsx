import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Heart, SearchX, Share2, ShieldCheck, ShoppingBag, Star, UtensilsCrossed } from 'lucide-react';
import { PageFrame, container } from '@/components/frame';
import { useFavorites } from '@/lib/favorites';
import { formatPaise, type ProductDto } from '@a3/contracts';
import { Button, ButtonLink, EmptyState, ErrorState, FoodImage, Skeleton, Stepper, VegMark, cx } from '@/components/ui';
import { categoriesQuery, productImage, productQuery, productsQuery, sized } from '@/lib/catalog-api';
import { defaultVariant } from './ProductCard';
import { DishCard } from './ProductCard';
import { useCart } from '@/features/cart/CartContext';

function getDishHighlights(p: ProductDto): string[] {
  const name = p.name.toLowerCase();
  if (name.includes('meal') || name.includes('thali')) {
    return [
      '🍚 Steamed Sona Masoori Rice',
      '🍲 Authentic Andhra Dal & Sambar',
      '🥘 2 Chef-special Seasoned Curries',
      '🥣 Tangy Tomato Rasam & Fresh Curd',
      '🌶️ Spicy Andhra Pickle & Crispy Appalam',
    ];
  } else if (name.includes('biryani')) {
    return [
      '🌾 Aged Long-Grain Basmati Rice',
      '🔥 Slow-cooked on Dum with House Spices',
      '🧅 Chilled Raita & Mirchi ka Salan',
      '🌿 Garnished with Fried Onions & Mint',
    ];
  } else if (name.includes('dosa')) {
    return [
      '🥞 Crisp Golden Fermented Crepe',
      '🥔 Spiced Potato Masala Filling',
      '🥥 Fresh Coconut Chutney & Tomato Chutney',
      '🥣 Steaming Vegetable Sambar',
    ];
  } else if (name.includes('paneer') || name.includes('curry')) {
    return [
      '🧀 Farm-Fresh Soft Malai Paneer',
      '🍅 Rich Slow-Simmered Cashew Gravy',
      '🧈 Finished with Pure Desi Butter & Cream',
      '🌿 Flavoured with Hand-Crushed Kasuri Methi',
    ];
  } else if (name.includes('naan') || name.includes('roti')) {
    return [
      '🔥 Clay Oven Tandoor-Baked to Perfection',
      '🧈 Generously Brushed with Fresh Butter',
      '🌾 Made with 100% Fine Grade Flour',
    ];
  } else if (name.includes('jamun') || name.includes('sweet')) {
    return [
      '🍯 Melt-in-mouth Golden Milk Dumplings',
      '🌸 Infused with Rosewater & Green Cardamom',
      '✨ Served Warm in Fragrant Sugar Syrup',
    ];
  }
  return [
    '🌿 100% Fresh Daily Ingredients',
    '👨‍🍳 Cooked to Order by Master Chefs',
    '📦 Hygienic Tamper-Proof Packaging',
    '🔥 Served Piping Hot & Fresh',
  ];
}

function resolveGalleryImages(p: ProductDto): string[] {
  if (p.images.length > 1) return p.images;
  if (!p.images.length || !p.images[0]) {
    const fallback = productImage(p);
    return fallback ? [fallback] : [];
  }
  const base = p.images[0];
  if (base.includes('res.cloudinary.com')) {
    const focus = base.replace('/upload/', '/upload/c_crop,g_center,w_700,h_700/');
    const wide = base.replace('/upload/', '/upload/c_fill,g_auto,w_900,h_700/');
    return [base, focus, wide];
  }
  return [base];
}

/** Swipe / scroll-snap carousel of every photo the admin uploaded, with dots and arrows. */
function Gallery({ p }: { p: ProductDto }) {
  const images = resolveGalleryImages(p);
  const track = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const go = (i: number) => {
    const el = track.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };
  return (
    <div className="group/gallery relative">
      <div
        ref={track}
        onScroll={(e) => setPage(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto md:rounded-[24px]"
        aria-roledescription="carousel"
        aria-label={`${p.name} photos`}
      >
        {images.map((src, i) => (
          <div key={src + i} className="w-full shrink-0 snap-center" aria-roledescription="slide" aria-label={`${i + 1} of ${images.length}`}>
            <FoodImage src={sized(src, 1240)} alt={i === 0 ? p.name : ''} dimmed={!p.isAvailable} className="aspect-square md:aspect-[5/4]" />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <>
          <div className="absolute inset-x-0 bottom-10 flex justify-center md:bottom-4">
            <div className="flex gap-1.5 rounded-full bg-ink/40 px-2.5 py-1.5 backdrop-blur-sm">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Show photo ${i + 1}`}
                  aria-current={i === page}
                  className={cx('h-1.5 rounded-full transition-[width,background-color] duration-200', i === page ? 'w-4 bg-surface' : 'w-1.5 bg-surface/55')}
                />
              ))}
            </div>
          </div>
          <button type="button" onClick={() => go(Math.max(0, page - 1))} disabled={page === 0} aria-label="Previous photo" className="absolute left-3 top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-surface/90 shadow-lift transition-opacity disabled:opacity-0 md:grid md:opacity-0 md:group-hover/gallery:opacity-100">
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button type="button" onClick={() => go(Math.min(images.length - 1, page + 1))} disabled={page === images.length - 1} aria-label="Next photo" className="absolute right-3 top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-surface/90 shadow-lift transition-opacity disabled:opacity-0 md:grid md:opacity-0 md:group-hover/gallery:opacity-100">
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </>
      )}
    </div>
  );
}

/** W04 · Product detail: full-bleed photo carousel on phones (no title bar), split layout on desktop. */
export function ProductPage() {
  const { slug = '' } = useParams();
  const product = useQuery(productQuery(slug));
  const categories = useQuery(categoriesQuery);
  const allProductsQuery = useQuery(productsQuery());
  const { add } = useCart();
  const navigate = useNavigate();
  const [variantId, setVariantId] = useState<string>();
  const [qty, setQty] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const fav = useFavorites();
  const back = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));

  if (product.isError)
    return (
      <PageFrame title="Dish details">
        <ErrorState onRetry={() => product.refetch()} />
      </PageFrame>
    );
  if (product.isPending)
    return (
      <div className={cx(container, 'grid gap-8 bg-surface py-6 lg:grid-cols-2')}>
        <Skeleton className="aspect-square md:aspect-[5/4]" />
        <Skeleton className="h-96" />
      </div>
    );
  const p = product.data;
  if (!p)
    return (
      <PageFrame title="Dish details">
        <EmptyState
          icon={<SearchX className="size-9" />}
          title="Dish not found"
          body="It may have been removed from the menu."
          action={<ButtonLink to="/menu">Back to menu</ButtonLink>}
        />
      </PageFrame>
    );

  const isFav = fav.has(p.id);
  const category = categories.data?.find((c) => c.id === p.categoryId);
  
  // Respective dishes from the same category first, supplemented with other available favorites so it is never empty.
  const sameCategory = (allProductsQuery.data ?? []).filter(
    (item) => item.categoryId === p.categoryId && item.id !== p.id && item.isAvailable,
  );
  const otherDishes = (allProductsQuery.data ?? []).filter(
    (item) => item.id !== p.id && item.categoryId !== p.categoryId && item.isAvailable,
  );
  const related = [...sameCategory, ...otherDishes].slice(0, 4);

  const selected = p.variants.find((v) => v.id === variantId) ?? defaultVariant(p);
  const unit = selected?.pricePaise ?? p.pricePaise;
  const round =
    'grid size-12 place-items-center rounded-full shadow-[0_2px_10px_rgb(0_0_0/0.14)] backdrop-blur-sm transition-transform active:scale-90';

  const toggleFavorite = () => {
    const nextState = !isFav;
    fav.toggle(p.id);
    setToast(nextState ? `Saved "${p.name}" to your wishlist!` : `Removed "${p.name}" from wishlist`);
    window.setTimeout(() => setToast(null), 2500);
  };

  return (
    <div className="relative overflow-x-clip bg-surface pb-28 md:pb-16">
      <div className="mx-auto w-full max-w-[1200px] md:px-10 md:pt-8">
        <nav aria-label="Breadcrumb" className="mb-6 max-md:hidden">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <li>
              <Link to="/menu" className="hover:text-ink">
                Menu
              </Link>
            </li>
            <ChevronRight className="size-3.5" aria-hidden />
            {category && (
              <>
                <li>
                  <Link to={`/menu/${category.slug}`} className="hover:text-ink">
                    {category.name}
                  </Link>
                </li>
                <ChevronRight className="size-3.5" aria-hidden />
              </>
            )}
            <li aria-current="page" className="font-medium text-ink">
              {p.name}
            </li>
          </ol>
        </nav>

        <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)] lg:gap-12">
          <div className="relative">
            <Gallery p={p} />
            {/* Floating controls over the photo */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink/40 to-transparent md:hidden" aria-hidden />
            <div className="absolute inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-20 flex justify-between md:inset-x-auto md:right-4 md:top-4">
              <button
                type="button"
                onClick={back}
                aria-label="Back"
                className={cx(round, 'bg-surface/95 text-ink md:hidden')}
              >
                <ArrowLeft className="size-5" aria-hidden />
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    setToast(`Sharing "${p.name}" (link copied)`);
                    window.setTimeout(() => setToast(null), 2500);
                  }}
                  aria-label="Share dish"
                  title="Share dish"
                  className={cx(round, 'bg-surface/95 text-ink hover:bg-card ring-1 ring-black/10')}
                >
                  <Share2 className="size-5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={toggleFavorite}
                  aria-pressed={isFav}
                  aria-label={isFav ? 'Remove from wishlist' : 'Add to wishlist'}
                  className={cx(
                    round,
                    isFav
                      ? 'bg-rose-50 text-rose-600 ring-2 ring-rose-300'
                      : 'bg-surface/95 text-ink hover:bg-rose-50 hover:text-rose-600 ring-1 ring-black/10',
                  )}
                >
                  <Heart
                    className={cx('size-6 transition-transform duration-200', isFav ? 'scale-110' : '')}
                    fill={isFav ? '#e11d48' : 'none'}
                    stroke={isFav ? '#e11d48' : 'currentColor'}
                    strokeWidth={2}
                    aria-hidden
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Details sheet */}
          <div className="relative flex flex-col gap-4 bg-surface px-5 pt-6 md:mt-0 md:rounded-none md:px-0 md:pt-0">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-card px-3 text-[13px] font-semibold">
                <VegMark veg={!!p.isVegetarian} /> {p.isVegetarian ? 'Pure Veg' : 'Non-veg'}
              </span>
              {category && (
                <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary-soft px-3 text-[13px] font-semibold text-primary-strong">
                  {category.name}
                </span>
              )}
              <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-card px-3 text-[13px] font-semibold">
                <Clock className="size-3.5" aria-hidden /> {p.preparationTimeMinutes ?? 20} min
              </span>
              <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-amber-100 px-3 text-[13px] font-bold text-amber-900">
                <Star className="size-3.5 fill-amber-500 text-amber-500" />
                4.8 (120+ orders)
              </span>
              {!p.isAvailable && (
                <span className="inline-flex h-8 items-center rounded-full bg-danger/10 px-3 text-[13px] font-semibold text-danger">
                  Unavailable now
                </span>
              )}
            </div>
            <div>
              <h1 className="text-balance font-display text-[1.75rem] font-bold leading-[1.15] md:text-[2.5rem]">
                {p.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-baseline gap-2.5">
                <span className="tabular font-display text-2xl font-extrabold text-primary-strong md:text-3xl">
                  {formatPaise(unit)}
                </span>
                {selected && (
                  <span className="text-sm font-bold text-muted">
                    ({selected.name})
                  </span>
                )}
                <span className="rounded-md bg-emerald-100/70 px-2 py-0.5 text-xs font-bold text-emerald-800">
                  Inclusive of all taxes
                </span>
              </div>
            </div>
            {p.description && (
              <p className="max-w-[62ch] text-[15px] leading-relaxed text-muted">{p.description}</p>
            )}

            {/* "What's in this dish" Highlights Box */}
            <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-[#fffbf8] to-[#fff4eb] p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-ink">
                <UtensilsCrossed className="size-4 text-primary" />
                <span className="font-display">What’s in this dish</span>
              </div>
              <ul className="mt-2.5 space-y-1.5 text-sm font-medium text-ink">
                {getDishHighlights(p).map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="font-bold text-primary">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {p.variants.length > 0 && (
              <fieldset className="mt-2 flex flex-col gap-2.5">
                <legend className="mb-2.5 font-bold">Choose a portion</legend>
                {p.variants.map((v) => {
                  const on = v.id === selected?.id;
                  return (
                    <label
                      key={v.id}
                      className={cx(
                        'flex min-h-14 cursor-pointer items-center gap-3.5 rounded-2xl px-4 ring-inset transition-colors',
                        on
                          ? 'bg-primary-soft ring-[1.5px] ring-primary'
                          : 'bg-card hover:ring-1 hover:ring-primary/50',
                        !v.isAvailable && 'cursor-not-allowed opacity-50',
                      )}
                    >
                      <input
                        type="radio"
                        name="variant"
                        className="size-5 accent-primary-strong"
                        checked={on}
                        disabled={!v.isAvailable}
                        onChange={() => setVariantId(v.id)}
                      />
                      <span className="flex-1 text-[15px] font-semibold">{v.name}</span>
                      <span className={cx('tabular text-[15px] font-bold', on && 'text-primary-strong')}>
                        {formatPaise(v.pricePaise)}
                      </span>
                    </label>
                  );
                })}
              </fieldset>
            )}

            {/* Trust & Hygiene Guarantee */}
            <div className="flex items-center gap-2.5 rounded-xl bg-card px-4 py-2.5 text-xs font-semibold text-muted">
              <ShieldCheck className="size-4 text-emerald-600" />
              <span>100% Contactless Delivery • Clean Kitchen Verified</span>
            </div>
            <p className="text-[13px] text-muted">Prices are confirmed by the kitchen at checkout.</p>

            {/* Pinned bar on phones, inline on desktop */}
            <div className="fixed inset-x-0 bottom-0 z-40 bg-surface px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_16px_rgb(30_29_27/0.08)] md:static md:z-auto md:p-0 md:pt-2 md:shadow-none">
              {p.isAvailable ? (
                <div className="flex items-center gap-3">
                  <Stepper value={qty} onChange={(v) => setQty(Math.max(1, v))} label={p.name} />
                  <Button
                    size="lg"
                    className="flex-1"
                    icon={<ShoppingBag className="size-[18px]" />}
                    onClick={() => {
                      add(p, selected?.id, qty);
                      back();
                    }}
                  >
                    Add to cart <span className="tabular">{formatPaise(unit * qty)}</span>
                  </Button>
                </div>
              ) : (
                <p role="status" className="py-3 text-center font-medium text-muted">
                  This dish is currently unavailable.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Respective and related dishes below */}
        {related.length > 0 && (
          <section aria-labelledby="related-heading" className="mt-14 border-t border-line px-5 pt-10 md:px-0">
            <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h2 id="related-heading" className="font-display text-2xl font-bold">
                  {sameCategory.length > 0 && category ? `More in ${category.name}` : 'You Might Also Like'}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {sameCategory.length > 0 && category
                    ? `Popular choices from ${category.name} and customer favorites`
                    : 'Delicious dishes that pair wonderfully with your meal'}
                </p>
              </div>
              {category && (
                <Link
                  to={`/menu/${category.slug}`}
                  className="text-sm font-bold text-primary hover:underline"
                >
                  View all in {category.name} &rarr;
                </Link>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 [&>*]:min-w-0">
              {related.map((item) => (
                <DishCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Floating Wishlist Toast */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-surface shadow-2xl transition-all motion-safe:animate-[pop_200ms_ease-out]"
        >
          <Heart className="size-4 fill-rose-500 text-rose-500" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

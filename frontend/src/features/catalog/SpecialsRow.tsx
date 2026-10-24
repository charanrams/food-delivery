import { Link, useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { BadgePercent, Clock, Plus } from 'lucide-react';
import { formatPaise, type SpecialDto } from '@a3/contracts';
import { EmptyState, ErrorState, FoodImage, Skeleton, Stepper, VegMark } from '@/components/ui';
import { PageFrame } from '@/components/frame';
import { Reveal } from '@/components/Reveal';
import { offerSectionsQuery, specialsQuery, productImage, sized } from '@/lib/catalog-api';
import { useCart } from '@/features/cart/CartContext';
import { defaultVariant } from './ProductCard';

export function SpecialCard({ special }: { special: SpecialDto }) {
  const { lines, add, setQuantity } = useCart();
  const navigate = useNavigate();
  const p = special.product;
  const multi = p.variants.length > 1;
  const inCart = lines.filter((l) => l.product.id === p.id);
  const qty = inCart.reduce((n, l) => n + l.quantity, 0);

  const originalPrice = defaultVariant(p)?.pricePaise ?? p.pricePaise;
  const discountedPrice =
    special.specialPricePaise ??
    Math.round((originalPrice * (100 - special.discountPercent)) / 100);

  return (
    <article className="group/card relative flex w-[240px] shrink-0 flex-col overflow-hidden rounded-[20px] bg-surface shadow-[0_6px_18px_-6px_rgb(30_29_27/0.16)] ring-1 ring-line/60 transition-[box-shadow,transform] duration-200 ease-out hover:shadow-lift motion-safe:hover:-translate-y-0.5 sm:w-[260px] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-strong">
      <div className="relative">
        <FoodImage
          src={sized(productImage(p), 600)}
          alt=""
          zoom
          className="aspect-[16/10] w-full"
        />
        <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-xs font-extrabold text-surface shadow-sm">
          <BadgePercent className="size-3" aria-hidden />
          {special.label || `${special.discountPercent}% OFF`}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="flex items-center gap-1.5 text-[15px] font-bold">
          <VegMark veg={!!p.isVegetarian} />
          <Link
            to={`/product/${p.slug}`}
            className="min-w-0 truncate outline-none after:absolute after:inset-0 after:content-['']"
          >
            {p.name}
          </Link>
        </h3>
        {p.description && <p className="line-clamp-1 text-xs text-muted">{p.description}</p>}
        <div className="relative z-10 mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 pt-1.5">
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="tabular text-base font-extrabold text-primary-strong">
              {formatPaise(discountedPrice)}
            </span>
            <span className="tabular text-xs text-muted line-through">
              {formatPaise(originalPrice)}
            </span>
          </div>
          {qty > 0 && !multi ? (
            <Stepper
              tone="solid"
              size="sm"
              value={qty}
              label={p.name}
              onChange={(v) => setQuantity(inCart[0]!.key, v)}
            />
          ) : (
            <button
              type="button"
              onClick={() =>
                multi ? navigate(`/product/${p.slug}`) : add(p, defaultVariant(p)?.id, 1)
              }
              aria-label={multi ? `Choose a portion of ${p.name}` : `Add ${p.name} to cart`}
              className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-primary px-3.5 text-sm font-bold text-surface shadow-press transition-[background-color,transform] duration-150 hover:bg-brand-hover active:scale-90"
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

/** Today's specials (no sectionId) or one admin-made offer section, as a horizontal Home row. */
export function SpecialsRow({
  sectionId,
  title = 'Today’s Specials',
}: {
  sectionId?: string;
  title?: string;
}) {
  const specials = useQuery(specialsQuery);
  const list =
    specials.data?.filter((s) => s.isLive && s.product?.isAvailable && s.sectionId === sectionId) ??
    [];

  if (specials.isError || list.length === 0) return null;

  return (
    <Reveal as="section" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-[1.375rem] font-semibold md:text-[1.75rem]">{title}</h2>
        </div>
        <Link
          to={`/offers/${sectionId ?? 'today'}`}
          className="inline-flex min-h-11 items-center text-[15px] font-bold text-primary-strong hover:underline"
        >
          See All
        </Link>
      </div>
      <ul className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:gap-5 md:px-0">
        {list.map((s) => (
          <li key={s.id} className="flex shrink-0">
            <SpecialCard special={s} />
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

/** Every switched-on offer section, each as its own row (hidden while it has no live dishes). */
export function OfferSectionRows() {
  const sections = useQuery(offerSectionsQuery);
  return (sections.data ?? []).map((x) => (
    <SpecialsRow key={x.id} sectionId={x.id} title={x.title} />
  ));
}

/** /offers/:sectionId — every live dish in one offer section ('today' = section-less specials). */
export function OfferSectionPage() {
  const { sectionId = 'today' } = useParams();
  const id = sectionId === 'today' ? undefined : sectionId;
  const specials = useQuery(specialsQuery);
  const sections = useQuery(offerSectionsQuery);
  const title = id
    ? (sections.data?.find((x) => x.id === id)?.title ?? 'Offers')
    : 'Today’s Specials';
  const list =
    specials.data?.filter((s) => s.isLive && s.product?.isAvailable && s.sectionId === id) ?? [];
  return (
    <PageFrame title={title}>
      {specials.isError ? (
        <ErrorState onRetry={() => specials.refetch()} />
      ) : specials.isPending ? (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i}>
              <Skeleton className="h-64 rounded-[20px]" />
            </li>
          ))}
        </ul>
      ) : list.length === 0 ? (
        <EmptyState
          icon={<BadgePercent className="size-9" />}
          title="No deals here right now"
          body="Check back soon, or browse the full menu."
          action={
            <Link to="/menu" className="font-bold text-primary-strong hover:underline">
              See the menu
            </Link>
          }
        />
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 md:gap-5">
          {list.map((s) => (
            <li key={s.id} className="flex [&>article]:w-full">
              <SpecialCard special={s} />
            </li>
          ))}
        </ul>
      )}
    </PageFrame>
  );
}

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  BadgePercent,
  CalendarClock,
  CirclePause,
  Pencil,
  Plus,
  Radio,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  formatPaise,
  type OfferSectionDto,
  type ProductDto,
  type SpecialDto,
  type SpecialInput,
} from '@a3/contracts';
import {
  Button,
  EmptyState,
  ErrorState,
  FoodImage,
  Skeleton,
  Toggle,
  VegMark,
  cx,
} from '@/components/ui';
import { ApiError } from '@/lib/api';
import { productImage, sized } from '@/lib/catalog-api';
import { adminApi, adminKeys } from './admin-api';
import { SectionDialog, SectionSchedule } from './AdminOfferSectionsPage';
import {
  NoticeBar,
  PageHeader,
  RowMenu,
  StatCard,
  StatGrid,
  inputCls,
  type Notice,
} from './admin-ui';

const basePrice = (p: ProductDto) =>
  p.variants.find((v) => v.isAvailable && v.name === 'Full')?.pricePaise ??
  p.variants.find((v) => v.isAvailable)?.pricePaise ??
  p.pricePaise;
const off = (paise: number, pct: number) => Math.round((paise * (100 - pct)) / 100);
const when = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';
/** <input type="datetime-local"> wants local "YYYY-MM-DDTHH:mm". */
const toLocal = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

function status(s: SpecialDto): { label: string; tone: string; icon: ReactNode } {
  if (s.isLive)
    return {
      label: 'Live now',
      tone: 'bg-success/12 text-success',
      icon: <Radio className="size-3.5" aria-hidden />,
    };
  if (!s.isActive)
    return {
      label: 'Paused',
      tone: 'bg-panel text-muted',
      icon: <CirclePause className="size-3.5" aria-hidden />,
    };
  if (s.startsAt && new Date(s.startsAt) > new Date())
    return {
      label: `Starts ${when(s.startsAt)}`,
      tone: 'bg-[#e4f0fd] text-[#1d5fa8]',
      icon: <CalendarClock className="size-3.5" aria-hidden />,
    };
  return {
    label: 'Ended',
    tone: 'bg-panel text-muted',
    icon: <CalendarClock className="size-3.5" aria-hidden />,
  };
}

/** Admin · Today's specials — dishes on the customer Home with a % off. Prices are applied by the server at checkout. */
export function AdminSpecialsPage() {
  return <SpecialsManager />;
}

/** Admin · one offer section (/admin/offer-sections/:sectionId): same tools as Today's specials, scoped to the section. */
export function AdminOfferSectionPage() {
  const { sectionId } = useParams();
  const sections = useQuery({ queryKey: adminKeys.offerSections, queryFn: adminApi.offerSections });
  const section = sections.data?.find((x) => x.id === sectionId);
  if (sections.isError) return <ErrorState onRetry={() => sections.refetch()} />;
  if (sections.isPending) return <Skeleton className="h-40 rounded-[20px]" />;
  if (!section)
    return (
      <EmptyState
        icon={<BadgePercent className="size-9" />}
        title="Section not found"
        body="It may have been deleted."
        action={
          <Link
            to="/admin/offer-sections"
            className="font-semibold text-primary-strong hover:underline"
          >
            Back to offer sections
          </Link>
        }
      />
    );
  return <SpecialsManager key={section.id} section={section} />;
}

/** Edit / delete the section itself, shown on its page. */
function SectionActions({ section }: { section: OfferSectionDto }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const remove = useMutation({
    mutationFn: () => adminApi.deleteOfferSection(section.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.offerSections });
      qc.invalidateQueries({ queryKey: adminKeys.specials });
      qc.invalidateQueries({ queryKey: ['specials'] });
      qc.invalidateQueries({ queryKey: ['offer-sections'] });
      navigate('/admin/offer-sections');
    },
  });
  return (
    <>
      <Button
        variant="secondary"
        icon={<Pencil className="size-[18px]" aria-hidden />}
        onClick={() => setEditing(true)}
      >
        Edit section
      </Button>
      <Button
        variant="ghost"
        icon={<Trash2 className="size-[18px]" aria-hidden />}
        loading={remove.isPending}
        onClick={() =>
          window.confirm(`Delete ${section.title}? Its dishes go back to normal price.`) &&
          remove.mutate()
        }
      >
        Delete
      </Button>
      {editing && (
        <SectionDialog
          existing={section}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            qc.invalidateQueries({ queryKey: adminKeys.offerSections });
            qc.invalidateQueries({ queryKey: adminKeys.specials });
            qc.invalidateQueries({ queryKey: ['specials'] });
            qc.invalidateQueries({ queryKey: ['offer-sections'] });
          }}
        />
      )}
    </>
  );
}

function SpecialsManager({ section }: { section?: OfferSectionDto }) {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<{ existing?: SpecialDto } | null>(null);
  const [notice, setNotice] = useState<Notice>();
  const specials = useQuery({ queryKey: adminKeys.specials, queryFn: adminApi.specials });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: adminKeys.specials });
    qc.invalidateQueries({ queryKey: adminKeys.offerSections });
    qc.invalidateQueries({ queryKey: ['specials'] });
  };
  const where = section ? section.title : 'Today’s specials';
  const fail = (e: unknown) =>
    setNotice({
      tone: 'danger',
      text: e instanceof ApiError ? e.message : 'Could not save. Please try again.',
    });
  const toggle = useMutation({
    mutationFn: (s: SpecialDto) => adminApi.updateSpecial(s.id, { isActive: !s.isActive }),
    onSuccess: (s) => {
      refresh();
      setNotice({
        tone: 'success',
        text: s.isActive ? `${s.product.name} is back on Home.` : `${s.product.name} paused.`,
      });
    },
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: (s: SpecialDto) => adminApi.deleteSpecial(s.id),
    onSuccess: (_d, s) => {
      refresh();
      setNotice({ tone: 'success', text: `${s.product.name} removed from ${where}.` });
    },
    onError: fail,
  });

  const all = specials.data ?? [];
  const list = all.filter((s) => (s.sectionId ?? null) === (section?.id ?? null));
  const live = list.filter((s) => s.isLive);
  const avg = live.length
    ? Math.round(live.reduce((n, s) => n + s.discountPercent, 0) / live.length)
    : 0;

  return (
    <div className="flex flex-col gap-6">
      {
        <Link
          to="/admin/offer-sections"
          className="-mb-2 inline-flex min-h-11 w-fit items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden /> All offer sections
        </Link>
      }
      <PageHeader
        title={where}
        description={
          section ? (
            <>
              {section.subtitle ? `${section.subtitle}. ` : ''}Shown as its own row on the customer
              Home while live. Discounts apply automatically at checkout.
              <SectionSchedule section={section} />
            </>
          ) : (
            'Dishes shown at the top of the customer Home with a discount. The discount is applied automatically at checkout.'
          )
        }
        actions={
          <>
            {section && <SectionActions section={section} />}
            <Button
              icon={<Plus className="size-[18px]" aria-hidden />}
              onClick={() => setDialog({})}
            >
              {section ? 'Add dish' : 'Add special'}
            </Button>
          </>
        }
      />

      {specials.data && (
        <StatGrid>
          <StatCard
            label="Live now"
            value={String(live.length)}
            tone="green"
            icon={<Radio className="size-[18px]" />}
            hint="Showing on Home"
          />
          <StatCard
            label="All specials"
            value={String(list.length)}
            icon={<BadgePercent className="size-[18px]" />}
            hint="Including paused"
          />
          <StatCard
            label="Average discount"
            value={`${avg}%`}
            tone="blue"
            icon={<BadgePercent className="size-[18px]" />}
            hint="Across live specials"
          />
          <StatCard
            label="Paused / scheduled"
            value={String(list.length - live.length)}
            tone="pink"
            icon={<CirclePause className="size-[18px]" />}
            hint="Not visible right now"
          />
        </StatGrid>
      )}

      <NoticeBar notice={notice} onDismiss={() => setNotice(undefined)} />

      {specials.isError ? (
        <ErrorState onRetry={() => specials.refetch()} />
      ) : specials.isPending ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-44 rounded-[20px]" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={<BadgePercent className="size-9" />}
          title={section ? 'No dishes in this section yet' : 'No specials yet'}
          body={`Pick a dish and a discount. It will appear in ${where} on the customer Home on the app and website.`}
          action={<Button onClick={() => setDialog({})}>Add your first dish</Button>}
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((s) => {
            const st = status(s);
            const was = basePrice(s.product);
            return (
              <li
                key={s.id}
                className={cx(
                  'flex flex-col overflow-hidden rounded-[20px] bg-surface ring-1 ring-line/70 transition-shadow hover:shadow-md',
                  !s.isLive && 'bg-panel',
                )}
              >
                <div className="relative">
                  <FoodImage
                    src={sized(productImage(s.product), 640)}
                    alt=""
                    dimmed={!s.isLive}
                    className="aspect-[16/9]"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-primary-strong px-3 py-1 text-sm font-extrabold text-surface shadow-sm">
                    {s.discountPercent}% OFF
                  </span>
                  {s.label && (
                    <span className="absolute right-3 top-3 rounded-full bg-surface/95 px-2.5 py-1 text-xs font-bold text-ink">
                      {s.label}
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="flex items-center gap-2 truncate font-bold">
                        <VegMark veg={!!s.product.isVegetarian} /> {s.product.name}
                      </h3>
                      <p className="mt-0.5 flex items-baseline gap-2">
                        <span className="tabular text-lg font-extrabold">
                          {formatPaise(s.specialPricePaise)}
                        </span>
                        <span className="tabular text-sm text-muted line-through">
                          {formatPaise(was)}
                        </span>
                      </p>
                    </div>
                    <RowMenu
                      label={`More actions for ${s.product.name}`}
                      items={[
                        {
                          label: 'Edit special',
                          icon: <Pencil />,
                          onSelect: () => setDialog({ existing: s }),
                        },
                        {
                          label: 'Remove special',
                          icon: <Trash2 />,
                          danger: true,
                          onSelect: () =>
                            window.confirm(`Remove ${s.product.name} from ${where}?`) &&
                            remove.mutate(s),
                        },
                      ]}
                    />
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-3">
                    <span
                      className={cx(
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold',
                        st.tone,
                      )}
                    >
                      {st.icon} {st.label}
                    </span>
                    <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-semibold">
                      {s.isActive ? 'On' : 'Off'}
                      <Toggle
                        checked={s.isActive}
                        label={`Show ${s.product.name} as a special`}
                        disabled={toggle.isPending && toggle.variables?.id === s.id}
                        onChange={() => toggle.mutate(s)}
                      />
                    </label>
                  </div>
                  {s.endsAt && <p className="-mt-1 text-xs text-muted">Ends {when(s.endsAt)}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {dialog && (
        <SpecialDialog
          existing={dialog.existing}
          sectionId={section?.id}
          taken={new Set(all.filter((s) => s.id !== dialog.existing?.id).map((s) => s.product.id))}
          onClose={() => setDialog(null)}
          onSaved={(name, added) => {
            setDialog(null);
            refresh();
            setNotice({
              tone: 'success',
              text: added ? `${name} added to ${where}.` : `${name} saved.`,
            });
          }}
        />
      )}
    </div>
  );
}

function SpecialDialog({
  existing,
  sectionId,
  taken,
  onClose,
  onSaved,
}: {
  existing?: SpecialDto;
  sectionId?: string;
  taken: Set<string>;
  onClose: () => void;
  onSaved: (name: string, added: boolean) => void;
}) {
  const products = useQuery({
    queryKey: adminKeys.products({ all: true }),
    queryFn: () => adminApi.products({}),
  });
  const [search, setSearch] = useState('');
  const [productId, setProductId] = useState(existing?.product.id ?? '');
  const [pct, setPct] = useState(existing?.discountPercent ?? 20);
  const [label, setLabel] = useState(existing?.label ?? '');
  const [startsAt, setStartsAt] = useState(toLocal(existing?.startsAt));
  const [endsAt, setEndsAt] = useState(toLocal(existing?.endsAt));
  const [active, setActive] = useState(existing?.isActive ?? true);
  const [error, setError] = useState<string>();

  const options = useMemo(
    () =>
      (products.data?.items ?? []).filter(
        (p) =>
          !p.isArchived &&
          !taken.has(p.id) &&
          p.name.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [products.data, taken, search],
  );
  const chosen = (products.data?.items ?? []).find((p) => p.id === productId) ?? existing?.product;

  const save = useMutation({
    mutationFn: () => {
      const body: SpecialInput = {
        productId,
        discountPercent: pct,
        label: label.trim() || (existing ? null : undefined),
        // Inside an offer section the section's own start/stop applies, so dish times are cleared.
        startsAt: !sectionId && startsAt ? new Date(startsAt).toISOString() : null,
        endsAt: !sectionId && endsAt ? new Date(endsAt).toISOString() : null,
        isActive: active,
        ...(existing ? {} : { sectionId: sectionId ?? null }),
      };
      return existing ? adminApi.updateSpecial(existing.id, body) : adminApi.createSpecial(body);
    },
    onSuccess: (s) => onSaved(s.product.name, !existing),
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : 'Could not save. Please try again.'),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!productId) return setError('Choose a dish.');
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt))
      return setError('The end time must be after the start time.');
    setError(undefined);
    save.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div
        className="absolute inset-0 bg-ink/40 motion-safe:animate-[fade_150ms_ease-out]"
        onClick={onClose}
        aria-hidden
      />
      <form
        onSubmit={submit}
        noValidate
        role="dialog"
        aria-modal="true"
        aria-labelledby="sp-title"
        className="relative flex max-h-[92dvh] w-full max-w-lg flex-col gap-5 overflow-y-auto rounded-[24px] bg-surface p-6 shadow-xl motion-safe:animate-[pop_220ms_cubic-bezier(0.16,1,0.3,1)]"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id="sp-title" className="text-lg font-bold">
            {existing
              ? sectionId
                ? 'Edit dish'
                : 'Edit special'
              : sectionId
                ? 'Add a dish'
                : 'Add a special'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-10 place-items-center rounded-full hover:bg-panel"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {/* Dish picker */}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-[13px] font-medium">Dish</legend>
          {chosen && productId ? (
            <div className="flex items-center gap-3 rounded-2xl bg-panel p-2.5">
              <FoodImage
                src={sized(productImage(chosen), 160)}
                alt=""
                className="size-12 shrink-0 rounded-xl"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{chosen.name}</p>
                <p className="tabular text-sm text-muted">{formatPaise(basePrice(chosen))}</p>
              </div>
              {!existing && (
                <Button type="button" size="sm" variant="ghost" onClick={() => setProductId('')}>
                  Change
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
                  aria-hidden
                />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search dishes"
                  aria-label="Search dishes"
                  className={cx(inputCls, 'rounded-full pl-10')}
                />
              </div>
              <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-2xl bg-panel p-1.5">
                {products.isPending ? (
                  <li className="p-3 text-sm text-muted">Loading dishes…</li>
                ) : options.length === 0 ? (
                  <li className="p-3 text-sm text-muted">
                    No dishes match (dishes that already have a deal in any section are hidden).
                  </li>
                ) : (
                  options.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setProductId(p.id)}
                        className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-surface"
                      >
                        <FoodImage
                          src={sized(productImage(p), 120)}
                          alt=""
                          className="size-10 shrink-0 rounded-lg"
                        />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                          {p.name}
                        </span>
                        <span className="tabular text-sm text-muted">
                          {formatPaise(basePrice(p))}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </>
          )}
        </fieldset>

        {/* Discount with live price preview */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="sp-pct" className="text-[13px] font-medium">
              Discount
            </label>
            <span className="tabular text-sm">
              {chosen && productId ? (
                <>
                  <span className="text-muted line-through">{formatPaise(basePrice(chosen))}</span>{' '}
                  <span className="font-extrabold text-primary-strong">
                    {formatPaise(off(basePrice(chosen), pct))}
                  </span>
                </>
              ) : (
                <span className="text-muted">Pick a dish to preview</span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              id="sp-pct"
              type="range"
              min={1}
              max={90}
              value={pct}
              onChange={(e) => setPct(Number(e.target.value))}
              className="flex-1 accent-[var(--color-primary-strong)]"
            />
            <div className="relative w-24">
              <input
                type="number"
                min={1}
                max={90}
                value={pct}
                aria-label="Discount percent"
                onChange={(e) => setPct(Math.max(1, Math.min(90, Number(e.target.value) || 1)))}
                className={cx(inputCls, 'tabular pr-8 text-right')}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">
                %
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[10, 15, 20, 25, 30, 50].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setPct(v)}
                className={cx(
                  'min-h-9 rounded-full px-3 text-sm font-semibold',
                  pct === v ? 'bg-primary-strong text-surface' : 'bg-panel hover:bg-primary-soft',
                )}
              >
                {v}%
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="sp-label" className="text-[13px] font-medium">
            Tag (optional)
          </label>
          <input
            id="sp-label"
            value={label}
            maxLength={40}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Weekend deal, Chef’s pick"
            className={inputCls}
          />
        </div>

        {!sectionId && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="sp-start" className="text-[13px] font-medium">
                Starts (optional)
              </label>
              <input
                id="sp-start"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="sp-end" className="text-[13px] font-medium">
                Ends (optional)
              </label>
              <input
                id="sp-end"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        )}

        <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl bg-panel px-3 text-sm font-semibold">
          Show on Home now
          <Toggle checked={active} label="Show on Home now" onChange={setActive} />
        </label>

        {error && (
          <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            {existing ? 'Save changes' : 'Add special'}
          </Button>
        </div>
      </form>
    </div>
  );
}

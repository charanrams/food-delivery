import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Eye, GalleryHorizontal, Image as ImageIcon, Link2, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { BannerDto, BannerInput } from '@a3/contracts';
import { Button, EmptyState, ErrorState, Skeleton, Toggle, cx } from '@/components/ui';
import { sized } from '@/lib/catalog-api';
import { adminApi, adminKeys } from './admin-api';
import { NoticeBar, PageHeader, RowMenu, SectionCard, StatCard, StatGrid, errorText, inputCls, type Notice } from './admin-ui';
import { SectionSchedule } from './AdminOfferSectionsPage';
import { ImageUploader } from './ImageUploader';

const LINK_LABEL: Record<BannerDto['linkType'], string> = {
  none: 'No link',
  category: 'Category',
  product: 'Dish',
  offer: 'Offer section',
  url: 'Web address or page',
};

/** Admin · Home banners (VSR "Banners"): the sliding cards at the top of the customer Home. */
export function AdminBannersPage() {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<{ existing?: BannerDto } | null>(null);
  const [notice, setNotice] = useState<Notice>();
  const banners = useQuery({ queryKey: adminKeys.banners, queryFn: adminApi.banners });
  const list = banners.data ?? [];
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: adminKeys.banners });
    void qc.invalidateQueries({ queryKey: ['banners'] });
  };
  const fail = (e: unknown) => setNotice({ tone: 'danger', text: errorText(e, 'Could not save. Please try again.') });
  const toggle = useMutation({
    mutationFn: (x: BannerDto) => adminApi.updateBanner(x.id, { isActive: !x.isActive }),
    onSuccess: (x) => {
      refresh();
      setNotice({ tone: 'success', text: x.isActive ? `${x.title} is back on Home.` : `${x.title} hidden from Home.` });
    },
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: (x: BannerDto) => adminApi.deleteBanner(x.id),
    onSuccess: (_d, x) => {
      refresh();
      setNotice({ tone: 'success', text: `${x.title} deleted.` });
    },
    onError: fail,
  });
  const reorder = useMutation({
    mutationFn: (ids: string[]) => adminApi.reorderBanners(ids),
    onMutate: (ids) => {
      const byId = new Map(list.map((x) => [x.id, x]));
      qc.setQueryData(adminKeys.banners, ids.map((id) => byId.get(id)!));
    },
    onSettled: refresh,
    onError: fail,
  });
  const move = (i: number, by: -1 | 1) => {
    const ids = list.map((x) => x.id);
    [ids[i], ids[i + by]] = [ids[i + by]!, ids[i]!];
    reorder.mutate(ids);
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        crumbs={[{ label: 'Menu' }, { label: 'Home banners' }]}
        title="Home banners"
        description="The sliding cards at the top of the customer Home, in the app and on the website. When none are live, Home shows the standard welcome banner."
        actions={
          <Button icon={<Plus className="size-[18px]" aria-hidden />} onClick={() => setDialog({})}>
            New banner
          </Button>
        }
      />
      <StatGrid>
        <StatCard label="Banners" value={String(list.length)} icon={<GalleryHorizontal />} hint="Left to right on Home" />
        <StatCard label="Live now" value={String(list.filter((x) => x.isLive).length)} tone="green" icon={<Eye />} hint="Customers see these" />
        <StatCard label="Linked" value={String(list.filter((x) => x.linkType !== 'none').length)} tone="blue" icon={<Link2 />} hint="With a button" />
        <StatCard label="Hidden" value={String(list.filter((x) => !x.isActive).length)} tone="pink" icon={<ImageIcon />} hint="Switched off" />
      </StatGrid>
      <NoticeBar notice={notice} onDismiss={() => setNotice(undefined)} />

      <SectionCard title="Banners on the customer Home" actions={<span className="text-xs text-muted">Use the arrows to change the order</span>}>
        {banners.isError ? (
          <ErrorState onRetry={() => banners.refetch()} />
        ) : banners.isPending ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 2 }, (_, i) => (
              <Skeleton key={i} className="h-24 rounded-[20px]" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={<GalleryHorizontal className="size-9" />}
            title="No banners yet"
            body="Add a banner with a photo, a headline and a button. It slides at the top of the customer Home."
            action={<Button onClick={() => setDialog({})}>Create your first banner</Button>}
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {list.map((x, i) => (
              <li key={x.id} className={cx('flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-line/70 sm:gap-4', !x.isActive && 'bg-panel')}>
                <div className="flex flex-col">
                  <button
                    type="button"
                    disabled={i === 0 || reorder.isPending}
                    onClick={() => move(i, -1)}
                    aria-label={`Move ${x.title} up`}
                    className="grid size-9 place-items-center rounded-lg text-muted hover:bg-panel hover:text-ink focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-30"
                  >
                    <ArrowUp className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    disabled={i === list.length - 1 || reorder.isPending}
                    onClick={() => move(i, 1)}
                    aria-label={`Move ${x.title} down`}
                    className="grid size-9 place-items-center rounded-lg text-muted hover:bg-panel hover:text-ink focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-30"
                  >
                    <ArrowDown className="size-4" aria-hidden />
                  </button>
                </div>
                <img src={sized(x.image, 240)} alt="" className="h-16 w-24 shrink-0 rounded-xl object-cover sm:w-32" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">
                    {x.title}
                    {x.highlight && <span className="text-primary-strong"> {x.highlight}</span>}
                  </p>
                  <p className="truncate text-sm text-muted">
                    {x.buttonText ? `“${x.buttonText}” → ` : ''}
                    {LINK_LABEL[x.linkType]}
                    {x.linkValue ? ` · ${x.linkValue}` : ''}
                  </p>
                  <SectionSchedule section={x} />
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-semibold">
                  <span className="hidden sm:inline">{x.isActive ? 'On Home' : 'Hidden'}</span>
                  <Toggle checked={x.isActive} label={`Show ${x.title} on Home`} disabled={toggle.isPending && toggle.variables?.id === x.id} onChange={() => toggle.mutate(x)} />
                </label>
                <RowMenu
                  label={`More actions for ${x.title}`}
                  items={[
                    { label: 'Edit banner', icon: <Pencil />, onSelect: () => setDialog({ existing: x }) },
                    { label: 'Delete banner', icon: <Trash2 />, danger: true, onSelect: () => window.confirm(`Delete the ${x.title} banner?`) && remove.mutate(x) },
                  ]}
                />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {dialog && (
        <BannerDialog
          existing={dialog.existing}
          onClose={() => setDialog(null)}
          onSaved={(x, added) => {
            setDialog(null);
            refresh();
            setNotice({ tone: 'success', text: added ? `${x.title} added to Home.` : `${x.title} saved.` });
          }}
        />
      )}
    </div>
  );
}

/** <input type="datetime-local"> wants local "YYYY-MM-DDTHH:mm". */
const toLocal = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

function BannerDialog({ existing, onClose, onSaved }: { existing?: BannerDto; onClose: () => void; onSaved: (x: BannerDto, added: boolean) => void }) {
  const [images, setImages] = useState<string[]>(existing ? [existing.image] : []);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [highlight, setHighlight] = useState(existing?.highlight ?? '');
  const [subtitle, setSubtitle] = useState(existing?.subtitle ?? '');
  const [buttonText, setButtonText] = useState(existing?.buttonText ?? '');
  const [linkType, setLinkType] = useState<BannerDto['linkType']>(existing?.linkType ?? 'none');
  const [linkValue, setLinkValue] = useState(existing?.linkValue ?? '');
  const [active, setActive] = useState(existing?.isActive ?? true);
  const [startsAt, setStartsAt] = useState(toLocal(existing?.startsAt));
  const [endsAt, setEndsAt] = useState(toLocal(existing?.endsAt));
  const [error, setError] = useState<string>();

  const categories = useQuery({ queryKey: adminKeys.categories, queryFn: adminApi.categories, enabled: linkType === 'category' });
  const products = useQuery({ queryKey: adminKeys.products({}), queryFn: () => adminApi.products({}), enabled: linkType === 'product' });
  const sections = useQuery({ queryKey: adminKeys.offerSections, queryFn: adminApi.offerSections, enabled: linkType === 'offer' });

  const save = useMutation({
    mutationFn: () => {
      const body: BannerInput = {
        title: title.trim(),
        highlight: highlight.trim() || null,
        subtitle: subtitle.trim() || null,
        buttonText: buttonText.trim() || null,
        linkType,
        linkValue: linkType === 'none' ? null : linkValue.trim() || null,
        image: images[0]!,
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        isActive: active,
      };
      return existing ? adminApi.updateBanner(existing.id, body) : adminApi.createBanner(body);
    },
    onSuccess: (x) => onSaved(x, !existing),
    onError: (e) => setError(errorText(e, 'Could not save. Please try again.')),
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
    if (!images[0]) return setError('Upload a banner photo.');
    if (title.trim().length < 2) return setError('Give the banner a headline.');
    if (linkType !== 'none' && !linkValue.trim()) return setError('Choose where the button goes.');
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) return setError('The stop time must be after the start time.');
    setError(undefined);
    save.mutate();
  };

  const select = (opts: { value: string; label: string }[] | undefined, loading: boolean) => (
    <select id="bn-target" value={linkValue} onChange={(e) => setLinkValue(e.target.value)} className={inputCls} disabled={loading}>
      <option value="">{loading ? 'Loading…' : 'Choose…'}</option>
      {opts?.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-ink/40 motion-safe:animate-[fade_150ms_ease-out]" onClick={onClose} aria-hidden />
      <form
        onSubmit={submit}
        noValidate
        role="dialog"
        aria-modal="true"
        aria-labelledby="bn-title"
        className="relative flex max-h-[92dvh] w-full max-w-xl flex-col gap-5 overflow-y-auto rounded-[24px] bg-surface p-6 shadow-xl motion-safe:animate-[pop_220ms_cubic-bezier(0.16,1,0.3,1)]"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id="bn-title" className="text-lg font-bold">
            {existing ? 'Edit banner' : 'New home banner'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-10 place-items-center rounded-full hover:bg-panel">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <ImageUploader value={images} onChange={(v) => setImages(v.slice(-1))} folder="banners" max={1} label="Banner photo (a round dish photo works best)" />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="bn-head" label="Headline">
            <input id="bn-head" value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} placeholder="Freshly Prepared" className={inputCls} />
          </Field>
          <Field id="bn-hl" label="Orange second line (optional)">
            <input id="bn-hl" value={highlight} maxLength={40} onChange={(e) => setHighlight(e.target.value)} placeholder="Delicious Food" className={inputCls} />
          </Field>
        </div>
        <Field id="bn-sub" label="Short text (optional)">
          <input id="bn-sub" value={subtitle} maxLength={120} onChange={(e) => setSubtitle(e.target.value)} placeholder="Authentic taste, made with love." className={inputCls} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="bn-btn" label="Button text (optional)">
            <input id="bn-btn" value={buttonText} maxLength={24} onChange={(e) => setButtonText(e.target.value)} placeholder="Order Now" className={inputCls} />
          </Field>
          <Field id="bn-link" label="Button opens">
            <select
              id="bn-link"
              value={linkType}
              onChange={(e) => {
                setLinkType(e.target.value as BannerDto['linkType']);
                setLinkValue('');
              }}
              className={inputCls}
            >
              {(Object.keys(LINK_LABEL) as BannerDto['linkType'][]).map((k) => (
                <option key={k} value={k}>
                  {LINK_LABEL[k]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {linkType !== 'none' && (
          <Field id="bn-target" label={linkType === 'url' ? 'Web address or page (e.g. /menu or https://…)' : `Which ${LINK_LABEL[linkType].toLowerCase()}`}>
            {linkType === 'category'
              ? select(categories.data?.map((c) => ({ value: c.slug, label: c.name })), categories.isPending)
              : linkType === 'product'
                ? select(products.data?.items.map((p) => ({ value: p.slug, label: p.name })), products.isPending)
                : linkType === 'offer'
                  ? select(sections.data?.filter((s) => s.kind === 'DEALS').map((s) => ({ value: s.id, label: s.title })), sections.isPending)
                  : <input id="bn-target" value={linkValue} maxLength={300} onChange={(e) => setLinkValue(e.target.value)} placeholder="/menu" className={inputCls} />}
          </Field>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="bn-start" label="Start (optional)">
            <input id="bn-start" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputCls} />
          </Field>
          <Field id="bn-end" label="Stop (optional)">
            <input id="bn-end" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <label className="flex items-center justify-between gap-3 rounded-2xl bg-panel px-4 py-3 text-sm font-semibold">
          Show on Home
          <Toggle checked={active} label="Show on Home" onChange={() => setActive((v) => !v)} />
        </label>
        {error && (
          <p role="alert" className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm font-medium text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            {existing ? 'Save banner' : 'Add banner'}
          </Button>
        </div>
      </form>
    </div>
  );
}

import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Flame,
  UtensilsCrossed,
  ChevronRight,
  LayoutList,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import type { OfferSectionDto, OfferSectionInput } from '@a3/contracts';
import { Button, EmptyState, ErrorState, Skeleton, Toggle, cx } from '@/components/ui';
import { adminApi, adminKeys } from './admin-api';
import { NoticeBar, PageHeader, RowMenu, errorText, inputCls, type Notice } from './admin-ui';

/** Admin · Offer sections — custom Home rows (e.g. "Weekend deals") that work like Today's specials. */
export function AdminOfferSectionsPage() {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<{ existing?: OfferSectionDto } | null>(null);
  const [notice, setNotice] = useState<Notice>();
  const sections = useQuery({ queryKey: adminKeys.offerSections, queryFn: adminApi.offerSections });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: adminKeys.offerSections });
    qc.invalidateQueries({ queryKey: adminKeys.specials });
    qc.invalidateQueries({ queryKey: ['specials'] });
    qc.invalidateQueries({ queryKey: ['offer-sections'] });
  };
  const fail = (e: unknown) =>
    setNotice({ tone: 'danger', text: errorText(e, 'Could not save. Please try again.') });
  const toggle = useMutation({
    mutationFn: (x: OfferSectionDto) =>
      adminApi.updateOfferSection(x.id, { isActive: !x.isActive }),
    onSuccess: (x) => {
      refresh();
      setNotice({
        tone: 'success',
        text: x.isActive ? `${x.title} is back on Home.` : `${x.title} hidden from Home.`,
      });
    },
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: (x: OfferSectionDto) => adminApi.deleteOfferSection(x.id),
    onSuccess: (_d, x) => {
      refresh();
      setNotice({ tone: 'success', text: `${x.title} deleted.` });
    },
    onError: fail,
  });
  const list = sections.data ?? [];
  const reorder = useMutation({
    mutationFn: (ids: string[]) => adminApi.reorderOfferSections(ids),
    onMutate: (ids) => {
      // Move instantly; the server confirms.
      const byId = new Map(list.map((x) => [x.id, x]));
      qc.setQueryData(
        adminKeys.offerSections,
        ids.map((id) => byId.get(id)!),
      );
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
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Offer sections"
        description="The rows on the customer Home, top to bottom. Use the arrows to set the order. Deal sections have their own dishes and discounts; Popular Near You fills itself with best sellers; category rows come from the Row on Home switch on Food categories. Website and app use this same order."
        actions={
          <Button icon={<Plus className="size-[18px]" aria-hidden />} onClick={() => setDialog({})}>
            New section
          </Button>
        }
      />
      <NoticeBar notice={notice} onDismiss={() => setNotice(undefined)} />

      {sections.isError ? (
        <ErrorState onRetry={() => sections.refetch()} />
      ) : sections.isPending ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-[20px]" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={<LayoutList className="size-9" />}
          title="No offer sections yet"
          body="Create a section, then add dishes with a discount. It shows as its own row on the customer Home."
          action={<Button onClick={() => setDialog({})}>Create your first section</Button>}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((x, i) => (
            <li
              key={x.id}
              className={cx(
                'relative flex items-center gap-4 rounded-[20px] bg-surface p-4 ring-1 ring-line/70 transition-shadow hover:shadow-md has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-primary-strong',
                !x.isActive && 'bg-panel',
              )}
            >
              <div className="relative z-10 flex flex-col">
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
              <span
                className="tabular w-5 shrink-0 text-center text-sm font-bold text-muted"
                aria-label={`Position ${i + 1}`}
              >
                {i + 1}
              </span>
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-strong">
                {x.kind === 'POPULAR' ? (
                  <Flame className="size-5" aria-hidden />
                ) : x.kind === 'CATEGORY' ? (
                  <UtensilsCrossed className="size-5" aria-hidden />
                ) : (
                  <LayoutList className="size-5" aria-hidden />
                )}
              </span>
              <div className="min-w-0 flex-1">
                {x.kind !== 'DEALS' ? (
                  <p className="truncate font-bold">{x.title}</p>
                ) : (
                  <Link
                    to={`/admin/offer-sections/${x.id}`}
                    className="block truncate font-bold outline-none after:absolute after:inset-0 after:content-['']"
                  >
                    {x.title}
                  </Link>
                )}
                <p className="truncate text-sm text-muted">
                  {x.kind === 'POPULAR'
                    ? 'Automatic · best sellers of the last 30 days'
                    : x.kind === 'CATEGORY'
                      ? 'Category row · its dishes from the menu'
                      : `${x.specialCount ?? 0} ${x.specialCount === 1 ? 'dish' : 'dishes'}`}
                  {x.subtitle ? ` · ${x.subtitle}` : ''}
                </p>
                <SectionSchedule section={x} />
              </div>
              <label className="relative z-10 inline-flex cursor-pointer items-center gap-2 text-[13px] font-semibold">
                <span className="hidden sm:inline">{x.isActive ? 'On Home' : 'Hidden'}</span>
                <Toggle
                  checked={x.isActive}
                  label={`Show ${x.title} on Home`}
                  disabled={toggle.isPending && toggle.variables?.id === x.id}
                  onChange={() => toggle.mutate(x)}
                />
              </label>
              <div className="relative z-10">
                <RowMenu
                  label={`More actions for ${x.title}`}
                  items={[
                    {
                      label: 'Edit section',
                      icon: <Pencil />,
                      onSelect: () => setDialog({ existing: x }),
                    },
                    ...(x.kind === 'POPULAR'
                      ? []
                      : x.kind === 'CATEGORY'
                        ? [
                            {
                              label: 'Remove from Home',
                              icon: <Trash2 />,
                              danger: true,
                              onSelect: () =>
                                window.confirm(`Remove the ${x.title} row from Home?`) &&
                                remove.mutate(x),
                            },
                          ]
                        : [
                            {
                              label: 'Delete section',
                              icon: <Trash2 />,
                              danger: true,
                              onSelect: () =>
                                window.confirm(
                                  `Delete ${x.title}? Its ${x.specialCount ?? 0} deal(s) will be removed and those dishes go back to normal price.`,
                                ) && remove.mutate(x),
                            },
                          ]),
                  ]}
                />
              </div>
              <ChevronRight
                className={cx('size-5 shrink-0 text-muted', x.kind !== 'DEALS' && 'invisible')}
                aria-hidden
              />
            </li>
          ))}
        </ul>
      )}

      {dialog && (
        <SectionDialog
          existing={dialog.existing}
          onClose={() => setDialog(null)}
          onSaved={(x, added) => {
            setDialog(null);
            refresh();
            setNotice({
              tone: 'success',
              text: added ? `${x.title} created. Open it to add dishes.` : `${x.title} saved.`,
            });
          }}
        />
      )}
    </div>
  );
}

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

/** Live / scheduled / ended / hidden, with the start and stop times. */
export function SectionSchedule({ section: x }: { section: OfferSectionDto }) {
  const now = new Date();
  const state = !x.isActive
    ? { text: 'Hidden', tone: 'bg-panel text-muted' }
    : x.isLive
      ? { text: 'Live now', tone: 'bg-success/12 text-success' }
      : x.startsAt && new Date(x.startsAt) > now
        ? { text: 'Scheduled', tone: 'bg-[#e4f0fd] text-[#1d5fa8]' }
        : { text: 'Ended', tone: 'bg-panel text-muted' };
  const range =
    x.startsAt || x.endsAt
      ? `${x.startsAt ? `Starts ${when(x.startsAt)}` : 'Running'}${x.endsAt ? ` · Stops ${when(x.endsAt)}` : ''}`
      : 'No end date';
  return (
    <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
      <span className={cx('rounded-full px-2 py-0.5 font-bold', state.tone)}>{state.text}</span>
      <span className="inline-flex items-center gap-1">
        <CalendarClock className="size-3.5" aria-hidden /> {range}
      </span>
    </span>
  );
}

export function SectionDialog({
  existing,
  onClose,
  onSaved,
}: {
  existing?: OfferSectionDto;
  onClose: () => void;
  onSaved: (x: OfferSectionDto, added: boolean) => void;
}) {
  const [title, setTitle] = useState(existing?.title ?? '');
  const [subtitle, setSubtitle] = useState(existing?.subtitle ?? '');
  const [active, setActive] = useState(existing?.isActive ?? true);
  const [startsAt, setStartsAt] = useState(toLocal(existing?.startsAt));
  const [endsAt, setEndsAt] = useState(toLocal(existing?.endsAt));
  const [error, setError] = useState<string>();
  // Position on Home: 1 = top. New sections default to last.
  const sections = useQuery({ queryKey: adminKeys.offerSections, queryFn: adminApi.offerSections });
  const others = (sections.data ?? []).filter((x) => x.id !== existing?.id).map((x) => x.id);
  const current = existing
    ? (sections.data ?? []).findIndex((x) => x.id === existing.id) + 1
    : others.length + 1;
  const [position, setPosition] = useState<number>();
  const pos = position ?? current;

  const save = useMutation({
    mutationFn: async () => {
      const body: OfferSectionInput = {
        title: title.trim(),
        subtitle: subtitle.trim() || (existing ? null : undefined),
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        isActive: active,
      };
      const saved = await (existing
        ? adminApi.updateOfferSection(existing.id, body)
        : adminApi.createOfferSection(body));
      if (sections.data && pos !== current) {
        const ids = [...others];
        ids.splice(pos - 1, 0, saved.id);
        await adminApi.reorderOfferSections(ids);
      }
      return saved;
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
    if (title.trim().length < 2) return setError('Give the section a name.');
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt))
      return setError('The stop time must be after the start time.');
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
        aria-labelledby="os-title"
        className="relative flex max-h-[92dvh] w-full max-w-lg flex-col gap-5 overflow-y-auto rounded-[24px] bg-surface p-6 shadow-xl motion-safe:animate-[pop_220ms_cubic-bezier(0.16,1,0.3,1)]"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id="os-title" className="text-lg font-bold">
            {existing ? 'Edit section' : 'New offer section'}
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
        <div className="flex flex-col gap-1.5">
          <label htmlFor="os-name" className="text-[13px] font-medium">
            Section name
          </label>
          <input
            id="os-name"
            autoFocus
            value={title}
            maxLength={40}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Weekend deals"
            aria-invalid={!!error && title.trim().length < 2}
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="os-sub" className="text-[13px] font-medium">
            Short line under the name (optional)
          </label>
          <input
            id="os-sub"
            value={subtitle}
            maxLength={80}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="e.g. Saturday and Sunday only"
            className={inputCls}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="os-start" className="text-[13px] font-medium">
              Start (optional)
            </label>
            <input
              id="os-start"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="os-end" className="text-[13px] font-medium">
              Stop (optional)
            </label>
            <input
              id="os-end"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className={inputCls}
            />
          </div>
          <p className="text-xs text-muted sm:col-span-2">
            Leave empty to start now and run until you switch it off. All dishes in the section
            follow these times.
          </p>
        </div>
        {sections.data && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="os-pos" className="text-[13px] font-medium">
              Position on Home
            </label>
            <select
              id="os-pos"
              value={pos}
              onChange={(e) => setPosition(Number(e.target.value))}
              className={inputCls}
            >
              {Array.from({ length: others.length + 1 }, (_, i) => (
                <option key={i} value={i + 1}>
                  {i + 1}
                  {i === 0 ? ' (top)' : i === others.length ? ' (bottom)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
        <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl bg-panel px-3 text-sm font-semibold">
          Show on Home
          <Toggle checked={active} label="Show on Home" onChange={setActive} />
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
            {existing ? 'Save changes' : 'Create section'}
          </Button>
        </div>
      </form>
    </div>
  );
}

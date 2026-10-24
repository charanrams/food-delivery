import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, FolderTree, Pencil, Plus, Trash2, UtensilsCrossed, X } from 'lucide-react';
import type { CategoryDto } from '@a3/contracts';
import { Button, EmptyState, ErrorState, Skeleton, Toggle, cx } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { categoryImage, sized } from '@/lib/catalog-api';
import { FilterTabs, NoticeBar, PageHeader, RowMenu, SearchInput, SectionCard, StatCard, StatGrid, tdCls, thCls, type Notice } from './admin-ui';
import { adminApi, adminKeys } from './admin-api';
import { ImageUploader } from './ImageUploader';

type Dialog = { mode: 'add' } | { mode: 'edit'; category: CategoryDto };

/** Admin · Food categories — photo tiles; show/hide is one labelled switch, the rest lives in "⋯". */
export function AdminCategoriesPage() {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [notice, setNotice] = useState<Notice>();
  const [show, setShow] = useState<'all' | 'on' | 'hidden' | 'home'>('all');
  const [search, setSearch] = useState('');

  const categories = useQuery({ queryKey: adminKeys.categories, queryFn: adminApi.categories });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin'] });
    qc.invalidateQueries({ queryKey: ['categories'] });
  };
  const fail = (e: unknown) =>
    setNotice({
      tone: 'danger',
      text: e instanceof ApiError ? e.message : 'Could not save. Please try again.',
    });

  const visibility = useMutation({
    mutationFn: (c: CategoryDto) => adminApi.updateCategory(c.id, { isActive: !c.isActive }),
    onSuccess: (_d, c) => {
      refresh();
      setNotice({
        tone: 'success',
        text: c.isActive
          ? `“${c.name}” is hidden from the menu.`
          : `“${c.name}” is back on the menu.`,
      });
    },
    onError: fail,
  });
  const homeRow = useMutation({
    mutationFn: (c: CategoryDto) => adminApi.updateCategory(c.id, { showOnHome: !c.showOnHome }),
    onSuccess: (_d, c) => {
      refresh();
      setNotice({ tone: 'success', text: c.showOnHome ? `“${c.name}” row removed from Home.` : `“${c.name}” now has its own row on Home.` });
    },
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: (c: CategoryDto) => adminApi.deleteCategory(c.id),
    onSuccess: (_d, c) => {
      refresh();
      setNotice({ tone: 'success', text: `“${c.name}” deleted.` });
    },
    onError: fail,
  });

  const list = categories.data ?? [];
  const rows = list
    .filter((c) => (show === 'on' ? c.isActive : show === 'hidden' ? !c.isActive : show === 'home' ? c.showOnHome : true))
    .filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        crumbs={[{ label: 'Menu' }, { label: 'Categories' }]}
        title="Categories"
        description="Sections of your menu. Hiding one hides its dishes too, without losing anything."
        actions={
          <Button
            icon={<Plus className="size-[18px]" aria-hidden />}
            onClick={() => setDialog({ mode: 'add' })}
          >
            Add category
          </Button>
        }
      />

      {categories.data && (
        <StatGrid>
          <StatCard
            label="Categories"
            value={String(categories.data.length)}
            icon={<FolderTree className="size-[18px]" />}
            hint="Sections of the menu"
          />
          <StatCard
            label="On the menu"
            value={String(categories.data.filter((c) => c.isActive).length)}
            tone="green"
            icon={<Eye className="size-[18px]" />}
            hint="Shown to customers"
          />
          <StatCard
            label="Hidden"
            value={String(categories.data.filter((c) => !c.isActive).length)}
            tone="pink"
            icon={<EyeOff className="size-[18px]" />}
            hint="With their dishes"
          />
          <StatCard
            label="Dishes"
            value={String(categories.data.reduce((n, c) => n + (c.productCount ?? 0), 0))}
            tone="blue"
            icon={<UtensilsCrossed className="size-[18px]" />}
            hint="Across all categories"
          />
        </StatGrid>
      )}

      <NoticeBar notice={notice} onDismiss={() => setNotice(undefined)} />

      <SectionCard>
        <div className="flex flex-col gap-3 px-1 pb-3 lg:flex-row lg:items-center lg:justify-between">
          <FilterTabs
            label="Show"
            value={show}
            options={[
              { value: 'all', label: 'All', count: list.length },
              { value: 'on', label: 'On the menu', count: list.filter((c) => c.isActive).length },
              { value: 'hidden', label: 'Hidden', count: list.filter((c) => !c.isActive).length },
              { value: 'home', label: 'Row on Home', count: list.filter((c) => c.showOnHome).length },
            ]}
            onChange={setShow}
          />
          <SearchInput id="cat-search" value={search} onChange={setSearch} placeholder="Search categories" className="lg:w-72 lg:shrink-0" />
        </div>

        {categories.isError ? (
          <ErrorState onRetry={() => categories.refetch()} />
        ) : categories.isPending ? (
          <Skeleton className="h-80 rounded-xl" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<FolderTree className="size-9" />}
            title={list.length ? 'No categories match' : 'No categories yet'}
            body={list.length ? 'Try another filter or search.' : 'Start with sections like Biryani, Curries or Desserts.'}
            action={list.length ? undefined : <Button onClick={() => setDialog({ mode: 'add' })}>Add your first category</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr>
                  <th scope="col" className={thCls}>Category</th>
                  <th scope="col" className={thCls}>Dishes</th>
                  <th scope="col" className={thCls}>Row on Home</th>
                  <th scope="col" className={thCls}>On the menu</th>
                  <th scope="col" className={cx(thCls, 'text-right')}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="[&_td]:border-t [&_td]:border-line/70 [&_tr:first-child_td]:border-t-0">
                {rows.map((c) => {
                  const count = c.productCount ?? 0;
                  return (
                    <tr key={c.id} className={cx('transition-colors hover:bg-primary-soft/40', !c.isActive && 'bg-[#faf8f5]')}>
                      <td className={tdCls}>
                        <button type="button" onClick={() => setDialog({ mode: 'edit', category: c })} className="flex items-center gap-3.5 text-left">
                          <img
                            src={sized(categoryImage(c), 160)}
                            alt=""
                            className={cx('size-14 shrink-0 rounded-xl bg-primary-soft object-cover', !c.isActive && 'opacity-50 grayscale')}
                          />
                          <span className="min-w-0">
                            <span className="block font-semibold hover:text-primary-strong">{c.name}</span>
                            <span className="block text-xs text-muted">{c.isActive ? 'Shown to customers' : 'Hidden with its dishes'}</span>
                          </span>
                        </button>
                      </td>
                      <td className={cx(tdCls, 'tabular')}>
                        {count} {count === 1 ? 'dish' : 'dishes'}
                      </td>
                      <td className={tdCls}>
                        <Toggle
                          checked={c.showOnHome}
                          label={`Show ${c.name} as a row on Home`}
                          disabled={homeRow.isPending && homeRow.variables?.id === c.id}
                          onChange={() => homeRow.mutate(c)}
                        />
                      </td>
                      <td className={tdCls}>
                        <label className="inline-flex cursor-pointer items-center gap-2.5">
                          <Toggle
                            checked={c.isActive}
                            label={`Show ${c.name} on the menu`}
                            disabled={visibility.isPending && visibility.variables?.id === c.id}
                            onChange={() => visibility.mutate(c)}
                          />
                          <span className={cx('text-[13px] font-semibold', c.isActive ? 'text-success' : 'text-muted')}>{c.isActive ? 'On' : 'Hidden'}</span>
                        </label>
                      </td>
                      <td className={cx(tdCls, 'text-right')}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setDialog({ mode: 'edit', category: c })}
                            className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ring-1 ring-line hover:bg-primary-soft hover:text-primary-strong"
                            aria-label={`Edit ${c.name}`}
                          >
                            <Pencil className="size-4" aria-hidden /> Edit
                          </button>
                          <RowMenu
                            label={`More actions for ${c.name}`}
                            items={[
                              {
                                label: 'Delete category',
                                icon: <Trash2 />,
                                danger: true,
                                disabled: count > 0,
                                hint: 'Move or archive its dishes first',
                                onSelect: () => window.confirm(`Delete “${c.name}”? This can’t be undone.`) && remove.mutate(c),
                              },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {dialog && (
        <CategoryDialog
          existing={dialog.mode === 'edit' ? dialog.category : undefined}
          sortOrder={categories.data?.length ?? 0}
          onClose={() => setDialog(null)}
          onSaved={(name, added) => {
            setDialog(null);
            refresh();
            setNotice({ tone: 'success', text: added ? `“${name}” added.` : `“${name}” saved.` });
          }}
        />
      )}
    </div>
  );
}

/** Add or edit a category in a small focused window (Esc or the backdrop closes it). */
function CategoryDialog({
  existing,
  sortOrder,
  onClose,
  onSaved,
}: {
  existing?: CategoryDto;
  sortOrder: number;
  onClose: () => void;
  onSaved: (name: string, added: boolean) => void;
}) {
  const [name, setName] = useState(existing?.name ?? '');
  const [image, setImage] = useState<string[]>(existing?.imageUrl ? [existing.imageUrl] : []);
  const [error, setError] = useState<string>();
  const save = useMutation({
    mutationFn: () =>
      existing
        ? adminApi.updateCategory(existing.id, {
            name: name.trim(),
            ...(image[0] && { imageUrl: image[0] }),
          })
        : adminApi.createCategory({
            name: name.trim(),
            sortOrder,
            ...(image[0] && { imageUrl: image[0] }),
          }),
    onSuccess: () => onSaved(name.trim(), !existing),
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : 'Could not save. Please try again.'),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return setError('Enter a category name.');
    save.mutate();
  };

  return (
    <Modal title={existing ? 'Edit category' : 'Add a category'} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cat-name" className="text-[13px] font-medium">
            Name
          </label>
          <input
            id="cat-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Starters"
            aria-invalid={!!error}
            className="h-11 rounded-xl bg-surface px-3.5 outline-none ring-1 ring-line focus:ring-2 focus:ring-primary aria-[invalid=true]:ring-danger"
          />
        </div>
        <ImageUploader
          value={image}
          onChange={setImage}
          folder="categories"
          max={1}
          label="Tile photo (optional)"
        />
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
            {existing ? 'Save changes' : 'Add category'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
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
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div
        className="absolute inset-0 bg-ink/40 motion-safe:animate-[fade_150ms_ease-out]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cat-dialog-title"
        className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-[24px] bg-surface p-6 shadow-xl motion-safe:animate-[pop_220ms_cubic-bezier(0.16,1,0.3,1)]"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 id="cat-dialog-title" className="text-lg font-bold">
            {title}
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
        {children}
      </div>
    </div>
  );
}

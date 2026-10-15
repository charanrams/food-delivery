import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, FolderTree, Pencil, Plus, Trash2, UtensilsCrossed, X } from 'lucide-react';
import type { CategoryDto } from '@a3/contracts';
import { Button, EmptyState, ErrorState, Skeleton, Toggle, cx } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { categoryImage, sized } from '@/lib/catalog-api';
import { NoticeBar, PageHeader, RowMenu, StatCard, StatGrid, type Notice } from './admin-ui';
import { adminApi, adminKeys } from './admin-api';
import { ImageUploader } from './ImageUploader';

type Dialog = { mode: 'add' } | { mode: 'edit'; category: CategoryDto };

/** Admin · Food categories — photo tiles; show/hide is one labelled switch, the rest lives in "⋯". */
export function AdminCategoriesPage() {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [notice, setNotice] = useState<Notice>();

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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Food categories"
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

      {categories.isError ? (
        <ErrorState onRetry={() => categories.refetch()} />
      ) : categories.isPending ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-64 rounded-[20px]" />
          ))}
        </div>
      ) : categories.data.length === 0 ? (
        <EmptyState
          icon={<FolderTree className="size-9" />}
          title="No categories yet"
          body="Start with sections like Biryani, Curries or Desserts."
          action={
            <Button onClick={() => setDialog({ mode: 'add' })}>Add your first category</Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
          {categories.data.map((c) => {
            const count = c.productCount ?? 0;
            return (
              <li
                key={c.id}
                className={cx(
                  'flex flex-col overflow-hidden rounded-[20px] bg-surface ring-1 ring-line/70 transition-shadow hover:shadow-md',
                  !c.isActive && 'bg-panel',
                )}
              >
                <button
                  type="button"
                  onClick={() => setDialog({ mode: 'edit', category: c })}
                  className="group relative block aspect-[4/3] overflow-hidden"
                  aria-label={`Edit ${c.name}`}
                >
                  <img
                    src={sized(categoryImage(c), 480)}
                    alt=""
                    className={cx(
                      'size-full bg-primary-soft object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]',
                      !c.isActive && 'opacity-50 grayscale',
                    )}
                  />
                  {!c.isActive && (
                    <span className="absolute left-3 top-3 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-semibold text-surface">
                      Hidden
                    </span>
                  )}
                </button>
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-bold">{c.name}</h3>
                      <p className="text-sm text-muted">
                        {count} {count === 1 ? 'dish' : 'dishes'}
                      </p>
                    </div>
                    <RowMenu
                      label={`More actions for ${c.name}`}
                      items={[
                        {
                          label: 'Edit name or photo',
                          icon: <Pencil />,
                          onSelect: () => setDialog({ mode: 'edit', category: c }),
                        },
                        {
                          label: 'Delete category',
                          icon: <Trash2 />,
                          danger: true,
                          disabled: count > 0,
                          hint: 'Move or archive its dishes first',
                          onSelect: () =>
                            window.confirm(`Delete “${c.name}”? This can’t be undone.`) &&
                            remove.mutate(c),
                        },
                      ]}
                    />
                  </div>
                  <label className="mt-auto flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl bg-panel px-3 text-sm font-semibold">
                    <span className={c.isActive ? 'text-success' : 'text-muted'}>
                      {c.isActive ? 'On the menu' : 'Hidden'}
                    </span>
                    <Toggle
                      checked={c.isActive}
                      label={`Show ${c.name} on the menu`}
                      disabled={visibility.isPending && visibility.variables?.id === c.id}
                      onChange={() => visibility.mutate(c)}
                    />
                  </label>
                  <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl bg-panel px-3 text-sm font-semibold">
                    <span className={c.showOnHome && c.isActive ? 'text-success' : 'text-muted'}>Row on Home</span>
                    <Toggle
                      checked={c.showOnHome}
                      label={`Show ${c.name} as a row on Home`}
                      disabled={homeRow.isPending && homeRow.variables?.id === c.id}
                      onChange={() => homeRow.mutate(c)}
                    />
                  </label>
                </div>
              </li>
            );
          })}
        </ul>
      )}

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

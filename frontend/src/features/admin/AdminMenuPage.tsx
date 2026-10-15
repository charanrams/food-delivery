import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  CircleCheck,
  CircleSlash,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  UtensilsCrossed,
} from 'lucide-react';
import { formatPaise, type ProductDto } from '@a3/contracts';
import {
  Badge,
  ButtonLink,
  Card,
  cx,
  EmptyState,
  ErrorState,
  Skeleton,
  Toggle,
  VegMark,
} from '@/components/ui';
import { productImage, sized } from '@/lib/catalog-api';
import { ApiError } from '@/lib/api';
import { PageHeader, RowMenu, StatCard, StatGrid, tdCls, thCls } from './admin-ui';
import { adminApi, adminKeys } from './admin-api';

/** Admin · Menu items — search, filter, toggle availability, archive/restore. */
export function AdminMenuPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [view, setView] = useState<'active' | 'archived'>('active');
  const [error, setError] = useState<string>();

  const categories = useQuery({ queryKey: adminKeys.categories, queryFn: adminApi.categories });
  const params = { search: search.trim() || undefined, categoryId: categoryId || undefined };
  const products = useQuery({
    queryKey: adminKeys.products(params),
    queryFn: () => adminApi.products(params),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin'] });
    qc.invalidateQueries({ queryKey: ['products'] });
  };
  const onError = (e: unknown) =>
    setError(e instanceof ApiError ? e.message : 'Could not save. Please try again.');
  const toggle = useMutation({
    mutationFn: (p: ProductDto) => adminApi.setAvailability(p.id, !p.isAvailable),
    onSuccess: invalidate,
    onError,
  });
  const archive = useMutation({
    mutationFn: (p: ProductDto) => (p.isArchived ? adminApi.restore(p.id) : adminApi.archive(p.id)),
    onSuccess: invalidate,
    onError,
  });

  const catName = new Map(categories.data?.map((c) => [c.id, c.name]));
  const rows = (products.data?.items ?? []).filter((p) =>
    view === 'archived' ? p.isArchived : !p.isArchived,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Menu items"
        description="Prices, photos and availability customers see right away."
        actions={
          <ButtonLink to="/admin/menu/new" icon={<Plus className="size-[18px]" />}>
            Add dish
          </ButtonLink>
        }
      />

      {products.data && (
        <StatGrid>
          <StatCard
            label="Dishes"
            value={String(products.data.items.filter((p) => !p.isArchived).length)}
            icon={<UtensilsCrossed className="size-[18px]" />}
            hint="On the menu"
          />
          <StatCard
            label="Available"
            value={String(products.data.items.filter((p) => !p.isArchived && p.isAvailable).length)}
            tone="green"
            icon={<CircleCheck className="size-[18px]" />}
            hint="Customers can order"
          />
          <StatCard
            label="Unavailable"
            value={String(
              products.data.items.filter((p) => !p.isArchived && !p.isAvailable).length,
            )}
            tone="pink"
            icon={<CircleSlash className="size-[18px]" />}
            hint="Sold out or paused"
          />
          <StatCard
            label="Archived"
            value={String(products.data.items.filter((p) => p.isArchived).length)}
            tone="blue"
            icon={<Archive className="size-[18px]" />}
            hint="Hidden, kept for history"
          />
        </StatGrid>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-w-64 flex-1 items-center gap-2 rounded-full bg-surface px-4 ring-1 ring-line focus-within:ring-2 focus-within:ring-primary">
          <Search className="size-[18px] text-muted" aria-hidden />
          <span className="sr-only">Search dishes</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dishes"
            className="h-11 flex-1 bg-transparent text-sm outline-none"
          />
        </label>
        <label className="sr-only" htmlFor="cat-filter">
          Category
        </label>
        <select
          id="cat-filter"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="h-11 rounded-xl bg-surface px-3 text-sm ring-1 ring-line"
        >
          <option value="">All categories</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div
          role="tablist"
          aria-label="Show"
          className="flex rounded-full bg-surface p-1 ring-1 ring-line/70"
        >
          {(['active', 'archived'] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={cx(
                'min-h-9 rounded-md px-3 text-sm font-medium capitalize',
                view === v ? 'bg-primary-soft text-primary-strong' : 'text-muted',
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {products.isError ? (
        <ErrorState onRetry={() => products.refetch()} />
      ) : products.isPending ? (
        <Skeleton className="h-96" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed className="size-9" />}
          title={view === 'archived' ? 'No archived dishes' : 'No dishes found'}
          body={
            view === 'archived'
              ? 'Archived dishes appear here and can be restored.'
              : 'Try another search, or add your first dish.'
          }
        />
      ) : (
        <Card className="overflow-x-auto rounded-[20px] p-3 ring-line/70">
          <table className="w-full border-separate border-spacing-0 min-w-[760px] text-left text-sm">
            <thead className="text-left">
              <tr>
                <th scope="col" className={thCls}>
                  Dish
                </th>
                <th scope="col" className={thCls}>
                  Category
                </th>
                <th scope="col" className={cx(thCls, 'text-right')}>
                  Price
                </th>
                <th scope="col" className={thCls}>
                  Availability
                </th>
                <th scope="col" className={cx(thCls, 'text-right')}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="[&_td]:border-t [&_td]:border-line/70 [&_tr:first-child_td]:border-t-0">
              {rows.map((p) => (
                <tr key={p.id} className="group/row transition-colors hover:bg-panel/60">
                  <td className={tdCls}>
                    <Link
                      to={`/admin/menu/${p.id}`}
                      className="flex items-center gap-3.5 rounded-xl outline-none"
                    >
                      <img
                        src={sized(productImage(p), 160)}
                        alt=""
                        className={cx(
                          'size-14 shrink-0 rounded-xl bg-primary-soft object-cover',
                          !p.isAvailable && !p.isArchived && 'opacity-60 grayscale',
                        )}
                      />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 font-semibold group-hover/row:text-primary-strong">
                          <VegMark veg={!!p.isVegetarian} />{' '}
                          <span className="truncate">{p.name}</span>
                        </span>
                        <span className="block text-xs text-muted">
                          {p.variants.length > 1
                            ? `${p.variants.length} portions`
                            : 'Single portion'}
                          {p.preparationTimeMinutes ? ` · ${p.preparationTimeMinutes} min` : ''}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className={tdCls}>
                    <span className="inline-flex rounded-full bg-panel px-2.5 py-1 text-xs font-semibold text-ink">
                      {catName.get(p.categoryId) ?? '-'}
                    </span>
                  </td>
                  <td className={cx(tdCls, 'tabular text-right font-bold')}>
                    {p.variants.length > 1 && (
                      <span className="mr-1 text-xs font-normal text-muted">from</span>
                    )}
                    {formatPaise(Math.min(p.pricePaise, ...p.variants.map((v) => v.pricePaise)))}
                  </td>
                  <td className={tdCls}>
                    {p.isArchived ? (
                      <Badge tone="neutral">Archived</Badge>
                    ) : (
                      <label className="inline-flex cursor-pointer items-center gap-2.5">
                        <Toggle
                          checked={p.isAvailable}
                          label={`${p.name} in stock`}
                          disabled={toggle.isPending && toggle.variables?.id === p.id}
                          onChange={() => toggle.mutate(p)}
                        />
                        <span
                          className={cx(
                            'w-16 text-[13px] font-semibold',
                            p.isAvailable ? 'text-success' : 'text-muted',
                          )}
                        >
                          {p.isAvailable ? 'In stock' : 'Sold out'}
                        </span>
                      </label>
                    )}
                  </td>
                  <td className={cx(tdCls, 'text-right')}>
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to={`/admin/menu/${p.id}`}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold hover:bg-primary-soft hover:text-primary-strong"
                        aria-label={`Edit ${p.name}`}
                      >
                        <Pencil className="size-4" aria-hidden /> Edit
                      </Link>
                      <RowMenu
                        label={`More actions for ${p.name}`}
                        items={[
                          p.isArchived
                            ? {
                                label: 'Restore to menu',
                                icon: <RotateCcw />,
                                onSelect: () => archive.mutate(p),
                              }
                            : {
                                label: 'Archive dish',
                                icon: <Archive />,
                                danger: true,
                                onSelect: () =>
                                  window.confirm(
                                    `Archive “${p.name}”? Customers won’t see it, but past orders keep it.`,
                                  ) && archive.mutate(p),
                              },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

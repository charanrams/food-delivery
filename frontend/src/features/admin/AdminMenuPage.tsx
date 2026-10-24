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
  UtensilsCrossed,
} from 'lucide-react';
import { formatPaise, type ProductDto } from '@a3/contracts';
import {
  Badge,
  ButtonLink,
  cx,
  EmptyState,
  ErrorState,
  Skeleton,
  Toggle,
  VegMark,
} from '@/components/ui';
import { productImage, sized } from '@/lib/catalog-api';
import { ApiError } from '@/lib/api';
import { FilterTabs, PageHeader, RowMenu, SearchInput, SectionCard, StatCard, StatGrid, tdCls, thCls } from './admin-ui';
import { adminApi, adminKeys } from './admin-api';

/** Admin · Menu items — search, filter, toggle availability, archive/restore. */
export function AdminMenuPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [view, setView] = useState<'active' | 'archived'>('active');
  const [diet, setDiet] = useState<'all' | 'veg' | 'nonveg'>('all');
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
  const all = products.data?.items ?? [];
  const live = all.filter((p) => !p.isArchived);
  const rows = all
    .filter((p) => (view === 'archived' ? p.isArchived : !p.isArchived))
    .filter((p) => (diet === 'all' ? true : diet === 'veg' ? p.isVegetarian : !p.isVegetarian));
  const countIn = (id: string) => live.filter((p) => p.categoryId === id).length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        crumbs={[{ label: 'Menu' }, { label: 'Menu items' }]}
        title="Menu items"
        description="What customers can order. Flip a dish to Sold out the moment the kitchen runs out."
        actions={
          <ButtonLink to="/admin/menu/new" icon={<Plus className="size-[18px]" />}>
            Add dish
          </ButtonLink>
        }
      />

      <StatGrid>
        <StatCard label="Dishes on the menu" value={String(live.length)} icon={<UtensilsCrossed />} hint={`Across ${categories.data?.length ?? 0} categories`} />
        <StatCard label="In stock" value={String(live.filter((p) => p.isAvailable).length)} tone="green" icon={<CircleCheck />} hint="Customers can order" />
        <StatCard label="Sold out" value={String(live.filter((p) => !p.isAvailable).length)} tone="red" icon={<CircleSlash />} hint="Visible, can’t be ordered" />
        <StatCard label="Archived" value={String(all.filter((p) => p.isArchived).length)} tone="blue" icon={<Archive />} hint="Hidden, kept for history" />
      </StatGrid>

      <SectionCard>
        <div className="flex flex-col gap-3 px-1 pb-3">
          <FilterTabs
            label="Category"
            value={categoryId || 'all'}
            options={[
              { value: 'all', label: 'All', count: live.length },
              ...(categories.data ?? []).map((c) => ({ value: c.id, label: c.name, count: countIn(c.id) })),
            ]}
            onChange={(v) => setCategoryId(v === 'all' ? '' : v)}
          />
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <SearchInput id="dish-search" value={search} onChange={setSearch} placeholder="Search dishes" className="lg:max-w-sm" />
            <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
              <Segmented
                label="Food type"
                value={diet}
                options={[
                  ['all', 'All'],
                  ['veg', 'Veg'],
                  ['nonveg', 'Non-veg'],
                ]}
                onChange={setDiet}
              />
              <Segmented
                label="Show"
                value={view}
                options={[
                  ['active', 'On the menu'],
                  ['archived', 'Archived'],
                ]}
                onChange={setView}
              />
            </div>
          </div>
        </div>

        {error && (
          <p role="alert" className="mx-1 mb-3 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        {products.isError ? (
          <ErrorState onRetry={() => products.refetch()} />
        ) : products.isPending ? (
          <Skeleton className="h-96 rounded-xl" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<UtensilsCrossed className="size-9" />}
            title={view === 'archived' ? 'No archived dishes' : 'No dishes found'}
            body={view === 'archived' ? 'Archived dishes appear here and can be restored.' : 'Try another search or filter, or add a dish.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr>
                  <th scope="col" className={thCls}>Dish</th>
                  <th scope="col" className={thCls}>Category</th>
                  <th scope="col" className={cx(thCls, 'text-right')}>Price</th>
                  <th scope="col" className={thCls}>Availability</th>
                  <th scope="col" className={cx(thCls, 'text-right')}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="[&_td]:border-t [&_td]:border-line/70 [&_tr:first-child_td]:border-t-0">
                {rows.map((p) => (
                  <tr key={p.id} className={cx('group/row transition-colors hover:bg-primary-soft/40', !p.isAvailable && !p.isArchived && 'bg-[#faf8f5]')}>
                    <td className={tdCls}>
                      <Link to={`/admin/menu/${p.id}`} className="flex items-center gap-3.5 rounded-xl outline-none">
                        <img
                          src={sized(productImage(p), 160)}
                          alt=""
                          className={cx('size-14 shrink-0 rounded-xl bg-primary-soft object-cover', !p.isAvailable && !p.isArchived && 'opacity-60 grayscale')}
                        />
                        <span className="min-w-0">
                          <span className="flex items-center gap-2 font-semibold group-hover/row:text-primary-strong">
                            <VegMark veg={!!p.isVegetarian} /> <span className="truncate">{p.name}</span>
                          </span>
                          <span className="block text-xs text-muted">
                            {p.variants.length > 1 ? `${p.variants.length} portions` : 'Single portion'}
                            {p.preparationTimeMinutes ? ` · ${p.preparationTimeMinutes} min` : ''}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className={tdCls}>
                      <span className="inline-flex whitespace-nowrap rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary-strong">
                        {catName.get(p.categoryId) ?? '-'}
                      </span>
                    </td>
                    <td className={cx(tdCls, 'tabular whitespace-nowrap text-right font-bold')}>
                      {p.variants.length > 1 && <span className="mr-1 text-xs font-normal text-muted">from</span>}
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
                          <span className={cx('w-16 text-[13px] font-semibold', p.isAvailable ? 'text-success' : 'text-danger')}>
                            {p.isAvailable ? 'In stock' : 'Sold out'}
                          </span>
                        </label>
                      )}
                    </td>
                    <td className={cx(tdCls, 'text-right')}>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/admin/menu/${p.id}`}
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ring-1 ring-line hover:bg-primary-soft hover:text-primary-strong"
                          aria-label={`Edit ${p.name}`}
                        >
                          <Pencil className="size-4" aria-hidden /> Edit
                        </Link>
                        <RowMenu
                          label={`More actions for ${p.name}`}
                          items={[
                            p.isArchived
                              ? { label: 'Restore to menu', icon: <RotateCcw />, onSelect: () => archive.mutate(p) }
                              : {
                                  label: 'Archive dish',
                                  icon: <Archive />,
                                  danger: true,
                                  onSelect: () =>
                                    window.confirm(`Archive “${p.name}”? Customers won’t see it, but past orders keep it.`) && archive.mutate(p),
                                },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows.length > 0 && <p className="px-2 pt-3 text-xs text-muted">Showing {rows.length} {rows.length === 1 ? 'dish' : 'dishes'}</p>}
      </SectionCard>
    </div>
  );
}

/** Small pill switch (All / Veg / Non-veg …). */
function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div role="tablist" aria-label={label} className="flex rounded-full bg-[#f4efe8] p-1">
      {options.map(([v, l]) => (
        <button
          key={v}
          role="tab"
          aria-selected={value === v}
          onClick={() => onChange(v)}
          className={cx('min-h-9 whitespace-nowrap rounded-full px-3.5 text-sm font-semibold', value === v ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink')}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

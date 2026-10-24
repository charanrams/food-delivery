import { IndianRupee, PackageCheck, ShoppingBag, TrendingUp, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatPaise } from '@a3/contracts';
import { Card, ErrorState, Skeleton, cx } from '@/components/ui';
import { adminApi, adminKeys } from './admin-api';
import { FilterTabs, PageHeader, StatCard } from './admin-ui';

const RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
] as const;
type Range = (typeof RANGES)[number]['value'];

const dayLabel = (d: string, long: boolean) =>
  new Date(`${d}T00:00:00`).toLocaleDateString(
    'en-IN',
    long ? { weekday: 'short', day: 'numeric' } : { day: 'numeric', month: 'short' },
  );

/** Admin · Reports — revenue by day and what sells. Revenue counts paid orders only. */
export function AdminReportsPage() {
  const [range, setRange] = useState<Range>('7');
  const days = Number(range);
  const report = useQuery({
    queryKey: adminKeys.reports(days),
    queryFn: () => adminApi.reports(days),
  });
  const r = report.data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        crumbs={[{ label: 'Business' }, { label: 'Reports' }]}
        title="Reports"
        description="Revenue counts money received only. Pending, failed and refunded payments are left out."
      />
      <FilterTabs label="Date range" value={range} options={[...RANGES]} onChange={setRange} />

      {report.isError ? (
        <Card>
          <ErrorState onRetry={() => report.refetch()} />
        </Card>
      ) : !r ? (
        <Skeleton className="h-[28rem]" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:gap-4 xl:grid-cols-5">
            <StatCard
              label="Revenue"
              value={formatPaise(r.revenuePaise)}
              tone="green"
              icon={<IndianRupee className="size-[18px]" />}
              hint="Money received"
            />
            <StatCard
              label="Orders"
              value={String(r.orders)}
              icon={<ShoppingBag className="size-[18px]" />}
              hint="In this period"
            />
            <StatCard
              label="Average order"
              value={formatPaise(r.averageOrderPaise)}
              tone="blue"
              icon={<TrendingUp className="size-[18px]" />}
              hint="Per order"
            />
            <StatCard
              label="Delivered"
              value={String(r.delivered)}
              tone="green"
              icon={<PackageCheck className="size-[18px]" />}
              hint="Completed"
            />
            <StatCard
              label="Cancelled"
              value={String(r.cancelled)}
              tone="pink"
              icon={<XCircle className="size-[18px]" />}
              hint="Cancelled or rejected"
            />
          </div>

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <Card as="section" className="rounded-[20px] p-5 ring-line/70">
              <h2 className="font-semibold">Revenue by day</h2>
              <RevenueChart daily={r.daily} />
            </Card>

            <Card as="section" className="overflow-hidden rounded-[20px] ring-line/70">
              <h2 className="border-b border-line px-5 py-4 font-semibold">Best sellers</h2>
              {r.topDishes.length === 0 ? (
                <p className="px-5 py-8 text-sm text-muted">No paid orders in this period yet.</p>
              ) : (
                <ol className="divide-y divide-line">
                  {r.topDishes.map((d, i) => {
                    const max = r.topDishes[0]!.quantity;
                    return (
                      <li key={d.name} className="flex flex-col gap-2 px-5 py-3">
                        <div className="flex items-baseline justify-between gap-4 text-sm">
                          <span className="min-w-0 truncate">
                            <span className="tabular mr-2 text-muted">{i + 1}.</span>
                            {d.name}
                          </span>
                          <span className="tabular shrink-0">
                            <span className="font-semibold">{d.quantity}</span>{' '}
                            <span className="text-muted">sold · {formatPaise(d.revenuePaise)}</span>
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-primary-soft" aria-hidden>
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${(d.quantity / max) * 100}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function RevenueChart({
  daily,
}: {
  daily: { date: string; orders: number; revenuePaise: number }[];
}) {
  const max = Math.max(...daily.map((d) => d.revenuePaise), 1);
  const short = daily.length <= 7;
  const every = Math.ceil(daily.length / 10);
  return (
    <figure className="mt-4">
      <div
        className="flex h-56 items-end gap-[3px] border-b border-line"
        role="img"
        aria-label={`Revenue per day, highest ${formatPaise(max)}`}
      >
        {daily.map((d) => (
          <div key={d.date} className="group relative flex h-full flex-1 items-end">
            <div
              className={cx(
                'w-full rounded-t-[4px] transition-colors',
                d.revenuePaise ? 'bg-primary group-hover:bg-primary-strong' : 'bg-line',
              )}
              style={{
                height: d.revenuePaise ? `${Math.max((d.revenuePaise / max) * 100, 2)}%` : 2,
              }}
            />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs text-surface group-hover:block">
              {dayLabel(d.date, false)} · {formatPaise(d.revenuePaise)} · {d.orders} orders
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-[3px] text-[11px] text-muted">
        {daily.map((d, i) => (
          <span key={d.date} className="tabular flex-1 truncate text-center">
            {i % every === 0 ? dayLabel(d.date, short) : ''}
          </span>
        ))}
      </div>
      <figcaption className="sr-only">
        {daily.map((d) => `${d.date}: ${formatPaise(d.revenuePaise)}`).join('; ')}
      </figcaption>
    </figure>
  );
}

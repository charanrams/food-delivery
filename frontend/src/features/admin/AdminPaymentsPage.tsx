import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { CircleCheck, IndianRupee, Receipt, Undo2, Wallet } from 'lucide-react';
import { formatPaise, type PaymentStatus } from '@a3/contracts';
import { Card, EmptyState, ErrorState, Skeleton, StatusBadge, cx } from '@/components/ui';
import { adminApi, adminKeys } from './admin-api';
import {
  dateTime,
  FilterTabs,
  PageHeader,
  PaymentBadge,
  StatCard,
  StatGrid,
  tdCls,
  thCls,
} from './admin-ui';

type Filter = 'ALL' | PaymentStatus;
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'REFUND_PENDING', label: 'Refund pending' },
  { value: 'REFUNDED', label: 'Refunded' },
];

/** Admin · Payments & refunds — money per order; refunds start automatically on reject/cancel. */
export function AdminPaymentsPage() {
  const [filter, setFilter] = useState<Filter>('ALL');
  const status = filter === 'ALL' ? undefined : filter;
  const payments = useQuery({
    queryKey: adminKeys.payments(filter),
    queryFn: () => adminApi.payments(status),
  });
  const rows = payments.data ?? [];
  const received = rows.filter((p) => p.status === 'PAID').reduce((s, p) => s + p.amountPaise, 0);
  const owed = rows
    .filter((p) => p.status === 'REFUND_PENDING')
    .reduce((s, p) => s + p.amountPaise, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Payments & refunds"
        description="Rejected or cancelled online orders are refunded automatically. Cash orders are marked paid when the rider collects."
      />

      {payments.data && (
        <StatGrid>
          <StatCard
            label="Payments"
            value={String(rows.length)}
            icon={<Receipt className="size-[18px]" />}
            hint="In this view"
          />
          <StatCard
            label="Amount"
            value={formatPaise(rows.reduce((n, p) => n + p.amountPaise, 0))}
            tone="blue"
            icon={<IndianRupee className="size-[18px]" />}
            hint="In this view"
          />
          <StatCard
            label="Paid"
            value={String(rows.filter((p) => p.status === 'PAID').length)}
            tone="green"
            icon={<CircleCheck className="size-[18px]" />}
            hint="Money received"
          />
          <StatCard
            label="Refunds"
            value={String(
              rows.filter(
                (p) =>
                  p.status === 'REFUNDED' ||
                  p.status === 'REFUND_PENDING' ||
                  p.status === 'PARTIALLY_REFUNDED',
              ).length,
            )}
            tone="pink"
            icon={<Undo2 className="size-[18px]" />}
            hint="Pending or done"
          />
        </StatGrid>
      )}
      <FilterTabs label="Payment status" value={filter} options={FILTERS} onChange={setFilter} />

      {payments.isError ? (
        <Card>
          <ErrorState onRetry={() => payments.refetch()} />
        </Card>
      ) : payments.isPending ? (
        <Skeleton className="h-80" />
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Wallet className="size-9" />}
            title="No payments here"
            body="Payments in this state will appear as orders come in."
          />
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted">
            {rows.length} {rows.length === 1 ? 'payment' : 'payments'} ·{' '}
            <span className="font-semibold text-ink">{formatPaise(received)}</span> received
            {owed > 0 && (
              <>
                {' '}
                · <span className="font-semibold text-warning">{formatPaise(owed)}</span> to refund
              </>
            )}
          </p>
          <Card className="overflow-x-auto rounded-[20px] p-3 ring-line/70">
            <table className="w-full border-separate border-spacing-0 min-w-[820px] text-left text-sm">
              <thead className="text-left">
                <tr>
                  <th scope="col" className={thCls}>
                    Order
                  </th>
                  <th scope="col" className={thCls}>
                    Customer
                  </th>
                  <th scope="col" className={thCls}>
                    Method
                  </th>
                  <th scope="col" className={cx(thCls, 'text-right')}>
                    Amount
                  </th>
                  <th scope="col" className={thCls}>
                    Payment
                  </th>
                  <th scope="col" className={thCls}>
                    Order status
                  </th>
                  <th scope="col" className={thCls}>
                    When
                  </th>
                </tr>
              </thead>
              <tbody className="[&_td]:border-t [&_td]:border-line/70 [&_tr:first-child_td]:border-t-0">
                {rows.map((p) => (
                  <tr key={p.orderId} className="hover:bg-panel">
                    <td className={tdCls}>
                      <Link
                        to={`/admin/orders/${p.orderId}`}
                        className="tabular whitespace-nowrap font-semibold text-primary-strong underline-offset-2 hover:underline"
                      >
                        {p.orderNumber}
                      </Link>
                      {p.providerPaymentId && (
                        <p className="font-mono text-xs text-muted">{p.providerPaymentId}</p>
                      )}
                    </td>
                    <td className={tdCls}>{p.customer}</td>
                    <td className={tdCls}>{p.method === 'COD' ? 'Cash' : 'Razorpay'}</td>
                    <td className={cx(tdCls, 'tabular text-right font-semibold')}>
                      {formatPaise(p.amountPaise)}
                    </td>
                    <td className={tdCls}>
                      <PaymentBadge status={p.status} />
                    </td>
                    <td className={tdCls}>
                      <StatusBadge status={p.orderStatus} />
                    </td>
                    <td className={cx(tdCls, 'tabular text-muted')}>
                      {dateTime(p.refundedAt ?? p.paidAt ?? p.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}

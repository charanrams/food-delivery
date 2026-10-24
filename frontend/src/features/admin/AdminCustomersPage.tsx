import { Link } from 'react-router';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, IndianRupee, Repeat, UserCheck, UserX, Users } from 'lucide-react';
import { formatPaise } from '@a3/contracts';
import { Badge, Card, EmptyState, ErrorState, Skeleton, cx } from '@/components/ui';
import { adminApi, adminKeys, type AdminCustomer } from './admin-api';
import {
  Avatar,
  errorText,
  localPhone,
  NoticeBar,
  PageHeader,
  RowMenu,
  SearchInput,
  StatCard,
  StatGrid,
  tdCls,
  thCls,
  timeAgo,
  type Notice,
} from './admin-ui';

/** Admin · Customers — who orders, how much, and the ability to block abuse. */
export function AdminCustomersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [notice, setNotice] = useState<Notice>();
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const customers = useQuery({
    queryKey: adminKeys.customers(debounced),
    queryFn: () => adminApi.customers(debounced),
  });
  const toggle = useMutation({
    mutationFn: (c: AdminCustomer) =>
      adminApi
        .setCustomerStatus(c.id, c.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')
        .then((r) => ({ ...c, status: r.status })),
    onSuccess: (c) => {
      setNotice({
        tone: 'success',
        text:
          c.status === 'ACTIVE'
            ? `${c.name} can order again.`
            : `${c.name} is blocked from ordering.`,
      });
      void qc.invalidateQueries({ queryKey: ['admin', 'customers'] });
    },
    onError: (e) => setNotice({ tone: 'danger', text: errorText(e) }),
  });

  const rows = customers.data ?? [];
  const total = rows.length;
  const repeat = rows.filter((c) => c.orders > 1).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        crumbs={[{ label: 'People' }, { label: 'Customers' }]}
        title="Customers"
        description={
          customers.data && !debounced
            ? `${total} ${total === 1 ? 'customer' : 'customers'} · ${repeat} ordered more than once.`
            : 'Everyone who has signed up to order.'
        }
        actions={
          <SearchInput
            id="customer-search"
            value={search}
            onChange={setSearch}
            placeholder="Search name, email or mobile"
            className="sm:w-72"
          />
        }
      />

      {!debounced && customers.data && (
        <StatGrid>
          <StatCard
            label="Customers"
            value={String(rows.length)}
            icon={<Users className="size-[18px]" />}
            hint="Signed up to order"
          />
          <StatCard
            label="Repeat customers"
            value={String(rows.filter((c) => c.orders > 1).length)}
            tone="green"
            icon={<Repeat className="size-[18px]" />}
            hint="Ordered more than once"
          />
          <StatCard
            label="Lifetime spend"
            value={formatPaise(rows.reduce((n, c) => n + c.spentPaise, 0))}
            tone="blue"
            icon={<IndianRupee className="size-[18px]" />}
            hint="Across all customers"
          />
          <StatCard
            label="Blocked"
            value={String(rows.filter((c) => c.status !== 'ACTIVE').length)}
            tone="pink"
            icon={<Ban className="size-[18px]" />}
            hint="Can't log in or order"
          />
        </StatGrid>
      )}
      <NoticeBar notice={notice} onDismiss={() => setNotice(undefined)} />

      {customers.isError ? (
        <Card>
          <ErrorState onRetry={() => customers.refetch()} />
        </Card>
      ) : customers.isPending ? (
        <Skeleton className="h-80" />
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="size-9" />}
            title={debounced ? 'No customers match' : 'No customers yet'}
            body={
              debounced
                ? 'Try a different name, email or number.'
                : 'Customers appear here once they sign up.'
            }
          />
        </Card>
      ) : (
        <Card className="overflow-x-auto rounded-[20px] p-3 ring-line/70">
          <table className="w-full border-separate border-spacing-0 min-w-[760px] text-left text-sm">
            <thead className="text-left">
              <tr>
                <th scope="col" className={thCls}>
                  Customer
                </th>
                <th scope="col" className={thCls}>
                  Mobile
                </th>
                <th scope="col" className={cx(thCls, 'text-right')}>
                  Orders
                </th>
                <th scope="col" className={cx(thCls, 'text-right')}>
                  Spent
                </th>
                <th scope="col" className={thCls}>
                  Last order
                </th>
                <th scope="col" className={thCls}>
                  Status
                </th>
                <th scope="col" className={cx(thCls, 'text-right')}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="[&_td]:border-t [&_td]:border-line/70 [&_tr:first-child_td]:border-t-0">
              {rows.map((c) => (
                <tr
                  key={c.id}
                  className={cx(
                    'relative transition-colors hover:bg-panel/60 [&_a[href^=tel]]:relative [&_a[href^=tel]]:z-10 [&_td:last-child]:relative [&_td:last-child]:z-10',
                    c.status !== 'ACTIVE' && 'text-muted',
                  )}
                >
                  <td className={tdCls}>
                    <div className="flex items-center gap-3">
                      <Avatar name={c.name} dot={c.status !== 'ACTIVE' ? 'blocked' : undefined} />
                      <div className="min-w-0">
                        <Link
                          to={`/admin/customers/${c.id}`}
                          className="block truncate font-semibold text-ink after:absolute after:inset-0 after:content-[''] hover:text-primary-strong"
                        >
                          {c.name}
                        </Link>
                        <p className="truncate text-[13px] text-muted">
                          {c.email ?? `Joined ${timeAgo(c.joinedAt)}`}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className={tdCls}>
                    <a
                      href={`tel:${c.phone}`}
                      className="tabular hover:text-primary-strong hover:underline"
                    >
                      {localPhone(c.phone)}
                    </a>
                  </td>
                  <td className={cx(tdCls, 'tabular text-right')}>
                    <span className="font-semibold">{c.orders}</span>
                    {c.orders > 1 && (
                      <span className="ml-2 rounded-full bg-success/12 px-2 py-0.5 text-[11px] font-bold text-success">
                        Repeat
                      </span>
                    )}
                  </td>
                  <td className={cx(tdCls, 'tabular text-right font-semibold')}>
                    {formatPaise(c.spentPaise)}
                  </td>
                  <td className={cx(tdCls, 'text-muted')}>
                    {c.lastOrderAt ? timeAgo(c.lastOrderAt) : 'Never'}
                  </td>
                  <td className={tdCls}>
                    {c.status === 'ACTIVE' ? (
                      <Badge tone="success">Active</Badge>
                    ) : (
                      <Badge tone="danger">Blocked</Badge>
                    )}
                  </td>
                  <td className={cx(tdCls, 'text-right')}>
                    <RowMenu
                      label={`More actions for ${c.name}`}
                      items={[
                        c.status === 'ACTIVE'
                          ? {
                              label: 'Block customer',
                              icon: <UserX />,
                              danger: true,
                              disabled: toggle.isPending && toggle.variables?.id === c.id,
                              onSelect: () =>
                                window.confirm(
                                  `Block ${c.name}? They won’t be able to place orders.`,
                                ) && toggle.mutate(c),
                            }
                          : {
                              label: 'Unblock customer',
                              icon: <UserCheck />,
                              disabled: toggle.isPending && toggle.variables?.id === c.id,
                              onSelect: () => toggle.mutate(c),
                            },
                      ]}
                    />
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

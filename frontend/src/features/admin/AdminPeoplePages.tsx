import { Link, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Bike,
  CalendarDays,
  CircleCheck,
  ClipboardList,
  Home,
  IndianRupee,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  Truck,
  UserCheck,
  UserX,
  XCircle,
} from 'lucide-react';
import { formatPaise } from '@a3/contracts';
import { Badge, Button, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { ApiError, api, qs } from '@/lib/api';
import { adminApi, adminKeys } from './admin-api';
import { Avatar, StatCard, StatGrid, localPhone } from './admin-ui';
import { OrderHistory } from './OrderList';

const fullDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '-';

function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-10 items-center gap-1.5 self-start rounded-full pr-3 text-sm font-semibold text-muted hover:text-ink"
    >
      <ArrowLeft className="size-4" aria-hidden /> {label}
    </Link>
  );
}

function ContactRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <p className="flex min-h-9 items-center gap-2.5 text-sm">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-panel text-muted [&>svg]:size-4">
        {icon}
      </span>
      <span className="min-w-0 truncate">{children}</span>
    </p>
  );
}

/** Admin · One customer — who they are, how they order, where they live, and every order. */
export function AdminCustomerPage() {
  const { customerId = '' } = useParams();
  const qc = useQueryClient();
  const c = useQuery({
    queryKey: ['admin', 'customer', customerId],
    queryFn: () => adminApi.customer(customerId),
  });
  const toggle = useMutation({
    mutationFn: () =>
      adminApi.setCustomerStatus(customerId, c.data?.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });

  if (c.isError)
    return (
      <div className="flex flex-col gap-5">
        <BackLink to="/admin/customers" label="All customers" />
        {c.error instanceof ApiError && c.error.status === 404 ? (
          <EmptyState
            icon={<UserX className="size-9" />}
            title="Customer not found"
            body="They may have been removed."
          />
        ) : (
          <ErrorState onRetry={() => c.refetch()} />
        )}
      </div>
    );
  if (c.isPending)
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-40 rounded-[20px]" />
        <Skeleton className="h-96 rounded-[20px]" />
      </div>
    );

  const d = c.data;
  const active = d.status === 'ACTIVE';
  return (
    <div className="flex flex-col gap-6">
      <BackLink to="/admin/customers" label="All customers" />

      <section className="flex flex-col gap-5 rounded-[20px] bg-surface p-5 ring-1 ring-line/70 md:flex-row md:items-start md:p-6">
        <Avatar name={d.name} dot={active ? undefined : 'blocked'} className="size-16 text-xl" />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-[-0.02em]">{d.name}</h1>
            {active ? <Badge tone="success">Active</Badge> : <Badge tone="danger">Blocked</Badge>}
            {d.orders > 1 && <Badge tone="primary">Repeat customer</Badge>}
          </div>
          <div className="grid gap-x-8 sm:grid-cols-2">
            <ContactRow icon={<Phone />}>
              <a
                href={`tel:${d.phone}`}
                className="tabular font-medium hover:text-primary-strong hover:underline"
              >
                {localPhone(d.phone)}
              </a>
            </ContactRow>
            {d.email && (
              <ContactRow icon={<Mail />}>
                <a href={`mailto:${d.email}`} className="hover:text-primary-strong hover:underline">
                  {d.email}
                </a>
              </ContactRow>
            )}
            <ContactRow icon={<CalendarDays />}>Joined {fullDate(d.joinedAt)}</ContactRow>
            <ContactRow icon={<ClipboardList />}>
              Last order {d.lastOrderAt ? fullDate(d.lastOrderAt) : 'never'}
            </ContactRow>
          </div>
        </div>
        <Button
          variant={active ? 'secondary' : 'primary'}
          className={active ? 'text-danger ring-danger/40 hover:bg-danger/10' : undefined}
          loading={toggle.isPending}
          icon={
            active ? (
              <UserX className="size-[18px]" aria-hidden />
            ) : (
              <UserCheck className="size-[18px]" aria-hidden />
            )
          }
          onClick={() =>
            (!active ||
              window.confirm(`Block ${d.name}? They won’t be able to log in or order.`)) &&
            toggle.mutate()
          }
        >
          {active ? 'Block customer' : 'Unblock customer'}
        </Button>
      </section>

      <StatGrid>
        <StatCard
          label="Orders"
          value={String(d.orders)}
          icon={<ReceiptText className="size-[18px]" />}
          hint={d.firstOrderAt ? `Since ${fullDate(d.firstOrderAt)}` : 'No orders yet'}
        />
        <StatCard
          label="Total spent"
          value={formatPaise(d.spentPaise)}
          tone="green"
          icon={<IndianRupee className="size-[18px]" />}
          hint="Paid orders only"
        />
        <StatCard
          label="Average order"
          value={formatPaise(d.averageOrderPaise)}
          tone="blue"
          icon={<CircleCheck className="size-[18px]" />}
          hint={`${d.delivered} delivered`}
        />
        <StatCard
          label="Cancelled"
          value={String(d.cancelled)}
          tone="pink"
          icon={<XCircle className="size-[18px]" />}
          hint="Cancelled or rejected"
        />
      </StatGrid>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <OrderHistory filter={{ customerId }} title="Orders" showCustomer={false} />
        <section
          className="flex flex-col gap-3 rounded-[20px] bg-surface p-4 ring-1 ring-line/70 md:p-5"
          aria-labelledby="addr-h"
        >
          <h2 id="addr-h" className="text-lg font-bold">
            Saved addresses{' '}
            <span className="tabular text-base font-semibold text-muted">
              ({d.addresses.length})
            </span>
          </h2>
          {d.addresses.length === 0 ? (
            <p className="text-sm text-muted">No saved addresses yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {d.addresses.map((a) => (
                <li key={a.id} className="flex gap-3 rounded-2xl bg-panel p-3.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-primary-strong">
                    {a.label === 'HOME' ? (
                      <Home className="size-4" aria-hidden />
                    ) : (
                      <MapPin className="size-4" aria-hidden />
                    )}
                  </span>
                  <div className="min-w-0 text-sm">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {a.label.charAt(0) + a.label.slice(1).toLowerCase()}
                      {a.isDefault && (
                        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary-strong">
                          Default
                        </span>
                      )}
                      {!a.isServiceable && (
                        <span className="rounded-full bg-danger/12 px-2 py-0.5 text-[11px] font-bold text-danger">
                          Outside area
                        </span>
                      )}
                    </p>
                    <p className="text-muted">
                      {[a.line1, a.line2, a.landmark, a.city, a.postalCode]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                    <p className="text-xs text-muted">
                      {a.recipientName} · {localPhone(a.phone)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

const count = (p: Record<string, string>) =>
  api.page(`/admin/orders${qs({ ...p, limit: 1 })}`).then((r) => r.meta.total);

/** Admin · One delivery partner — profile, delivery numbers and every order they carried. */
export function AdminPartnerPage() {
  const { partnerId = '' } = useParams();
  const partners = useQuery({
    queryKey: adminKeys.partners(''),
    queryFn: () => adminApi.partners(''),
  });
  const delivered = useQuery({
    queryKey: ['admin', 'partner-count', partnerId, 'DELIVERED'],
    queryFn: () => count({ partnerId, status: 'DELIVERED' }),
  });
  const onRoad = useQuery({
    queryKey: ['admin', 'partner-count', partnerId, 'ACTIVE'],
    queryFn: () => count({ partnerId, status: 'ACTIVE' }),
    refetchInterval: 30_000,
  });
  const total = useQuery({
    queryKey: ['admin', 'partner-count', partnerId, 'ALL'],
    queryFn: () => count({ partnerId }),
  });

  if (partners.isError)
    return (
      <div className="flex flex-col gap-5">
        <BackLink to="/admin/delivery-partners" label="All partners" />
        <ErrorState onRetry={() => partners.refetch()} />
      </div>
    );
  if (partners.isPending) return <Skeleton className="h-96 rounded-[20px]" />;
  const p = partners.data.find((x) => x.id === partnerId);
  if (!p)
    return (
      <div className="flex flex-col gap-5">
        <BackLink to="/admin/delivery-partners" label="All partners" />
        <EmptyState
          icon={<Bike className="size-9" />}
          title="Partner not found"
          body="They may have been removed."
        />
      </div>
    );

  const n = (q: { data?: number }) => (q.data === undefined ? '-' : String(q.data));
  return (
    <div className="flex flex-col gap-6">
      <BackLink to="/admin/delivery-partners" label="All partners" />

      <section className="flex flex-col gap-5 rounded-[20px] bg-surface p-5 ring-1 ring-line/70 md:flex-row md:items-start md:p-6">
        <Avatar
          name={p.name}
          dot={
            p.status !== 'ACTIVE' ? 'blocked' : p.availability === 'ONLINE' ? 'online' : 'offline'
          }
          className="size-16 text-xl"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-[-0.02em]">{p.name}</h1>
            {p.status !== 'ACTIVE' ? (
              <Badge tone="danger">Suspended</Badge>
            ) : (
              <Badge tone={p.availability === 'ONLINE' ? 'success' : 'neutral'}>
                {p.availability === 'ONLINE' ? 'Online' : 'Offline'}
              </Badge>
            )}
          </div>
          <div className="grid gap-x-8 sm:grid-cols-2">
            <ContactRow icon={<Phone />}>
              <a
                href={`tel:${p.phone}`}
                className="tabular font-medium hover:text-primary-strong hover:underline"
              >
                {localPhone(p.phone)}
              </a>
            </ContactRow>
            <ContactRow icon={<Mail />}>
              <a href={`mailto:${p.email}`} className="hover:text-primary-strong hover:underline">
                {p.email}
              </a>
            </ContactRow>
            <ContactRow icon={<Bike />}>
              {[p.vehicleType, p.vehicleNumber].filter(Boolean).join(' · ') || 'No vehicle on file'}
            </ContactRow>
            <ContactRow icon={<CalendarDays />}>Joined {fullDate(p.createdAt)}</ContactRow>
          </div>
        </div>
      </section>

      <StatGrid>
        <StatCard
          label="Orders assigned"
          value={n(total)}
          icon={<ReceiptText className="size-[18px]" />}
          hint="All time"
        />
        <StatCard
          label="Delivered"
          value={n(delivered)}
          tone="green"
          icon={<CircleCheck className="size-[18px]" />}
          hint="Completed drops"
        />
        <StatCard
          label="On the road"
          value={n(onRoad)}
          tone="blue"
          icon={<Truck className="size-[18px]" />}
          hint="Right now"
        />
        <StatCard
          label="Status"
          value={
            p.status !== 'ACTIVE' ? 'Suspended' : p.availability === 'ONLINE' ? 'Online' : 'Offline'
          }
          tone={p.status !== 'ACTIVE' ? 'pink' : 'orange'}
          icon={<Bike className="size-[18px]" />}
          hint={p.status !== 'ACTIVE' ? 'Can’t log in' : 'Availability'}
        />
      </StatGrid>

      <OrderHistory filter={{ partnerId }} title="Deliveries" />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BellRing, Bike, CheckCheck, CreditCard, ShoppingBag, Trash2, XCircle } from 'lucide-react';
import type { NotificationDto } from '@a3/contracts';
import { Button, EmptyState, ErrorState, Skeleton, cx } from '@/components/ui';
import { api } from '@/lib/api';
import { notificationsQuery } from '@/lib/orders-api';
import { FilterTabs, PageHeader, SectionCard, StatCard, StatGrid, timeAgo } from './admin-ui';

/** Icon + tint by notification type (order.*, delivery.*, payment.* …). */
function look(type: string) {
  if (type.startsWith('payment')) return { icon: CreditCard, cls: 'bg-success/12 text-success' };
  if (type.includes('declined') || type.includes('cancel') || type.includes('reject')) return { icon: XCircle, cls: 'bg-danger/10 text-danger' };
  if (type.startsWith('delivery')) return { icon: Bike, cls: 'bg-[#e4f0fd] text-[#1d5fa8]' };
  if (type.startsWith('order')) return { icon: ShoppingBag, cls: 'bg-primary-soft text-primary-strong' };
  return { icon: Bell, cls: 'bg-[#efe8fd] text-[#6d3fd6]' };
}

/** Admin · Notifications — new orders, declined deliveries, payments …; updates live. */
export function AdminNotificationsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [show, setShow] = useState<'all' | 'unread'>('all');
  const q = useQuery(notificationsQuery);
  const refresh = () => void qc.invalidateQueries({ queryKey: ['notifications'] });
  const readAll = useMutation({ mutationFn: () => api.post('/notifications/read-all'), onSuccess: refresh });
  const read = useMutation({ mutationFn: (id: string) => api.post(`/notifications/${id}/read`), onSuccess: refresh });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/notifications/${id}`), onSuccess: refresh });

  const items = q.data?.items ?? [];
  const unread = q.data?.unread ?? 0;
  const rows = show === 'unread' ? items.filter((n) => !n.readAt) : items;
  const today = items.filter((n) => Date.now() - Date.parse(n.createdAt) < 24 * 3600_000).length;

  const open = (n: NotificationDto) => {
    if (!n.readAt) read.mutate(n.id);
    if (n.orderId) navigate(`/admin/orders/${n.orderId}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        crumbs={[{ label: 'Kitchen' }, { label: 'Notifications' }]}
        title="Notifications"
        description="New orders, declined deliveries and payments. They arrive here the moment they happen."
        actions={
          <Button variant="secondary" disabled={!unread || readAll.isPending} onClick={() => readAll.mutate()}>
            <CheckCheck className="size-4" aria-hidden /> Mark all read
          </Button>
        }
      />

      <StatGrid>
        <StatCard label="Unread" value={String(unread)} tone="orange" icon={<BellRing />} hint={unread ? 'Need a look' : 'All caught up'} />
        <StatCard label="Last 24 hours" value={String(today)} tone="blue" icon={<Bell />} hint="Received" />
        <StatCard label="Orders" value={String(items.filter((n) => n.type.startsWith('order')).length)} tone="pink" icon={<ShoppingBag />} hint="Order updates" />
        <StatCard label="Deliveries" value={String(items.filter((n) => n.type.startsWith('delivery')).length)} tone="violet" icon={<Bike />} hint="Rider updates" />
      </StatGrid>

      <SectionCard>
        <div className="px-1 pb-3">
          <FilterTabs
            label="Show"
            value={show}
            options={[
              { value: 'all', label: 'All', count: items.length },
              { value: 'unread', label: 'Unread', count: unread },
            ]}
            onChange={setShow}
          />
        </div>
        {q.isError ? (
          <ErrorState onRetry={() => q.refetch()} />
        ) : q.isPending ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Bell className="size-9" />}
            title={show === 'unread' ? 'Nothing unread' : 'No notifications yet'}
            body="New orders and delivery updates show up here by themselves."
          />
        ) : (
          <ul className="flex flex-col gap-1.5">
            {rows.map((n) => {
              const { icon: Icon, cls } = look(n.type);
              return (
                <li key={n.id} className={cx('group flex items-start gap-3 rounded-2xl px-3 py-3 transition-colors', n.readAt ? 'hover:bg-[#faf6f1]' : 'bg-primary-soft/50 hover:bg-primary-soft')}>
                  <span className={cx('grid size-10 shrink-0 place-items-center rounded-xl', cls)} aria-hidden>
                    <Icon className="size-[18px]" />
                  </span>
                  <button type="button" onClick={() => open(n)} className="min-w-0 flex-1 text-left">
                    <span className="flex items-center gap-2">
                      <span className={cx('truncate text-sm', n.readAt ? 'font-medium' : 'font-bold')}>{n.title}</span>
                      {!n.readAt && <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="unread" />}
                    </span>
                    <span className="block text-[13px] text-muted">{n.message}</span>
                  </button>
                  <span className="hidden shrink-0 pt-0.5 text-xs text-muted sm:block">{timeAgo(n.createdAt)}</span>
                  <button
                    type="button"
                    onClick={() => remove.mutate(n.id)}
                    aria-label={`Delete notification: ${n.title}`}
                    className="grid size-9 shrink-0 place-items-center rounded-lg text-muted opacity-60 hover:bg-danger/10 hover:text-danger hover:opacity-100 focus-visible:opacity-100"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

/** Bell with unread badge + dropdown of the latest notifications (top right of the Dashboard). */
export function NotificationBell() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [openPanel, setOpenPanel] = useState(false);
  const q = useQuery(notificationsQuery);
  const refresh = () => void qc.invalidateQueries({ queryKey: ['notifications'] });
  const readAll = useMutation({ mutationFn: () => api.post('/notifications/read-all'), onSuccess: refresh });
  const read = useMutation({ mutationFn: (id: string) => api.post(`/notifications/${id}/read`), onSuccess: refresh });
  const unread = q.data?.unread ?? 0;
  const latest = (q.data?.items ?? []).slice(0, 6);

  useEffect(() => {
    if (!openPanel) return;
    const close = (e: KeyboardEvent | MouseEvent) =>
      e instanceof KeyboardEvent ? e.key === 'Escape' && setOpenPanel(false) : !(e.target as HTMLElement).closest('[data-bell]') && setOpenPanel(false);
    window.addEventListener('keydown', close);
    window.addEventListener('mousedown', close);
    return () => {
      window.removeEventListener('keydown', close);
      window.removeEventListener('mousedown', close);
    };
  }, [openPanel]);

  return (
    <div className="relative" data-bell>
      <button
        type="button"
        onClick={() => setOpenPanel((v) => !v)}
        aria-expanded={openPanel}
        aria-haspopup="dialog"
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative grid size-11 place-items-center rounded-xl bg-surface shadow-sm ring-1 ring-line hover:bg-primary-soft"
      >
        <Bell className="size-5" aria-hidden />
        {unread > 0 && (
          <span className="tabular absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-ink ring-2 ring-surface">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {openPanel && (
        <div role="dialog" aria-label="Notifications" className="absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl bg-surface shadow-xl ring-1 ring-line">
          <div className="flex items-center justify-between gap-3 border-b border-line/70 px-4 py-3">
            <p className="font-bold">Notifications</p>
            <button
              type="button"
              disabled={!unread || readAll.isPending}
              onClick={() => readAll.mutate()}
              className="text-xs font-semibold text-primary-strong hover:underline disabled:text-muted disabled:no-underline"
            >
              Mark all read
            </button>
          </div>
          {latest.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">You’re all caught up.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {latest.map((n) => {
                const { icon: Icon, cls } = look(n.type);
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!n.readAt) read.mutate(n.id);
                        setOpenPanel(false);
                        if (n.orderId) navigate(`/admin/orders/${n.orderId}`);
                      }}
                      className={cx('flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#faf6f1]', !n.readAt && 'bg-primary-soft/50')}
                    >
                      <span className={cx('grid size-9 shrink-0 place-items-center rounded-xl', cls)} aria-hidden>
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cx('block truncate text-sm', n.readAt ? 'font-medium' : 'font-bold')}>{n.title}</span>
                        <span className="block truncate text-xs text-muted">{n.message}</span>
                      </span>
                      <span className="shrink-0 text-[11px] text-muted">{timeAgo(n.createdAt)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <button
            type="button"
            onClick={() => {
              setOpenPanel(false);
              navigate('/admin/notifications');
            }}
            className="block w-full border-t border-line/70 px-4 py-3 text-center text-sm font-semibold text-primary-strong hover:bg-primary-soft"
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  ClipboardList,
  FolderTree,
  UtensilsCrossed,
  Bike,
  Users,
  Wallet,
  BarChart3,
  Settings,
  LogOut,
  History,
  UserRound,
  ChevronDown,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  GalleryHorizontal,
  LayoutList,
  Bell,
  Search,
  CalendarDays,
  ChefHat,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Logo, cx } from '@/components/ui';
import { useAuth } from '@/auth/AuthContext';
import { adminApi, adminKeys } from '@/features/admin/admin-api';

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean };
const ADMIN_NAV: { id: string; label: string; items: NavItem[] }[] = [
  {
    id: 'ops',
    label: 'Kitchen',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/kitchen', label: 'Live kitchen', icon: ChefHat },
      { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
    ],
  },
  {
    id: 'menu',
    label: 'Menu',
    items: [
      { to: '/admin/menu', label: 'Menu items', icon: UtensilsCrossed },
      { to: '/admin/categories', label: 'Categories', icon: FolderTree },
      { to: '/admin/offer-sections', label: 'Offers & specials', icon: LayoutList },
      { to: '/admin/banners', label: 'Home banners', icon: GalleryHorizontal },
    ],
  },
  {
    id: 'people',
    label: 'People',
    items: [
      { to: '/admin/delivery-partners', label: 'Delivery partners', icon: Bike },
      { to: '/admin/customers', label: 'Customers', icon: Users },
    ],
  },
  {
    id: 'business',
    label: 'Business',
    items: [
      { to: '/admin/payments', label: 'Payments & refunds', icon: Wallet },
      { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
      { to: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
];

// Sidebar preferences are per-browser conveniences; failing storage just means they aren't remembered.
const store = {
  get<T>(k: string, fallback: T): T {
    try {
      const v = localStorage.getItem(k);
      return v === null ? fallback : (JSON.parse(v) as T);
    } catch {
      return fallback;
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* ignore */
    }
  },
};

/**
 * Admin shell (VSR-style layout, customer-onboarding palette): peach wash page, white sidebar
 * card with grouped nav (ink pill = current page, orange counts), top bar with order search,
 * today's date, live status, new-order bell and the admin menu (kitchen open/pause lives in Settings).
 * Below lg the sidebar becomes a slide-in drawer.
 */
export function AdminLayout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(() => store.get('admin.sidebar.collapsed', false));
  const [drawer, setDrawer] = useState(false);
  // Shares the overview's cache key, so this costs nothing extra there.
  const summary = useQuery({ queryKey: adminKeys.summary, queryFn: adminApi.summary, refetchInterval: 30_000 });
  // Open orders (any day) drive the Orders sub-menu counts, same as the Orders page cards.
  const openOrders = useQuery({ queryKey: adminKeys.orders({ status: 'ACTIVE' }), queryFn: () => adminApi.orders({ status: 'ACTIVE' }), refetchInterval: 30_000 });
  const openByStatus: Partial<Record<string, number>> = {};
  for (const o of openOrders.data?.items ?? []) openByStatus[o.status] = (openByStatus[o.status] ?? 0) + 1;
  const waiting = openByStatus.PLACED ?? 0; // every order still waiting to be accepted
  const live = summary.data?.liveOrders ?? 0;

  useEffect(() => setDrawer(false), [pathname]);
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawer]);

  const toggleCollapsed = () => {
    store.set('admin.sidebar.collapsed', !collapsed);
    setCollapsed(!collapsed);
  };

  return (
    <div className="admin-wash flex min-h-dvh gap-4 lg:p-4">
      <aside
        className={cx(
          'sticky top-4 z-40 hidden h-[calc(100dvh-2rem)] shrink-0 flex-col rounded-[24px] bg-surface shadow-[0_1px_2px_rgb(30_29_27/0.04),0_12px_32px_-18px_rgb(122_59_16/0.28)] ring-1 ring-line/70 transition-[width] duration-200 ease-out lg:flex',
          collapsed ? 'w-[84px]' : 'w-[260px]',
        )}
      >
        <div className={cx('flex h-20 shrink-0 items-center', collapsed ? 'justify-center' : 'justify-between pl-5 pr-3')}>
          {collapsed ? <img src="/logo.png" alt="A3 Kitchen" width={40} height={40} className="rounded-full" /> : <Logo size={36} />}
          {!collapsed && (
            <button onClick={toggleCollapsed} className="grid size-9 place-items-center rounded-xl text-muted hover:bg-primary-soft hover:text-ink" aria-label="Collapse sidebar" title="Collapse sidebar">
              <PanelLeftClose className="size-[18px]" />
            </button>
          )}
        </div>
        {collapsed && (
          <button onClick={toggleCollapsed} className="mx-auto grid size-10 shrink-0 place-items-center rounded-xl text-muted hover:bg-primary-soft hover:text-ink" aria-label="Expand sidebar" title="Expand sidebar">
            <PanelLeftOpen className="size-[18px]" />
          </button>
        )}
        <AdminNav collapsed={collapsed} waiting={waiting} live={live} pathname={pathname} />
        <SidebarLogout collapsed={collapsed} name={user?.name} onLogout={() => void logout()} />
      </aside>

      <div className={cx('fixed inset-0 z-40 lg:hidden', drawer ? 'visible' : 'invisible')}>
        <div className={cx('absolute inset-0 bg-ink/40 transition-opacity duration-200', drawer ? 'opacity-100' : 'opacity-0')} onClick={() => setDrawer(false)} aria-hidden />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Admin menu"
          inert={!drawer}
          className={cx('absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-surface shadow-xl transition-transform duration-200 ease-out', drawer ? 'translate-x-0' : '-translate-x-full')}
        >
          <div className="flex h-16 shrink-0 items-center justify-between pl-5 pr-2">
            <Logo size={30} />
            <button onClick={() => setDrawer(false)} className="grid size-11 place-items-center rounded-xl hover:bg-primary-soft" aria-label="Close menu">
              <X className="size-5" />
            </button>
          </div>
          <AdminNav collapsed={false} waiting={waiting} live={live} pathname={pathname} />
          <SidebarLogout collapsed={false} name={user?.name} onLogout={() => void logout()} />
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileBar onMenu={() => setDrawer(true)} drawer={drawer} />
        <main id="main" className="flex-1 px-4 pb-8 pt-2 md:px-6 lg:px-2 lg:pt-4">
          <div className="mx-auto w-full max-w-[1440px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

/** Phones only: opens the sidebar drawer (desktop has no top bar). */
function MobileBar({ onMenu, drawer }: { onMenu: () => void; drawer: boolean }) {
  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center gap-2 bg-[rgb(255_244_234/0.9)] px-3 backdrop-blur-md lg:hidden">
      <button onClick={onMenu} className="grid size-11 place-items-center rounded-xl hover:bg-surface" aria-label="Open menu" aria-expanded={drawer}>
        <Menu className="size-5" />
      </button>
      <Logo size={28} />
    </header>
  );
}

/** Signed-in admin + Log out, pinned to the foot of the sidebar. */
function SidebarLogout({ collapsed, name, onLogout }: { collapsed: boolean; name?: string; onLogout: () => void }) {
  return (
    <div className={cx('shrink-0 border-t border-line/70 p-3', collapsed && 'flex justify-center')}>
      {!collapsed && name && <p className="truncate px-3 pb-2 text-xs text-muted">Signed in as <span className="font-semibold text-ink">{name}</span></p>}
      <button
        onClick={onLogout}
        aria-label={collapsed ? 'Log out' : undefined}
        className={cx(
          'group/out relative flex min-h-11 items-center gap-3 rounded-full text-sm font-semibold text-danger transition-colors hover:bg-danger/10',
          collapsed ? 'size-11 justify-center' : 'w-full px-3.5',
        )}
      >
        <LogOut className="size-[18px] shrink-0" aria-hidden />
        {collapsed ? <span role="tooltip" className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs font-semibold text-surface opacity-0 shadow-lg transition-opacity duration-150 group-hover/out:opacity-100 group-focus-visible/out:opacity-100">Log out</span> : 'Log out'}
      </button>
    </div>
  );
}

/** Orders sub-menu (VSR-style): one link per status filter, with today's counts. */
const ORDER_SUBNAV: { status: string; label: string; count?: (b: Partial<Record<string, number>>) => number }[] = [
  { status: 'ACTIVE', label: 'All active' },
  { status: 'PLACED', label: 'New', count: (b) => b.PLACED ?? 0 },
  { status: 'PREPARING', label: 'In the kitchen', count: (b) => (b.ACCEPTED ?? 0) + (b.PREPARING ?? 0) },
  { status: 'READY_FOR_PICKUP', label: 'Ready for pickup', count: (b) => b.READY_FOR_PICKUP ?? 0 },
  { status: 'OUT_FOR_DELIVERY', label: 'On the road', count: (b) => (b.ASSIGNED ?? 0) + (b.PICKED_UP ?? 0) + (b.OUT_FOR_DELIVERY ?? 0) },
  { status: 'DELIVERED', label: 'Delivered' },
  { status: 'CANCELLED', label: 'Cancelled' },
];

function OrdersSubNav({ byStatus }: { byStatus: Partial<Record<string, number>> }) {
  const { search } = useLocation();
  const current = new URLSearchParams(search).get('status') ?? 'ACTIVE';
  return (
    <ul className="mb-1 ml-6 mt-1 flex flex-col gap-0.5 border-l border-line pl-3" aria-label="Order filters">
      {ORDER_SUBNAV.map((s) => {
        const on = current === s.status;
        const n = s.count?.(byStatus) ?? 0;
        return (
          <li key={s.status}>
            <Link
              to={`/admin/orders?status=${s.status}`}
              aria-current={on ? 'page' : undefined}
              className={cx(
                'flex min-h-9 items-center justify-between gap-2 rounded-full px-3 text-[13px] transition-colors',
                on ? 'bg-primary-soft font-semibold text-primary-strong' : 'text-muted hover:bg-primary-soft/60 hover:text-ink',
              )}
            >
              {s.label}
              {n > 0 && <span className="tabular rounded-full bg-surface px-1.5 text-[11px] font-semibold text-ink ring-1 ring-line">{n}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function AdminNav({ collapsed, waiting, live, pathname }: { collapsed: boolean; waiting: number; live: number; pathname: string }) {
  // Open orders (any day) drive the Orders sub-menu counts, same as the Orders page cards.
  const openOrders = useQuery({ queryKey: adminKeys.orders({ status: 'ACTIVE' }), queryFn: () => adminApi.orders({ status: 'ACTIVE' }), refetchInterval: 30_000 });
  const openByStatus: Partial<Record<string, number>> = {};
  for (const o of openOrders.data?.items ?? []) openByStatus[o.status] = (openByStatus[o.status] ?? 0) + 1;
  // Today's specials lives under Offer sections now.
  const isActive = (i: NavItem) =>
    i.end ? pathname === i.to : pathname.startsWith(i.to) || (i.to === '/admin/offer-sections' && pathname.startsWith('/admin/specials'));
  const activeGroup = ADMIN_NAV.find((g) => g.items.some(isActive))?.id;
  const [open, setOpen] = useState<Record<string, boolean>>(() => store.get('admin.sidebar.groups', {}));
  const flip = (id: string, now: boolean) => {
    const next = { ...open, [id]: !now };
    store.set('admin.sidebar.groups', next);
    setOpen(next);
  };

  return (
    <nav aria-label="Admin" className={cx('no-scrollbar flex flex-1 flex-col gap-1 px-3 pb-3', collapsed ? 'overflow-visible' : 'overflow-y-auto')}>
      {ADMIN_NAV.map((g) => {
        // The icon rail always shows every item; otherwise groups fold, defaulting to open.
        const expanded = collapsed || (open[g.id] ?? true);
        const panel = `nav-${g.id}`;
        return (
          <div key={g.id} className={cx(collapsed ? 'border-t border-line pt-2 first:border-t-0 first:pt-0' : 'pt-2')}>
            {!collapsed && (
              <button
                onClick={() => flip(g.id, expanded)}
                aria-expanded={expanded}
                aria-controls={panel}
                className="flex min-h-8 w-full items-center justify-between rounded-md px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted hover:text-ink"
              >
                <span className="flex items-center gap-2">
                  {g.label}
                  {!expanded && g.id === activeGroup && <span className="size-1.5 rounded-full bg-primary" aria-label="(current page)" />}
                </span>
                <ChevronDown className={cx('size-4 transition-transform duration-200', !expanded && '-rotate-90')} aria-hidden />
              </button>
            )}
            <div id={panel} className={cx('grid transition-[grid-template-rows] duration-200 ease-out', expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
              <ul className={cx('flex min-h-0 flex-col gap-0.5', collapsed ? 'overflow-visible' : 'overflow-hidden')} inert={!expanded}>
                {g.items.map((i) => {
                  const badge = i.to === '/admin/orders' ? waiting : i.to === '/admin/kitchen' ? live : 0;
                  return (
                    <li key={i.to}>
                      <NavLink
                        to={i.to}
                        end={i.end}
                        aria-label={collapsed ? i.label : undefined}
                        className={({ isActive: navOn }, on = navOn || isActive(i)) =>
                          cx(
                            'group/nav relative flex min-h-11 items-center gap-3 rounded-full text-sm transition-colors',
                            collapsed ? 'justify-center' : 'px-3.5',
                            // Current page: ink pill with an orange icon (the onboarding button style).
                            on ? 'bg-ink font-semibold text-surface shadow-sm' : 'font-medium text-muted hover:bg-primary-soft hover:text-ink',
                          )
                        }
                      >
                        <i.icon className="size-[18px] shrink-0 group-aria-[current=page]/nav:text-primary" aria-hidden />
                        {collapsed ? <span role="tooltip" className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs font-semibold text-surface opacity-0 shadow-lg transition-opacity duration-150 group-hover/nav:opacity-100 group-focus-visible/nav:opacity-100">{i.label}</span> : i.label}
                        {badge > 0 &&
                          (collapsed ? (
                            <span className="absolute right-3 top-2 size-2 rounded-full bg-primary" aria-label={`${badge} waiting`} />
                          ) : (
                            <span className="tabular ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-ink" aria-label={`${badge} waiting`}>
                              {badge}
                            </span>
                          ))}
                      </NavLink>
                      {!collapsed && i.to === '/admin/orders' && pathname.startsWith('/admin/orders') && (
                        <OrdersSubNav byStatus={openByStatus} />
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        );
      })}
    </nav>
  );
}

/** Delivery partner web dashboard — mobile-first, mirrors the Flutter delivery app. */
export function DeliveryLayout() {
  // Same two-tone frame and tabs as the mobile-delivery app.
  return (
    <div className="flex min-h-dvh flex-col bg-frame pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <nav
        aria-label="Delivery"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 bg-frame pb-[env(safe-area-inset-bottom)]"
      >
        {[
          { to: '/delivery', label: 'Assignments', icon: ClipboardList, end: true },
          { to: '/delivery/history', label: 'History', icon: History },
          { to: '/delivery/profile', label: 'Profile', icon: UserRound },
        ].map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className="group flex min-h-[4.5rem] flex-col items-center justify-center gap-1 text-[13px] font-semibold text-ink aria-[current=page]:font-extrabold"
          >
            <span className="rounded-full px-4.5 py-1 group-aria-[current=page]:bg-surface group-aria-[current=page]:text-primary-strong">
              <Icon className="size-[22px]" aria-hidden />
            </span>
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

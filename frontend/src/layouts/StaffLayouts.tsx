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
  LayoutList,
  Bell,
  Search,
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
      { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
    ],
  },
  {
    id: 'menu',
    label: 'Menu',
    items: [
      { to: '/admin/categories', label: 'Food categories', icon: FolderTree },
      { to: '/admin/menu', label: 'Menu items', icon: UtensilsCrossed },
      { to: '/admin/offer-sections', label: 'Offer sections', icon: LayoutList },
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

/** Admin dashboard shell — collapsible sidebar with accordion groups; a slide-in drawer below lg. */
export function AdminLayout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(() => store.get('admin.sidebar.collapsed', false));
  const [drawer, setDrawer] = useState(false);
  // Shares the overview's cache key, so this costs nothing extra there.
  const summary = useQuery({
    queryKey: adminKeys.summary,
    queryFn: adminApi.summary,
    refetchInterval: 15_000,
  });
  const waiting = summary.data?.byStatus.PLACED ?? 0;

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
    // Sociafy-style shell: white page, a floating sidebar card and a soft content panel.
    <div className="flex min-h-dvh gap-4 bg-surface lg:p-4">
      <aside
        className={cx(
          'sticky top-4 hidden h-[calc(100dvh-2rem)] shrink-0 flex-col rounded-[28px] bg-panel transition-[width] duration-200 ease-out lg:flex',
          collapsed ? 'w-[84px]' : 'w-[264px]',
        )}
      >
        <div
          className={cx(
            'flex h-20 shrink-0 items-center',
            collapsed ? 'justify-center' : 'justify-between pl-6 pr-3',
          )}
        >
          {collapsed ? (
            <img src="/logo.png" alt="A3 Kitchen" width={36} height={36} className="rounded-full" />
          ) : (
            <Logo size={34} />
          )}
          {!collapsed && (
            <button
              onClick={toggleCollapsed}
              className="grid size-9 place-items-center rounded-xl text-muted hover:bg-surface hover:text-ink"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="size-[18px]" />
            </button>
          )}
        </div>
        {!collapsed && <div className="mx-6 border-t border-line" />}
        {collapsed && (
          <button
            onClick={toggleCollapsed}
            className="mx-auto grid size-10 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface hover:text-ink"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <PanelLeftOpen className="size-[18px]" />
          </button>
        )}
        <AdminNav collapsed={collapsed} waiting={waiting} pathname={pathname} />
      </aside>

      <div className={cx('fixed inset-0 z-40 lg:hidden', drawer ? 'visible' : 'invisible')}>
        <div
          className={cx(
            'absolute inset-0 bg-ink/40 transition-opacity duration-200',
            drawer ? 'opacity-100' : 'opacity-0',
          )}
          onClick={() => setDrawer(false)}
          aria-hidden
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Admin menu"
          inert={!drawer}
          className={cx(
            'absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-panel shadow-xl transition-transform duration-200 ease-out',
            drawer ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex h-16 shrink-0 items-center justify-between pl-5 pr-2">
            <Logo size={30} />
            <button
              onClick={() => setDrawer(false)}
              className="grid size-10 place-items-center rounded-xl hover:bg-surface"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
          </div>
          <AdminNav collapsed={false} waiting={waiting} pathname={pathname} />
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <TopBar
          waiting={waiting}
          name={user?.name}
          onMenu={() => setDrawer(true)}
          drawer={drawer}
          onLogout={() => void logout()}
        />
        <main id="main" className="flex-1 bg-panel px-4 py-6 md:px-8 md:py-8 lg:rounded-[28px]">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

/** Search (jumps to the order), live new-order alerts and the signed-in admin. */
function TopBar({
  waiting,
  name,
  onMenu,
  drawer,
  onLogout,
}: {
  waiting: number;
  name?: string;
  onMenu: () => void;
  drawer: boolean;
  onLogout: () => void;
}) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [menu, setMenu] = useState(false);
  const initials = (name ?? 'A')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  useEffect(() => {
    if (!menu) return;
    const close = (e: KeyboardEvent | MouseEvent) =>
      e instanceof KeyboardEvent ? e.key === 'Escape' && setMenu(false) : setMenu(false);
    window.addEventListener('keydown', close);
    window.addEventListener('click', close);
    return () => {
      window.removeEventListener('keydown', close);
      window.removeEventListener('click', close);
    };
  }, [menu]);

  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center gap-2 bg-surface/95 px-2 backdrop-blur-sm lg:static lg:rounded-[28px] lg:bg-panel lg:px-4">
      <button
        onClick={onMenu}
        className="grid size-11 place-items-center rounded-xl hover:bg-panel lg:hidden"
        aria-label="Open menu"
        aria-expanded={drawer}
      >
        <Menu className="size-5" />
      </button>
      <span className="lg:hidden">
        <Logo size={28} />
      </span>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) navigate(`/admin/orders?status=ALL&q=${encodeURIComponent(q.trim())}`);
        }}
        className="hidden h-12 min-w-0 max-w-md flex-1 items-center gap-2.5 rounded-full bg-surface px-4 ring-1 ring-line focus-within:ring-2 focus-within:ring-primary md:flex"
      >
        <Search className="size-[18px] shrink-0 text-muted" aria-hidden />
        <label htmlFor="admin-search" className="sr-only">
          Search orders
        </label>
        <input
          id="admin-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search order number…"
          className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
        />
        <kbd className="hidden rounded-md bg-panel px-1.5 py-0.5 text-[11px] font-semibold text-muted xl:inline">
          Enter
        </kbd>
      </form>
      <div className="ml-auto flex items-center gap-2">
        <Link
          to="/admin/orders?status=PLACED"
          aria-label={waiting ? `${waiting} new orders` : 'New orders'}
          className="relative grid size-11 place-items-center rounded-full bg-surface ring-1 ring-line hover:ring-primary"
        >
          <Bell className="size-[18px]" aria-hidden />
          {waiting > 0 && (
            <span className="tabular absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-primary-strong px-1 text-[11px] font-bold text-surface">
              {waiting}
            </span>
          )}
        </Link>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenu((v) => !v);
            }}
            aria-expanded={menu}
            aria-haspopup="menu"
            className="flex min-h-11 items-center gap-2.5 rounded-full py-1 pl-1 pr-3 hover:bg-surface"
          >
            <span
              className="grid size-10 place-items-center rounded-full bg-primary-strong text-sm font-bold text-surface"
              aria-hidden
            >
              {initials}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-semibold leading-tight">{name}</span>
              <span className="block text-xs text-muted">Kitchen admin</span>
            </span>
            <ChevronDown className="size-4 text-muted" aria-hidden />
          </button>
          {menu && (
            <div
              role="menu"
              className="absolute right-0 top-full z-40 mt-2 w-48 rounded-2xl bg-surface p-1.5 shadow-lg ring-1 ring-line"
            >
              <button
                role="menuitem"
                onClick={onLogout}
                className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-danger hover:bg-danger/10"
              >
                <LogOut className="size-[18px]" aria-hidden /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function AdminNav({
  collapsed,
  waiting,
  pathname,
}: {
  collapsed: boolean;
  waiting: number;
  pathname: string;
}) {
  // Today's specials lives under Offer sections now.
  const isActive = (i: NavItem) =>
    i.end
      ? pathname === i.to
      : pathname.startsWith(i.to) ||
        (i.to === '/admin/offer-sections' && pathname.startsWith('/admin/specials'));
  const activeGroup = ADMIN_NAV.find((g) => g.items.some(isActive))?.id;
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    store.get('admin.sidebar.groups', {}),
  );
  const flip = (id: string, now: boolean) => {
    const next = { ...open, [id]: !now };
    store.set('admin.sidebar.groups', next);
    setOpen(next);
  };

  return (
    <nav
      aria-label="Admin"
      className="no-scrollbar flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-3"
    >
      {ADMIN_NAV.map((g) => {
        // The icon rail always shows every item; otherwise groups fold, defaulting to open.
        const expanded = collapsed || (open[g.id] ?? true);
        const panel = `nav-${g.id}`;
        return (
          <div
            key={g.id}
            className={cx(collapsed && 'border-t border-line pt-2 first:border-t-0 first:pt-0')}
          >
            {!collapsed && (
              <button
                onClick={() => flip(g.id, expanded)}
                aria-expanded={expanded}
                aria-controls={panel}
                className="flex min-h-9 w-full items-center justify-between rounded-md px-3 text-xs font-semibold text-muted hover:bg-panel hover:text-ink"
              >
                <span className="flex items-center gap-2">
                  {g.label}
                  {!expanded && g.id === activeGroup && (
                    <span
                      className="size-1.5 rounded-full bg-primary-strong"
                      aria-label="(current page)"
                    />
                  )}
                </span>
                <ChevronDown
                  className={cx(
                    'size-4 transition-transform duration-200',
                    !expanded && '-rotate-90',
                  )}
                  aria-hidden
                />
              </button>
            )}
            <div
              id={panel}
              className={cx(
                'grid transition-[grid-template-rows] duration-200 ease-out',
                expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
              )}
            >
              <ul className="flex min-h-0 flex-col gap-0.5 overflow-hidden" inert={!expanded}>
                {g.items.map((i) => {
                  const badge = i.to === '/admin/orders' ? waiting : 0;
                  return (
                    <li key={i.to}>
                      <NavLink
                        to={i.to}
                        end={i.end}
                        title={collapsed ? i.label : undefined}
                        className={({ isActive: navOn }, on = navOn || isActive(i)) =>
                          cx(
                            'group/nav relative flex min-h-11 items-center gap-3 rounded-xl text-sm transition-colors',
                            collapsed ? 'justify-center' : 'px-3',
                            // Active: white pill, warm glow on the right edge, accent bar on the left (Sociafy-style).
                            on
                              ? 'bg-surface font-semibold text-ink shadow-sm before:absolute before:-left-3 before:inset-y-2 before:w-1 before:rounded-r-full before:bg-primary after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-2/5 after:rounded-r-xl after:bg-gradient-to-r after:from-transparent after:to-primary/20'
                              : 'font-medium text-muted hover:bg-surface/70 hover:text-ink',
                          )
                        }
                      >
                        <i.icon
                          className="size-[18px] shrink-0 group-aria-[current=page]/nav:text-primary-strong"
                          aria-hidden
                        />
                        {collapsed ? <span className="sr-only">{i.label}</span> : i.label}
                        {badge > 0 &&
                          (collapsed ? (
                            <span
                              className="absolute right-3 top-2 size-2 rounded-full bg-primary-strong"
                              aria-label={`${badge} waiting`}
                            />
                          ) : (
                            <span
                              className="tabular ml-auto rounded-full bg-primary-strong px-2 py-0.5 text-xs font-semibold text-surface"
                              aria-label={`${badge} waiting`}
                            >
                              {badge}
                            </span>
                          ))}
                      </NavLink>
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

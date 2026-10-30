import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { Bell, Home, LayoutGrid, ShoppingBag, ShoppingCart, User, ClipboardList, Heart } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { notificationsQuery } from '@/lib/orders-api';
import { LocationNotice } from '@/features/account/LocationNotice';
import { Logo, ButtonLink, cx } from '@/components/ui';
import { useAuth } from '@/auth/AuthContext';
import { useCart } from '@/features/cart/CartContext';
import { useFavorites } from '@/lib/favorites';

const NAV = [
  { to: '/menu', label: 'Menu' },
  { to: '/categories', label: 'Categories' },
  { to: '/orders', label: 'Orders' },
];

export function CustomerLayout() {
  const { user } = useAuth();
  const { count } = useCart();
  const { ids: favIds } = useFavorites();
  // Home has its own address bar on phones (mockup screen 7), so the orange header is desktop-only there.
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  // Dish details is a full-bleed photo page on phones: no header, no bottom bar (like the app).
  const isDish = pathname.startsWith('/product/');
  // Dish, cart, checkout and Order placed have no bottom tab bar.
  const noTabs = isDish || pathname === '/cart' || pathname === '/checkout' || pathname.endsWith('/confirmed');

  return (
    <div className={cx('flex min-h-dvh flex-col bg-surface md:bg-transparent md:pb-0', noTabs ? 'pb-[env(safe-area-inset-bottom)]' : 'pb-[calc(5.5rem+env(safe-area-inset-bottom))]')}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2">
        Skip to content
      </a>
      {/* Desktop-only header (on mobile, each page has its own clean PageFrame and bottom bar) */}
      <header className="sticky top-0 z-30 hidden bg-frame md:block">
        <div className="flex w-full px-4 md:px-8 xl:px-12 items-center gap-6 py-3 md:gap-10">
          <Link to="/" aria-label="A3 Kitchen home">
            <Logo />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-2 lg:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) => cx('rounded-full px-3 py-1.5 text-[15px] font-semibold text-ink hover:bg-surface/25', isActive && 'bg-surface')}
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-5">
            <Link to="/favorites" className="hidden items-center gap-1.5 text-[15px] font-semibold text-ink hover:underline md:flex" title="Wishlist">
              <Heart className={cx('size-[20px]', favIds.length > 0 ? 'fill-rose-600 text-rose-600' : 'text-ink')} aria-hidden />
              <span>Wishlist{favIds.length > 0 && <span className="tabular"> ({favIds.length})</span>}</span>
            </Link>
            <Link to="/cart" className="hidden items-center gap-2 text-[15px] font-semibold text-ink hover:underline md:flex">
              <ShoppingBag className="size-[22px]" aria-hidden />
              Cart{count > 0 && <span className="tabular">({count})</span>}
            </Link>
            {user ? (
              <>
                <NotificationLink />
                {/* Profile (phones reach it from the bottom bar). */}
                <NavLink
                  to="/account"
                  title="Profile"
                  className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-[15px] font-semibold text-ink hover:bg-surface/25 aria-[current=page]:bg-surface"
                >
                  <span className="grid size-9 place-items-center rounded-full bg-surface font-bold text-primary-strong" aria-hidden>
                    {user.name?.trim().charAt(0).toUpperCase() || <User className="size-5" />}
                  </span>
                  Profile
                </NavLink>
              </>
            ) : (
              <ButtonLink to="/login" variant="secondary" size="sm">
                Log in
              </ButtonLink>
            )}
          </div>
        </div>
      </header>

      <main id="main" className={cx('flex flex-1 flex-col', isHome || isDish ? 'bg-surface' : 'bg-frame')}>
        {user && <LocationNotice userId={user.id} />}
        <Outlet />
      </main>

      {isHome && (
        <div className="hidden md:block">
          <SiteFooter />
        </div>
      )}

      {/* Mobile bottom bar (matches the app): floating white pill with 4 tabs + round cart button, above the safe area. */}
      <div className={cx('pointer-events-none fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 bg-surface px-3.5 pt-2 pb-[max(0.625rem,env(safe-area-inset-bottom))] md:hidden', noTabs && 'hidden')}>
        <nav aria-label="Primary" className="pointer-events-auto grid h-[66px] flex-1 grid-cols-4 rounded-[26px] bg-surface shadow-[0_8px_24px_rgb(30_29_27/0.16)]">
          {[
            { to: '/', label: 'Home', icon: Home, end: true },
            { to: '/categories', label: 'Categories', icon: LayoutGrid },
            { to: '/orders', label: 'Orders', icon: ClipboardList },
            { to: '/account', label: 'Profile', icon: User },
          ].map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="group flex flex-col items-center justify-center gap-0.5 text-[12px] font-medium text-muted aria-[current=page]:font-bold aria-[current=page]:text-primary-strong">
              <Icon className="size-6 group-aria-[current=page]:text-primary" aria-hidden />
              <span className="max-w-full truncate px-1">{label}</span>
              <span className="h-[3px] w-0 rounded-full bg-primary transition-[width] duration-200 ease-out group-aria-[current=page]:w-5" aria-hidden />
            </NavLink>
          ))}
        </nav>
        <NavLink
          to="/cart"
          aria-label={count ? `Cart, ${count} items` : 'Cart'}
          className="pointer-events-auto relative grid size-[68px] shrink-0 place-items-center rounded-full bg-primary text-surface shadow-[0_8px_18px_rgb(180_83_10/0.3)] ring-4 ring-surface transition-transform active:scale-95 aria-[current=page]:bg-primary-strong"
        >
          <ShoppingCart className="size-7" aria-hidden />
          {count > 0 && (
            <span className="tabular absolute -right-0.5 -top-1 grid h-6 min-w-6 place-items-center rounded-full bg-primary px-1.5 text-xs font-extrabold text-surface ring-2 ring-surface">{count}</span>
          )}
        </NavLink>
      </div>
    </div>
  );
}

/** Bell with unread count. Desktop header + phone Home (the bottom nav has no notifications tab). */
export function NotificationLink({ className }: { className?: string }) {
  const { data } = useQuery(notificationsQuery);
  const unread = data?.unread ?? 0;
  return (
    <Link to="/notifications" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} className={cx("relative grid size-11 shrink-0 place-items-center rounded-full text-ink hover:bg-surface/25", className)}>
      <Bell className="size-[22px]" aria-hidden />
      {unread > 0 && <span className="tabular absolute right-1 top-1 grid min-w-5 place-items-center rounded-full bg-ink px-1 text-[11px] font-bold text-surface">{unread}</span>}
    </Link>
  );
}

export function SiteFooter() {
  // Items without a route yet stay as plain placeholders.
  const cols: [string, [string, string?][]][] = [
    ['Order', [['Menu', '/menu'], ['Track order', '/orders'], ['Offers', '/offers']]],
    ['Help', [['Contact us'], ['Delivery areas'], ['Refund policy', '/terms#s5']]],
    ['Legal', [['Terms & Conditions', '/terms'], ['Privacy Policy', '/privacy'], ['Photo credits', '/credits']]],
  ];
  return (
    <footer className="bg-ink text-background">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-4 py-12 md:flex-row md:gap-16 md:px-10 xl:px-[120px]">
        <div className="flex flex-1 flex-col gap-3">
          <Logo tone="light" />
          <p className="text-sm text-background/75">Freshly Prepared. Delivered with Care.</p>
          <Link to="/credits" className="mt-auto text-xs text-background/60 hover:text-background">
            Food photos: Wikimedia Commons contributors (CC BY / CC BY-SA). Credits
          </Link>
        </div>
        {cols.map(([h, items]) => (
          <div key={h} className="flex w-40 flex-col gap-2.5">
            <h2 className="text-sm font-semibold">{h}</h2>
            {items.map(([label, to]) =>
              to ? (
                <Link key={label} to={to} className="text-sm text-background/75 hover:text-background">
                  {label}
                </Link>
              ) : (
                <span key={label} className="text-sm text-background/50">
                  {label}
                </span>
              ),
            )}
          </div>
        ))}
      </div>
    </footer>
  );
}

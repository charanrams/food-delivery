import { Navigate, Outlet, useLocation } from 'react-router';
import type { UserRole } from '@a3/contracts';
import { HOME_FOR_ROLE, useAuth } from './AuthContext';

function SessionCheck() {
  return (
    <div className="grid min-h-[60dvh] place-items-center" role="status">
      <span className="text-muted">Checking your session…</span>
    </div>
  );
}

/**
 * Route guard for role-based areas. This only shapes the UI — the backend enforces
 * every permission again (docs/SECURITY.md §2: hiding a button is not authorization).
 */
export function RequireRole({ roles }: { roles: UserRole[] }) {
  const { user, status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <SessionCheck />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!roles.includes(user.role)) return <Navigate to={HOME_FOR_ROLE[user.role]} replace />;
  return <Outlet />;
}

/** Staff should not browse the customer storefront by accident. */
export function CustomerOnlyArea() {
  const { user } = useAuth();
  if (user && user.role !== 'CUSTOMER') return <Navigate to={HOME_FOR_ROLE[user.role]} replace />;
  return <Outlet />;
}

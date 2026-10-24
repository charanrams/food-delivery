import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Edit3,
  FileText,
  Headphones,
  Heart,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Shield,
  Trash2,
  User as UserIcon,
  X,
} from 'lucide-react';
import type { NotificationDto, UserDto } from '@a3/contracts';
import { Button, ButtonLink, EmptyState, ErrorState, Skeleton, cx } from '@/components/ui';
import { FrameIconButton, PageFrame } from '@/components/frame';
import { useAuth } from '@/auth/AuthContext';
import { useFavorites } from '@/lib/favorites';
import { api } from '@/lib/api';
import { addressesQuery, notificationsQuery, ordersQuery } from '@/lib/orders-api';

function StatCard({
  label,
  count,
  icon,
  to,
}: {
  label: string;
  count: number | string;
  icon: ReactNode;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-1 rounded-2xl border border-line/60 bg-surface p-4 text-center shadow-sm transition-all hover:border-primary/40 hover:shadow-md active:scale-95"
    >
      <span className="text-primary">{icon}</span>
      <span className="font-display text-2xl font-extrabold text-ink">{count}</span>
      <span className="text-xs font-semibold text-muted">{label}</span>
    </Link>
  );
}

function MenuRow({
  to,
  icon,
  iconBg = 'bg-primary-soft text-primary-strong',
  label,
  subtitle,
  badge,
  onClick,
  danger,
}: {
  to?: string;
  icon: ReactNode;
  iconBg?: string;
  label: string;
  subtitle?: string;
  badge?: ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  const cls = cx(
    'group flex min-h-[64px] w-full items-center gap-4 px-5 py-3 text-left transition-colors',
    danger ? 'text-danger hover:bg-danger/5' : 'hover:bg-primary-soft/30',
  );
  const inner = (
    <>
      <span
        className={cx(
          'grid size-10 shrink-0 place-items-center rounded-xl transition-transform group-hover:scale-105',
          danger ? 'bg-danger/10 text-danger' : iconBg,
        )}
      >
        {icon}
      </span>
      <div className="flex flex-1 flex-col">
        <span className={cx('text-[15px] font-bold', danger ? 'text-danger' : 'text-ink')}>
          {label}
        </span>
        {subtitle && <span className="text-xs text-muted">{subtitle}</span>}
      </div>
      {badge}
      {!danger && (
        <ChevronRight className="size-5 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
      )}
    </>
  );
  return to ? (
    <Link to={to} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

/** W12 · Profile: user card, contact details, quick stats, grouped action cards, clean logout. */
export function AccountPage() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const orders = useQuery(ordersQuery);
  const addresses = useQuery(addressesQuery);
  const notes = useQuery(notificationsQuery);
  const { ids: favIds } = useFavorites();

  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [termsOpen, setTermsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await api.delete('/users/me');
      await logout();
      navigate('/');
    } catch {
      alert('Failed to delete account. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  if (!user)
    return (
      <PageFrame art title="Profile" subtitle="Your account, orders and saved places" back={false}>
        <EmptyState
          icon={<LogOut className="size-9" />}
          title="You’re not logged in"
          body="Log in to place orders, track food delivery and see your history."
          action={<ButtonLink to="/login">Log in</ButtonLink>}
        />
      </PageFrame>
    );

  const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';
  const ordersCount = orders.data?.length ?? 0;
  const favsCount = favIds.length;
  const addrsCount = addresses.data?.length ?? 0;
  const unreadNotes = notes.data?.unread ?? 0;

  const openEditor = () => {
    setName(user.name ?? '');
    setPhone(user.phone ?? '');
    setEmail(user.email ?? '');
    setError(null);
    setEditOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }

    setSaving(true);
    try {
      const res = await api.patch<UserDto>('/users/me', {
        name: cleanName,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
      updateUser(res);
      setEditOpen(false);
      setToast('Profile & contact details updated!');
      setTimeout(() => setToast(null), 3000);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string'
          ? (err as { message: string }).message
          : 'Failed to update profile. Please try again.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageFrame art title="Profile" subtitle="Your account, orders and saved places" back={false}>
      <div className="mx-auto flex max-w-xl flex-col gap-6 pb-12">
        {/* User card — identity row on top, contact details full-width below so long emails never clip */}
        <div className="flex flex-col gap-4 rounded-3xl border border-line/70 bg-surface p-5 shadow-sm md:p-6">
          <div className="flex items-center gap-4">
            <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary font-display text-2xl font-extrabold text-surface shadow-md md:size-16 md:text-3xl">
              {initial}
            </div>
            <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
              <h2 className="w-full truncate font-display text-xl font-bold md:text-2xl">{user.name}</h2>
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-primary-strong">
                Member
              </span>
            </div>
            <button
              type="button"
              onClick={openEditor}
              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-primary-soft px-4 text-sm font-bold text-primary-strong transition-colors hover:bg-primary/20 focus-visible:outline-2 focus-visible:outline-primary active:scale-95"
            >
              <Edit3 className="size-4" aria-hidden />
              <span>Edit</span>
            </button>
          </div>
          <dl className="flex flex-col gap-2.5 border-t border-line/60 pt-4 text-sm">
            <div className="flex items-start gap-3">
              <dt className="mt-0.5 shrink-0 text-muted">
                <Mail className="size-4" aria-hidden />
                <span className="sr-only">Email</span>
              </dt>
              <dd className="min-w-0 break-all font-semibold text-ink">
                {user.email || <span className="font-normal italic text-muted">Add email address</span>}
              </dd>
            </div>
            <div className="flex items-start gap-3">
              <dt className="mt-0.5 shrink-0 text-muted">
                <Phone className="size-4" aria-hidden />
                <span className="sr-only">Phone</span>
              </dt>
              <dd className="tabular font-semibold text-ink">
                {user.phone || <span className="font-normal italic text-muted">Add phone number</span>}
              </dd>
            </div>
          </dl>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            to="/orders"
            label="Orders"
            count={ordersCount}
            icon={<ClipboardList className="size-5" />}
          />
          <StatCard
            to="/favorites"
            label="Saved"
            count={favsCount}
            icon={<Heart className="size-5" />}
          />
          <StatCard
            to="/addresses"
            label="Addresses"
            count={addrsCount}
            icon={<MapPin className="size-5" />}
          />
        </div>

        {/* Group 1: Activity & Orders */}
        <div>
          <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-muted">
            Activity & Orders
          </h3>
          <nav
            aria-label="Account Activity"
            className="divide-y divide-line/40 overflow-hidden rounded-2xl border border-line/60 bg-surface shadow-sm"
          >
            <MenuRow
              to="/orders"
              icon={<ClipboardList className="size-5" aria-hidden />}
              iconBg="bg-amber-50 text-amber-700"
              label="My Orders"
              subtitle="Order status, history & bills"
            />
            <MenuRow
              to="/favorites"
              icon={<Heart className="size-5" aria-hidden />}
              iconBg="bg-rose-50 text-rose-600"
              label="Favourite Dishes"
              subtitle="Quick access to what you love"
            />
            <MenuRow
              to="/addresses"
              icon={<MapPin className="size-5" aria-hidden />}
              iconBg="bg-blue-50 text-blue-600"
              label="Saved Delivery Addresses"
              subtitle="Home, work, and other places"
            />
            <MenuRow
              to="/notifications"
              icon={<Bell className="size-5" aria-hidden />}
              iconBg="bg-purple-50 text-purple-600"
              label="Notifications"
              subtitle="Offers, order updates & alerts"
              badge={
                unreadNotes > 0 ? (
                  <span className="tabular rounded-full bg-primary px-2 py-0.5 text-xs font-extrabold text-surface">
                    {unreadNotes}
                  </span>
                ) : undefined
              }
            />
          </nav>
        </div>

        {/* Group 2: Support & Legal */}
        <div>
          <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-muted">
            Support & Legal
          </h3>
          <div className="divide-y divide-line/40 overflow-hidden rounded-2xl border border-line/60 bg-surface shadow-sm">
            <MenuRow
              icon={<Headphones className="size-5" aria-hidden />}
              iconBg="bg-emerald-50 text-emerald-700"
              label="Customer Support"
              subtitle="Need help? Email support@specialdelivery.com"
              onClick={() => alert('For order assistance or questions, call +91 1800-123-4567 or email support@specialdelivery.com')}
            />
            <MenuRow
              icon={<FileText className="size-5" aria-hidden />}
              iconBg="bg-amber-50 text-amber-700"
              label="Terms & Conditions"
              subtitle="Ordering rules, refunds & delivery policies"
              onClick={() => setTermsOpen(true)}
            />
            <MenuRow
              icon={<Shield className="size-5" aria-hidden />}
              iconBg="bg-indigo-50 text-indigo-700"
              label="Privacy Policy"
              subtitle="How your information and data is protected"
              onClick={() => setPrivacyOpen(true)}
            />
            <MenuRow
              danger
              icon={<Trash2 className="size-5" aria-hidden />}
              label="Delete Account"
              subtitle="Permanently remove your account and all data"
              onClick={() => setDeleteOpen(true)}
            />
          </div>
        </div>

        {/* Group 3: Logout */}
        <div className="overflow-hidden rounded-2xl border border-rose-200 bg-surface shadow-sm">
          <MenuRow
            danger
            icon={<LogOut className="size-5" aria-hidden />}
            label="Log out"
            subtitle="Sign out from this session"
            onClick={async () => {
              if (!window.confirm('Log out of Special Delivery?')) return;
              await logout();
              navigate('/');
            }}
          />
        </div>
      </div>

      {/* Edit Profile Modal Dialog */}
      {editOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-profile-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 md:items-center md:p-4"
          onClick={(e) => e.target === e.currentTarget && !saving && setEditOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && !saving && setEditOpen(false)}
        >
          {/* Bottom sheet on phones (like the app's showModalBottomSheet), centered dialog from md up */}
          <div className="relative max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl bg-surface p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl motion-safe:animate-[sheet-up_260ms_cubic-bezier(0.16,1,0.3,1)] md:max-w-md md:rounded-3xl md:motion-safe:animate-[pop_200ms_ease-out]">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line md:hidden" aria-hidden />
            <div className="flex items-center justify-between border-b border-line/60 pb-3">
              <h3 id="edit-profile-title" className="font-display text-lg font-bold text-ink">
                Edit Profile & Contact
              </h3>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="rounded-full p-1 text-muted hover:bg-card hover:text-ink transition-colors"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="mt-4 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-xs font-bold text-ink">
                Full Name
                <div className="relative flex items-center">
                  <UserIcon className="pointer-events-none absolute left-3.5 size-4 text-muted" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Charan Kumar"
                    className="h-11 w-full rounded-xl bg-card pl-10 pr-3 text-sm outline-none ring-1 ring-line/80 focus:ring-2 focus:ring-primary"
                  />
                </div>
              </label>

              <label className="flex flex-col gap-1.5 text-xs font-bold text-ink">
                Mobile Number
                <div className="relative flex items-center">
                  <Phone className="pointer-events-none absolute left-3.5 size-4 text-muted" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="h-11 w-full rounded-xl bg-card pl-10 pr-3 text-sm outline-none ring-1 ring-line/80 focus:ring-2 focus:ring-primary"
                  />
                </div>
                <span className="text-[11px] font-normal text-muted">10-digit Indian mobile number for order calls & SMS</span>
              </label>

              <label className="flex flex-col gap-1.5 text-xs font-bold text-ink">
                Email Address
                <div className="relative flex items-center">
                  <Mail className="pointer-events-none absolute left-3.5 size-4 text-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. name@example.com"
                    className="h-11 w-full rounded-xl bg-card pl-10 pr-3 text-sm outline-none ring-1 ring-line/80 focus:ring-2 focus:ring-primary"
                  />
                </div>
                <span className="text-[11px] font-normal text-muted">For order confirmations & invoice receipts</span>
              </label>

              <div className="mt-2 flex flex-col-reverse gap-3 border-t border-line/50 pt-3 md:flex-row md:items-center md:justify-end">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  disabled={saving}
                  className="h-11 rounded-xl px-4 text-sm font-semibold text-muted transition-colors hover:bg-card hover:text-ink"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={saving}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Terms & Conditions Modal */}
      {termsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm"
        >
          <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-3xl bg-surface p-6 shadow-2xl motion-safe:animate-[pop_200ms_ease-out]">
            <div className="flex items-center justify-between border-b border-line/60 pb-3">
              <h3 className="font-display text-lg font-bold text-ink">Terms & Conditions</h3>
              <button
                type="button"
                onClick={() => setTermsOpen(false)}
                className="rounded-full p-1 text-muted hover:bg-card hover:text-ink transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pt-4 pr-1 text-sm text-muted space-y-4">
              <p>Welcome to Special Delivery. By accessing our platform, you agree to these Terms and Conditions.</p>
              <div>
                <h4 className="font-bold text-ink mb-1">1. Fresh Food Preparation</h4>
                <p>All dishes are freshly prepared after you confirm your order. We prioritize authentic recipes and hygienic standards.</p>
              </div>
              <div>
                <h4 className="font-bold text-ink mb-1">2. Delivery Timeframes</h4>
                <p>Delivery times are estimates (typically 25-45 minutes). Severe weather or road conditions may occasionally alter delivery durations.</p>
              </div>
              <div>
                <h4 className="font-bold text-ink mb-1">3. Pricing & Taxes</h4>
                <p>All prices are in Indian Rupees (INR) and inclusive of all applicable GST taxes. Packaging and delivery fees are displayed at checkout.</p>
              </div>
              <div>
                <h4 className="font-bold text-ink mb-1">4. Cancellations & Returns</h4>
                <p>Because items are freshly made, orders cannot be cancelled once cooking has commenced. If an incorrect or damaged item is received, contact our support immediately.</p>
              </div>
              <div>
                <h4 className="font-bold text-ink mb-1">5. Account Usage</h4>
                <p>You agree to provide true and accurate information during order placement and maintain account security.</p>
              </div>
            </div>
            <div className="mt-4 border-t border-line/60 pt-3 text-right">
              <Button variant="secondary" onClick={() => setTermsOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {privacyOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm"
        >
          <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-3xl bg-surface p-6 shadow-2xl motion-safe:animate-[pop_200ms_ease-out]">
            <div className="flex items-center justify-between border-b border-line/60 pb-3">
              <h3 className="font-display text-lg font-bold text-ink">Privacy Policy</h3>
              <button
                type="button"
                onClick={() => setPrivacyOpen(false)}
                className="rounded-full p-1 text-muted hover:bg-card hover:text-ink transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pt-4 pr-1 text-sm text-muted space-y-4">
              <p>Special Delivery is committed to respecting your privacy and protecting your personal details.</p>
              <div>
                <h4 className="font-bold text-ink mb-1">1. Information Collected</h4>
                <p>We collect your name, phone number, email address, and delivery coordinates necessary to process orders and contact you regarding deliveries.</p>
              </div>
              <div>
                <h4 className="font-bold text-ink mb-1">2. Location Data</h4>
                <p>Your location is accessed solely to show accurate addresses and optimize delivery routes. We do not track you when the website or app is closed.</p>
              </div>
              <div>
                <h4 className="font-bold text-ink mb-1">3. Data Security & Storage</h4>
                <p>All sensitive information and authentication sessions are securely encrypted and protected against unauthorized access.</p>
              </div>
              <div>
                <h4 className="font-bold text-ink mb-1">4. No Third-Party Selling</h4>
                <p>We do not sell, rent, or trade your personal data to external advertisers.</p>
              </div>
              <div>
                <h4 className="font-bold text-ink mb-1">5. Account Deletion</h4>
                <p>You can update your personal information or permanently delete your account and all associated order history directly from this page.</p>
              </div>
            </div>
            <div className="mt-4 border-t border-line/60 pt-3 text-right">
              <Button variant="secondary" onClick={() => setPrivacyOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {deleteOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm"
        >
          <div className="relative w-full max-w-md rounded-3xl bg-surface p-6 shadow-2xl motion-safe:animate-[pop_200ms_ease-out]">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="grid size-10 place-items-center rounded-xl bg-rose-50 text-rose-600">
                <Trash2 className="size-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-ink">Delete Account?</h3>
            </div>
            <p className="text-sm text-muted leading-relaxed">
              Are you sure you want to permanently delete your account? All order history, saved addresses, and profile details will be permanently erased. This action cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-line/50 pt-4">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
                className="h-11 rounded-xl px-4 text-sm font-semibold text-muted transition-colors hover:bg-card hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-danger px-5 text-sm font-bold text-surface shadow-sm transition-all hover:bg-danger/90 active:scale-95 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Success Feedback Toast */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-bold text-surface shadow-2xl motion-safe:animate-[pop_180ms_ease-out]"
        >
          <CheckCircle2 className="size-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}
    </PageFrame>
  );
}

const SWIPE_REMOVE_PX = 96;

/** One notification row: click opens its order; swipe left/right (or the bin button) removes it. */
function NotificationRow({ n, onOpen, onRemove }: { n: NotificationDto; onOpen: () => void; onRemove: () => void }) {
  const [dx, setDx] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const moved = useRef(false);

  const remove = () => {
    setLeaving(true);
    setDx((d) => (d < 0 ? -window.innerWidth : window.innerWidth));
    window.setTimeout(onRemove, 200);
  };

  return (
    <li className="relative overflow-hidden rounded-[18px]">
      {/* Revealed behind the row while swiping */}
      <div
        aria-hidden
        className={cx(
          'absolute inset-0 flex items-center bg-danger px-6 text-sm font-bold text-surface',
          dx < 0 ? 'justify-end' : 'justify-start',
        )}
      >
        <Trash2 className="size-5" />
        <span className="mx-2">Remove</span>
      </div>
      <div
        role="button"
        tabIndex={0}
        aria-label={`${n.title}${n.readAt ? '' : ', unread'}. ${n.message}`}
        onPointerDown={(e) => {
          start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
          moved.current = false;
        }}
        onPointerMove={(e) => {
          const s0 = start.current;
          if (!s0 || leaving) return;
          const ddx = e.clientX - s0.x;
          if (!moved.current && Math.abs(ddx) > 8 && Math.abs(ddx) > Math.abs(e.clientY - s0.y)) {
            moved.current = true;
            e.currentTarget.setPointerCapture(s0.id);
          }
          if (moved.current) setDx(ddx);
        }}
        onPointerUp={() => {
          const wasSwipe = moved.current;
          start.current = null;
          if (!wasSwipe) return;
          if (Math.abs(dx) > SWIPE_REMOVE_PX) remove();
          else setDx(0);
        }}
        onPointerCancel={() => {
          start.current = null;
          setDx(0);
        }}
        onClick={() => {
          if (moved.current) return;
          onOpen();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen();
          } else if (e.key === 'Delete' || e.key === 'Backspace') {
            remove();
          }
        }}
        style={{ transform: `translateX(${dx}px)`, touchAction: 'pan-y' }}
        className={cx(
          'relative flex cursor-pointer select-none items-start gap-3 rounded-[18px] p-4 focus-visible:outline-2 focus-visible:outline-primary',
          n.readAt ? 'bg-surface ring-1 ring-inset ring-line' : 'bg-primary-soft',
          (start.current === null || leaving) && 'transition-transform duration-200 ease-out',
        )}
      >
        <span className={cx('mt-2 size-2 shrink-0 rounded-full', n.readAt ? 'bg-transparent' : 'bg-primary')} aria-hidden />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-bold">{n.title}</span>
          <span className="text-sm">{n.message}</span>
          <span className="text-[13px] text-muted">
            {new Date(n.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
          </span>
        </span>
        <button
          type="button"
          aria-label="Remove notification"
          title="Remove"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            remove();
          }}
          className="grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-danger/10 hover:text-danger focus-visible:outline-2 focus-visible:outline-primary"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
        {n.orderId && <ChevronRight className="mt-2.5 size-5 shrink-0 text-muted" aria-hidden />}
      </div>
    </li>
  );
}

export function NotificationsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const notes = useQuery(notificationsQuery);
  const [removed, setRemoved] = useState<Set<string>>(() => new Set());
  const refresh = () => qc.invalidateQueries({ queryKey: notificationsQuery.queryKey });
  const readAll = useMutation({ mutationFn: () => api.post('/notifications/read-all'), onSuccess: refresh });
  const readOne = useMutation({ mutationFn: (id: string) => api.post(`/notifications/${id}/read`), onSuccess: refresh });
  const removeOne = useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}`),
    onSettled: refresh,
    onError: (_e, id) =>
      setRemoved((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      }),
  });
  const items = (notes.data?.items ?? []).filter((n) => !removed.has(n.id));

  return (
    <PageFrame
      art
      subtitle="Order updates, offers and alerts"
      title="Notifications"
      actions={
        (notes.data?.unread ?? 0) > 0 && (
          <FrameIconButton label="Mark all read" onClick={() => readAll.mutate()}>
            <CheckCheck className="size-5" aria-hidden />
          </FrameIconButton>
        )
      }
    >
      {notes.isError ? (
        <ErrorState onRetry={() => notes.refetch()} />
      ) : notes.isPending ? (
        <Skeleton className="h-60" />
      ) : items.length === 0 ? (
        <EmptyState icon={<Bell className="size-9" />} title="No notifications yet" body="Order updates will show up here." />
      ) : (
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          <p className="text-[13px] text-muted">Tap to open the order · swipe left or right to remove</p>
          <ul className="flex flex-col gap-2.5">
            {items.map((n) => (
              <NotificationRow
                key={n.id}
                n={n}
                onOpen={() => {
                  if (!n.readAt) readOne.mutate(n.id);
                  if (n.orderId) navigate(`/orders/${n.orderId}`);
                }}
                onRemove={() => {
                  setRemoved((s) => new Set(s).add(n.id));
                  removeOne.mutate(n.id);
                }}
              />
            ))}
          </ul>
        </div>
      )}
    </PageFrame>
  );
}

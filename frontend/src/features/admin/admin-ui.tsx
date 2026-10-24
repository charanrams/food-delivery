import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { MoreHorizontal, Search } from 'lucide-react';
import type { PaymentStatus } from '@a3/contracts';
import { Badge, cx } from '@/components/ui';
import { ApiError } from '@/lib/api';

/** Shared building blocks for every admin screen — one header, one input style, one notice style. */
export const inputCls =
  'h-11 w-full rounded-xl bg-surface px-3.5 text-[15px] outline-none ring-1 ring-line placeholder:text-muted focus:ring-2 focus:ring-primary aria-[invalid=true]:ring-danger disabled:bg-panel disabled:text-muted';
export const iconBtnCls =
  'grid size-10 place-items-center rounded-lg focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40';
export const thCls =
  'bg-[#fff6ee] px-4 py-3 text-xs font-semibold text-muted first:rounded-l-xl last:rounded-r-xl';
export const tdCls = 'px-4 py-3.5 align-middle';
export const errorText = (e: unknown, fallback = 'Something went wrong. Please try again.') =>
  e instanceof ApiError ? e.message : fallback;

export function PageHeader({
  title,
  description,
  actions,
  crumbs,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** Breadcrumb trail above the title, e.g. [{ label: 'Orders', to: '/admin/orders' }, { label: 'A3-…' }]. */
  crumbs?: { label: string; to?: string }[];
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        {crumbs && crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-1 flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
            {crumbs.map((c, i) => (
              <span key={c.label} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden>›</span>}
                {c.to ? (
                  <Link to={c.to} className="hover:text-primary-strong">
                    {c.label}
                  </Link>
                ) : (
                  <span className={i === crumbs.length - 1 ? 'text-ink' : ''}>{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="font-display text-balance text-2xl font-bold leading-tight tracking-[-0.02em] md:text-[1.875rem]">
          {title}
        </h1>
        {description && <p className="mt-1 max-w-[65ch] text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export type Notice = { tone: 'success' | 'danger'; text: string };
export function NoticeBar({ notice, onDismiss }: { notice?: Notice; onDismiss?: () => void }) {
  if (!notice) return null;
  return (
    <div
      role={notice.tone === 'danger' ? 'alert' : 'status'}
      className={cx(
        'flex items-start justify-between gap-4 rounded-lg px-4 py-3 text-sm',
        notice.tone === 'danger' ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success',
      )}
    >
      <p>{notice.text}</p>
      {onDismiss && (
        <button onClick={onDismiss} className="shrink-0 font-semibold underline underline-offset-2">
          Dismiss
        </button>
      )}
    </div>
  );
}

export function SearchInput({
  id,
  value,
  onChange,
  placeholder,
  className,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={cx('relative w-full sm:max-w-xs', className)}>
      <label htmlFor={id} className="sr-only">
        {placeholder}
      </label>
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cx(inputCls, 'rounded-full pl-10')}
      />
    </div>
  );
}

/** Segmented filter — scrolls horizontally inside itself on narrow screens. */
export function FilterTabs<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; count?: number }[];
  onChange: (v: T) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="no-scrollbar flex min-w-0 max-w-full gap-1 overflow-x-auto rounded-full bg-surface p-1 shadow-sm ring-1 ring-line/70"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cx(
              'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors',
              active
                ? 'bg-ink text-surface shadow-sm'
                : 'text-muted hover:bg-primary-soft hover:text-ink',
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={cx('tabular text-xs', active ? 'text-surface/80' : 'text-muted')}>
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-[13px] text-danger">
          {error}
        </p>
      ) : (
        hint && <p className="text-[13px] text-muted">{hint}</p>
      )}
    </div>
  );
}

const PAYMENT_UI: Record<
  PaymentStatus,
  { label: string; tone: 'neutral' | 'primary' | 'warning' | 'success' | 'danger' }
> = {
  PENDING: { label: 'Pending', tone: 'warning' },
  AUTHORIZED: { label: 'Authorised', tone: 'primary' },
  PAID: { label: 'Paid', tone: 'success' },
  FAILED: { label: 'Failed', tone: 'danger' },
  REFUND_PENDING: { label: 'Refund pending', tone: 'warning' },
  PARTIALLY_REFUNDED: { label: 'Part refunded', tone: 'neutral' },
  REFUNDED: { label: 'Refunded', tone: 'neutral' },
};
export const PaymentBadge = ({ status }: { status: PaymentStatus }) => (
  <Badge tone={PAYMENT_UI[status].tone}>{PAYMENT_UI[status].label}</Badge>
);
export const paymentLabel = (s: PaymentStatus) => PAYMENT_UI[s].label;

const rtf = new Intl.RelativeTimeFormat('en-IN', { numeric: 'auto' });
export function timeAgo(iso?: string) {
  if (!iso) return '-';
  const mins = Math.round((Date.parse(iso) - Date.now()) / 60_000);
  if (Math.abs(mins) < 60) return rtf.format(mins, 'minute');
  const hrs = Math.round(mins / 60);
  if (Math.abs(hrs) < 24) return rtf.format(hrs, 'hour');
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
export const dateTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '-';
/** "4 min", "2 h 5 min", "3 d" — long waits stay readable. */
export const waitLabel = (mins: number) =>
  mins < 60 ? `${mins} min` : mins < 24 * 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${Math.floor(mins / (24 * 60))} d`;
export const itemsLabel = (n: number) => `${n} ${n === 1 ? 'item' : 'items'}`;
export const localPhone = (p: string) => p.replace(/^\+91/, '');

/** KPI tile (VSR-style): tinted icon square, label, big number and a context line. */
export function StatCard({
  label,
  value,
  icon,
  hint,
  to,
  tone = 'orange',
}: {
  label: string;
  value: string;
  icon: ReactNode;
  hint?: ReactNode;
  to?: string;
  tone?: 'orange' | 'green' | 'pink' | 'blue' | 'violet' | 'red';
}) {
  const chip = {
    orange: 'bg-primary-soft text-primary-strong',
    green: 'bg-success/12 text-success',
    pink: 'bg-[#fde7ee] text-[#b4235a]',
    blue: 'bg-[#e4f0fd] text-[#1d5fa8]',
    violet: 'bg-[#efe8fd] text-[#6d3fd6]',
    red: 'bg-danger/10 text-danger',
  }[tone];
  const body = (
    <>
      <span className={cx('grid size-12 shrink-0 place-items-center rounded-2xl [&_svg]:size-[22px]', chip)} aria-hidden>
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-[13px] font-medium text-muted">{label}</span>
        <span className="font-display tabular break-words text-[1.5rem] font-bold leading-none tracking-[-0.01em] sm:text-[1.625rem]">{value}</span>
        {hint && <span className="truncate text-xs text-muted" title={typeof hint === 'string' ? hint : undefined}>{hint}</span>}
      </span>
    </>
  );
  const cls =
    'flex min-w-0 items-start gap-3.5 rounded-[20px] bg-surface p-4 shadow-[0_1px_2px_rgb(30_29_27/0.04),0_10px_24px_-18px_rgb(122_59_16/0.35)] ring-1 ring-line/70 transition-shadow sm:p-5';
  return to ? (
    <Link to={to} className={cx(cls, 'hover:shadow-md hover:ring-primary/40')}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** White section card on the admin panel with an optional title row (e.g. "Platform Performance Overview"). */
export function SectionCard({
  title,
  actions,
  children,
  className,
}: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        'min-w-0 rounded-[20px] bg-surface p-3 shadow-[0_1px_2px_rgb(30_29_27/0.04),0_10px_24px_-18px_rgb(122_59_16/0.3)] ring-1 ring-line/70 md:p-4',
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 px-2 pb-3 pt-1">
          {title && <h2 className="text-base font-bold">{title}</h2>}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

/** Row of KPI tiles at the top of a page. */
export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-4 xl:grid-cols-4">{children}</div>;
}

// ---------- People ----------
const AVATAR_TONES = [
  'bg-primary-soft text-primary-strong',
  'bg-success/12 text-success',
  'bg-[#e4f0fd] text-[#1d5fa8]',
  'bg-[#fde7ee] text-[#b4235a]',
  'bg-[#efe9fb] text-[#5b3db5]',
];

/** Initials avatar; the colour is stable per name so a person is recognisable across lists. */
export function Avatar({
  name,
  dot,
  className,
}: {
  name: string;
  dot?: 'online' | 'offline' | 'blocked';
  className?: string;
}) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('') || '?';
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <span
      className={cx(
        'relative grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold',
        AVATAR_TONES[h % AVATAR_TONES.length],
        className,
      )}
      aria-hidden
    >
      {initials}
      {dot && (
        <span
          className={cx(
            'absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full ring-2 ring-surface',
            dot === 'online' ? 'bg-success' : dot === 'blocked' ? 'bg-danger' : 'bg-ink/30',
          )}
        />
      )}
    </span>
  );
}

// ---------- Row actions ----------
export type RowMenuItem = {
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  hint?: string;
};

/**
 * "⋯" menu for the less frequent row actions. Positioned `fixed` from the trigger so it is never
 * clipped by a table's scroll container; closes on outside click, Esc, scroll or resize.
 */
export function RowMenu({ label, items }: { label: string; items: RowMenuItem[] }) {
  const [pos, setPos] = useState<{ top: number; right: number; up: boolean } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pos) return;
    menu.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    const close = () => setPos(null);
    const onDown = (e: MouseEvent) =>
      !menu.current?.contains(e.target as Node) &&
      !btn.current?.contains(e.target as Node) &&
      close();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        btn.current?.focus();
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const all = [
          ...(menu.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []),
        ];
        const i = all.indexOf(document.activeElement as HTMLButtonElement);
        all[(i + (e.key === 'ArrowDown' ? 1 : -1) + all.length) % all.length]?.focus();
      }
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [pos]);

  const toggle = () => {
    if (pos) return setPos(null);
    const r = btn.current!.getBoundingClientRect();
    const up = r.bottom + 56 * items.length + 24 > window.innerHeight;
    setPos({ top: up ? r.top - 6 : r.bottom + 6, right: window.innerWidth - r.right, up });
  };

  return (
    <>
      <button
        ref={btn}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={!!pos}
        aria-label={label}
        title="More actions"
        className="grid size-10 place-items-center rounded-full text-muted hover:bg-panel hover:text-ink"
      >
        <MoreHorizontal className="size-5" aria-hidden />
      </button>
      {pos && (
        <div
          ref={menu}
          role="menu"
          aria-label={label}
          style={{ top: pos.top, right: pos.right }}
          className={cx(
            'fixed z-50 w-60 rounded-2xl bg-surface p-1.5 shadow-lg ring-1 ring-line motion-safe:animate-[fade_120ms_ease-out]',
            pos.up && '-translate-y-full',
          )}
        >
          {items.map((i) => (
            <button
              key={i.label}
              type="button"
              role="menuitem"
              disabled={i.disabled}
              title={i.disabled ? i.hint : undefined}
              onClick={() => {
                setPos(null);
                i.onSelect();
              }}
              className={cx(
                'flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-medium outline-none disabled:cursor-not-allowed disabled:opacity-45',
                i.danger
                  ? 'text-danger hover:bg-danger/10 focus-visible:bg-danger/10'
                  : 'hover:bg-panel focus-visible:bg-panel',
              )}
            >
              <span className="shrink-0 [&>svg]:size-[18px]">{i.icon}</span>
              <span className="flex min-w-0 flex-col">
                {i.label}
                {i.disabled && i.hint && (
                  <span className="text-xs font-normal text-muted">{i.hint}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

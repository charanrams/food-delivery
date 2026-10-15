import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { Minus, Plus, Loader2, WifiOff, Trash2 } from 'lucide-react';
import type { OrderStatus } from '@a3/contracts';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/*
 * A3 component kit. Shape rule: controls 12px, cards 20px, media inside cards 14px, chips/badges pill.
 * Depth rule: cards are flat on the page; only interactive cards lift (tinted shadow) on hover.
 */

// ---------- Logo ----------
export function Logo({ tone = 'ink', size = 40 }: { tone?: 'ink' | 'light'; size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <img src="/logo.png" alt="" width={size} height={size} className="rounded-full bg-surface" />
      <span className={cx('font-display text-[1.35rem] font-semibold leading-none', tone === 'light' ? 'text-background' : 'text-ink')}>
        A3 Kitchen
      </span>
    </span>
  );
}

// ---------- Button ----------
type Variant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger';
type Size = 'lg' | 'md' | 'sm';
const variants: Record<Variant, string> = {
  primary: 'bg-primary-strong text-surface shadow-press hover:bg-primary-deep',
  secondary: 'bg-surface text-ink ring-1 ring-inset ring-line hover:ring-ink/25 hover:bg-panel',
  soft: 'bg-primary-soft text-primary-strong hover:bg-primary-soft-hover',
  ghost: 'text-ink hover:bg-ink/[0.05]',
  danger: 'bg-danger text-surface shadow-press hover:bg-danger-deep',
};
const sizes: Record<Size, string> = {
  lg: 'min-h-13 px-6 text-base',
  md: 'min-h-12 px-5 text-[15px]',
  sm: 'min-h-10 px-3.5 text-[13px]',
};
const base =
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-[background-color,box-shadow,transform,color] duration-150 ease-out active:translate-y-px active:scale-[0.985] disabled:pointer-events-none disabled:bg-line disabled:text-muted disabled:shadow-none disabled:ring-0 aria-busy:cursor-progress';

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean; icon?: ReactNode }) {
  return (
    <button className={cx(base, variants[variant], sizes[size], className)} disabled={loading || rest.disabled} aria-busy={loading || undefined} {...rest}>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  icon,
  className,
  children,
  ...rest
}: LinkProps & { variant?: Variant; size?: Size; icon?: ReactNode }) {
  return (
    <Link className={cx(base, variants[variant], sizes[size], className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

// ---------- Food image: blur-up fade in, tinted plate placeholder on failure ----------
export function FoodImage({ src, alt, className, dimmed, zoom }: { src: string; alt: string; className?: string; dimmed?: boolean; zoom?: boolean }) {
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  return (
    <div className={cx('relative isolate overflow-hidden bg-primary-soft', state === 'loading' && 'shimmer', className)}>
      {state === 'failed' ? (
        <div className="absolute inset-0 grid place-items-center" role="img" aria-label={alt || undefined}>
          <span className="aspect-square w-2/5 max-w-36 rounded-full bg-primary/15 ring-8 ring-primary/10" />
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setState('ready')}
          onError={() => setState('failed')}
          className={cx(
            'absolute inset-0 size-full object-cover transition-[opacity,filter,transform] duration-500 ease-out',
            state === 'ready' ? 'opacity-100 blur-0' : 'opacity-0 blur-md',
            dimmed && 'grayscale-[60%] opacity-50!',
            zoom && 'motion-safe:group-hover/card:scale-[1.04]',
          )}
        />
      )}
    </div>
  );
}

// ---------- Veg / non-veg mark (FSSAI style) ----------
export function VegMark({ veg }: { veg: boolean }) {
  return (
    <span
      role="img"
      aria-label={veg ? 'Vegetarian' : 'Non-vegetarian'}
      className={cx('grid size-3.5 shrink-0 place-items-center rounded-[3px] border-[1.5px] bg-surface', veg ? 'border-success' : 'border-danger')}
    >
      <span className={cx('size-1.5 rounded-full', veg ? 'bg-success' : 'bg-danger')} />
    </span>
  );
}

// ---------- Quantity stepper ----------
/** `solid` is the in-card “added” state; `outline` sits in forms and the cart. At 1, minus becomes remove. */
export function Stepper({
  value,
  onChange,
  label,
  max = 20,
  tone = 'outline',
  size = 'md',
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  max?: number;
  tone?: 'outline' | 'solid';
  size?: 'md' | 'sm';
}) {
  const solid = tone === 'solid';
  const btn = cx(
    'grid place-items-center rounded-[10px] transition-colors active:scale-90 disabled:opacity-40',
    size === 'sm' ? 'size-8' : 'size-9',
    solid ? 'text-surface hover:bg-surface/15' : 'text-primary-strong hover:bg-primary-soft',
  );
  const Minus_ = value <= 1 ? Trash2 : Minus;
  return (
    <div
      className={cx('inline-flex items-center gap-0.5 rounded-xl p-0.5', solid ? 'bg-primary-strong shadow-press' : 'bg-surface ring-1 ring-inset ring-line')}
      role="group"
      aria-label={`Quantity for ${label}`}
    >
      <button type="button" className={btn} onClick={() => onChange(value - 1)} aria-label={value <= 1 ? `Remove ${label}` : 'Decrease quantity'}>
        <Minus_ className="size-4" strokeWidth={2.25} />
      </button>
      <span className={cx('tabular min-w-7 text-center text-[15px] font-bold', solid ? 'text-surface' : 'text-ink')} aria-live="polite">
        <span key={value} className="inline-block motion-safe:animate-[tick_180ms_ease-out]">{value}</span>
      </span>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity">
        <Plus className="size-4" strokeWidth={2.25} />
      </button>
    </div>
  );
}

// ---------- Toggle switch ----------
export function Toggle({ checked, onChange, label, disabled, className }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx('group relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-50', checked ? 'bg-success' : 'bg-ink/20', className)}
    >
      <span
        className={cx(
          'absolute left-1 size-5 rounded-full bg-surface shadow-[0_1px_3px_rgb(30_29_27/0.3)] transition-[transform,width] duration-200 ease-out group-active:w-6',
          checked && 'translate-x-5 group-active:translate-x-4',
        )}
      />
    </button>
  );
}

// ---------- Status badge ----------
type Tone = 'neutral' | 'primary' | 'warning' | 'success' | 'danger';
const tones: Record<Tone, string> = {
  neutral: 'bg-ink/[0.06] text-muted',
  primary: 'bg-primary-soft text-primary-strong',
  warning: 'bg-warning/12 text-warning',
  success: 'bg-success/12 text-success',
  danger: 'bg-danger/10 text-danger',
};
export const ORDER_STATUS_UI: Record<OrderStatus, { label: string; tone: Tone }> = {
  PLACED: { label: 'Placed', tone: 'neutral' },
  ACCEPTED: { label: 'Accepted', tone: 'primary' },
  PREPARING: { label: 'Preparing', tone: 'primary' },
  READY_FOR_PICKUP: { label: 'Ready for pickup', tone: 'primary' },
  ASSIGNED: { label: 'Partner assigned', tone: 'warning' },
  PICKED_UP: { label: 'Picked up', tone: 'warning' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', tone: 'warning' },
  DELIVERED: { label: 'Delivered', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
};
/** `live` pulses the dot — only for states that are actually moving right now. */
export function Badge({ tone, children, live }: { tone: Tone; children: ReactNode; live?: boolean }) {
  return (
    <span className={cx('inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full pl-2 pr-2.5 text-xs font-semibold', tones[tone])}>
      <span className="relative grid size-1.5 place-items-center" aria-hidden>
        {live && <span className="absolute size-1.5 rounded-full bg-current opacity-60 motion-safe:animate-ping" />}
        <span className="size-1.5 rounded-full bg-current" />
      </span>
      {children}
    </span>
  );
}
const LIVE: OrderStatus[] = ['PREPARING', 'OUT_FOR_DELIVERY'];
export const StatusBadge = ({ status }: { status: OrderStatus }) => (
  <Badge tone={ORDER_STATUS_UI[status].tone} live={LIVE.includes(status)}>
    {ORDER_STATUS_UI[status].label}
  </Badge>
);

// ---------- Surfaces & states ----------
type CardTone = 'surface' | 'soft';
/**
 * `surface`: white with a hairline (admin, panels). `soft`: tinted fill on white pages (customer).
 * `interactive`: lifts on hover and shows the focus ring when anything inside is keyboard-focused.
 */
export function Card({
  className,
  children,
  as: As = 'div',
  tone = 'surface',
  interactive,
}: {
  className?: string;
  children: ReactNode;
  as?: 'div' | 'section' | 'article' | 'li';
  tone?: CardTone;
  interactive?: boolean;
}) {
  return (
    <As
      className={cx(
        'group/card relative rounded-[20px]',
        tone === 'surface' ? 'bg-surface ring-1 ring-line' : 'bg-card',
        interactive &&
          'transition-[box-shadow,transform] duration-200 ease-out hover:shadow-lift motion-safe:hover:-translate-y-0.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-strong',
        className,
      )}
    >
      {children}
    </As>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('shimmer rounded-[20px] bg-line/50', className)} aria-hidden />;
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="mb-1 grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary-strong [&>svg]:size-7">{icon}</div>
      <h2 className="text-balance font-display text-xl font-semibold">{title}</h2>
      <p className="max-w-sm text-pretty text-[15px] text-muted">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="mb-1 grid size-14 place-items-center rounded-2xl bg-danger/10 text-danger">
        <WifiOff className="size-6" aria-hidden />
      </div>
      <h2 className="font-display text-xl font-semibold">We couldn’t load this</h2>
      <p className="max-w-sm text-[15px] text-muted">Check your connection and try again.</p>
      <Button variant="secondary" size="sm" onClick={onRetry} className="mt-1">
        Try again
      </Button>
    </div>
  );
}

export { cx };

import { useEffect, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Eye, EyeOff, MapPinned, Truck, UtensilsCrossed, Wallet } from 'lucide-react';
import { formatPaise } from '@a3/contracts';
import { ButtonLink, FoodImage, Logo, cx } from '@/components/ui';
import { productImage, productsQuery, sized } from '@/lib/catalog-api';
import { HERO_BIRYANI, PRICING } from '@/lib/mock-data';

/** Split layout shared by login, sign-up and password reset: food photo + real menu on the left, form on the right. */
export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: ReactNode; children: ReactNode; footer?: ReactNode }) {
  const products = useQuery(productsQuery());
  const picks = (products.data ?? []).filter((p) => p.isAvailable && p.images.length).slice(0, 3);

  return (
    <div className="grid min-h-dvh bg-surface lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {/* Showcase (desktop): full-height photo, headline, real benefits, live menu picks. */}
      <aside className="relative isolate hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
        <img src={HERO_BIRYANI} alt="" className="absolute inset-0 -z-20 size-full scale-110 object-cover object-[42%_45%]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/90 via-ink/35 to-transparent" aria-hidden />

        <Link to="/" aria-label="A3 Kitchen home" className="self-start rounded-full bg-surface/95 py-1.5 pl-1.5 pr-4 shadow-lift">
          <Logo size={34} />
        </Link>

        <div className="flex flex-col gap-7 text-surface">
          <h1 className="max-w-lg text-balance font-display text-[3.25rem] font-semibold leading-[1.05]">Freshly prepared. Delivered with care.</h1>
          <ul className="flex flex-wrap gap-2.5">
            {[
              [Truck, `Free delivery above ${formatPaise(PRICING.freeDeliveryAbovePaise)}`],
              [MapPinned, 'Live order tracking'],
              [Wallet, 'Pay online or cash'],
            ].map(([Icon, text]) => {
              const I = Icon as typeof Truck;
              return (
                <li key={text as string} className="inline-flex h-10 items-center gap-2 rounded-full bg-surface/15 px-4 text-sm font-semibold ring-1 ring-inset ring-surface/25 backdrop-blur-md">
                  <I className="size-4" aria-hidden /> {text as string}
                </li>
              );
            })}
          </ul>
          {picks.length > 0 && (
            <div>
              <p className="mb-3 text-sm font-semibold text-surface/80">On the menu today</p>
              <ul className="grid grid-cols-3 gap-3">
                {picks.map((p) => (
                  <li key={p.id}>
                    <Link to={`/product/${p.slug}`} className="group flex items-center gap-3 rounded-2xl bg-surface/95 p-2 pr-3 text-ink shadow-lift transition-transform duration-200 ease-out motion-safe:hover:-translate-y-0.5">
                      <FoodImage src={sized(productImage(p), 160)} alt="" className="size-12 shrink-0 rounded-xl" />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-bold">{p.name}</span>
                        <span className="tabular block text-xs font-semibold text-primary-strong">{formatPaise(p.variants.find((v) => v.name === 'Full')?.pricePaise ?? p.pricePaise)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col lg:min-h-0">
        {/* Phone: the photo fills whatever height the form doesn't need, so there is never a blank gap. */}
        <div className="relative isolate flex min-h-64 flex-1 overflow-hidden lg:hidden">
          <img src={HERO_BIRYANI} alt="" className="absolute inset-0 -z-20 size-full scale-125 object-cover object-[42%_50%]" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" aria-hidden />
          <div className="flex w-full flex-col justify-between p-4 pb-12 text-surface">
            <Link to="/" className="inline-flex min-h-10 items-center gap-1.5 self-start rounded-full bg-surface/95 px-3.5 text-sm font-semibold text-ink shadow-lift">
              <ArrowLeft className="size-4" aria-hidden /> Home
            </Link>
            <div className="flex flex-col gap-3">
              <p className="font-display text-[1.75rem] font-semibold leading-tight">Freshly prepared.<br />Delivered with care.</p>
              <p className="flex flex-wrap gap-1.5 text-xs font-semibold">
                <span className="rounded-full bg-surface/20 px-2.5 py-1 backdrop-blur-md">Free delivery above {formatPaise(PRICING.freeDeliveryAbovePaise)}</span>
                <span className="rounded-full bg-surface/20 px-2.5 py-1 backdrop-blur-md">Live tracking</span>
              </p>
            </div>
          </div>
        </div>

        <main id="main" className="relative -mt-7 flex flex-col rounded-t-[28px] bg-surface px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-7 shadow-[0_-12px_30px_-12px_rgb(30_29_27/0.35)] lg:mt-0 lg:flex-1 lg:rounded-none lg:px-12 lg:py-10 lg:shadow-none">
          <span className="mx-auto -mt-3 mb-4 h-1.5 w-10 rounded-full bg-line lg:hidden" aria-hidden />
          <Link to="/" className="hidden min-h-10 items-center gap-1.5 self-start rounded-full pr-3 text-sm font-semibold text-muted transition-colors hover:text-ink lg:inline-flex">
            <ArrowLeft className="size-4" aria-hidden /> Back to home
          </Link>
          <div className="mx-auto flex w-full max-w-[400px] flex-col gap-6 lg:my-auto lg:py-10">
            <div className="flex flex-col gap-4">
              <img src="/logo.png" alt="" width={56} height={56} className="hidden rounded-full ring-4 ring-primary-soft lg:block" />
              <div>
                <h2 className="font-display text-[1.75rem] font-semibold leading-tight lg:text-[2rem]">{title}</h2>
                <p className="mt-1.5 text-muted">{subtitle}</p>
              </div>
            </div>
            {children}
            {footer && <p className="text-center text-sm text-muted">{footer}</p>}
            <div className="flex items-center gap-3 text-xs font-medium text-muted" aria-hidden>
              <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
            </div>
            <ButtonLink to="/menu" variant="secondary" icon={<UtensilsCrossed className="size-4" aria-hidden />}>
              Browse the menu first
            </ButtonLink>
            <p className="text-center text-xs leading-relaxed text-muted">
              By continuing you agree to A3 Kitchen’s{' '}
              <Link to="/terms" target="_blank" className="font-medium text-primary-strong underline underline-offset-2">Terms &amp; Conditions</Link> and{' '}
              <Link to="/privacy" target="_blank" className="font-medium text-primary-strong underline underline-offset-2">Privacy Policy</Link>.
            </p>
          </div>
          <p className="mt-6 text-center text-xs text-muted lg:mt-auto lg:pt-8">Customers, kitchen staff and delivery partners all sign in here.</p>
        </main>
      </div>
    </div>
  );
}

export const fieldClass = 'h-[52px] w-full rounded-xl bg-surface px-4 text-[15px] outline-none ring-1 ring-line transition-shadow placeholder:text-muted hover:ring-ink/25 focus:ring-2 focus:ring-primary aria-[invalid=true]:ring-danger';

export function Field({ id, label, error, hint, aside, ...input }: InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; error?: string; hint?: string; aside?: ReactNode }) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between">
        <label htmlFor={id} className="text-[13px] font-medium">{label}</label>
        {aside}
      </div>
      <input id={id} aria-invalid={!!error} aria-describedby={describedBy} className={fieldClass} {...input} />
      {error ? (
        <p id={`${id}-error`} className="text-[13px] text-danger">{error}</p>
      ) : (
        hint && <p id={`${id}-hint`} className="text-[13px] text-muted">{hint}</p>
      )}
    </div>
  );
}

export function PasswordField({ id, label, error, hint, aside, ...input }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { id: string; label: string; error?: string; hint?: string; aside?: ReactNode }) {
  const [show, setShow] = useState(false);
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between">
        <label htmlFor={id} className="text-[13px] font-medium">{label}</label>
        {aside}
      </div>
      <div className="relative">
        <input id={id} type={show ? 'text' : 'password'} aria-invalid={!!error} aria-describedby={describedBy} className={cx(fieldClass, 'pr-12')} {...input} />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-lg text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-[13px] text-danger">{error}</p>
      ) : (
        hint && <p id={`${id}-hint`} className="text-[13px] text-muted">{hint}</p>
      )}
    </div>
  );
}

/** Single input for the 6-digit email code — works with SMS/email autofill and paste. */
export function OtpField({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <Field
      id="otp"
      label="6-digit code"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      error={error}
      className={cx(fieldClass, 'text-center font-mono text-2xl tracking-[0.5em]')}
    />
  );
}

/** "Resend code" with a cooldown (60 s default = the server's email-code limit; phone login uses 30 s). */
export function ResendButton({ onResend, seconds = 60 }: { onResend: () => Promise<void>; seconds?: number }) {
  const [left, setLeft] = useState(seconds);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return (
    <button
      type="button"
      disabled={left > 0 || busy}
      onClick={async () => {
        setBusy(true);
        try {
          await onResend();
          setLeft(seconds);
        } finally {
          setBusy(false);
        }
      }}
      className="min-h-11 text-sm font-semibold text-primary-strong disabled:font-medium disabled:text-muted"
    >
      {left > 0 ? `Resend code in ${left}s` : busy ? 'Sending…' : 'Resend code'}
    </button>
  );
}

export const PASSWORD_RULE = 'At least 8 characters.';
export const validPhone = (v: string) => /^(\+?91)?[6-9]\d{9}$/.test(v.replace(/[\s-]/g, ''));
export const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

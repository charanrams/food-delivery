import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { cx } from './ui';

export const container = 'mx-auto w-full max-w-[1200px] px-4 md:px-10';

/**
 * Two-tone page (matches the apps): the title sits on the orange frame, content in a white
 * panel with rounded top corners. Large white title only — small text never sits on orange.
 */
export function PageFrame({
  title,
  subtitle,
  back = true,
  actions,
  children,
  bottom,
  band,
  art,
}: {
  title: string;
  /** Second line under the title (e.g. the order number). */
  subtitle?: string;
  back?: boolean;
  actions?: ReactNode;
  children: ReactNode;
  /** Pinned action bar (e.g. Checkout button) — sticky at the bottom of the panel. */
  bottom?: ReactNode;
  /** Replaces the title row (Home uses it for the address bar). */
  band?: ReactNode;
  /** VSR app bar: the Hyderabad/biryani artwork behind a large left-aligned title + subtitle. */
  art?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-1 flex-col bg-frame">
      {art && (
        <div className="bg-frame bg-cover bg-right-top bg-no-repeat" style={{ backgroundImage: "url('/images/home-header.jpg')" }}>
          <div className={cx(container, 'flex min-h-44 items-start gap-3 pb-12 pt-4 md:min-h-52')}>
            {back && (
              <button
                type="button"
                onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
                aria-label="Back"
                className="grid size-11 shrink-0 place-items-center rounded-full bg-surface text-primary-strong shadow-md hover:bg-primary-soft"
              >
                <ArrowLeft className="size-5" aria-hidden />
              </button>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1 [text-shadow:0_1px_8px_rgb(0_0_0/0.25)]">
              <h1 className="font-display text-[1.9rem] font-bold leading-tight text-surface md:text-[2.4rem]">{title}</h1>
              {subtitle && <p className="tabular max-w-[16rem] text-[15px] font-medium leading-snug text-surface md:max-w-md">{subtitle}</p>}
            </div>
            <div className="flex shrink-0 gap-2 [&>button]:bg-surface [&>button]:text-primary-strong [&>button]:shadow-md [&>button:hover]:bg-primary-soft">{actions}</div>
          </div>
        </div>
      )}
      <div className={cx(container, 'flex min-h-20 items-center gap-3 pb-5 pt-2', art && 'hidden')}>
        {band ?? (
          <>
            {back ? (
              <button
                type="button"
                onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
                aria-label="Back"
                className="grid size-11 shrink-0 place-items-center rounded-full text-surface ring-[1.5px] ring-surface/70 hover:bg-surface/15"
              >
                <ArrowLeft className="size-5" aria-hidden />
              </button>
            ) : (
              <span className="size-11 shrink-0" />
            )}
            <div className="flex min-w-0 flex-1 flex-col text-center md:text-left">
              <h1 className="truncate font-display text-2xl font-semibold text-surface md:text-[2rem]">{title}</h1>
              {subtitle && <p className="tabular truncate text-sm font-semibold text-surface">{subtitle}</p>}
            </div>
            <div className="flex min-w-11 justify-end gap-1">{actions}</div>
          </>
        )}
      </div>
      <div className={cx('flex-1 rounded-t-[32px] bg-surface', art && 'relative -mt-8')}>
        <div className={cx(container, 'min-h-[60vh] pb-10 pt-7')}>{children}</div>
        {bottom && (
          <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 bg-surface/95 py-3 backdrop-blur-sm md:bottom-0">
            <div className={container}>{bottom}</div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Round icon button for the orange header (white icon, 44px target). */
export function FrameIconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="grid size-11 place-items-center rounded-full text-surface hover:bg-surface/15">
      {children}
    </button>
  );
}

/** Pill filter chip — charcoal when selected (white on orange is too low-contrast). */
export function PillChip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cx('min-h-10 shrink-0 rounded-full px-4.5 text-sm font-semibold transition-colors', selected ? 'bg-ink text-surface' : 'bg-card text-ink hover:bg-primary-soft')}
    >
      {children}
    </button>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-lg font-bold md:text-xl">{title}</h2>
      {action}
    </div>
  );
}

/** Round white button for the artwork app bar (orange icon, 44px target). */
export function ArtIconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="grid size-11 place-items-center rounded-full bg-surface text-primary-strong shadow-md hover:bg-primary-soft">
      {children}
    </button>
  );
}

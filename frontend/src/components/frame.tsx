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
  back = true,
  actions,
  children,
  bottom,
  band,
}: {
  title: string;
  back?: boolean;
  actions?: ReactNode;
  children: ReactNode;
  /** Pinned action bar (e.g. Checkout button) — sticky at the bottom of the panel. */
  bottom?: ReactNode;
  /** Replaces the title row (Home uses it for the address bar). */
  band?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-1 flex-col bg-frame">
      <div className={cx(container, 'flex min-h-20 items-center gap-3 pb-5 pt-2')}>
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
            <h1 className="flex-1 truncate text-center font-display text-2xl font-semibold text-surface md:text-left md:text-[2rem]">{title}</h1>
            <div className="flex min-w-11 justify-end gap-1">{actions}</div>
          </>
        )}
      </div>
      <div className="flex-1 rounded-t-[32px] bg-surface">
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

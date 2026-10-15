import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cx } from './ui';

/**
 * Fades + lifts its children in the first time they scroll into view (IntersectionObserver,
 * no scroll listeners). Content is visible by default if JS/IO is unavailable, and the
 * global reduced-motion rule in index.css collapses the transition to instant.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as: As = 'div',
}: {
  children: ReactNode;
  className?: string;
  /** ms; use small steps (40-80) to stagger siblings. */
  delay?: number;
  as?: 'div' | 'section' | 'li';
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    // Already on screen at mount (above the fold): show immediately, no animation.
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.9) {
      setShown(true);
      return;
    }
    setArmed(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const style: CSSProperties = armed ? { transitionDelay: `${delay}ms` } : {};
  return (
    <As
      ref={ref as never}
      style={style}
      className={cx(
        armed && 'transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]',
        armed && !shown && 'translate-y-6 opacity-0',
        className,
      )}
    >
      {children}
    </As>
  );
}

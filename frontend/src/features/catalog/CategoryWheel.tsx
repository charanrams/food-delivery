import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CategoryDto } from '@a3/contracts';
import { FoodImage, cx } from '@/components/ui';
import { categoryImage, sized } from '@/lib/catalog-api';

const ITEM = 104; // px per category on the wheel

/**
 * Curved category wheel (same as the app): categories sit on an arc — the centred one is
 * highest and largest, neighbours dip and tilt outward. Scrolling snaps a category to the
 * centre and selects it; tapping one rolls it there.
 */
export function CategoryWheel({ categories, index, onSelect }: { categories: CategoryDto[]; index: number; onSelect: (i: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(index); // fractional "which item is centred"
  const [pad, setPad] = useState(0);
  const settle = useRef<ReturnType<typeof setTimeout>>(undefined);
  const programmatic = useRef(false);

  // Side padding so the first and last items can reach the centre.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setPad(Math.max(0, el.clientWidth / 2 - ITEM / 2));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scrollTo = useCallback((i: number, smooth = true) => {
    const el = box.current;
    if (!el) return;
    programmatic.current = true;
    el.scrollTo({ left: i * ITEM, behavior: smooth && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto' });
  }, []);

  // Selection changed elsewhere (dish swipe) → roll the wheel to it.
  useEffect(() => {
    if (Math.round(pos) !== index) scrollTo(index, pad > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, pad]);

  const onScroll = () => {
    const el = box.current;
    if (!el) return;
    setPos(el.scrollLeft / ITEM);
    clearTimeout(settle.current);
    // When the wheel comes to rest, the centred category becomes the selection.
    settle.current = setTimeout(() => {
      const i = Math.min(categories.length - 1, Math.max(0, Math.round(el.scrollLeft / ITEM)));
      programmatic.current = false;
      if (i !== index) onSelect(i);
    }, 120);
  };

  return (
    <div
      ref={box}
      onScroll={onScroll}
      role="listbox"
      aria-label="Categories"
      aria-orientation="horizontal"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') onSelect(Math.min(categories.length - 1, index + 1));
        if (e.key === 'ArrowLeft') onSelect(Math.max(0, index - 1));
      }}
      className="no-scrollbar -mx-4 flex touch-pan-x snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain pb-10 pt-3 outline-none md:mx-auto md:w-full md:max-w-[560px] md:[mask-image:linear-gradient(90deg,transparent,black_18%,black_82%,transparent)]"
      style={{ paddingInline: pad }}
    >
      {categories.map((c, i) => {
        const d = Math.max(-3, Math.min(3, i - pos));
        const on = i === index;
        return (
          <button
            key={c.id}
            type="button"
            role="option"
            aria-selected={on}
            onClick={() => (i === index ? undefined : scrollTo(i))}
            className="flex shrink-0 snap-center flex-col items-center"
            style={{ width: ITEM }}
          >
            <span
              className="flex flex-col items-center will-change-transform"
              // Arc: centre is highest; neighbours dip lower, tilt outward and shrink a little.
              style={{ transform: `translateY(${9 * d * d}px) rotate(${d * 9}deg) scale(${1 - Math.min(0.3, 0.14 * Math.abs(d))})` }}
            >
              <span
                className={cx(
                  'size-[72px] rounded-full p-[3px] transition-[background-color,box-shadow] duration-200',
                  on ? 'bg-primary shadow-[0_6px_16px_rgb(245_130_32/0.35)]' : 'bg-surface shadow-[0_3px_8px_rgb(41_35_31/0.1)]',
                )}
              >
                <span className="block size-full rounded-full bg-surface p-[2px]">
                  <FoodImage src={sized(categoryImage(c), 200)} alt="" className="size-full rounded-full" />
                </span>
              </span>
              <span className={cx('mt-2 max-w-full truncate px-1 text-[13px] transition-colors', on ? 'font-extrabold text-primary-strong' : 'font-semibold text-ink')}>{c.name}</span>
              {/* Curved "smile" underline under the selected category. */}
              <svg width="34" height="10" viewBox="0 0 34 10" aria-hidden className={cx('mt-1 transition-opacity duration-200', on ? 'opacity-100' : 'opacity-0')}>
                <path d="M2 2 Q17 15 32 2" fill="none" className="stroke-primary" strokeWidth="3.2" strokeLinecap="round" />
              </svg>
            </span>
          </button>
        );
      })}
    </div>
  );
}

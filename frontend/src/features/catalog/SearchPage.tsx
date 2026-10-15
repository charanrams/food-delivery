import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Search, Sparkles, X } from 'lucide-react';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { PageFrame } from '@/components/frame';
import { productsQuery } from '@/lib/catalog-api';
import { ProductRow } from './ProductCard';

const POPULAR_SEARCHES = [
  'Biryani',
  'Dosa',
  'Thali',
  'Paneer',
  'Curry',
  'Naan',
  'Meals',
  'Gulab Jamun',
];

/** W03a · Search results / Suggestions / No results */
export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q')?.trim() ?? '';
  const [text, setText] = useState(q);
  const results = useQuery({ ...productsQuery({ search: q }), enabled: q.length > 0 });
  const allProducts = useQuery(productsQuery());

  // Debounced: update ?q= 300 ms after typing stops.
  useEffect(() => {
    const t = setTimeout(() => {
      if (text.trim() !== q) setParams(text.trim() ? { q: text.trim() } : {}, { replace: true });
    }, 300);
    return () => clearTimeout(t);
  }, [text, q, setParams]);

  const selectTag = (tag: string) => {
    setText(tag);
    setParams({ q: tag }, { replace: true });
  };

  return (
    <PageFrame title="Search">
      <div className="flex flex-col gap-6">
        <form role="search" onSubmit={(e) => e.preventDefault()} className="flex h-13 items-center gap-2.5 rounded-[14px] bg-card px-4 focus-within:ring-2 focus-within:ring-ink">
          <Search className="size-5 shrink-0 text-muted" aria-hidden />
          <label htmlFor="q" className="sr-only">
            Search dishes
          </label>
          <input
            id="q"
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search biryani, dosa, thali…"
            className="h-full w-full bg-transparent text-[15px] outline-none placeholder:text-muted"
          />
          {text && (
            <button
              type="button"
              onClick={() => {
                setText('');
                setParams({}, { replace: true });
              }}
              aria-label="Clear search"
              className="grid size-9 place-items-center rounded-full hover:bg-surface"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </form>

        {/* Popular Search tags (no tabs) */}
        <div className="flex flex-col gap-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Popular Searches</h2>
          <div className="flex flex-wrap gap-2">
            {POPULAR_SEARCHES.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => selectTag(tag)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-bold text-ink transition-colors hover:bg-primary-soft hover:text-primary-strong active:scale-95"
              >
                <Search className="size-3 text-primary-strong" aria-hidden />
                {tag}
              </button>
            ))}
          </div>
        </div>

        {!q ? (
          /* Suggested dishes when search is empty */
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
                <Sparkles className="size-4.5 text-primary" aria-hidden />
                Suggested Dishes
              </h2>
              <span className="text-xs font-semibold text-muted">Chef recommendations</span>
            </div>
            {allProducts.isPending ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-30" />
                ))}
              </div>
            ) : allProducts.isError ? (
              <ErrorState onRetry={() => allProducts.refetch()} />
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {(allProducts.data ?? []).slice(0, 6).map((p) => (
                  <ProductRow key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>
        ) : results.isError ? (
          <ErrorState onRetry={() => results.refetch()} />
        ) : results.isPending ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-30" />
            ))}
          </div>
        ) : results.data.length === 0 ? (
          <EmptyState
            icon={<Search className="size-9" />}
            title={`No dishes match “${q}”`}
            body="Try another search term like biryani, dosa, or thali."
          />
        ) : (
          <>
            <p className="text-[15px] font-semibold text-muted" aria-live="polite">
              {results.data.length} {results.data.length === 1 ? 'suggestion found' : 'suggestions found'} for “<span className="font-bold text-ink">{q}</span>”
            </p>
            <div className="grid gap-3 lg:grid-cols-2">
              {results.data.map((p) => (
                <ProductRow key={p.id} product={p} />
              ))}
            </div>
          </>
        )}
      </div>
    </PageFrame>
  );
}

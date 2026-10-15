import { PHOTO_SOURCES } from '@a3/contracts';

const label = (key: string) => (key === 'hero' ? 'Home page thali' : key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));

/** Attribution required by the CC BY / CC BY-SA licences of the menu photos. */
export function CreditsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl">Photo credits</h1>
      <p className="mt-2 max-w-[65ch] text-muted">
        Menu photos are from Wikimedia Commons and are used under the Creative Commons licences listed below. Photos may be cropped or resized.
      </p>
      <ul className="mt-8 divide-y divide-line rounded-2xl bg-surface ring-1 ring-line">
        {PHOTO_SOURCES.map((p) => (
          <li key={p.key} className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-4">
            <span className="font-medium">{label(p.key)}</span>
            <span className="text-sm text-muted">
              <a href={p.page} target="_blank" rel="noreferrer" className="text-primary-strong underline-offset-2 hover:underline">
                {p.author}
              </a>{' '}
              · {p.license}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { MapPinOff, X } from 'lucide-react';

const asked = new Set<string>();

/**
 * Web counterpart of the app's post-login location prompt: asks the browser for location once
 * per session. A site can't switch the device's location on, so if it's off or blocked we
 * explain how to turn it on.
 */
export function LocationNotice({ userId }: { userId: string }) {
  const [problem, setProblem] = useState<'off' | 'blocked' | null>(null);

  useEffect(() => {
    if (asked.has(userId) || !('geolocation' in navigator)) return;
    asked.add(userId);
    navigator.geolocation.getCurrentPosition(
      () => setProblem(null),
      (err) => setProblem(err.code === err.PERMISSION_DENIED ? 'blocked' : 'off'),
      { timeout: 15_000, maximumAge: 300_000 },
    );
  }, [userId]);

  if (!problem) return null;
  return (
    <div role="status" className="mx-auto flex max-w-[1200px] items-start gap-3 px-4 pb-3 md:px-10">
      <div className="flex flex-1 items-start gap-3 rounded-2xl bg-surface p-4 shadow-sm">
        <MapPinOff className="mt-0.5 size-5 shrink-0 text-primary-strong" aria-hidden />
        <p className="flex-1 text-sm">
          {problem === 'off' ? (
            <>
              <strong>Your device location is off.</strong> Turn on location in your device settings so we can find your address.
            </>
          ) : (
            <>
              <strong>Location is blocked for this site.</strong> Allow it from the lock icon in the address bar to find your address faster.
            </>
          )}
        </p>
        <button type="button" onClick={() => setProblem(null)} aria-label="Dismiss" className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-card">
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

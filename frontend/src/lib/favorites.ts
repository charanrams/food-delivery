import { useCallback, useSyncExternalStore } from 'react';

// Favourite dishes live on this device only (same as the apps).
const KEY = 'a3_favorites_v1';
const listeners = new Set<() => void>();

function read(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
let snapshot = read();

function write(ids: string[]) {
  snapshot = ids;
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* private mode: keep in memory */
  }
  listeners.forEach((l) => l());
}

export function useFavorites() {
  const ids = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => snapshot,
  );
  const toggle = useCallback((id: string) => write(snapshot.includes(id) ? snapshot.filter((x) => x !== id) : [...snapshot, id]), []);
  const remove = useCallback((id: string) => write(snapshot.filter((x) => x !== id)), []);
  const clear = useCallback(() => write([]), []);
  return { ids, has: (id: string) => ids.includes(id), toggle, remove, clear };
}

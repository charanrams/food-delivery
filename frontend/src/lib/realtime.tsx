import { useEffect } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from '@/auth/AuthContext';
import { getAccessToken, refreshSession } from './api';

/**
 * Live updates (backend/src/realtime/realtime.ts): the server sends `sync { topics, orderId? }`
 * whenever data changes and we re-fetch the affected queries. Polling stays as a fallback.
 */
type Topic = 'orders' | 'deliveries' | 'notifications' | 'catalog' | 'settings' | 'people' | 'payments' | 'addresses' | 'profile';

/** Which TanStack query keys (by first segment) each topic refreshes. */
const KEYS: Record<Topic, string[][]> = {
  orders: [['orders'], ['order'], ['admin']],
  deliveries: [['delivery']],
  notifications: [['notifications']],
  catalog: [['products'], ['product'], ['categories'], ['specials'], ['offer-sections'], ['quote'], ['admin']],
  settings: [['quote'], ['admin']],
  people: [['admin']],
  payments: [['admin'], ['orders'], ['order']],
  addresses: [['addresses']],
  profile: [['delivery', 'me']],
};

function apply(qc: QueryClient, topics: Topic[]) {
  const seen = new Set<string>();
  for (const t of topics) {
    for (const key of KEYS[t] ?? []) {
      const id = key.join('/');
      if (seen.has(id)) continue;
      seen.add(id);
      void qc.invalidateQueries({ queryKey: key });
    }
  }
}

const SOCKET_ORIGIN = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '') || undefined;

/** Mount once inside QueryClientProvider + AuthProvider. Reconnects as the signed-in user. */
export function RealtimeBridge() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  useEffect(() => {
    const opts = {
      path: '/socket.io',
      withCredentials: true,
      // Sent on every (re)connect, so a rotated access token is picked up automatically.
      auth: (cb: (data: object) => void) => {
        const token = getAccessToken();
        cb(token ? { token } : {});
      },
    };
    const socket: Socket = SOCKET_ORIGIN ? io(SOCKET_ORIGIN, opts) : io(opts);

    socket.on('sync', (e: { topics?: Topic[] }) => apply(qc, e.topics ?? []));
    // After a gap (sleep, network drop) refresh everything we might have missed.
    socket.io.on('reconnect', () => void qc.invalidateQueries());
    socket.on('connect_error', async (err) => {
      if (err.message !== 'unauthorized') return; // network errors: socket.io retries by itself
      const session = await refreshSession(); // expired access token → rotate, then retry
      if (session) socket.connect();
    });

    return () => {
      socket.close();
    };
  }, [qc, userId]);

  return null;
}

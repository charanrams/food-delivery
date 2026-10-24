import type { Server as HttpServer } from 'node:http';
import jwt from 'jsonwebtoken';
import type { Model } from 'mongoose';
import { Server } from 'socket.io';
import type { UserRole } from '@a3/contracts';
import { config } from '../config';
import {
  Address,
  Banner,
  Category,
  DeliveryAssignment,
  DeliveryOtp,
  DeliveryPartnerProfile,
  Notification,
  OfferSection,
  Order,
  Payment,
  Product,
  Settings,
  Special,
  User,
} from '../models';
import { logger } from '../utils/logger';

/**
 * Real-time "something changed" signals (Socket.IO).
 *
 * The server never pushes data over the socket: it watches MongoDB change streams and tells the
 * right audience which TOPICS changed; clients then re-fetch through the normal REST API (so the
 * usual auth/ownership checks still apply). Change streams catch every write, whichever route,
 * admin action, webhook or script made it.
 *
 * Rooms: `public` (everyone, guests too) · `admins` · `user:<id>`.
 * Event: `sync` → { topics: Topic[], orderId?: string }.
 */
export type Topic =
  | 'orders' // customer orders / admin order queue
  | 'deliveries' // a partner's assignments
  | 'notifications'
  | 'catalog' // menu, categories, specials, offer sections
  | 'settings' // fees, hours, serviceable PINs
  | 'people' // admin: customers / partners
  | 'payments'
  | 'addresses'
  | 'profile'; // the signed-in user's own account

let io: Server | undefined;

interface AccessClaims {
  sub: string;
  role: UserRole;
}

export function initRealtime(server: HttpServer): Server {
  io = new Server(server, {
    path: '/socket.io',
    cors: { origin: config().CORS_ORIGINS, credentials: true },
  });

  // Optional auth: no token = guest (public room only); a bad/expired token is refused so the
  // client refreshes it and reconnects as the right user.
  io.use((socket, next) => {
    const token = (socket.handshake.auth as { token?: unknown } | undefined)?.token;
    if (typeof token !== 'string' || !token) return next();
    try {
      const claims = jwt.verify(token, config().JWT_ACCESS_SECRET, { algorithms: ['HS256'] }) as AccessClaims;
      socket.data.user = { id: claims.sub, role: claims.role };
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    void socket.join('public');
    const user = socket.data.user as { id: string; role: UserRole } | undefined;
    if (user) {
      void socket.join(`user:${user.id}`);
      if (user.role === 'ADMIN') void socket.join('admins');
    }
  });

  startWatchers();
  logger.info('realtime: socket.io ready');
  return io;
}

export async function closeRealtime(): Promise<void> {
  await new Promise<void>((resolve) => (io ? io.close(() => resolve()) : resolve()));
  io = undefined;
}

// ---------------------------------------------------------------------------- batching

// Bulk writes (seeding, mark-all-read) would fire many events; batch per room for 300 ms.
const pending = new Map<string, { topics: Set<Topic>; orderId?: string }>();
let flushTimer: NodeJS.Timeout | undefined;

function send(room: string, topics: Topic[], orderId?: string) {
  if (!io) return;
  const entry = pending.get(room) ?? { topics: new Set<Topic>() };
  for (const t of topics) entry.topics.add(t);
  // Only keep the order id when a batch is about a single order.
  entry.orderId = entry.orderId === undefined || entry.orderId === orderId ? orderId : undefined;
  pending.set(room, entry);
  flushTimer ??= setTimeout(flush, 300);
}

function flush() {
  flushTimer = undefined;
  for (const [room, { topics, orderId }] of pending) {
    io?.to(room).emit('sync', { topics: [...topics], ...(orderId ? { orderId } : {}) });
  }
  pending.clear();
}

const idOf = (v: unknown) => (v == null ? undefined : String(v));

// ---------------------------------------------------------------------------- change streams

type Doc = Record<string, unknown> & { _id?: unknown };
type Route = (doc: Doc | undefined, id: string | undefined) => void;

/** collection → who hears about a change */
const routes: [Model<never>, Route][] = [
  [
    Order as unknown as Model<never>,
    (doc, id) => {
      send('admins', ['orders', 'payments'], id);
      if (doc?.customerId) send(`user:${idOf(doc.customerId)}`, ['orders'], id);
      if (doc?.partnerId) send(`user:${idOf(doc.partnerId)}`, ['deliveries'], id);
    },
  ],
  [
    // Covers decline/reassignment: the previous partner still hears about it.
    DeliveryAssignment as unknown as Model<never>,
    (doc) => {
      send('admins', ['orders']);
      if (doc?.partnerId) send(`user:${idOf(doc.partnerId)}`, ['deliveries'], idOf(doc.orderId));
    },
  ],
  [
    // A regenerated delivery code must show up on the customer's tracking screen.
    DeliveryOtp as unknown as Model<never>,
    (doc) => {
      if (doc?.customerId) send(`user:${idOf(doc.customerId)}`, ['orders'], idOf(doc.orderId));
    },
  ],
  [
    Payment as unknown as Model<never>,
    (doc) => {
      send('admins', ['payments', 'orders'], idOf(doc?.orderId));
      if (doc?.customerId) send(`user:${idOf(doc.customerId)}`, ['orders'], idOf(doc.orderId));
    },
  ],
  [
    Notification as unknown as Model<never>,
    (doc) => {
      // Notifications accompany order events, so refresh the user's lists with them.
      if (doc?.userId) send(`user:${idOf(doc.userId)}`, ['notifications', 'orders', 'deliveries']);
    },
  ],
  [Product as unknown as Model<never>, () => send('public', ['catalog'])],
  [Category as unknown as Model<never>, () => send('public', ['catalog'])],
  [Special as unknown as Model<never>, () => send('public', ['catalog'])],
  [OfferSection as unknown as Model<never>, () => send('public', ['catalog'])],
  [Banner as unknown as Model<never>, () => send('public', ['catalog'])],
  [Settings as unknown as Model<never>, () => send('public', ['settings', 'catalog'])],
  [
    User as unknown as Model<never>,
    (_doc, id) => {
      send('admins', ['people']);
      if (id) send(`user:${id}`, ['profile']);
    },
  ],
  [
    DeliveryPartnerProfile as unknown as Model<never>,
    (doc) => {
      send('admins', ['people']);
      if (doc?.userId) send(`user:${idOf(doc.userId)}`, ['profile']);
    },
  ],
  [
    Address as unknown as Model<never>,
    (doc) => {
      if (doc?.userId) send(`user:${idOf(doc.userId)}`, ['addresses']);
    },
  ],
];

function startWatchers() {
  for (const [model, route] of routes) watch(model, route);
}

/** One change stream per collection; restarts itself after errors (e.g. a dropped connection). */
function watch(model: Model<never>, route: Route) {
  let stream: ReturnType<Model<never>['watch']>;
  try {
    stream = model.watch([], { fullDocument: 'updateLookup' });
  } catch (err) {
    logger.error({ err, collection: model.collection.collectionName }, 'realtime: change stream unavailable');
    return;
  }
  stream.on('change', (change: { fullDocument?: Doc; documentKey?: { _id?: unknown } }) => {
    try {
      route(change.fullDocument, idOf(change.documentKey?._id ?? change.fullDocument?._id));
    } catch (err) {
      logger.error({ err }, 'realtime: routing failed');
    }
  });
  stream.on('error', (err: unknown) => {
    logger.warn({ err, collection: model.collection.collectionName }, 'realtime: change stream error, retrying in 5 s');
    void stream.close().catch(() => undefined);
    if (io) setTimeout(() => watch(model, route), 5000).unref();
  });
}

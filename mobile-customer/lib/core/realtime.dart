import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../features/auth/auth_controller.dart';
import '../features/catalog/catalog_providers.dart';
import '../features/home/offer_rows.dart';
import '../features/orders/orders_providers.dart';
import 'api/api_client.dart';

/// Live updates (backend/src/realtime/realtime.ts): the server sends `sync {topics, orderId?}`
/// whenever data changes; we re-fetch the affected providers. Polling stays as a fallback.
/// Watched once from the app root, so it lives for the whole session and reconnects per user.
final realtimeProvider = Provider<void>((ref) {
  ref.watch(authProvider.select((a) => a.value?.id)); // new socket per signed-in user
  final api = ref.read(apiClientProvider);
  final origin = apiBaseUrl.replaceFirst(RegExp(r'/api/v1/?$'), '');

  Map<String, dynamic> auth() {
    final token = api.tokens.accessToken;
    return token == null ? {} : {'token': token};
  }

  final socket = io.io(
    origin,
    io.OptionBuilder()
        .setPath('/socket.io')
        .setTransports(['websocket'])
        .setAuth(auth())
        .enableReconnection()
        .disableAutoConnect()
        .build(),
  );

  void refresh(List<String> topics) {
    for (final t in topics) {
      switch (t) {
        case 'orders' || 'payments':
          ref.invalidate(ordersProvider);
          ref.invalidate(orderProvider);
        case 'notifications':
          ref.invalidate(notificationsProvider);
        case 'catalog':
          ref.invalidate(productsProvider);
          ref.invalidate(productProvider);
          ref.invalidate(categoriesProvider);
          ref.invalidate(popularProvider);
          ref.invalidate(searchProvider);
          ref.invalidate(specialsProvider);
          ref.invalidate(offerSectionsProvider);
          ref.invalidate(quoteProvider);
        case 'settings':
          ref.invalidate(quoteProvider);
        case 'addresses':
          ref.invalidate(addressesProvider);
      }
    }
  }

  socket.on('sync', (data) {
    final topics = (data is Map ? data['topics'] as List? : null)?.cast<String>() ?? const [];
    refresh(topics);
  });
  // Rotated access tokens: always reconnect with the current one.
  socket.io.on('reconnect_attempt', (_) => socket.auth = auth());
  // After a gap (background, network drop) catch up on anything missed.
  socket.io.on('reconnect', (_) => refresh(const ['orders', 'notifications', 'catalog', 'addresses']));
  socket.onConnectError((err) async {
    if ('$err'.contains('unauthorized') && await api.refresh()) {
      socket.auth = auth();
      socket.connect();
    }
  });

  socket.connect();
  ref.onDispose(socket.dispose);
});

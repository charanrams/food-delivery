import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../features/auth/auth_controller.dart';
import '../features/deliveries/deliveries_providers.dart';
import 'api/api_client.dart';

/// Live updates (backend/src/realtime/realtime.ts): new assignments, reassignments, cancellations
/// and profile changes arrive the moment they happen; we re-fetch the affected providers.
/// The 10 s poll in activeDeliveriesProvider stays as a fallback.
final realtimeProvider = Provider<void>((ref) {
  final userId = ref.watch(authProvider.select((a) => a.value?.id));
  // Partners only: nothing to hear about while signed out.
  if (userId == null) return;
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
    if (topics.contains('deliveries') || topics.contains('orders')) {
      ref.invalidate(activeDeliveriesProvider);
      ref.invalidate(deliveryProvider);
      ref.invalidate(historyProvider);
      ref.invalidate(earningsProvider);
      ref.invalidate(statementsProvider);
    }
    if (topics.contains('profile')) {
      ref.read(authProvider.notifier).reload().catchError((_) {});
    }
  }

  socket.on('sync', (data) {
    final topics =
        (data is Map ? data['topics'] as List? : null)?.cast<String>() ??
        const [];
    refresh(topics);
  });
  socket.io.on('reconnect_attempt', (_) => socket.auth = auth());
  socket.io.on('reconnect', (_) => refresh(const ['deliveries', 'profile']));
  socket.onConnectError((err) async {
    if ('$err'.contains('unauthorized') && await api.refresh()) {
      socket.auth = auth();
      socket.connect();
    }
  });

  socket.connect();
  ref.onDispose(socket.dispose);
});

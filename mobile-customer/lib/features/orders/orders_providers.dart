import 'dart:async';
import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/models.dart';
import '../auth/auth_controller.dart';
import '../cart/cart_controller.dart';

/// Per-account data re-fetches whenever the signed-in user changes (no stale data after logout).
void _perUser(Ref ref) => ref.watch(authProvider.select((a) => a.value?.id));

final addressesProvider = FutureProvider<List<Address>>((ref) async {
  _perUser(ref);
  final data = await ref.watch(apiClientProvider).get('/addresses') as List;
  return data.map((j) => Address.fromJson(j as Map<String, dynamic>)).toList();
});

final ordersProvider = FutureProvider<List<Order>>((ref) async {
  _perUser(ref);
  final data = await ref.watch(apiClientProvider).get('/orders') as List;
  return data.map((j) => Order.fromJson(j as Map<String, dynamic>)).toList();
});

/// Live order: re-fetches every 8 s while the order is active (REST polling fallback until
/// Socket.IO/FCM land — docs/ARCHITECTURE.md §9). Stops polling once delivered/cancelled.
final orderProvider = StreamProvider.autoDispose.family<Order, String>((
  ref,
  id,
) async* {
  final api = ref.watch(apiClientProvider);
  Future<Order> load() async =>
      Order.fromJson(await api.get('/orders/$id') as Map<String, dynamic>);
  var order = await load();
  yield order;
  while (order.isActive) {
    await Future<void>.delayed(const Duration(seconds: 8));
    try {
      order = await load();
      yield order;
    } on ApiException catch (e) {
      if (e.code != 'NETWORK_ERROR') {
        rethrow; // keep the last known state while offline
      }
    }
  }
});

final notificationsProvider =
    FutureProvider<({List<AppNotification> items, int unread})>((ref) async {
      _perUser(ref);
      final data =
          await ref.watch(apiClientProvider).get('/notifications')
              as Map<String, dynamic>;
      return (
        items: (data['items'] as List)
            .map((j) => AppNotification.fromJson(j as Map<String, dynamic>))
            .toList(),
        unread: (data['unread'] as num).toInt(),
      );
    });

/// Server-priced preview of the current cart.
final quoteProvider = FutureProvider.autoDispose<Map<String, dynamic>>((
  ref,
) async {
  final lines = ref.watch(cartProvider);
  return await ref.watch(apiClientProvider).post('/orders/quote', {
    'items': cartPayload(lines),
  }) as Map<String, dynamic>;
});

List<Map<String, dynamic>> cartPayload(List<CartLine> lines) => [
  for (final l in lines)
    {
      'productId': l.product.id,
      'variantId': ?l.variant?.id,
      'quantity': l.quantity,
    },
];

/// One key per checkout attempt — retries of the same attempt never create a second order.
String newIdempotencyKey() {
  final r = Random.secure();
  return List.generate(24, (_) => r.nextInt(16).toRadixString(16)).join();
}

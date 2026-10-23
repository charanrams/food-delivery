import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/models.dart';
import '../auth/auth_controller.dart';

/// Active deliveries, refreshed every 10 s so new assignments appear without a manual pull
/// (REST polling until FCM push lands — docs/ARCHITECTURE.md §9).
final activeDeliveriesProvider = StreamProvider.autoDispose<List<Delivery>>((ref) async* {
  ref.watch(authProvider.select((a) => a.value?.id));
  final api = ref.watch(apiClientProvider);
  Future<List<Delivery>> load() async => [for (final j in (await api.get('/delivery/orders') as List)) Delivery.fromJson(j as Map<String, dynamic>)];
  yield await load();
  while (true) {
    await Future<void>.delayed(const Duration(seconds: 10));
    try {
      yield await load();
    } on ApiException catch (e) {
      if (e.code != 'NETWORK_ERROR') rethrow; // keep showing the last list while offline
    }
  }
});

final deliveryProvider = FutureProvider.autoDispose.family<Delivery, String>((ref, id) async {
  return Delivery.fromJson(await ref.watch(apiClientProvider).get('/delivery/orders/$id') as Map<String, dynamic>);
});

final historyProvider = FutureProvider.autoDispose<List<Delivery>>((ref) async {
  ref.watch(authProvider.select((a) => a.value?.id));
  return [for (final j in (await ref.watch(apiClientProvider).get('/delivery/history') as List)) Delivery.fromJson(j as Map<String, dynamic>)];
});

final earningsProvider = FutureProvider.autoDispose<PartnerEarnings>((ref) async {
  ref.watch(authProvider.select((a) => a.value?.id));
  final res = await ref.watch(apiClientProvider).get('/delivery/earnings');
  return PartnerEarnings.fromJson(res as Map<String, dynamic>);
});


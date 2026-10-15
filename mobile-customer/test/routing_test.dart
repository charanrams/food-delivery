import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:a3_customer/core/api/models.dart';
import 'package:a3_customer/features/home/offer_rows.dart';
import 'package:a3_customer/features/auth/auth_controller.dart';
import 'package:a3_customer/features/catalog/catalog_providers.dart';
import 'package:a3_customer/features/orders/orders_providers.dart';
import 'package:a3_customer/routing/app_router.dart';

class _FakeAuth extends AuthController {
  _FakeAuth(this.user);
  final AppUser? user;
  @override
  Future<AppUser?> build() async => user;
}

/// Mounts the real router with a fake session and returns it.
Future<GoRouter> _app(WidgetTester tester, AppUser? user) async {
  final container = ProviderContainer(
    overrides: [
      authProvider.overrideWith(() => _FakeAuth(user)),
      // No network in tests: screens get empty data.
      categoriesProvider.overrideWith((ref) async => const []),
      popularProvider.overrideWith((ref) async => const []),
      productsProvider('').overrideWith((ref) async => const []),
      specialsProvider.overrideWith((ref) async => const <Special>[]),
      offerSectionsProvider.overrideWith((ref) async => const <OfferSection>[]),
      notificationsProvider.overrideWith(
        (ref) async => (items: const <AppNotification>[], unread: 0),
      ),
      addressesProvider.overrideWith((ref) async => const <Address>[]),
      ordersProvider.overrideWith((ref) async => const <Order>[]),
      quoteProvider.overrideWith((ref) async => const <String, dynamic>{}),
    ],
  );
  addTearDown(container.dispose);
  await container.read(authProvider.future);
  final router = container.read(routerProvider);
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp.router(routerConfig: router),
    ),
  );
  await tester.pump(
    const Duration(seconds: 3),
  ); // let the splash finish routing
  return router;
}

String _path(GoRouter r) => r.routerDelegate.currentConfiguration.uri.path;

void main() {
  const ravi = AppUser(id: 'u1', name: 'Ravi', role: 'CUSTOMER');

  testWidgets('guests can browse but are sent to login for ordering screens', (
    tester,
  ) async {
    final router = await _app(tester, null);
    for (final path in ['/', '/menu', '/cart', '/orders', '/profile']) {
      router.go(path);
      await tester.pump();
      expect(_path(router), path, reason: 'guest may browse $path');
    }
    for (final path in [
      '/checkout',
      '/addresses',
      '/notifications',
      '/orders/abc',
    ]) {
      router.go(path);
      await tester.pump();
      expect(_path(router), '/login', reason: path);
    }
  });

  testWidgets('logged-in customers reach checkout and addresses', (
    tester,
  ) async {
    final router = await _app(tester, ravi);
    for (final path in ['/checkout', '/addresses']) {
      router.go(path);
      await tester.pump();
      expect(_path(router), path);
    }
  });
}

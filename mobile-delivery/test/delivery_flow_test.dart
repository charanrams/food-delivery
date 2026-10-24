import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:a3_delivery/core/api/models.dart';
import 'package:a3_delivery/features/auth/auth_controller.dart';
import 'package:a3_delivery/features/deliveries/deliveries_providers.dart';
import 'package:a3_delivery/routing/app_router.dart';

class _FakeAuth extends AuthController {
  _FakeAuth(this.partner);
  final Partner? partner;
  @override
  Future<Partner?> build() async => partner;
  @override
  Future<({bool isEmail, bool exists})> checkIdentifier(String identifier) async =>
      (isEmail: identifier.contains('@'), exists: true);
  @override
  Future<String?> sendPhoneOtp(String phone) async => '482913';
}

Delivery _delivery({String payment = 'COD', String status = 'ASSIGNED', List<String> actions = const ['accept', 'decline']}) => Delivery.fromJson({
      'id': 'o1',
      'orderNumber': 'A3-20261014-0042',
      'status': status,
      'paymentMethod': payment,
      'paymentStatus': payment == 'COD' ? 'PENDING' : 'PAID',
      'totalPaise': 56190,
      'items': [
        {'productName': 'Chicken Dum Biryani', 'variantName': 'Full', 'quantity': 2},
      ],
      'customer': {'name': 'Ravi', 'phone': '+919000000003'},
      'deliveryAddress': {'recipientName': 'Ravi', 'phone': '+919876543210', 'line1': 'Flat 302', 'city': 'Hyderabad', 'postalCode': '500072'},
      'actions': actions,
      'timeline': {'placedAt': '2026-10-14T10:00:00Z'},
    });

Future<GoRouter> _app(WidgetTester tester, Partner? p, List<Delivery> active) async {
  // Phone-sized screen (the default 800x600 test view hides the bottom buttons).
  tester.view.physicalSize = const Size(1080, 2400);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  final container = ProviderContainer(overrides: [
    authProvider.overrideWith(() => _FakeAuth(p)),
    activeDeliveriesProvider.overrideWith((ref) => Stream.value(active)),
    earningsProvider.overrideWith((ref) async => PartnerEarnings.fromJson(const {})),
  ]);
  addTearDown(container.dispose);
  await container.read(authProvider.future);
  final router = container.read(routerProvider);
  await tester.pumpWidget(UncontrolledProviderScope(container: container, child: MaterialApp.router(routerConfig: router)));
  await tester.pump(const Duration(seconds: 3)); // let the splash finish routing
  return router;
}

void main() {
  const suresh = Partner(id: 'p1', name: 'Suresh R.', phone: '+919000000002', online: true, todayDelivered: 3);

  setUp(() => SharedPreferences.setMockInitialValues({}));

  testWidgets('logged-out partners are sent to login', (tester) async {
    final router = await _app(tester, null, const []);
    router.go('/');
    await tester.pumpAndSettle();
    expect(router.routerDelegate.currentConfiguration.uri.path, '/login');
    expect(find.text('Delivery Partner'), findsOneWidget);
  });

  testWidgets('first launch shows the partner onboarding', (tester) async {
    final router = await _app(tester, null, const []);
    expect(router.routerDelegate.currentConfiguration.uri.path, '/onboarding');
    expect(find.text('Deliver for\nA3 Kitchen'), findsOneWidget);
  });

  testWidgets('online partner sees a new assignment with the cash to collect', (tester) async {
    final router = await _app(tester, suresh, [_delivery()]);
    router.go('/');
    await tester.pumpAndSettle();
    expect(find.text('3'), findsWidgets); // delivered-today stat
    expect(find.textContaining('A3-20261014-0042'), findsOneWidget);
    expect(find.text('New Order'), findsOneWidget);
    expect(find.textContaining('collect ₹561.90'), findsOneWidget);
  });

  testWidgets('an empty online list explains that assignments arrive automatically', (tester) async {
    final router = await _app(tester, suresh, const []);
    router.go('/');
    await tester.pumpAndSettle();
    expect(find.text('Waiting for assignments'), findsOneWidget);
  });

  test('prepaid orders never ask the partner to collect cash', () {
    expect(_delivery(payment: 'RAZORPAY').collectCash, isFalse);
    expect(_delivery().collectCash, isTrue);
  });

  testWidgets('login: a mobile number goes to the code step with the server code filled in', (tester) async {
    final router = await _app(tester, null, const []);
    router.go('/login');
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), '9000000002');
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();
    expect(find.text('Enter Code', findRichText: true), findsOneWidget);
    expect(find.text('482913'), findsWidgets); // shown in the code note and filled into the field
    expect(find.text('Your login code'), findsOneWidget);
  });

  testWidgets('login: an email goes to the password step', (tester) async {
    final router = await _app(tester, null, const []);
    router.go('/login');
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'delivery@a3kitchen.in');
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();
    expect(find.text('Enter Password', findRichText: true), findsOneWidget);
    expect(find.text('Forgot password?'), findsOneWidget);
  });
}

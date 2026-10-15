import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:a3_customer/features/auth/login_screen.dart';
import 'package:a3_customer/features/auth/register_screen.dart';

Future<void> _pump(WidgetTester tester, Widget screen) async {
  tester.view.physicalSize = const Size(1080, 2600);
  tester.view.devicePixelRatio = 2.6;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(ProviderScope(child: MaterialApp(home: screen)));
  await tester.pump(const Duration(seconds: 1)); // entrance animation
}

void main() {
  testWidgets(
    'login takes an email or a number and validates it before calling the server',
    (tester) async {
      await _pump(tester, const LoginScreen());
      expect(find.text('Log in or sign up'), findsOneWidget);
      expect(find.text('Email or mobile number'), findsOneWidget);
      expect(find.text('Skip'), findsOneWidget);
      for (final bad in ['12345', 'not-an-email@', 'abc']) {
        await tester.enterText(find.byType(TextField), bad);
        await tester.tap(find.text('Continue'));
        await tester.pump();
        expect(
          find.text('Enter a valid email or 10-digit mobile number.'),
          findsOneWidget,
          reason: bad,
        );
      }
    },
  );

  testWidgets('register opens pre-filled with the email from login', (
    tester,
  ) async {
    await _pump(tester, const RegisterScreen(email: 'new@example.com'));
    expect(find.text('Create your account'), findsOneWidget);
    expect(find.text('new@example.com'), findsOneWidget);
  });

  testWidgets(
    'register opens pre-filled with the number from login and checks every field',
    (tester) async {
      await _pump(tester, const RegisterScreen(phone: '9876543210'));
      expect(find.text('9876543210'), findsOneWidget);
      await tester.tap(find.text('Send OTP'));
      await tester.pump();
      expect(find.text('Enter your full name.'), findsOneWidget);
    },
  );
}

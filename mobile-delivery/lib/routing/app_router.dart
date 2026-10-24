import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/api/models.dart';
import '../core/theme/app_theme.dart';
import '../features/auth/auth_controller.dart';
import '../features/auth/forgot_password_screen.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/onboarding_screen.dart';
import '../features/auth/reset_password_screen.dart';
import '../features/deliveries/delivery_confirmation_screen.dart';
import '../features/deliveries/delivery_screen.dart';
import '../features/deliveries/home_screen.dart';
import '../features/profile/app_settings_screen.dart';
import '../features/profile/bank_kyc_screen.dart';
import '../features/profile/edit_profile_screen.dart';
import '../features/profile/help_support_screen.dart';
import '../features/profile/legal_screens.dart';
import '../features/profile/notifications_screen.dart';
import '../features/profile/payout_history_screen.dart';
import '../features/profile/profile_screens.dart';
import '../features/splash/splash_screen.dart';

const _tabs = [
  (Icons.home_outlined, Icons.home_rounded, 'Home'),
  (
    Icons.account_balance_wallet_outlined,
    Icons.account_balance_wallet,
    'Earnings',
  ),
  (Icons.history_outlined, Icons.history, 'History'),
  (Icons.person_outline, Icons.person, 'Profile'),
];

/// Flow: Splash → Login when logged out, Splash → Deliveries when logged in.
/// Everything except public auth screens needs a partner session; logout lands on Login.
final routerProvider = Provider<GoRouter>((ref) {
  final session = ValueNotifier<AsyncValue<Partner?>>(ref.read(authProvider));
  ref.listen(authProvider, (_, next) => session.value = next);
  ref.onDispose(session.dispose);

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: session,
    redirect: (context, state) {
      final path = state.matchedLocation;
      if (path == '/splash' || session.value.isLoading) return null;
      final loggedIn = session.value.value != null;
      const publicPaths = [
        '/splash',
        '/login',
        '/onboarding',
        '/forgot-password',
        '/reset-password',
      ];
      if (!loggedIn && !publicPaths.contains(path)) return '/login';
      if (loggedIn && (path == '/login' || path == '/onboarding')) return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, _) => const SplashScreen()),
      GoRoute(path: '/onboarding', builder: (_, _) => const OnboardingScreen()),
      GoRoute(path: '/login', builder: (_, _) => const LoginScreen()),
      GoRoute(
        path: '/forgot-password',
        builder: (_, s) => ForgotPasswordScreen(email: s.extra as String?),
      ),
      GoRoute(
        path: '/reset-password',
        builder: (_, s) => ResetPasswordScreen(email: s.extra as String?),
      ),
      StatefulShellRoute.indexedStack(
        // Back on Earnings/History/Profile returns to Home; back on Home leaves the app.
        builder: (context, state, shell) => PopScope(
          canPop: shell.currentIndex == 0,
          onPopInvokedWithResult: (didPop, _) {
            if (!didPop) shell.goBranch(0);
          },
          child: Scaffold(
            backgroundColor: A3Colors.surface,
            body: shell,
            bottomNavigationBar: SafeArea(
              top: false,
              minimum: const EdgeInsets.only(bottom: 10),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(14, 6, 14, 0),
                child: Container(
                  height: 66,
                  decoration: BoxDecoration(
                    color: A3Colors.surface,
                    borderRadius: BorderRadius.circular(26),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x261E1D1B),
                        blurRadius: 24,
                        offset: Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      for (var i = 0; i < _tabs.length; i++)
                        Expanded(
                          child: Semantics(
                            selected: shell.currentIndex == i,
                            button: true,
                            label: _tabs[i].$3,
                            child: InkResponse(
                              onTap: () => shell.goBranch(
                                i,
                                initialLocation: i == shell.currentIndex,
                              ),
                              radius: 36,
                              child: _TabItem(
                                icon: shell.currentIndex == i
                                    ? _tabs[i].$2
                                    : _tabs[i].$1,
                                label: _tabs[i].$3,
                                selected: shell.currentIndex == i,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
        branches: [
          StatefulShellBranch(
            routes: [GoRoute(path: '/', builder: (_, _) => const HomeScreen())],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/earnings',
                builder: (_, _) => const EarningsScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/history',
                builder: (_, _) => const HistoryScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/profile',
                builder: (_, _) => const ProfileScreen(),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: '/delivery/:id',
        builder: (_, s) => DeliveryScreen(orderId: s.pathParameters['id']!),
      ),
      GoRoute(
        path: '/delivery-confirmation',
        builder: (_, s) {
          final extra = s.extra as Map<String, dynamic>? ?? {};
          return DeliveryConfirmationScreen(
            orderNumber: extra['orderNumber'] as String? ?? '#AK12834',
            earningsPaise: extra['earningsPaise'] as int? ?? 4000,
          );
        },
      ),
      GoRoute(path: '/bank-kyc', builder: (_, _) => const BankKycScreen()),
      GoRoute(
        path: '/payout-history',
        builder: (_, _) => const PayoutHistoryScreen(),
      ),
      GoRoute(
        path: '/notifications',
        builder: (_, _) => const NotificationsScreen(),
      ),
      GoRoute(
        path: '/help-support',
        builder: (_, _) => const HelpSupportScreen(),
      ),
      GoRoute(
        path: '/edit-profile',
        builder: (_, _) => const EditProfileScreen(),
      ),
      GoRoute(path: '/settings', builder: (_, _) => const AppSettingsScreen()),
      GoRoute(
        path: '/privacy-policy',
        builder: (_, _) => const PrivacyPolicyScreen(),
      ),
      GoRoute(
        path: '/terms-conditions',
        builder: (_, _) => const TermsConditionsScreen(),
      ),
    ],
  );
});

class _TabItem extends StatelessWidget {
  const _TabItem({
    required this.icon,
    required this.label,
    required this.selected,
  });
  final IconData icon;
  final String label;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(
          icon,
          color: selected ? A3Colors.primary : A3Colors.muted,
          size: 24,
        ),
        const SizedBox(height: 3),
        Text(
          label,
          maxLines: 1,
          style: TextStyle(
            color: selected ? A3Colors.primaryStrong : A3Colors.muted,
            fontSize: 12,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
          ),
        ),
        const SizedBox(height: 3),
        AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOutCubic,
          height: 3,
          width: selected ? 20 : 0,
          decoration: BoxDecoration(
            color: A3Colors.primary,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
      ],
    );
  }
}

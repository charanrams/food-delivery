import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/api/models.dart';
import '../features/auth/auth_controller.dart';
import '../features/auth/login_screen.dart';
import '../features/deliveries/delivery_screen.dart';
import '../features/deliveries/home_screen.dart';
import '../features/profile/profile_screens.dart';
import '../features/splash/splash_screen.dart';

/// Flow: Splash → Login when logged out, Splash → Deliveries when logged in.
/// Everything except splash/login needs a partner session; logout lands on Login.
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
      if (!loggedIn && path != '/login') return '/login';
      if (loggedIn && path == '/login') return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, _) => const SplashScreen()),
      GoRoute(path: '/login', builder: (_, _) => const LoginScreen()),
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => Scaffold(
          body: shell,
          bottomNavigationBar: NavigationBar(
            selectedIndex: shell.currentIndex,
            onDestinationSelected: (i) => shell.goBranch(i, initialLocation: i == shell.currentIndex),
            destinations: const [
              NavigationDestination(icon: Icon(Icons.delivery_dining_outlined), selectedIcon: Icon(Icons.delivery_dining), label: 'Deliveries'),
              NavigationDestination(icon: Icon(Icons.history), label: 'History'),
              NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profile'),
            ],
          ),
        ),
        branches: [
          StatefulShellBranch(routes: [GoRoute(path: '/', builder: (_, _) => const HomeScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/history', builder: (_, _) => const HistoryScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/profile', builder: (_, _) => const ProfileScreen())]),
        ],
      ),
      GoRoute(path: '/delivery/:id', builder: (_, s) => DeliveryScreen(orderId: s.pathParameters['id']!)),
    ],
  );
});

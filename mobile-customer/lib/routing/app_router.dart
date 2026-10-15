import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/api/models.dart';
import '../features/home/offer_rows.dart';
import '../core/location.dart';
import '../core/theme/app_theme.dart';
import '../features/addresses/address_form_screen.dart';
import '../features/addresses/addresses_screen.dart';
import '../features/addresses/location_picker_screen.dart';

import 'package:latlong2/latlong.dart';

import '../features/auth/auth_controller.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/register_screen.dart';
import '../features/cart/cart_controller.dart';
import '../features/cart/cart_screen.dart';
import '../features/catalog/menu_screen.dart';
import '../features/catalog/product_screen.dart';
import '../features/home/home_screen.dart';
import '../features/notifications/notifications_screen.dart';
import '../features/onboarding/onboarding_screen.dart';
import '../features/orders/bill_screen.dart';
import '../features/orders/checkout_screen.dart';
import '../features/orders/order_result_screens.dart';
import '../features/orders/order_tracking_screen.dart';
import '../features/orders/orders_screen.dart';
import '../features/orders/payment_failed_screen.dart';
import '../features/profile/profile_screen.dart';
import '../features/splash/splash_screen.dart';

/// Guests can browse like on the website; ordering and account screens need a login.
const _public = {
  '/splash',
  '/onboarding',
  '/login',
  '/register',
  '/',
  '/menu',
  '/categories',
  '/cart',
  '/orders',
  '/profile',
};
bool _isPublic(String path) =>
    _public.contains(path) ||
    path.startsWith('/product/') ||
    path.startsWith('/offers/');

/// Flow (docs/UX_FLOWS.md): Splash → Login when logged out (with “Continue as guest”),
/// Splash → Home when logged in. Guests browse; checkout/orders/addresses need a login.
/// The redirect re-runs whenever the session changes (login, logout, session revoked).
final routerProvider = Provider<GoRouter>((ref) {
  final session = ValueNotifier<AsyncValue<AppUser?>>(ref.read(authProvider));
  ref.listen(authProvider, (_, next) => session.value = next);
  ref.onDispose(session.dispose);

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: session,
    redirect: (context, state) {
      final auth = session.value;
      final path = state.matchedLocation;
      if (path == '/splash' || auth.isLoading) {
        return null; // splash decides the first stop
      }
      // Login/register screens navigate themselves after success (back to the cart, or Home).
      if (auth.value == null && !_isPublic(path)) return '/login';
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, _) => const SplashScreen()),
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => _TabShell(shell: shell),
        branches: [
          StatefulShellBranch(
            routes: [GoRoute(path: '/', builder: (_, _) => const HomeScreen())],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/categories',
                builder: (_, _) => const CategoriesScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/orders',
                builder: (_, _) => const OrdersScreen(),
                routes: [
                  GoRoute(
                    path: ':id',
                    builder: (_, s) =>
                        OrderTrackingScreen(orderId: s.pathParameters['id']!),
                  ),
                ],
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
          // Cart is the round button beside the bar (index 4), not a pill tab.
          StatefulShellBranch(
            routes: [
              GoRoute(path: '/cart', builder: (_, _) => const CartScreen()),
            ],
          ),
        ],
      ),
      GoRoute(path: '/onboarding', builder: (_, _) => const OnboardingScreen()),
      GoRoute(
        path: '/menu',
        builder: (_, s) => MenuScreen(
          initialCategory: s.uri.queryParameters['category'],
          focusSearch: s.uri.queryParameters['search'] == '1',
        ),
      ),
      GoRoute(path: '/favorites', builder: (_, _) => const FavoritesScreen()),
      GoRoute(
        path: '/offers/:id',
        builder: (_, s) =>
            OfferSectionScreen(sectionId: s.pathParameters['id']!),
      ),
      GoRoute(
        path: '/product/:slug',
        builder: (_, s) => ProductScreen(
          slug: s.pathParameters['slug']!,
          initialProduct: s.extra as Product?,
        ),
      ),
      GoRoute(path: '/checkout', builder: (_, _) => const CheckoutScreen()),
      // Full-screen bill (no tab bar), opened from the order screen.
      GoRoute(
        path: '/bill/:id',
        builder: (_, s) => BillScreen(orderId: s.pathParameters['id']!),
      ),
      GoRoute(path: '/addresses', builder: (_, _) => const AddressesScreen()),
      GoRoute(
        path: '/addresses/select',
        builder: (_, s) => AddressesScreen(selectFor: s.extra as String? ?? ''),
      ),
      GoRoute(
        path: '/addresses/map',
        builder: (_, s) => LocationPickerScreen(initial: s.extra as LatLng?),
      ),
      GoRoute(
        path: '/addresses/new',
        builder: (_, _) => const AddressFormScreen(),
      ),
      GoRoute(
        path: '/addresses/edit',
        builder: (_, s) => AddressFormScreen(existing: s.extra as Address?),
      ),
      GoRoute(
        path: '/order-placed/:id',
        builder: (_, s) => OrderPlacedScreen(orderId: s.pathParameters['id']!),
      ),
      GoRoute(
        path: '/payment-failed',
        builder: (_, s) {
          final e = s.extra as ({String? orderId, String? message})?;
          return PaymentFailedScreen(orderId: e?.orderId, message: e?.message);
        },
      ),
      GoRoute(
        path: '/notifications',
        builder: (_, _) => const NotificationsScreen(),
      ),
      GoRoute(path: '/login', builder: (_, _) => const LoginScreen()),
      GoRoute(
        path: '/register',
        // Login hands over the email or number it couldn't find, so Register starts pre-filled.
        builder: (_, s) {
          final v = s.extra is ({String? email, String? phone})
              ? s.extra! as ({String? email, String? phone})
              : null;
          return RegisterScreen(email: v?.email, phone: v?.phone);
        },
      ),
    ],
  );
});

/// Tab shell: Home, Categories, Orders, Profile in a floating pill + a round Cart button.
class _TabShell extends ConsumerStatefulWidget {
  const _TabShell({required this.shell});
  final StatefulNavigationShell shell;

  @override
  ConsumerState<_TabShell> createState() => _TabShellState();
}

class _TabShellState extends ConsumerState<_TabShell> {
  /// User id we've already asked about location this app session.
  static String? _locationAskedFor;
  DateTime? _lastBackPressTime;

  void _maybeAskLocation(AppUser? user) {
    if (user == null || _locationAskedFor == user.id) return;
    _locationAskedFor = user.id;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) ensureLocationAccess(context);
    });
  }

  @override
  Widget build(BuildContext context) {
    final shell = widget.shell;
    final count = ref.watch(cartCountProvider);
    _maybeAskLocation(ref.watch(authProvider).value);
    const tabs = [
      (Icons.home_outlined, Icons.home_rounded, 'Home'),
      (Icons.grid_view_outlined, Icons.grid_view_rounded, 'Categories'),
      (Icons.receipt_long_outlined, Icons.receipt_long_rounded, 'Orders'),
      (Icons.person_outline_rounded, Icons.person_rounded, 'Profile'),
    ];
    const cartIndex = 4;
    void go(int i) =>
        shell.goBranch(i, initialLocation: i == shell.currentIndex);

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        if (shell.currentIndex != 0) {
          shell.goBranch(0);
          return;
        }
        final now = DateTime.now();
        if (_lastBackPressTime == null ||
            now.difference(_lastBackPressTime!) > const Duration(seconds: 2)) {
          _lastBackPressTime = now;
          ScaffoldMessenger.of(context).hideCurrentSnackBar();
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Press back again to exit'),
              duration: Duration(seconds: 2),
              behavior: SnackBarBehavior.floating,
            ),
          );
          return;
        }
        SystemNavigator.pop();
      },
      child: Scaffold(
        backgroundColor: A3Colors.surface,
        body: shell,
        // Floating bar (reference design): white pill with 4 tabs + a round orange cart button,
        // lifted above the gesture/home-indicator area by SafeArea.
        bottomNavigationBar: SafeArea(
          top: false,
          minimum: const EdgeInsets.only(bottom: 10),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(14, 6, 14, 0),
            child: Row(
              children: [
                Expanded(
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
                        for (var i = 0; i < tabs.length; i++)
                          Expanded(
                            child: Semantics(
                              selected: shell.currentIndex == i,
                              button: true,
                              label: tabs[i].$3,
                              excludeSemantics: true,
                              child: InkResponse(
                                onTap: () => go(i),
                                radius: 36,
                                child: _TabItem(
                                  icon: shell.currentIndex == i
                                      ? tabs[i].$2
                                      : tabs[i].$1,
                                  label: tabs[i].$3,
                                  selected: shell.currentIndex == i,
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                _CartButton(
                  count: count,
                  selected: shell.currentIndex == cartIndex,
                  onTap: () => go(cartIndex),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

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
    final c = selected ? A3Colors.primary : A3Colors.muted;
    final d = MediaQuery.of(context).disableAnimations
        ? Duration.zero
        : const Duration(milliseconds: 220);
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(icon, color: c, size: 25),
        const SizedBox(height: 3),
        Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.fade,
          softWrap: false,
          style: TextStyle(
            color: selected ? A3Colors.primaryStrong : A3Colors.muted,
            fontSize: 12,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
          ),
        ),
        const SizedBox(height: 3),
        AnimatedContainer(
          duration: d,
          curve: Curves.easeOutCubic,
          height: 3,
          width: selected ? 22 : 0,
          decoration: BoxDecoration(
            color: A3Colors.primary,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
      ],
    );
  }
}

class _CartButton extends StatelessWidget {
  const _CartButton({
    required this.count,
    required this.selected,
    required this.onTap,
  });
  final int count;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    selected: selected,
    label: count > 0 ? 'Cart, $count items' : 'Cart',
    excludeSemantics: true,
    child: SizedBox(
      width: 68,
      height: 68,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          DecoratedBox(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 4),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x40B4530A),
                  blurRadius: 18,
                  offset: Offset(0, 8),
                ),
              ],
            ),
            child: Material(
              color: selected ? A3Colors.primaryStrong : A3Colors.primary,
              shape: const CircleBorder(),
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: onTap,
                child: const SizedBox.expand(
                  child: Icon(
                    Icons.shopping_cart_outlined,
                    color: Colors.white,
                    size: 28,
                  ),
                ),
              ),
            ),
          ),
          if (count > 0)
            Positioned(
              right: -2,
              top: -4,
              child: Container(
                constraints: const BoxConstraints(minWidth: 24),
                height: 24,
                padding: const EdgeInsets.symmetric(horizontal: 6),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: A3Colors.primary,
                  shape: BoxShape.rectangle,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white, width: 2),
                ),
                child: Text(
                  '$count',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ),
        ],
      ),
    ),
  );
}

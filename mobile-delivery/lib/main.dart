import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/realtime.dart';
import 'core/prefs.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/theme_mode.dart';
import 'features/auth/auth_controller.dart';
import 'routing/app_router.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final mode = await savedThemeMode();
  runApp(
    ProviderScope(
      overrides: [initialThemeMode.overrideWithValue(mode)],
      child: const A3DeliveryApp(),
    ),
  );
}

class A3DeliveryApp extends ConsumerWidget {
  const A3DeliveryApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Splash, onboarding and auth screens are always light; the saved
    // appearance (default: follow the phone) applies once signed in.
    final signedIn = ref.watch(authProvider.select((a) => a.value != null));
    ref.watch(realtimeProvider); // live assignments / updates while signed in
    final mode = ref.watch(themeModeProvider);
    final dark =
        signedIn &&
        (mode == 'dark' ||
            (mode == 'system' &&
                MediaQuery.platformBrightnessOf(context) == Brightness.dark));
    // Colour tokens are read at build time, so set them before building and
    // rebuild the whole tree (new key) when the appearance flips.
    A3Colors.dark = dark;
    return MaterialApp.router(
      key: ValueKey(dark),
      title: 'A3 Kitchen Delivery',
      debugShowCheckedModeBanner: false,
      theme: buildA3Theme(),
      routerConfig: ref.watch(routerProvider),
    );
  }
}

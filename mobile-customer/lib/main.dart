import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/realtime.dart';
import 'core/theme/app_theme.dart';
import 'routing/app_router.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ProviderScope(child: A3CustomerApp()));
}

class A3CustomerApp extends ConsumerWidget {
  const A3CustomerApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(realtimeProvider); // live updates for the whole session
    return MaterialApp.router(
      title: 'A3 Kitchen',
      debugShowCheckedModeBanner: false,
      theme: buildA3Theme(),
      // No visible scrollbars on any screen (web/desktop show them by default); scrolling still works.
      scrollBehavior: const MaterialScrollBehavior().copyWith(
        scrollbars: false,
      ),
      routerConfig: ref.watch(routerProvider),
    );
  }
}

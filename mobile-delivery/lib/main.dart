import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/theme/app_theme.dart';
import 'routing/app_router.dart';

void main() {
  runApp(const ProviderScope(child: A3DeliveryApp()));
}

class A3DeliveryApp extends ConsumerWidget {
  const A3DeliveryApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'A3 Kitchen Delivery',
      debugShowCheckedModeBanner: false,
      theme: buildA3Theme(),
      routerConfig: ref.watch(routerProvider),
    );
  }
}

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/frame.dart';
import '../../core/widgets/widgets.dart';
import 'orders_providers.dart';

/// Order placed (web W07 counterpart).
class OrderPlacedScreen extends ConsumerWidget {
  const OrderPlacedScreen({super.key, required this.orderId});
  final String orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final order = ref.watch(orderProvider(orderId));
    final text = Theme.of(context).textTheme;
    return _AutoOpen(
      path: '/orders/$orderId',
      ready: order.hasValue,
      child: FramedPage(
        title: 'Order placed',
        showBack: false,
        child: SafeArea(
          top: false,
          child: order.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => AsyncStateView.error(
              message: '$e',
              onRetry: () => ref.invalidate(orderProvider(orderId)),
            ),
            data: (o) => ListView(
              padding: const EdgeInsets.all(A3Spacing.xl),
              children: [
                const SizedBox(height: A3Spacing.xl),
                const Center(
                  child: CircleAvatar(
                    radius: 40,
                    backgroundColor: Color(0x1F2E7D4F),
                    child: Icon(
                      Icons.check_rounded,
                      size: 44,
                      color: A3Colors.success,
                    ),
                  ),
                ),
                const SizedBox(height: A3Spacing.lg),
                Text(
                  'Order placed',
                  textAlign: TextAlign.center,
                  style: text.headlineMedium,
                ),
                const SizedBox(height: A3Spacing.sm),
                Text(
                  o.orderNumber,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: A3Spacing.md),
                Text(
                  'The kitchen is reviewing your order. We’ll update you as soon as it’s accepted.',
                  textAlign: TextAlign.center,
                  style: text.bodyLarge?.copyWith(
                    color: A3Colors.muted,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: A3Spacing.xl),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(A3Spacing.lg),
                    child: Column(
                      children: [
                        _info(
                          Icons.schedule,
                          'Estimated delivery',
                          '35–40 min',
                        ),
                        _info(
                          Icons.account_balance_wallet_outlined,
                          'Payment',
                          o.paymentMethod == 'COD'
                              ? 'Cash on delivery · ${formatPaise(o.totalPaise)}'
                              : o.paymentStatus == 'PAID'
                              ? 'Paid (${o.paymentMethod == 'TEST' ? 'test mode' : 'online'})'
                              : 'Pending',
                        ),
                        _info(
                          Icons.location_on_outlined,
                          'Delivering to',
                          o.addressLine,
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: A3Spacing.xl),
                FilledButton(
                  onPressed: () => context.go('/orders/${o.id}'),
                  child: const Text('Track your order'),
                ),
                const SizedBox(height: A3Spacing.sm),
                OutlinedButton(
                  onPressed: () => context.go('/'),
                  child: const Text('Back to home'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _info(IconData icon, String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 6),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: A3Colors.primary),
        const SizedBox(width: A3Spacing.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(fontSize: 12, color: A3Colors.muted),
              ),
              Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      ],
    ),
  );
}

/// Opens [path] 5 s after [ready] (VSR: Order placed → order page by itself).
class _AutoOpen extends StatefulWidget {
  const _AutoOpen({
    required this.path,
    required this.ready,
    required this.child,
  });
  final String path;
  final bool ready;
  final Widget child;

  @override
  State<_AutoOpen> createState() => _AutoOpenState();
}

class _AutoOpenState extends State<_AutoOpen> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _arm();
  }

  @override
  void didUpdateWidget(_AutoOpen old) {
    super.didUpdateWidget(old);
    _arm();
  }

  void _arm() {
    if (!widget.ready || _timer != null) return;
    _timer = Timer(const Duration(seconds: 5), () {
      if (mounted) context.go(widget.path);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

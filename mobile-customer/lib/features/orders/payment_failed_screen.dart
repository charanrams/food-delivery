import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/frame.dart';
import '../cart/cart_controller.dart';
import 'orders_providers.dart';
import 'razorpay_payer.dart';

/// Payment failed or was cancelled. The cart is untouched, so the customer can retry
/// Razorpay or cancel the unpaid order and switch to cash on delivery.
class PaymentFailedScreen extends ConsumerStatefulWidget {
  const PaymentFailedScreen({super.key, this.orderId, this.message});
  final String? orderId;
  final String? message;

  @override
  ConsumerState<PaymentFailedScreen> createState() =>
      _PaymentFailedScreenState();
}

class _PaymentFailedScreenState extends ConsumerState<PaymentFailedScreen> {
  bool _busy = false;
  String? _message;

  @override
  void initState() {
    super.initState();
    _message = widget.message;
  }

  Future<void> _retry() async {
    final id = widget.orderId!;
    setState(() => _busy = true);
    try {
      final payer = RazorpayPayer(ref.read(apiClientProvider));
      final r = await payer.pay(orderId: id, checkout: await payer.reopen(id));
      if (!mounted) return;
      if (r.result == PayResult.paid) {
        ref.read(cartProvider.notifier).clear();
        ref.invalidate(ordersProvider);
        context.go('/order-placed/$id');
      } else {
        setState(() => _message = r.message);
      }
    } on ApiException catch (e) {
      setState(() => _message = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _switchToCash() async {
    setState(() => _busy = true);
    try {
      if (widget.orderId != null) {
        await ref.read(apiClientProvider).post(
          '/orders/${widget.orderId}/cancel',
          {'reason': 'Switched to cash on delivery'},
        );
        ref.invalidate(ordersProvider);
      }
      if (mounted) context.pop(); // back to checkout; cart is still there
    } on ApiException catch (e) {
      setState(() => _message = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return FramedPage(
      title: 'Payment',
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.all(A3Spacing.xl),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Center(
                child: CircleAvatar(
                  radius: 40,
                  backgroundColor: Color(0x1FC0392B),
                  child: Icon(
                    Icons.credit_card_off_outlined,
                    size: 38,
                    color: A3Colors.danger,
                  ),
                ),
              ),
              const SizedBox(height: A3Spacing.lg),
              Text(
                'Payment didn’t go through',
                textAlign: TextAlign.center,
                style: text.headlineSmall,
              ),
              const SizedBox(height: A3Spacing.sm),
              Semantics(
                liveRegion: true,
                child: Text(
                  _message ?? 'No money was taken.',
                  textAlign: TextAlign.center,
                  style: text.bodyLarge?.copyWith(color: A3Colors.muted),
                ),
              ),
              const SizedBox(height: A3Spacing.xs),
              const Text(
                'Your cart is still saved.',
                textAlign: TextAlign.center,
                style: TextStyle(color: A3Colors.muted),
              ),
              const SizedBox(height: A3Spacing.xl),
              if (widget.orderId != null && RazorpayPayer.supported)
                FilledButton(
                  onPressed: _busy ? null : _retry,
                  child: const Text('Try paying again'),
                ),
              const SizedBox(height: A3Spacing.sm),
              OutlinedButton(
                onPressed: _busy ? null : _switchToCash,
                child: const Text('Pay with cash on delivery instead'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

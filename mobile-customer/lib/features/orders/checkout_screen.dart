import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/api/models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/frame.dart';
import '../../core/widgets/widgets.dart';
import '../cart/cart_controller.dart';
import 'orders_providers.dart';
import 'razorpay_payer.dart';

/// Checkout (web W06 counterpart): address → payment → server-priced summary → place order.
class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  Address? _address;
  String _payment = RazorpayPayer.supported ? 'RAZORPAY' : 'COD';
  bool _placing = false;
  String? _error;
  // One key for this checkout attempt: a retry after a timeout can't create a second order.
  final String _idempotencyKey = newIdempotencyKey();

  Future<void> _place() async {
    final address = _address;
    if (address == null) {
      return setState(() => _error = 'Choose a delivery address.');
    }
    setState(() {
      _placing = true;
      _error = null;
    });
    try {
      final data =
          await ref
                  .read(apiClientProvider)
                  .postWith(
                    '/orders/checkout',
                    {
                      'items': cartPayload(ref.read(cartProvider)),
                      'addressId': address.id,
                      'paymentMethod': _payment,
                    },
                    {'Idempotency-Key': _idempotencyKey},
                  )
              as Map<String, dynamic>;
      final order = Order.fromJson(data);
      ref.invalidate(ordersProvider);
      final checkout = data['razorpay'] as Map<String, dynamic>?;
      if (checkout != null) {
        // Order exists but is unpaid: pay now. The cart stays until the server confirms payment.
        final r = await RazorpayPayer(ref.read(apiClientProvider))
            .pay(orderId: order.id, checkout: checkout);
        if (!mounted) return;
        if (r.result != PayResult.paid) {
          context.push(
            '/payment-failed',
            extra: (orderId: order.id, message: r.message),
          );
          return;
        }
      }
      ref.read(cartProvider.notifier).clear();
      if (mounted) context.go('/order-placed/${order.id}');
    } on ApiException catch (e) {
      if (!mounted) return;
      if (e.code == 'PAYMENT_PROVIDER_ERROR') {
        context.push(
          '/payment-failed',
          extra: (orderId: null, message: e.message),
        );
      } else {
        setState(() => _error = e.message);
        if (e.code == 'PRODUCT_UNAVAILABLE') ref.invalidate(quoteProvider);
      }
    } finally {
      if (mounted) setState(() => _placing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lines = ref.watch(cartProvider);
    final addresses = ref.watch(addressesProvider);
    final quote = ref.watch(quoteProvider);

    // Default to the saved default (serviceable) address once loaded.
    _address ??=
        addresses.value
            ?.where((a) => a.isServiceable)
            .fold<Address?>(
              null,
              (best, a) => best ?? (a.isDefault ? a : null),
            ) ??
        addresses.value?.where((a) => a.isServiceable).firstOrNull;

    if (lines.isEmpty) {
      return FramedPage(
        title: 'Checkout',
        child: const AsyncStateView.empty(
          icon: Icons.shopping_bag_outlined,
          title: 'Your cart is empty',
          message: 'Add dishes from the menu to check out.',
        ),
      );
    }

    return FramedPage(
      title: 'Checkout',
      bottom: FilledButton.icon(
        onPressed: _placing || quote.isLoading || quote.hasError
            ? null
            : _place,
        icon: _placing
            ? const SizedBox.square(
                dimension: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              )
            : const Icon(Icons.lock_outline),
        label: Text(
          quote.hasValue
              ? 'Place order · ${formatPaise((quote.value!['totalPaise'] as num).toInt())}'
              : 'Place order',
        ),
      ),
      child: ListView(
        padding: const EdgeInsets.all(A3Spacing.lg),
        children: [
          const _Heading(
            icon: Icons.location_on_outlined,
            text: 'Delivery address',
          ),
          Card(
            child: ListTile(
              contentPadding: const EdgeInsets.symmetric(
                horizontal: A3Spacing.lg,
                vertical: A3Spacing.sm,
              ),
              title: Text(
                _address == null
                    ? 'Add a delivery address'
                    : '${_address!.labelText} · ${_address!.recipientName}',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
              subtitle: _address == null
                  ? (addresses.isLoading ? const Text('Loading…') : null)
                  : Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(_address!.oneLine),
                    ),
              trailing: Text(
                _address == null ? 'Add' : 'Change',
                style: const TextStyle(
                  color: A3Colors.primaryStrong,
                  fontWeight: FontWeight.w600,
                ),
              ),
              onTap: () async {
                final picked = await context.push<Address>(
                  '/addresses/select',
                  extra: _address?.id ?? '',
                );
                if (picked != null) setState(() => _address = picked);
              },
            ),
          ),
          if (_address != null)
            const Padding(
              padding: EdgeInsets.only(top: A3Spacing.sm),
              child: Row(
                children: [
                  Icon(
                    Icons.check_circle_outline,
                    size: 16,
                    color: A3Colors.success,
                  ),
                  SizedBox(width: 6),
                  Text(
                    'We deliver here · about 35–40 min',
                    style: TextStyle(
                      fontSize: 13,
                      color: A3Colors.success,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: A3Spacing.xl),
          const _Heading(
            icon: Icons.account_balance_wallet_outlined,
            text: 'Payment',
          ),
          RadioGroup<String>(
            groupValue: _payment,
            onChanged: (v) => setState(() => _payment = v ?? 'COD'),
            child: const Column(
              children: [
                _PayOption(
                  value: 'RAZORPAY',
                  title: 'Pay online',
                  subtitle: 'UPI, cards, netbanking · secured by Razorpay',
                ),
                _PayOption(
                  value: 'COD',
                  title: 'Cash on delivery',
                  subtitle: 'Pay the delivery partner when your food arrives',
                ),
              ],
            ),
          ),
          const SizedBox(height: A3Spacing.xl),
          const _Heading(
            icon: Icons.receipt_long_outlined,
            text: 'Order summary',
          ),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(A3Spacing.lg),
              child: quote.when(
                loading: () => const Center(
                  child: Padding(
                    padding: EdgeInsets.all(A3Spacing.lg),
                    child: CircularProgressIndicator(),
                  ),
                ),
                error: (e, _) =>
                    Text('$e', style: const TextStyle(color: A3Colors.danger)),
                data: (q) => Column(
                  children: [
                    for (final i
                        in (q['items'] as List).cast<Map<String, dynamic>>())
                      _Row(
                        '${i['quantity']} × ${i['productName']}${i['variantName'] != null ? ' (${i['variantName']})' : ''}',
                        formatPaise((i['lineTotalPaise'] as num).toInt()),
                        muted: true,
                      ),
                    const Divider(color: A3Colors.line),
                    _Row(
                      'Item total',
                      formatPaise((q['subtotalPaise'] as num).toInt()),
                    ),
                    _Row(
                      'Delivery fee',
                      (q['deliveryFeePaise'] as num) == 0
                          ? 'Free'
                          : formatPaise((q['deliveryFeePaise'] as num).toInt()),
                      good: (q['deliveryFeePaise'] as num) == 0,
                    ),
                    _Row(
                      'Taxes (GST)',
                      formatPaise((q['taxPaise'] as num).toInt()),
                    ),
                    const Divider(color: A3Colors.line),
                    _Row(
                      'To pay',
                      formatPaise((q['totalPaise'] as num).toInt()),
                      bold: true,
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: A3Spacing.sm),
          const Text(
            'Prices are calculated by the kitchen. By placing this order you agree to the cancellation policy.',
            style: TextStyle(fontSize: 12, color: A3Colors.muted),
          ),
          if (_error != null) ...[
            const SizedBox(height: A3Spacing.md),
            Semantics(
              liveRegion: true,
              child: Text(
                _error!,
                style: const TextStyle(
                  color: A3Colors.danger,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _Heading extends StatelessWidget {
  const _Heading({required this.icon, required this.text});
  final IconData icon;
  final String text;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: A3Spacing.sm),
    child: Row(
      children: [
        Icon(icon, color: A3Colors.primary, size: 20),
        const SizedBox(width: 8),
        Text(
          text,
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
        ),
      ],
    ),
  );
}

class _PayOption extends StatelessWidget {
  const _PayOption({
    required this.value,
    required this.title,
    required this.subtitle,
  });
  final String value, title, subtitle;
  @override
  Widget build(BuildContext context) {
    final selected = RadioGroup.maybeOf<String>(context)?.groupValue == value;
    return Card(
      margin: const EdgeInsets.only(bottom: A3Spacing.sm),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: selected ? A3Colors.primary : A3Colors.line,
          width: selected ? 2 : 1,
        ),
      ),
      child: RadioListTile<String>(
        value: value,
        title: Row(
          children: [
            Flexible(
              child: Text(
                title,
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
        subtitle: Text(subtitle, style: const TextStyle(fontSize: 13)),
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row(
    this.a,
    this.b, {
    this.bold = false,
    this.good = false,
    this.muted = false,
  });
  final String a, b;
  final bool bold, good, muted;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(
      children: [
        Expanded(
          child: Text(
            a,
            style: TextStyle(
              fontSize: bold ? 17 : 14,
              fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
              color: muted ? A3Colors.muted : null,
            ),
          ),
        ),
        Text(
          b,
          style: TextStyle(
            fontSize: bold ? 17 : 14,
            fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
            color: good ? A3Colors.success : null,
          ),
        ),
      ],
    ),
  );
}

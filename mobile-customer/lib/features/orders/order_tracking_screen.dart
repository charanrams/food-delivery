import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api/api_client.dart';
import '../../core/api/models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/frame.dart';
import '../../core/widgets/widgets.dart';
import '../cart/cart_controller.dart';
import '../catalog/catalog_providers.dart';
import 'orders_providers.dart';
import 'razorpay_payer.dart';

/// Live tracking with the delivery code (web W08 counterpart). Polls while active.
class OrderTrackingScreen extends ConsumerWidget {
  const OrderTrackingScreen({super.key, required this.orderId});
  final String orderId;

  static const _steps = [
    ('PLACED', 'Order placed', 'placedAt'),
    ('ACCEPTED', 'Accepted by kitchen', 'acceptedAt'),
    ('PREPARING', 'Preparing your food', 'preparingAt'),
    ('READY_FOR_PICKUP', 'Ready for pickup', 'readyAt'),
    ('PICKED_UP', 'Picked up', 'pickedUpAt'),
    ('OUT_FOR_DELIVERY', 'Out for delivery', 'outForDeliveryAt'),
    ('DELIVERED', 'Delivered', 'deliveredAt'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final order = ref.watch(orderProvider(orderId));
    return FramedPage(
      title: order.value?.orderNumber ?? 'Your order',
      actions: [
        IconButton(
          tooltip: 'Download bill',
          color: Colors.white,
          icon: const Icon(Icons.download_rounded),
          onPressed: () => context.push('/bill/$orderId'),
        ),
      ],
      child: order.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => AsyncStateView.error(
          message: '$e',
          onRetry: () => ref.invalidate(orderProvider(orderId)),
        ),
        data: (o) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(orderProvider(orderId)),
          child: ListView(
            padding: const EdgeInsets.all(A3Spacing.lg),
            children: [
              _StatusHeader(order: o),
              const SizedBox(height: A3Spacing.lg),
              if (o.deliveryOtp != null) ...[
                _OtpCard(code: o.deliveryOtp!),
                const SizedBox(height: A3Spacing.lg),
              ],
              if (o.partner != null) ...[
                _PartnerCard(partner: o.partner!),
                const SizedBox(height: A3Spacing.lg),
              ],
              if (o.status == 'CANCELLED' || o.status == 'REJECTED')
                Card(
                  color: A3Colors.danger.withValues(alpha: 0.06),
                  child: Padding(
                    padding: const EdgeInsets.all(A3Spacing.lg),
                    child: Text(
                      '${o.status == 'REJECTED' ? 'The kitchen couldn’t take this order' : 'This order was cancelled'}${o.reason != null ? ': ${o.reason}' : '.'}'
                      '${o.paymentStatus == 'REFUNDED'
                          ? '\nYour payment has been refunded.'
                          : o.paymentStatus == 'REFUND_PENDING'
                          ? '\nYour refund is on its way.'
                          : ''}',
                      style: const TextStyle(
                        color: A3Colors.danger,
                        height: 1.5,
                      ),
                    ),
                  ),
                )
              else
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(A3Spacing.lg),
                    child: _Timeline(order: o),
                  ),
                ),
              const SizedBox(height: A3Spacing.lg),
              _Summary(order: o),
              const SizedBox(height: A3Spacing.lg),
              if (o.actions.contains('pay') && RazorpayPayer.supported) ...[
                FilledButton.icon(
                  onPressed: () => _pay(context, ref, o),
                  icon: const Icon(Icons.lock_outline),
                  label: Text(
                    'Complete payment · ${formatPaise(o.totalPaise)}',
                  ),
                ),
                const SizedBox(height: A3Spacing.sm),
              ],
              if (o.actions.contains('reorder'))
                FilledButton.icon(
                  onPressed: () => _reorder(context, ref, o),
                  icon: const Icon(Icons.replay),
                  label: const Text('Order again'),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _pay(BuildContext context, WidgetRef ref, Order o) async {
    try {
      final payer = RazorpayPayer(ref.read(apiClientProvider));
      final r = await payer.pay(
        orderId: o.id,
        checkout: await payer.reopen(o.id),
      );
      ref.invalidate(orderProvider(o.id));
      if (context.mounted && r.result != PayResult.paid && r.message != null) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(r.message!)));
      }
    } on ApiException catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  /// Re-adds items using current menu prices; unavailable dishes are skipped with a note.
  Future<void> _reorder(BuildContext context, WidgetRef ref, Order o) async {
    final cart = ref.read(cartProvider.notifier);
    var skipped = 0;
    for (final item in o.items) {
      try {
        final p = await ref.read(productProvider(item.productId).future);
        final v =
            p.variants.where((x) => x.name == item.variantName).firstOrNull ??
            p.defaultVariant;
        if (!p.isAvailable || (p.variants.isNotEmpty && v == null)) {
          skipped++;
          continue;
        }
        cart.add(p, v, item.quantity);
      } catch (_) {
        skipped++;
      }
    }
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          skipped == 0
              ? 'Added to your cart.'
              : 'Added to your cart — $skipped dish(es) are unavailable now.',
        ),
      ),
    );
    if (skipped < o.items.length) context.go('/cart');
  }
}

class _StatusHeader extends StatelessWidget {
  const _StatusHeader({required this.order});
  final Order order;
  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final headline = switch (order.status) {
      'PLACED' => 'Waiting for the kitchen',
      'ACCEPTED' || 'PREPARING' => 'Your food is being prepared',
      'READY_FOR_PICKUP' || 'ASSIGNED' => 'Packed and ready',
      'PICKED_UP' || 'OUT_FOR_DELIVERY' => 'On the way to you',
      'DELIVERED' => 'Delivered — enjoy!',
      _ => orderStatusLabel[order.status] ?? order.status,
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        StatusChip(status: order.status),
        const SizedBox(height: A3Spacing.sm),
        Text(headline, style: text.headlineSmall),
        const SizedBox(height: 4),
        Text(
          'Placed ${shortDate(order.placedAt)}${order.isActive ? ' · updates automatically' : ''}',
          style: const TextStyle(color: A3Colors.muted, fontSize: 13),
        ),
      ],
    );
  }
}

class _OtpCard extends StatelessWidget {
  const _OtpCard({required this.code});
  final String code;
  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Your delivery code is ${code.split('').join(' ')}',
      child: Container(
        padding: const EdgeInsets.all(A3Spacing.lg),
        decoration: BoxDecoration(
          color: A3Colors.primarySoft,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(
                  Icons.key_rounded,
                  color: A3Colors.primaryStrong,
                  size: 20,
                ),
                SizedBox(width: 8),
                Text(
                  'Your delivery code',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color: A3Colors.primaryStrong,
                  ),
                ),
              ],
            ),
            const SizedBox(height: A3Spacing.md),
            ExcludeSemantics(
              child: Row(
                children: [
                  for (final d in code.split(''))
                    Expanded(
                      child: Container(
                        margin: const EdgeInsets.symmetric(horizontal: 3),
                        height: 58,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: A3Colors.surface,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          d,
                          style: const TextStyle(
                            fontFamily: 'Outfit',
                            fontSize: 30,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: A3Spacing.md),
            const Text(
              'Share this code with your delivery partner only when you have your food. A3 Kitchen will never ask for it on a call.',
              style: TextStyle(fontSize: 13, height: 1.45),
            ),
          ],
        ),
      ),
    );
  }
}

class _PartnerCard extends StatelessWidget {
  const _PartnerCard({required this.partner});
  final OrderPartner partner;
  @override
  Widget build(BuildContext context) => Card(
    child: ListTile(
      contentPadding: const EdgeInsets.symmetric(
        horizontal: A3Spacing.lg,
        vertical: A3Spacing.sm,
      ),
      leading: CircleAvatar(
        backgroundColor: A3Colors.primarySoft,
        child: Text(
          partner.name.characters.first,
          style: const TextStyle(
            color: A3Colors.primaryStrong,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      title: Text(
        partner.name,
        style: const TextStyle(fontWeight: FontWeight.w600),
      ),
      subtitle: Text(
        partner.vehicle?.isNotEmpty == true
            ? 'Your delivery partner · ${partner.vehicle}'
            : 'Your delivery partner',
      ),
      trailing: IconButton.filledTonal(
        tooltip: 'Call ${partner.name}',
        icon: const Icon(Icons.call_outlined),
        onPressed: () async {
          if (!await launchUrl(Uri(scheme: 'tel', path: partner.phone))) {
            await Clipboard.setData(ClipboardData(text: partner.phone));
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text(
                    'Number copied — your device can’t place calls.',
                  ),
                ),
              );
            }
          }
        },
      ),
    ),
  );
}

class _Timeline extends StatelessWidget {
  const _Timeline({required this.order});
  final Order order;
  @override
  Widget build(BuildContext context) {
    final steps = OrderTrackingScreen._steps;
    // ASSIGNED sits between "ready" and "picked up" for the customer.
    final status = order.status == 'ASSIGNED'
        ? 'READY_FOR_PICKUP'
        : order.status;
    final current = steps.indexWhere((s) => s.$1 == status);
    return Column(
      children: [
        for (var i = 0; i < steps.length; i++)
          _Step(
            label: steps[i].$2,
            time: order.timeline[steps[i].$3],
            state: i < current || order.status == 'DELIVERED'
                ? 'done'
                : i == current
                ? 'current'
                : 'pending',
            last: i == steps.length - 1,
            hint:
                steps[i].$1 == 'OUT_FOR_DELIVERY' &&
                    status == 'OUT_FOR_DELIVERY'
                ? 'Share your delivery code at the door'
                : null,
          ),
      ],
    );
  }
}

class _Step extends StatelessWidget {
  const _Step({
    required this.label,
    required this.state,
    required this.last,
    this.time,
    this.hint,
  });
  final String label, state;
  final bool last;
  final DateTime? time;
  final String? hint;
  @override
  Widget build(BuildContext context) {
    final done = state == 'done', current = state == 'current';
    return Semantics(
      label:
          '$label, ${done
              ? 'completed'
              : current
              ? 'in progress'
              : 'not yet'}',
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Column(
              children: [
                Container(
                  width: 26,
                  height: 26,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: done
                        ? A3Colors.success
                        : current
                        ? A3Colors.primary
                        : A3Colors.surface,
                    border: done || current
                        ? null
                        : Border.all(color: A3Colors.line, width: 2),
                  ),
                  child: done
                      ? const Icon(Icons.check, size: 16, color: Colors.white)
                      : current
                      ? const Icon(
                          Icons.delivery_dining,
                          size: 15,
                          color: Colors.white,
                        )
                      : null,
                ),
                if (!last)
                  Expanded(
                    child: Container(
                      width: 2,
                      color: done ? A3Colors.success : A3Colors.line,
                    ),
                  ),
              ],
            ),
            const SizedBox(width: A3Spacing.md),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(top: 3, bottom: A3Spacing.lg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: ExcludeSemantics(
                            child: Text(
                              label,
                              style: TextStyle(
                                fontWeight: current
                                    ? FontWeight.w700
                                    : done
                                    ? FontWeight.w500
                                    : FontWeight.w400,
                                color: state == 'pending'
                                    ? A3Colors.muted
                                    : null,
                              ),
                            ),
                          ),
                        ),
                        if (time != null)
                          Text(
                            timeOfDay(time!),
                            style: const TextStyle(
                              fontSize: 12,
                              color: A3Colors.muted,
                            ),
                          ),
                      ],
                    ),
                    if (hint != null)
                      Text(
                        hint!,
                        style: const TextStyle(
                          fontSize: 13,
                          color: A3Colors.primaryStrong,
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

const _payMethod = {'RAZORPAY': 'Online (Razorpay)', 'COD': 'Cash on delivery'};
const _payStatus = {
  'PAID': 'Paid',
  'PENDING': 'Pending',
  'AUTHORIZED': 'Authorised',
  'FAILED': 'Failed',
  'REFUND_PENDING': 'Refund in progress',
  'PARTIALLY_REFUNDED': 'Partly refunded',
  'REFUNDED': 'Refunded',
};

String _when(DateTime d) {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  final h = d.hour % 12 == 0 ? 12 : d.hour % 12;
  final m = d.minute.toString().padLeft(2, '0');
  return '${d.day} ${months[d.month - 1]}, $h:$m ${d.hour < 12 ? 'am' : 'pm'}';
}

/// Full order summary: items, price breakdown, payment and delivery details (mirrors web).
class _Summary extends StatelessWidget {
  const _Summary({required this.order});
  final Order order;

  @override
  Widget build(BuildContext context) {
    final o = order;
    final count = o.items.fold<int>(0, (n, i) => n + i.quantity);
    const pad = EdgeInsets.symmetric(horizontal: A3Spacing.lg);
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: A3Colors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: A3Colors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              A3Spacing.lg,
              A3Spacing.lg,
              A3Spacing.lg,
              4,
            ),
            child: Row(
              children: [
                const Expanded(
                  child: Text(
                    'Order summary',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17),
                  ),
                ),
                Text(
                  '$count item${count == 1 ? '' : 's'}',
                  style: const TextStyle(fontSize: 13, color: A3Colors.muted),
                ),
              ],
            ),
          ),
          for (final (idx, i) in o.items.indexed) ...[
            if (idx > 0)
              const Divider(
                height: 1,
                indent: A3Spacing.lg,
                endIndent: A3Spacing.lg,
                color: A3Colors.line,
              ),
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: A3Spacing.lg,
                vertical: 12,
              ),
              child: Row(
                children: [
                  SizedBox(
                    width: 48,
                    height: 48,
                    child: FoodImage(url: i.imageUrl, width: 120, radius: 12),
                  ),
                  const SizedBox(width: A3Spacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          i.name,
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                        if (i.variantName != null)
                          Text(
                            i.variantName!,
                            style: const TextStyle(
                              fontSize: 13,
                              color: A3Colors.muted,
                            ),
                          ),
                        Text(
                          '${i.quantity} × ${formatPaise(i.lineTotalPaise ~/ i.quantity)}',
                          style: const TextStyle(
                            fontSize: 13,
                            color: A3Colors.muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    formatPaise(i.lineTotalPaise),
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
          ],
          const Padding(
            padding: pad,
            child: Divider(height: 1, color: A3Colors.line),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(
              A3Spacing.lg,
              12,
              A3Spacing.lg,
              12,
            ),
            child: Column(
              children: [
                _Line('Item total', formatPaise(o.subtotalPaise)),
                if (o.discountPaise > 0)
                  _Line(
                    'Discount',
                    '− ${formatPaise(o.discountPaise)}',
                    valueColor: A3Colors.success,
                  ),
                _Line(
                  'Delivery fee',
                  o.deliveryFeePaise == 0
                      ? 'Free'
                      : formatPaise(o.deliveryFeePaise),
                ),
                _Line('GST', formatPaise(o.taxPaise)),
              ],
            ),
          ),
          Container(
            margin: const EdgeInsets.fromLTRB(
              A3Spacing.lg,
              0,
              A3Spacing.lg,
              A3Spacing.lg,
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: A3Colors.primarySoft,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    o.paymentStatus == 'PAID'
                        ? 'Total paid'
                        : o.paymentMethod == 'COD'
                        ? 'To pay on delivery'
                        : 'Total',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
                Text(
                  formatPaise(o.totalPaise),
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 19,
                    color: A3Colors.primaryStrong,
                  ),
                ),
              ],
            ),
          ),
          Container(
            color: A3Colors.card.withValues(alpha: 0.5),
            padding: const EdgeInsets.all(A3Spacing.lg),
            child: Column(
              children: [
                _Line('Order number', o.orderNumber),
                _Line('Placed on', _when(o.placedAt)),
                _Line(
                  'Payment',
                  _payMethod[o.paymentMethod] ?? o.paymentMethod,
                ),
                _Line(
                  'Payment status',
                  _payStatus[o.paymentStatus] ?? o.paymentStatus,
                ),
                if (o.timeline['deliveredAt'] != null)
                  _Line('Delivered at', _when(o.timeline['deliveredAt']!)),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(A3Spacing.lg),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.location_on_outlined,
                  size: 20,
                  color: A3Colors.primaryStrong,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Delivering to',
                        style: TextStyle(fontWeight: FontWeight.w600),
                      ),
                      Text(
                        o.addressLine,
                        style: const TextStyle(color: A3Colors.muted),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Line extends StatelessWidget {
  const _Line(this.label, this.value, {this.valueColor});
  final String label, value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Text(
            label,
            style: const TextStyle(color: A3Colors.muted, fontSize: 14),
          ),
        ),
        const SizedBox(width: 12),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.right,
            style: TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 14,
              color: valueColor ?? A3Colors.ink,
            ),
          ),
        ),
      ],
    ),
  );
}

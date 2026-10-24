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
    ('PLACED', 'Order\nPlaced', 'placedAt', Icons.soup_kitchen_outlined),
    (
      'ACCEPTED',
      'Accepted\nby Kitchen',
      'acceptedAt',
      Icons.check_circle_outline,
    ),
    (
      'PREPARING',
      'Preparing\nyour Food',
      'preparingAt',
      Icons.outdoor_grill_outlined,
    ),
    (
      'READY_FOR_PICKUP',
      'Ready for\nPickup',
      'readyAt',
      Icons.shopping_bag_outlined,
    ),
    (
      'PICKED_UP',
      'Picked up\nby Partner',
      'pickedUpAt',
      Icons.delivery_dining_outlined,
    ),
    (
      'OUT_FOR_DELIVERY',
      'Out for\nDelivery',
      'outForDeliveryAt',
      Icons.location_on_outlined,
    ),
    ('DELIVERED', 'Delivered', 'deliveredAt', Icons.home_outlined),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final order = ref.watch(orderProvider(orderId));
    return FramedPage(
      art: true,
      title: 'Track Order',
      subtitle: order.value == null
          ? null
          : 'Order #${order.value!.orderNumber}',
      actions: [
        ArtIconButton(
          tooltip: 'Download bill',
          icon: Icons.download_rounded,
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
                _Timeline(order: o),
              const SizedBox(height: A3Spacing.lg),
              _Summary(order: o),
              const SizedBox(height: A3Spacing.md),
              _Details(order: o),
              const SizedBox(height: A3Spacing.md),
              _AddressCard(order: o),
              const SizedBox(height: A3Spacing.md),
              const _HelpCard(),
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
                  onPressed: () => reorderOrder(context, ref, o),
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
}

/// Re-adds items using current menu prices; unavailable dishes are skipped with a note.
Future<void> reorderOrder(BuildContext context, WidgetRef ref, Order o) async {
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

class _StatusHeader extends StatelessWidget {
  const _StatusHeader({required this.order});
  final Order order;
  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final unpaid =
        order.paymentMethod == 'RAZORPAY' && order.paymentStatus != 'PAID';
    final (headline, blurb) = switch (order.status) {
      'PLACED' when unpaid => (
        'Waiting for payment',
        'Complete the payment so the kitchen can start on your order.',
      ),
      'PLACED' => (
        'Waiting for the kitchen',
        'Your order has been placed and is waiting for the kitchen to accept it.',
      ),
      'ACCEPTED' => (
        'The kitchen accepted your order',
        'The kitchen will start cooking in a moment.',
      ),
      'PREPARING' => (
        'Your food is being prepared',
        'Your food is being freshly prepared by the kitchen.',
      ),
      'READY_FOR_PICKUP' => (
        'Packed and ready',
        'Your order is packed and waiting for a delivery partner.',
      ),
      'ASSIGNED' => (
        'A partner is on the way to the kitchen',
        'Your delivery partner will collect it shortly.',
      ),
      'PICKED_UP' => (
        'Your order has been picked up',
        'Your delivery partner has your food.',
      ),
      'OUT_FOR_DELIVERY' => (
        'On the way to you',
        'Share your delivery code at the door.',
      ),
      'DELIVERED' => (
        'Delivered. Enjoy your meal!',
        'Thanks for ordering from A3 Kitchen.',
      ),
      _ => (
        orderStatusLabel[order.status] ?? order.status,
        'This order won’t be delivered.',
      ),
    };
    final ended = order.status == 'CANCELLED' || order.status == 'REJECTED';
    final delivered = order.timeline['deliveredAt'];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        StatusChip(status: order.status),
        const SizedBox(height: A3Spacing.sm),
        Row(
          children: [
            Flexible(child: Text(headline, style: text.headlineSmall)),
            if (!ended) ...[
              const SizedBox(width: 8),
              const Icon(
                Icons.soup_kitchen_outlined,
                color: A3Colors.primary,
                size: 24,
              ),
            ],
          ],
        ),
        const SizedBox(height: 4),
        Text(
          blurb,
          style: const TextStyle(
            color: A3Colors.muted,
            fontSize: 14,
            height: 1.4,
          ),
        ),
        if (!ended) ...[
          const SizedBox(height: A3Spacing.md),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: A3Colors.primarySoft.withValues(alpha: 0.6),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.schedule_rounded,
                  color: A3Colors.primaryStrong,
                  size: 28,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        delivered != null
                            ? 'Delivered at'
                            : 'Estimated arrival',
                        style: const TextStyle(
                          fontSize: 12,
                          color: A3Colors.muted,
                        ),
                      ),
                      Text(
                        delivered != null ? timeOfDay(delivered) : '30–40 mins',
                        style: const TextStyle(
                          fontFamily: 'Outfit',
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: A3Colors.primaryStrong,
                        ),
                      ),
                      Text(
                        'Placed on ${_when(order.placedAt)}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: A3Colors.muted,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
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
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (var i = 0; i < steps.length; i++) ...[
            if (i > 0)
              Padding(
                padding: const EdgeInsets.only(top: 27),
                child: _Dashes(on: i <= current || order.status == 'DELIVERED'),
              ),
            _Step(
              label: steps[i].$2,
              icon: steps[i].$4,
              time: order.timeline[steps[i].$3],
              state: i < current || order.status == 'DELIVERED'
                  ? 'done'
                  : i == current
                  ? 'current'
                  : 'pending',
            ),
          ],
        ],
      ),
    );
  }
}

class _Dashes extends StatelessWidget {
  const _Dashes({required this.on});
  final bool on;
  @override
  Widget build(BuildContext context) => Row(
    children: [
      for (var i = 0; i < 3; i++)
        Container(
          width: 4,
          height: 2,
          margin: const EdgeInsets.symmetric(horizontal: 1.5),
          color: on ? A3Colors.primary : A3Colors.line,
        ),
    ],
  );
}

class _Step extends StatelessWidget {
  const _Step({
    required this.label,
    required this.icon,
    required this.state,
    this.time,
  });
  final String label, state;
  final IconData icon;
  final DateTime? time;
  @override
  Widget build(BuildContext context) {
    final current = state == 'current', pending = state == 'pending';
    return Semantics(
      label:
          '${label.replaceAll('\n', ' ')}, ${state == 'done'
              ? 'completed'
              : current
              ? 'in progress'
              : 'not yet'}',
      child: ExcludeSemantics(
        child: SizedBox(
          width: 64,
          child: Column(
            children: [
              Container(
                width: 54,
                height: 54,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: current
                      ? A3Colors.primary
                      : pending
                      ? A3Colors.card
                      : A3Colors.primarySoft,
                  boxShadow: current
                      ? const [
                          BoxShadow(
                            color: Color(0x55E8761E),
                            blurRadius: 12,
                            offset: Offset(0, 4),
                          ),
                        ]
                      : null,
                ),
                child: Icon(
                  icon,
                  size: 24,
                  color: current
                      ? Colors.white
                      : pending
                      ? A3Colors.muted
                      : A3Colors.primaryStrong,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                label,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 11.5,
                  height: 1.3,
                  fontWeight: pending ? FontWeight.w500 : FontWeight.w700,
                  color: pending ? A3Colors.muted : A3Colors.primaryStrong,
                ),
              ),
              if (time != null)
                Text(
                  timeOfDay(time!),
                  style: const TextStyle(fontSize: 11, color: A3Colors.muted),
                ),
            ],
          ),
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
                    'Order Summary',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17),
                  ),
                ),
                Text(
                  '$count Item${count == 1 ? '' : 's'}',
                  style: const TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                    color: A3Colors.primaryStrong,
                  ),
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
                    width: 96,
                    height: 72,
                    child: FoodImage(url: i.imageUrl, width: 240, radius: 14),
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

const _card = BoxDecoration(
  color: A3Colors.surface,
  borderRadius: BorderRadius.all(Radius.circular(20)),
  border: Border.fromBorderSide(BorderSide(color: A3Colors.line)),
);

/// Order number, time, payment method and a payment-status pill.
class _Details extends StatelessWidget {
  const _Details({required this.order});
  final Order order;
  @override
  Widget build(BuildContext context) {
    final o = order;
    final paid = o.paymentStatus == 'PAID';
    return Container(
      padding: const EdgeInsets.all(A3Spacing.lg),
      decoration: _card,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Order Details',
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17),
          ),
          const SizedBox(height: 8),
          _Line('Order number', o.orderNumber),
          _Line('Placed on', _when(o.placedAt)),
          _Line(
            'Payment method',
            _payMethod[o.paymentMethod] ?? o.paymentMethod,
          ),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              children: [
                const Expanded(
                  child: Text(
                    'Payment status',
                    style: TextStyle(color: A3Colors.muted, fontSize: 14),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: paid
                        ? A3Colors.success.withValues(alpha: 0.12)
                        : A3Colors.primarySoft,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    _payStatus[o.paymentStatus] ?? o.paymentStatus,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: paid ? A3Colors.success : A3Colors.primaryStrong,
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (o.timeline['deliveredAt'] != null)
            _Line('Delivered at', _when(o.timeline['deliveredAt']!)),
        ],
      ),
    );
  }
}

/// Delivery address with a "View on Map" link.
class _AddressCard extends StatelessWidget {
  const _AddressCard({required this.order});
  final Order order;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(A3Spacing.lg),
    decoration: _card,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.location_on, color: A3Colors.primary, size: 26),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Delivering to',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    order.addressLine,
                    style: const TextStyle(color: A3Colors.muted, height: 1.4),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: A3Spacing.sm),
        Align(
          alignment: Alignment.centerRight,
          child: FilledButton.tonalIcon(
            style: FilledButton.styleFrom(
              backgroundColor: A3Colors.primarySoft,
              foregroundColor: A3Colors.primaryStrong,
            ),
            onPressed: () => launchUrl(
              Uri.https('www.google.com', '/maps/search/', {
                'api': '1',
                'query': order.addressLine,
              }),
              mode: LaunchMode.externalApplication,
            ),
            icon: const Icon(Icons.near_me_outlined, size: 18),
            label: const Text('View on Map'),
          ),
        ),
      ],
    ),
  );
}

/// "Need help with your order?" with a call-support button (same line as Account → Help).
class _HelpCard extends StatelessWidget {
  const _HelpCard();
  static const _phone = '+9118001234567';
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(A3Spacing.lg),
    decoration: BoxDecoration(
      color: A3Colors.primarySoft.withValues(alpha: 0.6),
      borderRadius: BorderRadius.circular(20),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Row(
          children: [
            CircleAvatar(
              radius: 24,
              backgroundColor: Colors.white,
              child: Icon(
                Icons.headset_mic_outlined,
                color: A3Colors.primaryStrong,
              ),
            ),
            SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Need help with your order?',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: A3Colors.primaryStrong,
                    ),
                  ),
                  Text(
                    'Contact our support team for any issues.',
                    style: TextStyle(fontSize: 13, color: A3Colors.muted),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: A3Spacing.md),
        OutlinedButton(
          style: OutlinedButton.styleFrom(
            backgroundColor: Colors.white,
            foregroundColor: A3Colors.primaryStrong,
            side: const BorderSide(color: A3Colors.primary),
          ),
          onPressed: () async {
            if (!await launchUrl(Uri(scheme: 'tel', path: _phone))) {
              await Clipboard.setData(const ClipboardData(text: _phone));
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Support number copied.')),
                );
              }
            }
          },
          child: const Text('Contact Support'),
        ),
      ],
    ),
  );
}

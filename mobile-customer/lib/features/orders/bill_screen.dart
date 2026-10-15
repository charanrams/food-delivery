import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models.dart';
import '../../core/kitchen.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/widgets.dart';
import 'orders_providers.dart';

const _paymentLabel = {
  'PAID': 'Paid',
  'PENDING': 'Payment pending',
  'AUTHORIZED': 'Authorised',
  'FAILED': 'Payment failed',
  'REFUND_PENDING': 'Refund in progress',
  'PARTIALLY_REFUNDED': 'Partly refunded',
  'REFUNDED': 'Refunded',
};

String _date(DateTime d) {
  const m = [
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
  return '${d.day} ${m[d.month - 1]} ${d.year}, $h:${d.minute.toString().padLeft(2, '0')} ${d.hour < 12 ? 'am' : 'pm'}';
}

/// Order bill (same layout as the web bill): logo band, billed-to, items table, totals.
/// Available from the moment the order is placed.
class BillScreen extends ConsumerWidget {
  const BillScreen({super.key, required this.orderId});
  final String orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final order = ref.watch(orderProvider(orderId));
    return AnnotatedRegion(
      value: SystemUiOverlayStyle.dark,
      child: Scaffold(
        backgroundColor: A3Colors.background,
        appBar: AppBar(
          backgroundColor: A3Colors.background,
          title: const Text('Bill'),
          leading: IconButton(
            tooltip: 'Back',
            icon: const Icon(Icons.arrow_back_rounded),
            onPressed: () =>
                context.canPop() ? context.pop() : context.go('/orders'),
          ),
          actions: [
            if (order.value != null)
              IconButton(
                tooltip: 'Copy order number',
                icon: const Icon(Icons.copy_rounded),
                onPressed: () {
                  Clipboard.setData(
                    ClipboardData(text: order.value!.orderNumber),
                  );
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      behavior: SnackBarBehavior.floating,
                      content: Text('Order number copied'),
                    ),
                  );
                },
              ),
          ],
        ),
        body: order.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => AsyncStateView.error(
            message: '$e',
            onRetry: () => ref.invalidate(orderProvider(orderId)),
          ),
          data: (o) => ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
            children: [_Bill(o: o)],
          ),
        ),
      ),
    );
  }
}

class _Bill extends StatelessWidget {
  const _Bill({required this.o});
  final Order o;

  @override
  Widget build(BuildContext context) {
    final a = o.address;
    final voided = o.status == 'CANCELLED' || o.status == 'REJECTED';
    final itemsTotal = o.subtotalPaise;
    final gstRate = itemsTotal > 0
        ? (o.taxPaise * 1000 / itemsTotal).round() / 10
        : 0;
    String fmtRate(num r) =>
        r == r.roundToDouble() ? r.toStringAsFixed(0) : r.toString();
    const muted = TextStyle(color: A3Colors.muted, fontSize: 13);
    const label = TextStyle(
      color: A3Colors.muted,
      fontSize: 11.5,
      fontWeight: FontWeight.w700,
      letterSpacing: 0.6,
    );

    Widget row(String k, String v, {bool strong = false}) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Expanded(
            child: Text(
              k,
              style: strong
                  ? const TextStyle(fontWeight: FontWeight.w700)
                  : muted,
            ),
          ),
          Text(
            v,
            style: TextStyle(
              fontWeight: strong ? FontWeight.w700 : FontWeight.w500,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
        ],
      ),
    );

    return DecoratedBox(
      decoration: BoxDecoration(
        color: A3Colors.surface,
        borderRadius: BorderRadius.circular(24),
        boxShadow: const [
          BoxShadow(
            color: Color(0x221E1D1B),
            blurRadius: 30,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Brand band
            Container(
              color: A3Colors.frame,
              padding: const EdgeInsets.fromLTRB(18, 16, 18, 16),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(2),
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                    ),
                    child: ClipOval(
                      child: Image.asset(
                        'assets/images/logo.png',
                        width: 44,
                        height: 44,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'A3 Kitchen',
                          style: TextStyle(
                            fontFamily: 'Outfit',
                            color: Colors.white,
                            fontSize: 21,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        Text(
                          'Freshly Prepared. Delivered with Care.',
                          style: TextStyle(color: Colors.white, fontSize: 11.5),
                        ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      const Text(
                        'BILL',
                        style: TextStyle(
                          color: Colors.white70,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1,
                        ),
                      ),
                      Text(
                        o.orderNumber.replaceFirst('A3-', ''),
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 13.5,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Container(
              color: A3Colors.background,
              padding: const EdgeInsets.fromLTRB(18, 10, 18, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  for (final l in Kitchen.addressLines)
                    Text(
                      l,
                      style: const TextStyle(
                        color: A3Colors.muted,
                        fontSize: 11.5,
                      ),
                    ),
                  Text(
                    '${Kitchen.phone} · ${Kitchen.email}',
                    style: const TextStyle(
                      color: A3Colors.muted,
                      fontSize: 11.5,
                    ),
                  ),
                  const SizedBox(height: 2),
                  const Text(
                    'GSTIN ${Kitchen.gstin}',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 11.5,
                    ),
                  ),
                ],
              ),
            ),
            if (voided)
              Container(
                color: A3Colors.danger.withValues(alpha: 0.1),
                padding: const EdgeInsets.all(12),
                child: Text(
                  'This order was ${o.status == 'REJECTED' ? 'rejected' : 'cancelled'}. Nothing is payable.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: A3Colors.danger,
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 18, 18, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('BILLED TO', style: label),
                  const SizedBox(height: 4),
                  Text(
                    '${a['recipientName'] ?? ''}',
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                    ),
                  ),
                  Text(o.addressLine, style: muted),
                  if (a['phone'] is String)
                    Text(a['phone'] as String, style: muted),
                  const SizedBox(height: 14),
                  row('Order', o.orderNumber),
                  row('Date', _date(o.placedAt)),
                  if (o.timeline['deliveredAt'] != null)
                    row('Delivered', _date(o.timeline['deliveredAt']!)),
                  row(
                    'Payment',
                    o.paymentMethod == 'COD'
                        ? 'Cash on delivery'
                        : 'Online (Razorpay)',
                  ),
                  row(
                    'Status',
                    _paymentLabel[o.paymentStatus] ?? o.paymentStatus,
                  ),
                ],
              ),
            ),
            const _Dashed(),
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 14, 18, 6),
              child: Column(
                children: [
                  const Row(
                    children: [
                      Expanded(child: Text('ITEM', style: label)),
                      SizedBox(
                        width: 36,
                        child: Text(
                          'QTY',
                          textAlign: TextAlign.center,
                          style: label,
                        ),
                      ),
                      SizedBox(
                        width: 78,
                        child: Text(
                          'AMOUNT',
                          textAlign: TextAlign.right,
                          style: label,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  for (final i in o.items)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  i.name,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                Text(
                                  '${i.variantName != null ? '${i.variantName}, ' : ''}${formatPaise(i.lineTotalPaise ~/ i.quantity)} each',
                                  style: const TextStyle(
                                    color: A3Colors.muted,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          SizedBox(
                            width: 36,
                            child: Text(
                              '${i.quantity}',
                              textAlign: TextAlign.center,
                            ),
                          ),
                          SizedBox(
                            width: 78,
                            child: Text(
                              formatPaise(i.lineTotalPaise),
                              textAlign: TextAlign.right,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
            const _Dashed(),
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 12, 18, 16),
              child: Column(
                children: [
                  row('Item total', formatPaise(o.subtotalPaise)),
                  row(
                    'Delivery fee',
                    o.deliveryFeePaise == 0
                        ? 'Free'
                        : formatPaise(o.deliveryFeePaise),
                  ),
                  row(
                    'GST${gstRate > 0 ? ' (${fmtRate(gstRate)}%)' : ''}',
                    formatPaise(o.taxPaise),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      color: A3Colors.primarySoft,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            voided
                                ? 'Order value'
                                : o.paymentStatus == 'PAID'
                                ? 'Total paid'
                                : 'Total payable',
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                        ),
                        Text(
                          formatPaise(o.totalPaise),
                          style: const TextStyle(
                            fontFamily: 'Outfit',
                            fontWeight: FontWeight.w700,
                            fontSize: 20,
                            color: A3Colors.primaryStrong,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Container(
              color: A3Colors.background,
              padding: const EdgeInsets.fromLTRB(18, 14, 18, 16),
              child: const Column(
                children: [
                  Text(
                    'Thank you for ordering with A3 Kitchen',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: 'Outfit',
                      fontWeight: FontWeight.w600,
                      fontSize: 15,
                    ),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'Questions about this bill? Contact the kitchen with your order number.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: A3Colors.muted, fontSize: 11.5),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Receipt-style dashed divider.
class _Dashed extends StatelessWidget {
  const _Dashed();
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 18),
    child: LayoutBuilder(
      builder: (_, c) => Row(
        children: List.generate(
          (c.maxWidth / 8).floor(),
          (_) => Expanded(
            child: Container(
              height: 1,
              margin: const EdgeInsets.symmetric(horizontal: 2),
              color: A3Colors.line,
            ),
          ),
        ),
      ),
    ),
  );
}

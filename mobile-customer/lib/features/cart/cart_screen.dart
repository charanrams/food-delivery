import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/frame.dart';
import '../../core/widgets/widgets.dart';
import '../auth/auth_controller.dart';
import 'cart_controller.dart';

/// Cart (mockup screen 11): lines with quantity steppers and delete, offers box, bill.
class CartScreen extends ConsumerWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lines = ref.watch(cartProvider);
    final cart = ref.read(cartProvider.notifier);
    final totals = CartTotals.of(lines);
    final loggedIn = ref.watch(authProvider).value != null;

    return FramedPage(
      title: 'My Cart',
      showBack: false,
      actions: [
        if (lines.isNotEmpty)
          IconButton(
            tooltip: 'Clear cart',
            color: Colors.white,
            icon: const Icon(Icons.delete_sweep_outlined),
            onPressed: () async {
              final ok = await showDialog<bool>(
                context: context,
                builder: (c) => AlertDialog(
                  title: const Text('Clear your cart?'),
                  content: const Text('All dishes will be removed.'),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(c, false),
                      child: const Text('Keep'),
                    ),
                    FilledButton(
                      onPressed: () => Navigator.pop(c, true),
                      child: const Text('Clear all'),
                    ),
                  ],
                ),
              );
              if (ok == true) cart.clear();
            },
          ),
      ],
      bottom: lines.isEmpty
          ? null
          : FilledButton(
              onPressed: () => context.push(loggedIn ? '/checkout' : '/login'),
              child: Text(
                loggedIn
                    ? 'Checkout · ${formatPaise(totals.totalPaise)}'
                    : 'Log in to checkout',
              ),
            ),
      child: lines.isEmpty
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const AsyncStateView.empty(
                    icon: Icons.shopping_bag_outlined,
                    title: 'Your cart is empty',
                    message: 'Add a few dishes from the menu and they’ll show up here.',
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: A3Spacing.xxl,
                    ),
                    child: FilledButton(
                      onPressed: () => context.push('/menu'),
                      child: const Text('Browse the menu'),
                    ),
                  ),
                ],
              ),
            )
          : ListView(
              padding: const EdgeInsets.fromLTRB(
                A3Spacing.lg,
                A3Spacing.xl,
                A3Spacing.lg,
                A3Spacing.lg,
              ),
              children: [
                for (final l in lines)
                  Padding(
                    padding: const EdgeInsets.only(bottom: A3Spacing.md),
                    child: Container(
                      padding: const EdgeInsets.all(A3Spacing.md),
                      decoration: BoxDecoration(
                        color: A3Colors.card,
                        borderRadius: BorderRadius.circular(18),
                      ),
                      child: Row(
                        children: [
                          SizedBox(
                            width: 76,
                            height: 76,
                            child: FoodImage(
                              url: l.product.imageUrl,
                              width: 200,
                              radius: 14,
                            ),
                          ),
                          const SizedBox(width: A3Spacing.md),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  l.product.name,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 15,
                                  ),
                                ),
                                if (l.variant != null)
                                  Text(
                                    l.variant!.name,
                                    style: const TextStyle(
                                      fontSize: 13,
                                      color: A3Colors.muted,
                                    ),
                                  ),
                                const SizedBox(height: 4),
                                Text(
                                  formatPaise(l.lineTotalPaise),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                    color: A3Colors.primaryStrong,
                                    fontSize: 15,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              IconButton(
                                tooltip: 'Remove ${l.product.name}',
                                visualDensity: VisualDensity.compact,
                                onPressed: () => cart.setQuantity(l.key, 0),
                                icon: const Icon(
                                  Icons.delete_outline,
                                  color: A3Colors.muted,
                                ),
                              ),
                              Container(
                                decoration: BoxDecoration(
                                  color: A3Colors.surface,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    _QtyButton(
                                      icon: Icons.remove,
                                      tooltip: 'Decrease quantity',
                                      onTap: () => cart.setQuantity(
                                        l.key,
                                        l.quantity - 1,
                                      ),
                                    ),
                                    SizedBox(
                                      width: 24,
                                      child: Text(
                                        '${l.quantity}',
                                        textAlign: TextAlign.center,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ),
                                    _QtyButton(
                                      icon: Icons.add,
                                      tooltip: 'Increase quantity',
                                      onTap: () => cart.setQuantity(
                                        l.key,
                                        l.quantity + 1,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                const SizedBox(height: A3Spacing.sm),
                const _CouponBox(),
                const SizedBox(height: A3Spacing.lg),
                Container(
                  padding: const EdgeInsets.all(A3Spacing.lg),
                  decoration: BoxDecoration(
                    color: A3Colors.card,
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Column(
                    children: [
                      _row('Item total', formatPaise(totals.itemTotalPaise)),
                      _row(
                        'Delivery fee',
                        totals.deliveryFeePaise == 0
                            ? 'Free'
                            : formatPaise(totals.deliveryFeePaise),
                        good: totals.deliveryFeePaise == 0,
                      ),
                      _row('Taxes (GST 5%)', formatPaise(totals.taxPaise)),
                      const Divider(color: A3Colors.line, height: A3Spacing.xl),
                      _row(
                        'To pay',
                        formatPaise(totals.totalPaise),
                        bold: true,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: A3Spacing.sm),
                const Text(
                  'Prices, delivery fee and taxes are recalculated by the kitchen when you place the order.',
                  style: TextStyle(fontSize: 12, color: A3Colors.muted),
                ),
              ],
            ),
    );
  }

  Widget _row(String a, String b, {bool bold = false, bool good = false}) =>
      Padding(
        padding: const EdgeInsets.symmetric(vertical: 5),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              a,
              style: TextStyle(
                fontSize: bold ? 17 : 15,
                fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
              ),
            ),
            Text(
              b,
              style: TextStyle(
                fontSize: bold ? 17 : 15,
                fontWeight: bold ? FontWeight.w800 : FontWeight.w500,
                color: good ? A3Colors.success : null,
              ),
            ),
          ],
        ),
      );
}

class _QtyButton extends StatelessWidget {
  const _QtyButton({
    required this.icon,
    required this.tooltip,
    required this.onTap,
  });
  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => IconButton(
    tooltip: tooltip,
    onPressed: onTap,
    icon: Icon(icon, size: 18),
    style: IconButton.styleFrom(minimumSize: const Size(40, 40)),
  );
}

/// Offer code box. There are no live promotions in the backend yet, so it says so honestly.
class _CouponBox extends StatefulWidget {
  const _CouponBox();
  @override
  State<_CouponBox> createState() => _CouponBoxState();
}

class _CouponBoxState extends State<_CouponBox> {
  final _code = TextEditingController();
  String? _message;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Row(
        children: [
          Expanded(
            child: TextField(
              controller: _code,
              textCapitalization: TextCapitalization.characters,
              decoration: InputDecoration(
                hintText: 'Offer code',
                prefixIcon: const Icon(Icons.local_offer_outlined),
                fillColor: A3Colors.card,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide.none,
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),
          const SizedBox(width: A3Spacing.sm),
          SizedBox(
            height: 48,
            child: FilledButton(
              style: FilledButton.styleFrom(
                minimumSize: const Size(88, 48),
                backgroundColor: A3Colors.ink,
              ),
              onPressed: () => setState(
                () => _message = _code.text.trim().isEmpty
                    ? 'Enter a code first.'
                    : 'No offers are running right now.',
              ),
              child: const Text('Apply'),
            ),
          ),
        ],
      ),
      if (_message != null)
        Padding(
          padding: const EdgeInsets.only(top: 6, left: 4),
          child: Text(
            _message!,
            style: const TextStyle(fontSize: 13, color: A3Colors.muted),
          ),
        ),
    ],
  );
}

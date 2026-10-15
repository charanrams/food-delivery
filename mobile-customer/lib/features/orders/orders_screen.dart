import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/frame.dart';
import '../../core/widgets/widgets.dart';
import '../auth/auth_controller.dart';
import 'orders_providers.dart';

/// Order history: active orders first, then past ones.
class OrdersScreen extends ConsumerWidget {
  const OrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (ref.watch(authProvider).value == null) {
      return FramedPage(
        title: 'Your orders',
        showBack: false,
        child: LoginPrompt(
          icon: Icons.receipt_long_outlined,
          title: 'Log in to see your orders',
          message: 'Track deliveries and reorder your favourites.',
          onLogin: () => context.push('/login'),
        ),
      );
    }
    final orders = ref.watch(ordersProvider);
    return FramedPage(
      title: 'Your orders',
      showBack: false,
      child: orders.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => AsyncStateView.error(
          message: '$e',
          onRetry: () => ref.invalidate(ordersProvider),
        ),
        data: (list) {
          if (list.isEmpty) {
            return const AsyncStateView.empty(
              icon: Icons.receipt_long_outlined,
              title: 'No orders yet',
              message: 'Your orders will appear here once you place one.',
            );
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(ordersProvider);
              await ref.read(ordersProvider.future);
            },
            child: _FilteredOrders(orders: list),
          );
        },
      ),
    );
  }
}

/// Ongoing / Past order tabs.
class _FilteredOrders extends StatefulWidget {
  const _FilteredOrders({required this.orders});
  final List<Order> orders;
  @override
  State<_FilteredOrders> createState() => _FilteredOrdersState();
}

class _FilteredOrdersState extends State<_FilteredOrders> {
  bool _active = true;

  @override
  Widget build(BuildContext context) {
    final all = widget.orders;
    final activeCount = all.where((o) => o.isActive).length;
    final list = all.where((o) => o.isActive == _active).toList();

    return ListView(
      padding: const EdgeInsets.all(A3Spacing.lg),
      children: [
        Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: A3Colors.card,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            children: [
              for (final t in [true, false])
                Expanded(
                  child: _TabButton(
                    label: t ? 'Ongoing' : 'Past orders',
                    count: t ? activeCount : all.length - activeCount,
                    selected: _active == t,
                    onTap: () => setState(() => _active = t),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: A3Spacing.md),
        if (list.isEmpty)
          Padding(
            padding: const EdgeInsets.only(top: A3Spacing.lg),
            child: AsyncStateView.empty(
              icon: Icons.receipt_long_outlined,
              title: _active ? 'No ongoing orders' : 'No past orders yet',
              message: _active
                  ? 'When you place an order, you can follow it here.'
                  : 'Your delivered and cancelled orders will show up here.',
            ),
          )
        else
          for (final o in list) _OrderCard(order: o),
      ],
    );
  }
}

class _TabButton extends StatelessWidget {
  const _TabButton({
    required this.label,
    required this.count,
    required this.selected,
    required this.onTap,
  });
  final String label;
  final int count;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
    selected: selected,
    button: true,
    child: Material(
      color: selected ? A3Colors.surface : Colors.transparent,
      elevation: selected ? 1 : 0,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Container(
          constraints: const BoxConstraints(minHeight: 44),
          alignment: Alignment.center,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  color: selected ? A3Colors.ink : A3Colors.muted,
                ),
              ),
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: selected ? A3Colors.primarySoft : A3Colors.surface,
                  borderRadius: BorderRadius.circular(99),
                ),
                child: Text(
                  '$count',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: selected ? A3Colors.primaryStrong : A3Colors.muted,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({required this.order});
  final Order order;
  @override
  Widget build(BuildContext context) {
    final summary = order.items
        .map((i) => '${i.quantity} × ${i.name}')
        .join(', ');
    return Card(
      margin: const EdgeInsets.only(bottom: A3Spacing.md),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => context.push('/orders/${order.id}'),
        child: Padding(
          padding: const EdgeInsets.all(A3Spacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      order.orderNumber,
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                  StatusChip(status: order.status),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                summary,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: A3Colors.muted, fontSize: 13),
              ),
              const SizedBox(height: A3Spacing.sm),
              Row(
                children: [
                  Text(
                    shortDate(order.placedAt),
                    style: const TextStyle(fontSize: 12, color: A3Colors.muted),
                  ),
                  const Spacer(),
                  Text(
                    formatPaise(order.totalPaise),
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

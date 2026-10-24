import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/api/models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/frame.dart';
import '../../core/widgets/widgets.dart';
import '../auth/auth_controller.dart';
import 'order_tracking_screen.dart' show reorderOrder;
import 'orders_providers.dart';

/// My Orders (VSR layout): artwork app bar with search, Ongoing/Past tabs, cards with a
/// short progress row, and an "Order again" card (web W09 counterpart).
class OrdersScreen extends ConsumerStatefulWidget {
  const OrdersScreen({super.key});
  @override
  ConsumerState<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends ConsumerState<OrdersScreen> {
  bool _searching = false;
  String _q = '';

  @override
  Widget build(BuildContext context) {
    const title = 'My Orders';
    const subtitle = 'Track, manage and reorder your favourite food';
    if (ref.watch(authProvider).value == null) {
      return FramedPage(
        art: true,
        title: title,
        subtitle: subtitle,
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
      art: true,
      title: title,
      subtitle: subtitle,
      showBack: false,
      actions: [
        ArtIconButton(
          tooltip: _searching ? 'Close search' : 'Search orders',
          icon: _searching ? Icons.close_rounded : Icons.search_rounded,
          onPressed: () => setState(() {
            _searching = !_searching;
            _q = '';
          }),
        ),
      ],
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
            child: _FilteredOrders(
              orders: list,
              searching: _searching,
              query: _q,
              onQuery: (v) => setState(() => _q = v),
            ),
          );
        },
      ),
    );
  }
}

/// Ongoing / Past order tabs.
class _FilteredOrders extends StatefulWidget {
  const _FilteredOrders({
    required this.orders,
    required this.searching,
    required this.query,
    required this.onQuery,
  });
  final List<Order> orders;
  final bool searching;
  final String query;
  final ValueChanged<String> onQuery;
  @override
  State<_FilteredOrders> createState() => _FilteredOrdersState();
}

class _FilteredOrdersState extends State<_FilteredOrders> {
  bool _active = true;

  @override
  Widget build(BuildContext context) {
    final all = widget.orders;
    final activeCount = all.where((o) => o.isActive).length;
    final needle = widget.query.trim().toLowerCase();
    final list = all
        .where((o) => o.isActive == _active)
        .where(
          (o) =>
              needle.isEmpty ||
              o.orderNumber.toLowerCase().contains(needle) ||
              o.items.any((i) => i.name.toLowerCase().contains(needle)),
        )
        .toList();

    return ListView(
      padding: const EdgeInsets.fromLTRB(
        A3Spacing.lg,
        A3Spacing.sm,
        A3Spacing.lg,
        A3Spacing.xl,
      ),
      children: [
        Container(
          decoration: const BoxDecoration(
            border: Border(bottom: BorderSide(color: A3Colors.line)),
          ),
          child: Row(
            children: [
              for (final t in [true, false])
                Expanded(
                  child: _TabButton(
                    icon: t
                        ? Icons.receipt_long_outlined
                        : Icons.schedule_rounded,
                    label: t ? 'Ongoing' : 'Past Orders',
                    count: t ? activeCount : all.length - activeCount,
                    selected: _active == t,
                    onTap: () => setState(() => _active = t),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: A3Spacing.md),
        if (widget.searching) ...[
          TextField(
            autofocus: true,
            onChanged: widget.onQuery,
            decoration: const InputDecoration(
              hintText: 'Order number or dish',
              prefixIcon: Icon(Icons.search_rounded),
            ),
          ),
          const SizedBox(height: A3Spacing.md),
        ],
        if (list.isEmpty)
          Padding(
            padding: const EdgeInsets.only(top: A3Spacing.lg),
            child: AsyncStateView.empty(
              icon: Icons.receipt_long_outlined,
              title: needle.isNotEmpty
                  ? 'No matching orders'
                  : _active
                  ? 'No ongoing orders'
                  : 'No past orders yet',
              message: needle.isNotEmpty
                  ? 'Try another order number or dish name.'
                  : _active
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
    required this.icon,
    required this.label,
    required this.count,
    required this.selected,
    required this.onTap,
  });
  final IconData icon;
  final String label;
  final int count;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = selected ? A3Colors.primaryStrong : A3Colors.muted;
    return Semantics(
      selected: selected,
      button: true,
      child: InkWell(
        onTap: onTap,
        child: Container(
          constraints: const BoxConstraints(minHeight: 52),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(
                color: selected ? A3Colors.primary : Colors.transparent,
                width: 3,
              ),
            ),
          ),
          alignment: Alignment.center,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 20, color: color),
              const SizedBox(width: 6),
              Text(
                '$label ($count)',
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 15,
                  color: color,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({required this.order});
  final Order order;
  @override
  Widget build(BuildContext context) {
    final o = order;
    final count = o.items.fold<int>(0, (n, i) => n + i.quantity);
    final first = o.items.firstOrNull;
    final ended = o.status == 'CANCELLED' || o.status == 'REJECTED';
    return Padding(
      padding: const EdgeInsets.only(bottom: A3Spacing.md),
      child: Material(
        color: A3Colors.surface,
        elevation: 2,
        shadowColor: Colors.black26,
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () => context.push('/orders/${o.id}'),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      width: 76,
                      height: 76,
                      child: FoodImage(
                        url: first?.imageUrl,
                        width: 200,
                        radius: 16,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Text(
                                  'Order #${o.orderNumber}',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 6),
                              StatusChip(status: o.status),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${first?.name ?? ''}${o.items.length > 1 ? ' + ${o.items.length - 1} more' : ''}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: A3Colors.muted),
                          ),
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  '${shortDate(o.placedAt)} · $count item${count == 1 ? '' : 's'}',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 12.5,
                                    color: A3Colors.muted,
                                  ),
                                ),
                              ),
                              Text(
                                formatPaise(o.totalPaise),
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const Icon(
                                Icons.chevron_right_rounded,
                                color: A3Colors.muted,
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                if (ended)
                  Row(
                    children: [
                      const Icon(
                        Icons.cancel_outlined,
                        size: 16,
                        color: A3Colors.danger,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        o.status == 'REJECTED'
                            ? 'The kitchen couldn’t take this order'
                            : 'This order was cancelled',
                        style: const TextStyle(
                          fontSize: 13,
                          color: A3Colors.danger,
                        ),
                      ),
                    ],
                  )
                else
                  _MiniProgress(status: o.status),
                if (o.status == 'DELIVERED') ...[
                  const SizedBox(height: 14),
                  _DeliveredStrip(order: o),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Placed → Accepted → Preparing → Out for delivery → Delivered, as small round icons.
class _MiniProgress extends StatelessWidget {
  const _MiniProgress({required this.status});
  final String status;

  static const _steps = [
    ('Placed', Icons.receipt_long_outlined),
    ('Accepted', Icons.check_circle_outline),
    ('Preparing', Icons.soup_kitchen_outlined),
    ('Out for\nDelivery', Icons.delivery_dining_outlined),
    ('Delivered', Icons.home_outlined),
  ];

  int get _reached => switch (status) {
    'PLACED' => 0,
    'ACCEPTED' => 1,
    'PREPARING' || 'READY_FOR_PICKUP' || 'ASSIGNED' => 2,
    'PICKED_UP' || 'OUT_FOR_DELIVERY' => 3,
    _ => 4,
  };

  @override
  Widget build(BuildContext context) {
    final delivered = status == 'DELIVERED';
    final reached = _reached;
    final tone = delivered ? A3Colors.success : A3Colors.primary;
    final textTone = delivered ? A3Colors.success : A3Colors.primaryStrong;
    return Semantics(
      label: 'Progress: ${_steps[reached].$1.replaceAll('\n', ' ')}',
      child: ExcludeSemantics(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (var i = 0; i < _steps.length; i++) ...[
              if (i > 0)
                Expanded(
                  child: Container(
                    margin: const EdgeInsets.only(top: 15),
                    height: 2,
                    color: i <= reached
                        ? tone.withValues(alpha: 0.5)
                        : A3Colors.line,
                  ),
                ),
              SizedBox(
                width: 54,
                child: Column(
                  children: [
                    CircleAvatar(
                      radius: 16,
                      backgroundColor: i <= reached ? tone : A3Colors.card,
                      child: Icon(
                        i < reached || (delivered && i < _steps.length - 1)
                            ? Icons.check_rounded
                            : _steps[i].$2,
                        size: 17,
                        color: i <= reached ? Colors.white : A3Colors.muted,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _steps[i].$1,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 10.5,
                        height: 1.25,
                        fontWeight: i <= reached
                            ? FontWeight.w600
                            : FontWeight.w400,
                        color: i <= reached ? textTone : A3Colors.muted,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Delivered order footer: rate the order (inline, once) and reorder into the cart.
class _DeliveredStrip extends ConsumerStatefulWidget {
  const _DeliveredStrip({required this.order});
  final Order order;
  @override
  ConsumerState<_DeliveredStrip> createState() => _DeliveredStripState();
}

class _DeliveredStripState extends ConsumerState<_DeliveredStrip> {
  bool _open = false, _saving = false, _reordering = false;
  int _rating = 0;
  final _comment = TextEditingController();

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final messenger = ScaffoldMessenger.of(context);
    if (_rating == 0) {
      messenger.showSnackBar(
        const SnackBar(content: Text('Pick a star rating first.')),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(apiClientProvider).post(
        '/orders/${widget.order.id}/review',
        {
          'rating': _rating,
          if (_comment.text.trim().isNotEmpty) 'comment': _comment.text.trim(),
        },
      );
      ref.invalidate(ordersProvider);
      if (mounted) setState(() => _open = false);
      messenger.showSnackBar(
        const SnackBar(content: Text('Thanks for your feedback!')),
      );
    } on ApiException catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _reorder() async {
    setState(() => _reordering = true);
    await reorderOrder(context, ref, widget.order);
    if (mounted) setState(() => _reordering = false);
  }

  Widget _stars(int value, {double size = 18, ValueChanged<int>? onTap}) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      for (var n = 1; n <= 5; n++)
        onTap == null
            ? Icon(
                n <= value ? Icons.star_rounded : Icons.star_outline_rounded,
                size: size,
                color: n <= value ? A3Colors.primary : A3Colors.line,
              )
            : IconButton(
                tooltip: '$n star${n == 1 ? '' : 's'}',
                onPressed: () => onTap(n),
                icon: Icon(
                  n <= value ? Icons.star_rounded : Icons.star_outline_rounded,
                  size: size,
                  color: n <= value ? A3Colors.primary : A3Colors.muted,
                ),
              ),
    ],
  );

  @override
  Widget build(BuildContext context) {
    final rated = widget.order.reviewRating;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: A3Colors.primarySoft.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const CircleAvatar(
                radius: 20,
                backgroundColor: Colors.white,
                child: Icon(Icons.star_rounded, color: A3Colors.primary),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: rated != null
                    ? Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Thanks for your feedback!',
                            style: TextStyle(fontWeight: FontWeight.w700),
                          ),
                          Semantics(
                            label: 'You rated $rated out of 5',
                            child: ExcludeSemantics(child: _stars(rated)),
                          ),
                        ],
                      )
                    : const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'How was your order?',
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              color: A3Colors.primaryStrong,
                            ),
                          ),
                          Text(
                            'Help us improve with your feedback',
                            style: TextStyle(
                              fontSize: 12.5,
                              color: A3Colors.muted,
                            ),
                          ),
                        ],
                      ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              if (rated == null) ...[
                Expanded(
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: A3Colors.primaryStrong,
                      side: const BorderSide(color: A3Colors.primary),
                      shape: const StadiumBorder(),
                    ),
                    onPressed: () => setState(() => _open = !_open),
                    icon: const Icon(Icons.star_outline_rounded),
                    label: const Text('Review'),
                  ),
                ),
                const SizedBox(width: 10),
              ],
              Expanded(
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(shape: const StadiumBorder()),
                  onPressed: _reordering ? null : _reorder,
                  icon: _reordering
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.replay_rounded),
                  label: const Text('Reorder'),
                ),
              ),
            ],
          ),
          if (_open && rated == null) ...[
            const SizedBox(height: 10),
            Center(
              child: _stars(
                _rating,
                size: 30,
                onTap: (n) => setState(() => _rating = n),
              ),
            ),
            TextField(
              controller: _comment,
              maxLength: 500,
              maxLines: 2,
              decoration: const InputDecoration(
                hintText: 'Tell us what you liked (optional)',
                filled: true,
                fillColor: Colors.white,
              ),
            ),
            FilledButton(
              onPressed: _saving ? null : _submit,
              child: Text(_saving ? 'Saving…' : 'Submit review'),
            ),
          ],
        ],
      ),
    );
  }
}

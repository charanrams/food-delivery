import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/api/models.dart';
import '../../core/kitchen.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/frame.dart';
import '../../core/widgets/widgets.dart';
import '../auth/auth_controller.dart';
import 'deliveries_providers.dart';
import 'new_order_card.dart';
import 'route_map.dart';

/// The stage of one delivery, from the server's allowed actions (plus a local
/// "reached the customer" flag, since the server has no separate arrival step).
enum _Stage { offer, pickup, pickedUp, onTheWay, handover, done }

/// One delivery, end to end (delivery mockups 2–7):
/// New order → Pickup → Order picked up → On the way → Delivery confirmation → Completed.
class DeliveryScreen extends ConsumerStatefulWidget {
  const DeliveryScreen({super.key, required this.orderId});
  final String orderId;

  @override
  ConsumerState<DeliveryScreen> createState() => _DeliveryScreenState();
}

class _DeliveryScreenState extends ConsumerState<DeliveryScreen> {
  bool _busy = false;
  bool _reached = false; // rider tapped "Reached location" → show the code step
  final _code = TextEditingController();
  bool _cash = false;
  String? _codeError;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  _Stage _stageOf(Delivery d) {
    if (d.status == 'DELIVERED') return _Stage.done;
    if (d.actions.contains('accept')) return _Stage.offer;
    if (d.actions.contains('pickup')) return _Stage.pickup;
    if (d.actions.contains('out-for-delivery')) return _Stage.pickedUp;
    return _reached ? _Stage.handover : _Stage.onTheWay;
  }

  Future<void> _act(String action, [Map<String, dynamic>? body]) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await ref
          .read(apiClientProvider)
          .post('/delivery/orders/${widget.orderId}/$action', body);
      HapticFeedback.mediumImpact();
      _refresh();
      if (action == 'regenerate-otp' && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('A new code was sent to the customer’s app.'),
          ),
        );
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      if (action == 'verify-otp') {
        setState(() => _codeError = e.message);
      } else {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _refresh() {
    ref.invalidate(activeDeliveriesProvider);
    ref.invalidate(deliveryProvider(widget.orderId));
    ref.invalidate(earningsProvider);
    ref.invalidate(historyProvider);
  }

  Future<void> _complete(Delivery d) async {
    if (!RegExp(r'^\d{6}$').hasMatch(_code.text)) {
      return setState(
        () => _codeError = 'Enter the 6-digit code from the customer’s app.',
      );
    }
    if (d.collectCash && !_cash) {
      return setState(
        () => _codeError =
            'Collect ${formatPaise(d.totalPaise)} in cash and tick the box first.',
      );
    }
    setState(() => _codeError = null);
    await _act('verify-otp', {
      'otp': _code.text,
      if (d.collectCash) 'cashCollected': true,
    });
    if (mounted &&
        ref.read(deliveryProvider(widget.orderId)).value?.status ==
            'DELIVERED') {
      await ref.read(authProvider.notifier).reload(); // today's count on Home
    }
  }

  @override
  Widget build(BuildContext context) {
    final delivery = ref.watch(deliveryProvider(widget.orderId));
    final d = delivery.value;
    final stage = d == null ? null : _stageOf(d);

    return PopScope(
      // Back from the code step returns to "On the way" instead of leaving.
      canPop: stage != _Stage.handover,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) setState(() => _reached = false);
      },
      child: FramedPage(
        title: switch (stage) {
          _Stage.offer => 'New Order',
          _Stage.pickup => 'Order Pickup',
          _Stage.pickedUp => 'Order Picked Up',
          _Stage.onTheWay => 'On the way to Deliver',
          _Stage.handover => 'Delivery Confirmation',
          _Stage.done => 'Delivery Completed',
          null => 'Order',
        },
        onBack: stage == _Stage.handover
            ? () => setState(() => _reached = false)
            : null,
        bottom: d == null || stage == _Stage.offer
            ? null
            : _primaryButton(d, stage!),
        child: delivery.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => e is ApiException && e.status == 404
              ? const StateView(
                  icon: Icons.assignment_late_outlined,
                  title: 'No longer assigned to you',
                  message: 'The kitchen may have reassigned this order.',
                )
              : ErrorView(
                  error: e,
                  onRetry: () =>
                      ref.invalidate(deliveryProvider(widget.orderId)),
                ),
          data: (d) => RefreshIndicator(
            onRefresh: () async =>
                ref.invalidate(deliveryProvider(widget.orderId)),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(
                A3Spacing.lg,
                A3Spacing.lg,
                A3Spacing.lg,
                A3Spacing.xl,
              ),
              children: _body(d, _stageOf(d)),
            ),
          ),
        ),
      ),
    );
  }

  /// The one main action per stage, pinned to the bottom.
  Widget? _primaryButton(Delivery d, _Stage stage) {
    final (label, icon, onTap) = switch (stage) {
      _Stage.pickup => (
        'Confirm Pickup',
        Icons.inventory_2_rounded,
        () => _act('pickup'),
      ),
      _Stage.pickedUp => (
        'Start Delivery',
        Icons.arrow_forward_rounded,
        () => _act('out-for-delivery'),
      ),
      _Stage.onTheWay => (
        'Reached Location',
        Icons.flag_rounded,
        () => setState(() => _reached = true),
      ),
      _Stage.handover => (
        'Complete Delivery',
        Icons.check_rounded,
        () => _complete(d),
      ),
      _Stage.done => (
        'Back to Home',
        Icons.arrow_forward_rounded,
        () => context.go('/'),
      ),
      _Stage.offer => ('', Icons.check, () {}),
    };
    return FilledButton(
      onPressed: _busy ? null : onTap,
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(56),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        textStyle: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
      ),
      child: _busy
          ? const SizedBox.square(
              dimension: 22,
              child: CircularProgressIndicator(
                strokeWidth: 2.4,
                color: Colors.white,
              ),
            )
          : Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(label),
                const SizedBox(width: 10),
                Icon(icon, size: 22),
              ],
            ),
    );
  }

  List<Widget> _body(Delivery d, _Stage stage) {
    const gap = SizedBox(height: A3Spacing.md);
    final steps = switch (stage) {
      _Stage.offer => -1,
      _Stage.pickup => 0,
      _Stage.pickedUp || _Stage.onTheWay => 1,
      _Stage.handover => 2,
      _Stage.done => 3,
    };
    return [
      if (steps >= 0) ...[
        _Steps(current: steps),
        const SizedBox(height: A3Spacing.lg),
      ],
      ...switch (stage) {
        // 2 · New order: same card as Home, accept stays here, reject goes home.
        _Stage.offer => [
          NewOrderCard(
            d: d,
            compactHeader: true,
            onDone: (action) =>
                action == 'decline' ? context.go('/') : _refresh(),
          ),
        ],
        // 3 · Pickup at the kitchen.
        _Stage.pickup => [
          _KitchenCard(showAddress: true),
          gap,
          _ItemsCard(d: d),
          gap,
          _PaymentNote(d: d),
        ],
        // 4 · Order picked up.
        _Stage.pickedUp => [
          _Hero(
            icon: Icons.shopping_bag_rounded,
            tint: A3Colors.primarySoft,
            iconColor: A3Colors.primary,
            title: 'Order Picked Up!',
            subtitle: '${_count(d)} collected from $kitchenName',
          ),
          gap,
          _CustomerCard(d: d, showFacts: true, showNavigate: true),
          gap,
          _ItemsCard(d: d),
          gap,
          _PaymentNote(d: d),
        ],
        // 5 · On the way: customer, map, drop-off.
        _Stage.onTheWay => [
          _CustomerCard(d: d, showFacts: true),
          gap,
          RouteMapCard(d: d, toCustomer: true, mapHeight: 280),
          gap,
          _PaymentNote(d: d),
        ],
        // 6 · Delivery confirmation: customer code (+ cash for COD).
        _Stage.handover => [
          _CustomerCard(d: d),
          gap,
          _CodeCard(
            controller: _code,
            error: _codeError,
            onChanged: () => setState(() => _codeError = null),
            onResend: _busy ? null : () => _act('regenerate-otp'),
          ),
          if (d.collectCash) ...[
            gap,
            _CashCheck(
              amount: formatPaise(d.totalPaise),
              value: _cash,
              onChanged: (v) => setState(() {
                _cash = v;
                _codeError = null;
              }),
            ),
          ],
          gap,
          _ItemsCard(d: d),
        ],
        // 7 · Completed.
        _Stage.done => [
          _Hero(
            icon: Icons.check_rounded,
            tint: const Color(0xFFDCFCE7),
            iconColor: A3Colors.success,
            solid: true,
            title: 'Delivery Completed!',
            subtitle:
                'Order delivered to ${d.recipient}'
                '${d.deliveredAt != null ? ' at ${timeOfDay(d.deliveredAt!)}' : ''}',
          ),
          gap,
          _EarnedCard(feePaise: d.deliveryFeePaise),
          gap,
          _ItemsCard(d: d, showKitchen: true),
          gap,
          _CustomerCard(d: d, label: 'Customer', showCall: false),
        ],
      },
    ];
  }
}

String _count(Delivery d) {
  final n = d.items.fold<int>(0, (s, i) => s + i.quantity);
  return '$n ${n == 1 ? 'item' : 'items'}';
}

// ============================================================================ building blocks

class _Card extends StatelessWidget {
  const _Card({
    required this.child,
    this.padding = const EdgeInsets.all(A3Spacing.lg),
    this.color,
  });
  final Widget child;
  final EdgeInsets padding;
  final Color? color;
  @override
  Widget build(BuildContext context) => Container(
    padding: padding,
    decoration: BoxDecoration(
      color: color ?? Colors.white,
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: A3Colors.line),
    ),
    child: child,
  );
}

class _RoundIcon extends StatelessWidget {
  const _RoundIcon(
    this.icon, {
    this.color = A3Colors.primary,
    this.bg = A3Colors.primarySoft,
    this.size = 48,
  });
  final IconData icon;
  final Color color, bg;
  final double size;
  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(color: bg, shape: BoxShape.circle),
    child: Icon(icon, color: color, size: size * 0.5),
  );
}

class _CircleAction extends StatelessWidget {
  const _CircleAction({
    required this.icon,
    required this.tooltip,
    required this.onPressed,
  });
  final IconData icon;
  final String tooltip;
  final VoidCallback onPressed;
  @override
  Widget build(BuildContext context) => IconButton.outlined(
    tooltip: tooltip,
    onPressed: onPressed,
    style: IconButton.styleFrom(
      minimumSize: const Size(48, 48),
      side: const BorderSide(color: A3Colors.line),
    ),
    icon: Icon(icon, color: A3Colors.ink),
  );
}

/// 1 Pickup — 2 On the way — 3 Deliver. Done = green tick, current = orange.
class _Steps extends StatelessWidget {
  const _Steps({required this.current});
  final int current; // 3 = all done
  static const _labels = ['Pickup', 'On the way', 'Deliver'];

  @override
  Widget build(BuildContext context) => Semantics(
    label: current >= 3
        ? 'All steps done'
        : 'Step ${current + 1} of 3: ${_labels[current]}',
    child: ExcludeSemantics(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (var i = 0; i < 3; i++) ...[
            SizedBox(
              width: 76,
              child: Column(
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: i < current
                          ? A3Colors.success
                          : (i == current ? A3Colors.primary : Colors.white),
                      border: Border.all(
                        color: i < current
                            ? A3Colors.success
                            : (i == current ? A3Colors.primary : A3Colors.line),
                        width: 1.5,
                      ),
                    ),
                    child: i < current
                        ? const Icon(
                            Icons.check_rounded,
                            size: 18,
                            color: Colors.white,
                          )
                        : Text(
                            '${i + 1}',
                            style: TextStyle(
                              fontWeight: FontWeight.w800,
                              color: i == current
                                  ? Colors.white
                                  : A3Colors.muted,
                            ),
                          ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _labels[i],
                    style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: i == current
                          ? FontWeight.w800
                          : FontWeight.w500,
                      color: i == current
                          ? A3Colors.primaryStrong
                          : A3Colors.muted,
                    ),
                  ),
                ],
              ),
            ),
            if (i < 2)
              Expanded(
                child: Container(
                  height: 2,
                  margin: const EdgeInsets.only(top: 15),
                  color: i < current ? A3Colors.success : A3Colors.line,
                ),
              ),
          ],
        ],
      ),
    ),
  );
}

class _Hero extends StatelessWidget {
  const _Hero({
    required this.icon,
    required this.tint,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    this.solid = false,
  });
  final IconData icon;
  final Color tint, iconColor;
  final String title, subtitle;
  final bool solid;
  @override
  Widget build(BuildContext context) => _Card(
    color: solid ? const Color(0xFFF0FBF4) : Colors.white,
    padding: const EdgeInsets.symmetric(
      horizontal: A3Spacing.lg,
      vertical: A3Spacing.xl,
    ),
    child: Column(
      children: [
        Stack(
          clipBehavior: Clip.none,
          children: [
            Container(
              width: 104,
              height: 104,
              decoration: BoxDecoration(color: tint, shape: BoxShape.circle),
              child: Center(
                child: solid
                    ? Container(
                        width: 68,
                        height: 68,
                        decoration: BoxDecoration(
                          color: iconColor,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(icon, color: Colors.white, size: 40),
                      )
                    : Icon(icon, color: iconColor, size: 54),
              ),
            ),
            if (!solid)
              const Positioned(
                right: -2,
                bottom: 4,
                child: CircleAvatar(
                  radius: 17,
                  backgroundColor: Colors.white,
                  child: CircleAvatar(
                    radius: 14,
                    backgroundColor: A3Colors.success,
                    child: Icon(
                      Icons.check_rounded,
                      color: Colors.white,
                      size: 18,
                    ),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: A3Spacing.lg),
        Text(
          title,
          style: const TextStyle(
            fontFamily: 'Outfit',
            fontSize: 24,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          subtitle,
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: A3Colors.muted,
            fontSize: 15,
            height: 1.4,
          ),
        ),
      ],
    ),
  );
}

class _KitchenCard extends StatelessWidget {
  const _KitchenCard({this.showAddress = false});
  final bool showAddress;
  @override
  Widget build(BuildContext context) => _Card(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 52,
              height: 52,
              padding: const EdgeInsets.all(5),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: A3Colors.line),
              ),
              child: ClipOval(
                child: Image.asset('assets/images/logo.png', fit: BoxFit.cover),
              ),
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    kitchenName,
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17),
                  ),
                  Text(
                    kitchenArea,
                    style: TextStyle(color: A3Colors.muted, fontSize: 13.5),
                  ),
                ],
              ),
            ),
            _CircleAction(
              icon: Icons.call_rounded,
              tooltip: 'Call kitchen',
              onPressed: () => callNumber(context, kitchenPhone),
            ),
          ],
        ),
        if (showAddress) ...[
          const Divider(color: A3Colors.line, height: 28),
          const Text(
            'Pickup from',
            style: TextStyle(fontSize: 12.5, color: A3Colors.muted),
          ),
          const SizedBox(height: 2),
          const Text(
            kitchenAddress,
            style: TextStyle(fontWeight: FontWeight.w600, height: 1.4),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () => navigateTo(
              context,
              kitchenAddress,
              lat: kitchenLatLng.latitude,
              lng: kitchenLatLng.longitude,
            ),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(46),
              foregroundColor: A3Colors.primaryStrong,
              side: const BorderSide(color: A3Colors.primary),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            icon: const Icon(Icons.navigation_rounded, size: 18),
            label: const Text(
              'Get Directions',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ],
    ),
  );
}

class _ItemsCard extends StatelessWidget {
  const _ItemsCard({required this.d, this.showKitchen = false});
  final Delivery d;
  final bool showKitchen;
  @override
  Widget build(BuildContext context) => _Card(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (showKitchen) ...[
          const Row(
            children: [
              _RoundIcon(Icons.storefront_rounded, size: 40),
              SizedBox(width: 10),
              Text(
                kitchenName,
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
              ),
            ],
          ),
          const Divider(color: A3Colors.line, height: 24),
        ],
        Row(
          children: [
            Expanded(
              child: Text(
                'Order Items (${d.items.length})',
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 16,
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: A3Colors.primarySoft,
                borderRadius: BorderRadius.circular(99),
              ),
              child: Text(
                d.orderNumber,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: A3Colors.primaryStrong,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        for (final i in d.items)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 5),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 36,
                  child: Text(
                    '${i.quantity} ×',
                    style: const TextStyle(color: A3Colors.muted, fontSize: 15),
                  ),
                ),
                Expanded(
                  child: Text(
                    i.variant == null ? i.name : '${i.name} (${i.variant})',
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 15,
                    ),
                  ),
                ),
                if (i.lineTotalPaise > 0)
                  Text(
                    formatPaise(i.lineTotalPaise),
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 15,
                    ),
                  ),
              ],
            ),
          ),
        const Divider(color: A3Colors.line, height: 24),
        Row(
          children: [
            Expanded(
              child: Text(
                'Total amount · ${_count(d)}',
                style: const TextStyle(color: A3Colors.muted),
              ),
            ),
            Text(
              formatPaise(d.totalPaise),
              style: const TextStyle(
                fontFamily: 'Outfit',
                fontWeight: FontWeight.w700,
                fontSize: 20,
              ),
            ),
          ],
        ),
      ],
    ),
  );
}

/// Customer block: name + area + call; optional distance/ETA and address with Navigate.
class _CustomerCard extends StatelessWidget {
  const _CustomerCard({
    required this.d,
    this.showFacts = false,
    this.showNavigate = false,
    this.showCall = true,
    this.label = 'Deliver to',
  });
  final Delivery d;
  final bool showFacts, showNavigate, showCall;
  final String label;

  @override
  Widget build(BuildContext context) {
    final km = distanceKm(d);
    final mins = etaMinutes(km);
    final landmark = d.address['landmark'] as String?;
    return _Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const _RoundIcon(Icons.person_rounded),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: const TextStyle(
                        fontSize: 12.5,
                        color: A3Colors.muted,
                      ),
                    ),
                    Text(
                      d.recipient,
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 17,
                      ),
                    ),
                    Text(
                      d.addressLine,
                      maxLines: showNavigate ? 1 : 3,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: A3Colors.muted,
                        fontSize: 13.5,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
              if (showCall && d.recipientPhone.isNotEmpty)
                _CircleAction(
                  icon: Icons.call_rounded,
                  tooltip: 'Call ${d.recipient}',
                  onPressed: () => callNumber(context, d.recipientPhone),
                ),
            ],
          ),
          if (showFacts) ...[
            const SizedBox(height: A3Spacing.md),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: A3Colors.card,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: _Fact(
                      icon: Icons.near_me_rounded,
                      value: km == null ? '—' : '${km.toStringAsFixed(1)} km',
                      label: 'Distance',
                    ),
                  ),
                  Container(width: 1, height: 36, color: A3Colors.line),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _Fact(
                      icon: Icons.schedule_rounded,
                      value: mins == null ? '—' : '$mins mins',
                      label: 'Est. time',
                    ),
                  ),
                ],
              ),
            ),
          ],
          if (showNavigate) ...[
            const SizedBox(height: A3Spacing.md),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.location_on_rounded, color: A3Colors.primary),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Delivery address',
                        style: TextStyle(fontWeight: FontWeight.w700),
                      ),
                      Text(
                        d.addressLine,
                        style: const TextStyle(
                          color: A3Colors.muted,
                          height: 1.4,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                OutlinedButton.icon(
                  onPressed: () => navigateTo(
                    context,
                    d.addressLine,
                    lat: d.lat,
                    lng: d.lng,
                  ),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: A3Colors.primaryStrong,
                    side: const BorderSide(color: A3Colors.primary),
                    minimumSize: const Size(0, 44),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(99),
                    ),
                  ),
                  icon: const Icon(Icons.navigation_rounded, size: 18),
                  label: const Text(
                    'Navigate',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
          ],
          if (landmark != null && landmark.isNotEmpty) ...[
            const SizedBox(height: A3Spacing.md),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF6EE),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.sticky_note_2_rounded,
                    color: A3Colors.primary,
                    size: 22,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Landmark',
                          style: TextStyle(
                            fontSize: 12.5,
                            color: A3Colors.muted,
                          ),
                        ),
                        Text(
                          landmark,
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _Fact extends StatelessWidget {
  const _Fact({required this.icon, required this.value, required this.label});
  final IconData icon;
  final String value, label;
  @override
  Widget build(BuildContext context) => Row(
    children: [
      _RoundIcon(
        icon,
        color: const Color(0xFF1A73E8),
        bg: const Color(0xFFE8F0FE),
        size: 38,
      ),
      const SizedBox(width: 10),
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
          ),
          Text(
            label,
            style: const TextStyle(fontSize: 12, color: A3Colors.muted),
          ),
        ],
      ),
    ],
  );
}

/// Cash to collect (COD) or "prepaid — collect nothing".
class _PaymentNote extends StatelessWidget {
  const _PaymentNote({required this.d});
  final Delivery d;
  @override
  Widget build(BuildContext context) {
    final cod = d.collectCash;
    final fg = cod ? const Color(0xFF92400E) : const Color(0xFF166534);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: cod ? const Color(0xFFFEF3C7) : const Color(0xFFDCFCE7),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Icon(
            cod ? Icons.payments_rounded : Icons.verified_rounded,
            color: fg,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              cod
                  ? 'Cash on delivery: collect ${formatPaise(d.totalPaise)} from the customer'
                  : 'Prepaid online: don’t collect any money',
              style: TextStyle(fontWeight: FontWeight.w700, color: fg),
            ),
          ),
        ],
      ),
    );
  }
}

/// 6 boxes over one hidden field (the server's delivery code is 6 digits).
class _CodeCard extends StatefulWidget {
  const _CodeCard({
    required this.controller,
    required this.onChanged,
    required this.onResend,
    this.error,
  });
  final TextEditingController controller;
  final VoidCallback onChanged;
  final VoidCallback? onResend;
  final String? error;

  @override
  State<_CodeCard> createState() => _CodeCardState();
}

class _CodeCardState extends State<_CodeCard> {
  final _focus = FocusNode();

  @override
  void dispose() {
    _focus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final code = widget.controller.text;
    return _Card(
      color: const Color(0xFFFAF9F7),
      child: Column(
        children: [
          const _RoundIcon(Icons.verified_user_rounded, size: 56),
          const SizedBox(height: 12),
          const Text(
            'Enter Customer Code',
            style: TextStyle(
              fontFamily: 'Outfit',
              fontSize: 20,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Ask the customer for the 6-digit code shown in their A3 Kitchen app.',
            textAlign: TextAlign.center,
            style: TextStyle(color: A3Colors.muted, height: 1.4),
          ),
          const SizedBox(height: A3Spacing.lg),
          GestureDetector(
            onTap: () => _focus.requestFocus(),
            child: Stack(
              children: [
                Row(
                  children: [
                    for (var i = 0; i < 6; i++) ...[
                      if (i > 0) const SizedBox(width: 8),
                      Expanded(
                        child: AspectRatio(
                          aspectRatio: 0.82,
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 150),
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: widget.error != null
                                    ? A3Colors.danger
                                    : (i == code.length && _focus.hasFocus
                                          ? A3Colors.primary
                                          : A3Colors.line),
                                width: i == code.length && _focus.hasFocus
                                    ? 2
                                    : 1.2,
                              ),
                            ),
                            child: Text(
                              i < code.length ? code[i] : '',
                              style: const TextStyle(
                                fontFamily: 'Outfit',
                                fontSize: 24,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                // Invisible input that drives the boxes (keeps paste/autofill working).
                Positioned.fill(
                  child: Opacity(
                    opacity: 0,
                    child: TextField(
                      controller: widget.controller,
                      focusNode: _focus,
                      keyboardType: TextInputType.number,
                      maxLength: 6,
                      autofillHints: const [AutofillHints.oneTimeCode],
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                      showCursor: false,
                      decoration: const InputDecoration(
                        counterText: '',
                        border: InputBorder.none,
                      ),
                      onChanged: (_) {
                        setState(() {});
                        widget.onChanged();
                      },
                      onTap: () => setState(() {}),
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (widget.error != null) ...[
            const SizedBox(height: 10),
            Text(
              widget.error!,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: A3Colors.danger,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFFDCFCE7),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.lock_rounded, size: 16, color: A3Colors.success),
                SizedBox(width: 6),
                Text(
                  'Code-verified handovers keep orders safe.',
                  style: TextStyle(fontSize: 12.5, color: Color(0xFF166534)),
                ),
              ],
            ),
          ),
          TextButton(
            onPressed: widget.onResend,
            style: TextButton.styleFrom(
              foregroundColor: A3Colors.primaryStrong,
            ),
            child: const Text('Customer can’t find the code? Send it again'),
          ),
        ],
      ),
    );
  }
}

class _CashCheck extends StatelessWidget {
  const _CashCheck({
    required this.amount,
    required this.value,
    required this.onChanged,
  });
  final String amount;
  final bool value;
  final ValueChanged<bool> onChanged;
  @override
  Widget build(BuildContext context) => Material(
    color: const Color(0xFFFEF3C7),
    borderRadius: BorderRadius.circular(16),
    child: CheckboxListTile(
      value: value,
      onChanged: (v) => onChanged(v ?? false),
      activeColor: const Color(0xFFB45309),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      controlAffinity: ListTileControlAffinity.leading,
      title: Text(
        'I collected $amount in cash',
        style: const TextStyle(
          fontWeight: FontWeight.w700,
          color: Color(0xFF78350F),
        ),
      ),
      subtitle: const Text(
        'Cash on delivery order',
        style: TextStyle(color: Color(0xFF92400E)),
      ),
    ),
  );
}

class _EarnedCard extends StatelessWidget {
  const _EarnedCard({required this.feePaise});
  final int feePaise;
  @override
  Widget build(BuildContext context) => _Card(
    color: const Color(0xFFFFF6EE),
    child: Row(
      children: [
        const _RoundIcon(Icons.account_balance_wallet_rounded, size: 60),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('You earned', style: TextStyle(color: A3Colors.muted)),
              Text(
                formatPaise(feePaise),
                style: const TextStyle(
                  fontFamily: 'Outfit',
                  fontSize: 34,
                  fontWeight: FontWeight.w700,
                  color: A3Colors.success,
                ),
              ),
              const Text(
                'Added to today’s earnings',
                style: TextStyle(fontSize: 12.5, color: A3Colors.muted),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/api/models.dart';
import '../../core/kitchen.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/widgets.dart';
import 'deliveries_providers.dart';
import 'route_map.dart';

/// Home "New Order" card (home mockup): 30 s countdown from the assignment time,
/// kitchen, items with prices, drop-off, distance/ETA, and Reject | Accept.
/// At 0 the order is declined automatically so the kitchen can reassign it.
class NewOrderCard extends ConsumerStatefulWidget {
  const NewOrderCard({
    super.key,
    required this.d,
    this.onDone,
    this.compactHeader = false,
  });
  final Delivery d;

  /// Called after accept/decline succeeds (default: accept opens the order screen).
  final void Function(String action)? onDone;

  /// Hide the kitchen row's link (when already on the order screen).
  final bool compactHeader;

  @override
  ConsumerState<NewOrderCard> createState() => _NewOrderCardState();
}

class _NewOrderCardState extends ConsumerState<NewOrderCard> {
  static const _window = 30;
  static const _reasons = [
    'Too far',
    'Traffic issue',
    'Busy with another order',
    'Vehicle problem',
    'Personal reason',
  ];

  late final DateTime _start = widget.d.assignedAt ?? DateTime.now();
  Timer? _timer;
  int _left = _window;
  bool _busy = false, _expired = false;

  Delivery get d => widget.d;

  @override
  void initState() {
    super.initState();
    HapticFeedback.heavyImpact();
    _tick();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _tick() {
    final left = (_window - DateTime.now().difference(_start).inSeconds).clamp(
      0,
      _window,
    );
    if (mounted) setState(() => _left = left);
    if (left == 0 && !_expired) {
      _expired = true;
      _timer?.cancel();
      _send('decline', {'reason': 'No response within 30 seconds'});
    }
  }

  Future<void> _send(String action, [Map<String, dynamic>? body]) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await ref
          .read(apiClientProvider)
          .post('/delivery/orders/${d.id}/$action', body);
      ref.invalidate(activeDeliveriesProvider);
      if (!mounted) return;
      if (widget.onDone != null) {
        widget.onDone!(action);
      } else if (action == 'accept') {
        context.push('/delivery/${d.id}');
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _reject() async {
    final reason = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: Text(
                'Why are you rejecting this order?',
                style: TextStyle(
                  fontFamily: 'Outfit',
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            for (final r in _reasons)
              ListTile(title: Text(r), onTap: () => Navigator.pop(ctx, r)),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (reason != null) await _send('decline', {'reason': reason});
  }

  @override
  Widget build(BuildContext context) {
    final km = distanceKm(d);
    final mins = etaMinutes(km);
    final itemCount = d.items.fold<int>(0, (s, i) => s + i.quantity);
    final urgent = _left <= 10;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: A3Colors.primary.withValues(alpha: 0.35)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14F58220),
            blurRadius: 20,
            offset: Offset(0, 8),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header: bell · New Order · countdown chip
          Container(
            color: const Color(0xFFFFF4EC),
            padding: const EdgeInsets.fromLTRB(16, 14, 14, 14),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: const BoxDecoration(
                    color: A3Colors.primarySoft,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.notifications_active_rounded,
                    color: A3Colors.primary,
                  ),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'New Order',
                        style: TextStyle(
                          fontFamily: 'Outfit',
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: A3Colors.danger,
                        ),
                      ),
                      Text(
                        'Please accept or reject within 30 seconds',
                        style: TextStyle(fontSize: 12.5, color: A3Colors.muted),
                      ),
                    ],
                  ),
                ),
                Semantics(
                  liveRegion: urgent,
                  label: '$_left seconds left',
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: A3Colors.danger.withValues(
                        alpha: urgent ? 0.16 : 0.1,
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.timer_outlined,
                          size: 18,
                          color: A3Colors.danger,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '00:${_left.toString().padLeft(2, '0')}',
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 16,
                            color: A3Colors.danger,
                            fontFeatures: [FontFeature.tabularFigures()],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Kitchen (pickup) — opens the full order
                InkWell(
                  borderRadius: BorderRadius.circular(14),
                  onTap: widget.compactHeader
                      ? null
                      : () => context.push('/delivery/${d.id}'),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      children: [
                        Container(
                          width: 56,
                          height: 56,
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: A3Colors.line),
                          ),
                          child: Image.asset(
                            'assets/images/logo.png',
                            fit: BoxFit.contain,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                kitchenName,
                                style: TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 16,
                                ),
                              ),
                              Text(
                                '$kitchenArea · ${d.orderNumber}',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: A3Colors.muted,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (!widget.compactHeader)
                          const Icon(
                            Icons.chevron_right_rounded,
                            color: A3Colors.muted,
                          ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                // Items + total
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: A3Colors.card,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Column(
                    children: [
                      for (final i in d.items)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 3),
                          child: Row(
                            children: [
                              SizedBox(
                                width: 34,
                                child: Text(
                                  '${i.quantity} x',
                                  style: const TextStyle(color: A3Colors.muted),
                                ),
                              ),
                              Expanded(
                                child: Text(
                                  i.variant == null
                                      ? i.name
                                      : '${i.name} (${i.variant})',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                              if (i.lineTotalPaise > 0)
                                Text(
                                  formatPaise(i.lineTotalPaise),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      const Divider(color: A3Colors.line, height: 18),
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              'Total amount · $itemCount ${itemCount == 1 ? 'item' : 'items'}',
                              style: const TextStyle(
                                color: A3Colors.muted,
                                fontSize: 13,
                              ),
                            ),
                          ),
                          Text(
                            formatPaise(d.totalPaise),
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 16,
                            ),
                          ),
                        ],
                      ),
                      if (d.collectCash) ...[
                        const SizedBox(height: 6),
                        Align(
                          alignment: Alignment.centerLeft,
                          child: Text(
                            'Cash on delivery: collect ${formatPaise(d.totalPaise)}',
                            style: const TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFFB45309),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                // Deliver to + call
                Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: const BoxDecoration(
                        color: A3Colors.primarySoft,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.location_on_rounded,
                        color: A3Colors.primary,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Deliver to',
                            style: TextStyle(
                              fontSize: 12,
                              color: A3Colors.muted,
                            ),
                          ),
                          Text(
                            d.recipient,
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 15,
                            ),
                          ),
                          Text(
                            d.addressLine,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 13,
                              color: A3Colors.muted,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (d.recipientPhone.isNotEmpty)
                      IconButton.outlined(
                        tooltip: 'Call ${d.recipient}',
                        onPressed: () => callNumber(context, d.recipientPhone),
                        icon: const Icon(
                          Icons.call_rounded,
                          color: A3Colors.ink,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                // Distance · estimated time
                Container(
                  padding: const EdgeInsets.symmetric(
                    vertical: 10,
                    horizontal: 12,
                  ),
                  decoration: BoxDecoration(
                    color: A3Colors.card,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: _Fact(
                          icon: Icons.near_me_rounded,
                          value: km == null
                              ? '—'
                              : '${km.toStringAsFixed(1)} km',
                          label: 'Distance',
                        ),
                      ),
                      Container(width: 1, height: 34, color: A3Colors.line),
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
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _busy || _expired ? null : _reject,
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size.fromHeight(54),
                          foregroundColor: A3Colors.danger,
                          backgroundColor: A3Colors.danger.withValues(
                            alpha: 0.05,
                          ),
                          side: const BorderSide(color: A3Colors.danger),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        icon: const Icon(Icons.close_rounded),
                        label: const Text(
                          'Reject',
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 16,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: _busy || _expired
                            ? null
                            : () => _send('accept'),
                        style: FilledButton.styleFrom(
                          minimumSize: const Size.fromHeight(54),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        icon: _busy
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Icon(Icons.check_rounded),
                        label: const Text(
                          'Accept',
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 16,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
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
      Container(
        width: 36,
        height: 36,
        decoration: const BoxDecoration(
          color: Color(0xFFE8F0FE),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, size: 18, color: const Color(0xFF1A73E8)),
      ),
      const SizedBox(width: 10),
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
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

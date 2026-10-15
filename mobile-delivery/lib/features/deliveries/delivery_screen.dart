import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/api/models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/widgets.dart';
import '../auth/auth_controller.dart';
import 'deliveries_providers.dart';

/// One delivery, step by step (docs/UX_FLOWS.md Flow 6):
/// accept/decline → confirm pickup → start delivery → enter the customer's code.
/// Nothing is shown as done until the server confirms it.
class DeliveryScreen extends ConsumerStatefulWidget {
  const DeliveryScreen({super.key, required this.orderId});
  final String orderId;

  @override
  ConsumerState<DeliveryScreen> createState() => _DeliveryScreenState();
}

class _DeliveryScreenState extends ConsumerState<DeliveryScreen> {
  bool _busy = false;

  Future<void> _act(String action, [Map<String, dynamic>? body]) async {
    setState(() => _busy = true);
    try {
      await ref.read(apiClientProvider).post('/delivery/orders/${widget.orderId}/$action', body);
      ref.invalidate(activeDeliveriesProvider);
      if (action == 'decline') {
        if (mounted) context.go('/');
        return;
      }
      ref.invalidate(deliveryProvider(widget.orderId));
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _decline() async {
    final reason = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('Decline this delivery?'),
        content: TextField(controller: reason, autofocus: true, decoration: const InputDecoration(labelText: 'Reason for the kitchen'), maxLength: 120),
        actions: [
          TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Back')),
          TextButton(onPressed: () => Navigator.pop(c, reason.text.trim().length >= 3), child: const Text('Decline', style: TextStyle(color: A3Colors.danger))),
        ],
      ),
    );
    if (ok == true) await _act('decline', {'reason': reason.text.trim()});
    reason.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final delivery = ref.watch(deliveryProvider(widget.orderId));
    return Scaffold(
      appBar: AppBar(title: Text(delivery.value?.orderNumber ?? 'Delivery')),
      body: delivery.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => e is ApiException && e.status == 404
            ? const StateView(icon: Icons.assignment_late_outlined, title: 'No longer assigned to you', message: 'The kitchen may have reassigned this order.')
            : ErrorView(error: e, onRetry: () => ref.invalidate(deliveryProvider(widget.orderId))),
        data: (d) => d.status == 'DELIVERED' ? _Delivered(d) : _body(d),
      ),
    );
  }

  Widget _body(Delivery d) {
    final step = d.actions.contains('accept')
        ? 0
        : d.actions.contains('pickup')
            ? 1
            : d.actions.contains('out-for-delivery')
                ? 2
                : 3;
    return ListView(
      padding: const EdgeInsets.all(A3Spacing.lg),
      children: [
        _Steps(current: step),
        const SizedBox(height: A3Spacing.lg),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(A3Spacing.lg),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(step <= 1 ? 'Pick up at A3 Kitchen' : 'Deliver to', style: const TextStyle(color: A3Colors.muted, fontSize: 13)),
              const SizedBox(height: 4),
              Text(step <= 1 ? 'Collect the packed order at the kitchen counter.' : d.recipient, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
              if (step >= 2) ...[
                const SizedBox(height: 4),
                Text(d.addressLine, style: const TextStyle(height: 1.4)),
                const SizedBox(height: A3Spacing.md),
                Row(children: [
                  Expanded(child: OutlinedButton.icon(onPressed: () => navigateTo(context, d.addressLine), icon: const Icon(Icons.navigation_outlined), label: const Text('Navigate'))),
                  const SizedBox(width: A3Spacing.sm),
                  Expanded(child: OutlinedButton.icon(onPressed: () => callNumber(context, d.recipientPhone), icon: const Icon(Icons.call_outlined), label: const Text('Call'))),
                ]),
              ],
            ]),
          ),
        ),
        const SizedBox(height: A3Spacing.md),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(A3Spacing.lg),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Items', style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: A3Spacing.sm),
              for (final i in d.items) Padding(padding: const EdgeInsets.symmetric(vertical: 2), child: Text('${i.quantity} × ${i.name}${i.variant != null ? ' (${i.variant})' : ''}')),
              const Divider(color: A3Colors.line),
              Row(children: [
                Icon(d.collectCash ? Icons.payments_outlined : Icons.verified_outlined, color: d.collectCash ? A3Colors.warning : A3Colors.success),
                const SizedBox(width: A3Spacing.sm),
                Expanded(
                  child: Text(d.collectCash ? 'Collect ${formatPaise(d.totalPaise)} in cash' : 'Prepaid — don’t collect money',
                      style: TextStyle(fontWeight: FontWeight.w700, color: d.collectCash ? A3Colors.warning : A3Colors.success)),
                ),
              ]),
            ]),
          ),
        ),
        const SizedBox(height: A3Spacing.xl),
        if (step == 0) ...[
          FilledButton(onPressed: _busy ? null : () => _act('accept'), child: const Text('Accept delivery')),
          const SizedBox(height: A3Spacing.sm),
          OutlinedButton(onPressed: _busy ? null : _decline, child: const Text('Decline')),
        ] else if (step == 1)
          FilledButton.icon(onPressed: _busy ? null : () => _act('pickup'), icon: const Icon(Icons.inventory_2_outlined), label: const Text('I’ve picked up the order'))
        else if (step == 2)
          FilledButton.icon(onPressed: _busy ? null : () => _act('out-for-delivery'), icon: const Icon(Icons.delivery_dining), label: const Text('Start delivery'))
        else ...[
          FilledButton.icon(
            onPressed: _busy ? null : () => _showOtpSheet(d),
            icon: const Icon(Icons.key_rounded),
            label: const Text('Enter delivery code'),
          ),
          const SizedBox(height: A3Spacing.sm),
          TextButton(onPressed: _busy ? null : () => _act('regenerate-otp'), child: const Text('Customer can’t find the code? Send a new one')),
        ],
        if (_busy) const Padding(padding: EdgeInsets.only(top: A3Spacing.md), child: Center(child: CircularProgressIndicator())),
      ],
    );
  }

  Future<void> _showOtpSheet(Delivery d) async {
    final done = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _OtpSheet(delivery: d),
    );
    if (done == true) {
      ref.invalidate(activeDeliveriesProvider);
      ref.invalidate(deliveryProvider(widget.orderId));
      ref.invalidate(historyProvider);
      await ref.read(authProvider.notifier).reload();
    }
  }
}

class _OtpSheet extends ConsumerStatefulWidget {
  const _OtpSheet({required this.delivery});
  final Delivery delivery;
  @override
  ConsumerState<_OtpSheet> createState() => _OtpSheetState();
}

class _OtpSheetState extends ConsumerState<_OtpSheet> {
  final _code = TextEditingController();
  bool _cash = false, _busy = false;
  String? _error;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _verify() async {
    final d = widget.delivery;
    if (!RegExp(r'^\d{6}$').hasMatch(_code.text)) return setState(() => _error = 'Enter the 6-digit code from the customer.');
    if (d.collectCash && !_cash) return setState(() => _error = 'Collect the cash and tick the box first.');
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(apiClientProvider).post('/delivery/orders/${d.id}/verify-otp', {'otp': _code.text, if (d.collectCash) 'cashCollected': true});
      if (mounted) Navigator.pop(context, true);
    } on ApiException catch (e) {
      setState(() => _error = e.message); // wrong / expired / locked — delivery stays incomplete
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final d = widget.delivery;
    return Padding(
      padding: EdgeInsets.fromLTRB(A3Spacing.xl, 0, A3Spacing.xl, MediaQuery.of(context).viewInsets.bottom + A3Spacing.xl),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text('Enter the delivery code', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: A3Spacing.xs),
        const Text('Ask the customer for the 6-digit code shown in their A3 Kitchen app.', style: TextStyle(color: A3Colors.muted)),
        const SizedBox(height: A3Spacing.lg),
        TextField(
          controller: _code,
          autofocus: true,
          keyboardType: TextInputType.number,
          maxLength: 6,
          textAlign: TextAlign.center,
          autofillHints: const [AutofillHints.oneTimeCode],
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          style: const TextStyle(fontSize: 30, letterSpacing: 14, fontWeight: FontWeight.w600),
          decoration: const InputDecoration(counterText: '', hintText: '••••••'),
          onSubmitted: (_) => _verify(),
        ),
        if (d.collectCash)
          CheckboxListTile(
            contentPadding: EdgeInsets.zero,
            value: _cash,
            onChanged: (v) => setState(() => _cash = v ?? false),
            title: Text('I collected ${formatPaise(d.totalPaise)} in cash'),
            controlAffinity: ListTileControlAffinity.leading,
          ),
        if (_error != null) Semantics(liveRegion: true, child: Text(_error!, style: const TextStyle(color: A3Colors.danger, fontWeight: FontWeight.w500))),
        const SizedBox(height: A3Spacing.lg),
        FilledButton(
          onPressed: _busy ? null : _verify,
          child: _busy ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Complete delivery'),
        ),
      ]),
    );
  }
}

class _Steps extends StatelessWidget {
  const _Steps({required this.current});
  final int current;
  static const _labels = ['Accept', 'Pick up', 'Start', 'Hand over'];
  @override
  Widget build(BuildContext context) => Row(children: [
        for (var i = 0; i < _labels.length; i++)
          Expanded(
            child: Semantics(
              label: '${_labels[i]}: ${i < current ? 'done' : i == current ? 'current step' : 'next'}',
              child: Column(children: [
                Container(height: 4, margin: const EdgeInsets.symmetric(horizontal: 2), color: i <= current ? A3Colors.primary : A3Colors.line),
                const SizedBox(height: 6),
                ExcludeSemantics(
                  child: Text(_labels[i], style: TextStyle(fontSize: 12, fontWeight: i == current ? FontWeight.w700 : FontWeight.w500, color: i <= current ? A3Colors.ink : A3Colors.muted)),
                ),
              ]),
            ),
          ),
      ]);
}

class _Delivered extends StatelessWidget {
  const _Delivered(this.d);
  final Delivery d;
  @override
  Widget build(BuildContext context) => StateView(
        icon: Icons.check_circle_outline,
        title: 'Delivered',
        message: '${d.orderNumber} was handed over${d.deliveredAt != null ? ' at ${timeOfDay(d.deliveredAt!)}' : ''}. Great job!',
        action: FilledButton(onPressed: () => context.go('/'), child: const Text('Back to deliveries')),
      );
}

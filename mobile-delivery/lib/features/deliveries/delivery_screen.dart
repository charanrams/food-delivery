import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/api/models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/frame.dart';
import '../../core/widgets/widgets.dart';
import '../auth/auth_controller.dart';
import 'deliveries_providers.dart';

/// Mission Screen: one delivery, executed step by step.
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
      ref.invalidate(earningsProvider);
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
    int selectedReason = 0;
    final detailsController = TextEditingController();
    const reasons = [
      'Restaurant is too far',
      'Traffic issue',
      'Personal reason',
      'Already busy with another task',
      'Accidental accept',
      'Other',
    ];

    final confirmed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Padding(
              padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(ctx).viewInsets.bottom + 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 56,
                      height: 56,
                      decoration: const BoxDecoration(color: Color(0xFFFFEBEE), shape: BoxShape.circle),
                      child: const Icon(Icons.cancel_outlined, size: 32, color: A3Colors.danger),
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Why are you rejecting this order?',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontFamily: 'Outfit', fontSize: 18, fontWeight: FontWeight.bold, color: A3Colors.ink),
                  ),
                  const SizedBox(height: 14),
                  for (var i = 0; i < reasons.length; i++)
                    InkWell(
                      onTap: () => setSheetState(() => selectedReason = i),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Row(
                          children: [
                            Icon(
                              selectedReason == i ? Icons.radio_button_checked : Icons.radio_button_unchecked,
                              size: 20,
                              color: selectedReason == i ? A3Colors.primary : A3Colors.muted,
                            ),
                            const SizedBox(width: 10),
                            Expanded(child: Text(reasons[i], style: const TextStyle(fontSize: 14))),
                          ],
                        ),
                      ),
                    ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: detailsController,
                    decoration: InputDecoration(
                      hintText: 'Add additional details (optional)',
                      filled: true,
                      fillColor: A3Colors.card,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    ),
                  ),
                  const SizedBox(height: 18),
                  FilledButton(
                    onPressed: () => Navigator.pop(ctx, true),
                    style: FilledButton.styleFrom(
                      backgroundColor: A3Colors.danger,
                      minimumSize: const Size.fromHeight(48),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    child: const Text('Submit Rejection', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            );
          },
        );
      },
    );

    if (confirmed == true) {
      final reasonText = '${reasons[selectedReason]} ${detailsController.text.trim()}'.trim();
      await _act('decline', {'reason': reasonText});
    }
    detailsController.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final delivery = ref.watch(deliveryProvider(widget.orderId));
    final orderNumber = delivery.value?.orderNumber ?? 'Mission';

    return FramedPage(
      title: orderNumber,
      child: delivery.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => e is ApiException && e.status == 404
            ? const StateView(
                icon: Icons.assignment_late_outlined,
                title: 'No longer assigned to you',
                message: 'The kitchen may have reassigned this order.',
              )
            : ErrorView(error: e, onRetry: () => ref.invalidate(deliveryProvider(widget.orderId))),
        data: (d) => d.status == 'DELIVERED' ? _Delivered(d) : _missionBody(d),
      ),
    );
  }

  Widget _missionBody(Delivery d) {
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
        // Stepper Progress Header
        _MissionStepper(current: step),
        const SizedBox(height: A3Spacing.lg),

        // Destination / Action Card
        Container(
          padding: const EdgeInsets.all(A3Spacing.lg),
          decoration: BoxDecoration(
            color: A3Colors.card,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                step <= 1 ? 'STEP 1: PICK UP AT KITCHEN' : 'STEP 2: DELIVER TO CUSTOMER',
                style: const TextStyle(
                  color: A3Colors.primaryStrong,
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                step <= 1 ? 'A3 Kitchen Counter' : d.recipient,
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18, fontFamily: 'Outfit'),
              ),
              const SizedBox(height: 4),
              Text(
                step <= 1 ? 'Collect packed order at dispatch counter and inspect items.' : d.addressLine,
                style: const TextStyle(height: 1.4, color: A3Colors.ink),
              ),
              const SizedBox(height: A3Spacing.md),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        backgroundColor: Colors.white,
                        minimumSize: const Size.fromHeight(44),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () => navigateTo(context, step <= 1 ? 'A3 Kitchen' : d.addressLine),
                      icon: const Icon(Icons.navigation_outlined, size: 18),
                      label: const Text('Directions', style: TextStyle(fontWeight: FontWeight.w700)),
                    ),
                  ),
                  const SizedBox(width: A3Spacing.sm),
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        backgroundColor: Colors.white,
                        minimumSize: const Size.fromHeight(44),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () => callNumber(context, step <= 1 ? '+91 9876543210' : d.recipientPhone),
                      icon: const Icon(Icons.call_outlined, size: 18),
                      label: Text(step <= 1 ? 'Call Kitchen' : 'Call Customer', style: const TextStyle(fontWeight: FontWeight.w700)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: A3Spacing.lg),

        // Items Checklist Card
        Container(
          padding: const EdgeInsets.all(A3Spacing.lg),
          decoration: BoxDecoration(
            color: A3Colors.card,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Text('Order Items & Verification', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                  const Spacer(),
                  Text('${d.items.length} dishes', style: const TextStyle(color: A3Colors.muted, fontSize: 13)),
                ],
              ),
              const SizedBox(height: A3Spacing.md),
              for (final i in d.items)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: A3Colors.line),
                        ),
                        child: Text('${i.quantity}x', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          '${i.name}${i.variant != null ? ' (${i.variant})' : ''}',
                          style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
                        ),
                      ),
                      const Icon(Icons.check_circle_outline, color: A3Colors.success, size: 18),
                    ],
                  ),
                ),
              const Divider(color: A3Colors.line, height: 24),
              // Payment requirement
              Container(
                padding: const EdgeInsets.all(A3Spacing.md),
                decoration: BoxDecoration(
                  color: d.collectCash ? const Color(0xFFFEF3C7) : const Color(0xFFDCFCE7),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  children: [
                    Icon(
                      d.collectCash ? Icons.payments_outlined : Icons.check_circle,
                      color: d.collectCash ? const Color(0xFFB45309) : const Color(0xFF15803D),
                      size: 24,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            d.collectCash ? 'CASH ON DELIVERY (COD)' : 'PREPAID ONLINE',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: d.collectCash ? const Color(0xFFB45309) : const Color(0xFF15803D),
                            ),
                          ),
                          Text(
                            d.collectCash ? 'Collect ${formatPaise(d.totalPaise)} in cash from customer' : 'Do NOT collect any money at doorstep',
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                              color: d.collectCash ? const Color(0xFF92400E) : const Color(0xFF166534),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: A3Spacing.xl),

        // Action Buttons corresponding to current step
        if (step == 0) ...[
          FilledButton.icon(
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(52),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            onPressed: _busy ? null : () => _act('accept'),
            icon: const Icon(Icons.check),
            label: const Text('Accept Delivery Assignment', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          ),
          const SizedBox(height: A3Spacing.md),
          OutlinedButton(
            style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(50),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            onPressed: _busy ? null : _decline,
            child: const Text('Decline this Order', style: TextStyle(fontWeight: FontWeight.w600, color: A3Colors.danger)),
          ),
        ] else if (step == 1) ...[
          Container(
            padding: const EdgeInsets.all(18),
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: A3Colors.card,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: A3Colors.line),
            ),
            child: Column(
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: const BoxDecoration(
                    color: A3Colors.surface,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.camera_alt_outlined, color: A3Colors.primary, size: 28),
                ),
                const SizedBox(height: 10),
                const Text('Take a photo of the packed order', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                const SizedBox(height: 4),
                const Text('Photo helps us verify the pickup at kitchen counter', style: TextStyle(color: A3Colors.muted, fontSize: 12)),
              ],
            ),
          ),
          FilledButton.icon(
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(52),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            onPressed: _busy ? null : () => _act('pickup'),
            icon: const Icon(Icons.inventory_2_outlined),
            label: const Text('Confirm Pickup', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          ),
        ] else if (step == 2)
          FilledButton.icon(
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(52),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            onPressed: _busy ? null : () => _act('out-for-delivery'),
            icon: const Icon(Icons.delivery_dining),
            label: const Text('Start Trip to Customer', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          )
        else ...[
          FilledButton.icon(
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(52),
              backgroundColor: A3Colors.success,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            onPressed: _busy ? null : () => _showOtpSheet(d),
            icon: const Icon(Icons.key_rounded),
            label: const Text('Enter 6-Digit Delivery Code', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          ),
          const SizedBox(height: A3Spacing.sm),
          TextButton(
            onPressed: _busy ? null : () => _act('regenerate-otp'),
            child: const Text('Customer cannot find code? Send fresh OTP'),
          ),
        ],
        if (_busy)
          const Padding(
            padding: EdgeInsets.only(top: A3Spacing.md),
            child: Center(child: CircularProgressIndicator()),
          ),
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
      ref.invalidate(earningsProvider);
      await ref.read(authProvider.notifier).reload();
      if (mounted) {
        context.push('/delivery-confirmation', extra: {
          'orderNumber': d.orderNumber,
          'earningsPaise': 4000,
        });
      }
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
    if (!RegExp(r'^\d{6}$').hasMatch(_code.text)) {
      return setState(() => _error = 'Enter the 6-digit code shown in the customer app.');
    }
    if (d.collectCash && !_cash) {
      return setState(() => _error = 'Collect the cash and tick the box first.');
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(apiClientProvider).post(
        '/delivery/orders/${d.id}/verify-otp',
        {'otp': _code.text, if (d.collectCash) 'cashCollected': true},
      );
      if (mounted) Navigator.pop(context, true);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final d = widget.delivery;
    return Padding(
      padding: EdgeInsets.fromLTRB(
        A3Spacing.xl,
        0,
        A3Spacing.xl,
        MediaQuery.of(context).viewInsets.bottom + A3Spacing.xl,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Doorstep Handover',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, fontFamily: 'Outfit'),
          ),
          const SizedBox(height: 4),
          const Text(
            'Ask the customer for the 6-digit delivery code displayed on their screen.',
            style: TextStyle(color: A3Colors.muted, fontSize: 13),
          ),
          const SizedBox(height: A3Spacing.lg),

          TextField(
            controller: _code,
            autofocus: true,
            keyboardType: TextInputType.number,
            maxLength: 6,
            textAlign: TextAlign.center,
            autofillHints: const [AutofillHints.oneTimeCode],
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            style: const TextStyle(fontSize: 32, letterSpacing: 16, fontWeight: FontWeight.w800, fontFamily: 'Outfit'),
            decoration: InputDecoration(
              counterText: '',
              hintText: '••••••',
              filled: true,
              fillColor: A3Colors.card,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
            ),
            onSubmitted: (_) => _verify(),
          ),
          const SizedBox(height: A3Spacing.md),

          if (d.collectCash)
            Container(
              margin: const EdgeInsets.only(bottom: A3Spacing.md),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF3C7),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFFDE68A)),
              ),
              child: CheckboxListTile(
                value: _cash,
                onChanged: (v) => setState(() => _cash = v ?? false),
                activeColor: const Color(0xFFB45309),
                title: Text(
                  'I collected ${formatPaise(d.totalPaise)} in cash',
                  style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF78350F), fontSize: 14),
                ),
                subtitle: const Text('Ensure exact amount is in hand', style: TextStyle(fontSize: 12, color: Color(0xFF92400E))),
                controlAffinity: ListTileControlAffinity.leading,
              ),
            ),

          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: A3Spacing.sm),
              child: Text(_error!, style: const TextStyle(color: A3Colors.danger, fontWeight: FontWeight.w600)),
            ),

          FilledButton(
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(50),
              backgroundColor: A3Colors.success,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            onPressed: _busy ? null : _verify,
            child: _busy
                ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Verify & Finish Delivery', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          ),
        ],
      ),
    );
  }
}

class _MissionStepper extends StatelessWidget {
  const _MissionStepper({required this.current});
  final int current;
  static const _labels = ['Accept', 'Pick Up', 'En Route', 'Handover'];

  @override
  Widget build(BuildContext context) => Row(
        children: [
          for (var i = 0; i < _labels.length; i++)
            Expanded(
              child: Column(
                children: [
                  Container(
                    height: 5,
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    decoration: BoxDecoration(
                      color: i <= current ? A3Colors.primary : A3Colors.line,
                      borderRadius: BorderRadius.circular(99),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _labels[i],
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: i == current ? FontWeight.w800 : FontWeight.w500,
                      color: i <= current ? A3Colors.ink : A3Colors.muted,
                    ),
                  ),
                ],
              ),
            ),
        ],
      );
}

class _Delivered extends StatelessWidget {
  const _Delivered(this.d);
  final Delivery d;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(A3Spacing.xl),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: const BoxDecoration(
                  color: Color(0xFFDCFCE7),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check_circle_rounded, size: 40, color: Color(0xFF16A34A)),
              ),
              const SizedBox(height: A3Spacing.lg),
              const Text(
                'Delivery Completed!',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, fontFamily: 'Outfit'),
              ),
              const SizedBox(height: 6),
              Text(
                'Order ${d.orderNumber} handed over${d.deliveredAt != null ? ' at ${timeOfDay(d.deliveredAt!)}' : ''}. Payout credited to your earnings.',
                textAlign: TextAlign.center,
                style: const TextStyle(color: A3Colors.muted, fontSize: 14, height: 1.4),
              ),
              const SizedBox(height: A3Spacing.xl),
              FilledButton(
                style: FilledButton.styleFrom(
                  minimumSize: const Size(200, 48),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                onPressed: () => context.go('/'),
                child: const Text('Back to Duty Console', style: TextStyle(fontWeight: FontWeight.w700)),
              ),
            ],
          ),
        ),
      );
}

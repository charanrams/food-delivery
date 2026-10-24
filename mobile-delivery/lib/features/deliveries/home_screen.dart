import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/api/models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/frame.dart';
import '../../core/widgets/widgets.dart';
import '../auth/auth_controller.dart';
import 'deliveries_providers.dart';
import 'new_order_card.dart';

/// Partner home (home mockup): header art, today's stats, duty card, then
/// new orders (accept/reject card with 30 s countdown) and active assignments.

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final partner = ref.watch(authProvider).value;
    final online = partner?.online ?? false;
    final deliveries = ref.watch(activeDeliveriesProvider);
    final earnings = ref.watch(earningsProvider).value;

    return FramedPage(
      title: 'A3 Delivery Partner',
      showBack: false,
      headerImage: 'assets/images/home_banner.jpg',
      headerHeight: 150,
      // Mockup 1: logo + greeting on the left, bell + ON DUTY pill on the right,
      // over the rider/city artwork.
      headerWidget: Padding(
        padding: const EdgeInsets.only(top: 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white,
                border: Border.all(color: Colors.white, width: 2),
              ),
              clipBehavior: Clip.antiAlias,
              child: Image.asset('assets/images/logo.png', fit: BoxFit.cover),
            ),
            const SizedBox(width: A3Spacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Hi, ${(partner?.name ?? 'Rider').split(' ').first}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      fontFamily: 'Outfit',
                      shadows: [
                        Shadow(color: Color(0x40000000), blurRadius: 8),
                      ],
                    ),
                  ),
                  const Text(
                    'Delivery Partner',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      shadows: [
                        Shadow(color: Color(0x40000000), blurRadius: 8),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            IconButton(
              tooltip: 'Notifications',
              onPressed: () => context.push('/notifications'),
              style: IconButton.styleFrom(backgroundColor: Colors.white24),
              icon: const Icon(
                Icons.notifications_outlined,
                color: Colors.white,
              ),
            ),
            const SizedBox(width: 6),
            Semantics(
              button: true,
              label: online
                  ? 'On duty, tap to go off duty'
                  : 'Off duty, tap to go on duty',
              child: Material(
                color: Colors.white,
                borderRadius: BorderRadius.circular(99),
                child: InkWell(
                  borderRadius: BorderRadius.circular(99),
                  onTap: partner == null
                      ? null
                      : () async {
                          try {
                            await ref
                                .read(authProvider.notifier)
                                .setOnline(!online);
                          } on ApiException catch (e) {
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text(e.message)),
                              );
                            }
                          }
                        },
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.circle,
                          size: 9,
                          color: online ? A3Colors.success : A3Colors.muted,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          online ? 'ON DUTY' : 'OFF DUTY',
                          style: TextStyle(
                            color: online ? A3Colors.success : A3Colors.ink,
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.3,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
      child: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(activeDeliveriesProvider);
          ref.invalidate(earningsProvider);
          await ref.read(authProvider.notifier).reload();
        },
        child: ListView(
          padding: const EdgeInsets.all(A3Spacing.lg),
          children: [
            // Live Duty Stats Grid
            Row(
              children: [
                Expanded(
                  child: _StatCard(
                    title: 'Delivered',
                    value: '${partner?.todayDelivered ?? 0}',
                    subtitle: 'Today',
                    icon: Icons.check_circle_outline_rounded,
                    color: A3Colors.success,
                  ),
                ),
                const SizedBox(width: A3Spacing.md),
                Expanded(
                  child: _StatCard(
                    title: "Today's Earnings",
                    value: formatPaise(earnings?.today.earningsPaise ?? 0),
                    icon: Icons.currency_rupee_rounded,
                    color: A3Colors.primary,
                  ),
                ),
                const SizedBox(width: A3Spacing.md),
                Expanded(
                  child: _StatCard(
                    title: 'Active Orders',
                    value: '${deliveries.value?.length ?? 0}',
                    subtitle: 'Now',
                    icon: Icons.two_wheeler_rounded,
                    color: const Color(0xFF1A73E8),
                  ),
                ),
              ],
            ),
            const SizedBox(height: A3Spacing.md),

            // Deliveries Stream
            deliveries.when(
              loading: () => const Padding(
                padding: EdgeInsets.all(40),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (e, _) => ErrorView(
                error: e,
                onRetry: () => ref.invalidate(activeDeliveriesProvider),
              ),
              data: (list) {
                if (!online) {
                  return Container(
                    padding: const EdgeInsets.all(A3Spacing.xl),
                    decoration: BoxDecoration(
                      color: A3Colors.card,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Column(
                      children: [
                        const Icon(
                          Icons.power_settings_new_rounded,
                          size: 48,
                          color: A3Colors.muted,
                        ),
                        const SizedBox(height: A3Spacing.md),
                        const Text(
                          'You are currently offline',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            fontFamily: 'Outfit',
                          ),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Toggle the switch in the top header to go online and receive live delivery dispatches.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: A3Colors.muted, height: 1.4),
                        ),
                        const SizedBox(height: A3Spacing.lg),
                        FilledButton.icon(
                          onPressed: () =>
                              ref.read(authProvider.notifier).setOnline(true),
                          icon: const Icon(Icons.bolt),
                          label: const Text('Go Online Now'),
                        ),
                      ],
                    ),
                  );
                }

                final fresh = list
                    .where((d) => d.actions.contains('accept'))
                    .toList();
                final ongoing = list
                    .where((d) => !d.actions.contains('accept'))
                    .toList();
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const _OnDutyCard(),
                    const SizedBox(height: A3Spacing.md),
                    for (final d in fresh) ...[
                      NewOrderCard(key: ValueKey('new-${d.id}'), d: d),
                      const SizedBox(height: A3Spacing.md),
                    ],
                    if (ongoing.isNotEmpty) ...[
                      const Padding(
                        padding: EdgeInsets.only(top: 4, bottom: A3Spacing.sm),
                        child: Text(
                          'Active Assignments',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            fontFamily: 'Outfit',
                          ),
                        ),
                      ),
                      for (final d in ongoing) _DeliveryCard(delivery: d),
                    ],
                    if (list.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(A3Spacing.xl),
                        decoration: BoxDecoration(
                          color: A3Colors.card,
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(color: A3Colors.line),
                        ),
                        child: const Column(
                          children: [
                            Icon(
                              Icons.radar_rounded,
                              size: 40,
                              color: A3Colors.primaryStrong,
                            ),
                            SizedBox(height: A3Spacing.md),
                            Text(
                              'Waiting for assignments',
                              style: TextStyle(
                                fontSize: 19,
                                fontWeight: FontWeight.w700,
                                fontFamily: 'Outfit',
                              ),
                            ),
                            SizedBox(height: 6),
                            Text(
                              'New orders appear here with a 30-second window to accept.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: A3Colors.muted,
                                fontSize: 13,
                                height: 1.45,
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
    this.subtitle,
  });

  final String title, value;
  final String? subtitle;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(A3Spacing.md),
    decoration: BoxDecoration(
      color: A3Colors.card,
      borderRadius: BorderRadius.circular(20),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.14),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, size: 20, color: color),
        ),
        const SizedBox(height: 10),
        FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Text(
            value,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              fontFamily: 'Outfit',
              color: A3Colors.ink,
            ),
          ),
        ),
        Text(
          title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 12, color: A3Colors.muted),
        ),
        if (subtitle != null)
          Text(
            subtitle!,
            style: const TextStyle(fontSize: 12, color: A3Colors.muted),
          ),
      ],
    ),
  );
}

/// Green "You are ON DUTY" strip (home mockup).
class _OnDutyCard extends StatelessWidget {
  const _OnDutyCard();
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    decoration: BoxDecoration(
      color: const Color(0xFFEAF7EF),
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: const Color(0xFFBFE6CC)),
    ),
    child: const Row(
      children: [
        CircleAvatar(
          radius: 22,
          backgroundColor: Color(0xFFD3F0DD),
          child: Icon(Icons.gps_fixed_rounded, color: A3Colors.success),
        ),
        SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'You are ON DUTY',
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 16,
                  fontFamily: 'Outfit',
                ),
              ),
              Text(
                'Ready to receive new orders',
                style: TextStyle(fontSize: 13, color: A3Colors.muted),
              ),
            ],
          ),
        ),
        Icon(Icons.delivery_dining_rounded, size: 40, color: A3Colors.primary),
      ],
    ),
  );
}

class _DeliveryCard extends StatelessWidget {
  const _DeliveryCard({required this.delivery});
  final Delivery delivery;

  @override
  Widget build(BuildContext context) {
    final d = delivery;
    final isNew = d.actions.contains('accept');
    final isPickup = d.actions.contains('pickup');
    final isOut = d.actions.contains('out-for-delivery');

    final stepLabel = isNew
        ? 'New: Tap to Accept'
        : isPickup
        ? 'Step 1: Pick up at kitchen'
        : isOut
        ? 'Step 2: Start delivery'
        : 'Step 3: Doorstep OTP handover';

    return Container(
      margin: const EdgeInsets.only(bottom: A3Spacing.md),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isNew ? A3Colors.primary : A3Colors.line,
          width: isNew ? 2 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: isNew
                ? A3Colors.primary.withValues(alpha: 0.12)
                : Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () => context.push('/delivery/${d.id}'),
        child: Padding(
          padding: const EdgeInsets.all(A3Spacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: isNew ? A3Colors.primarySoft : A3Colors.card,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.delivery_dining,
                      color: isNew ? A3Colors.primaryStrong : A3Colors.ink,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          d.orderNumber,
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 16,
                            fontFamily: 'Outfit',
                          ),
                        ),
                        Text(
                          stepLabel,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: isNew
                                ? A3Colors.primaryStrong
                                : A3Colors.muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: (isNew ? A3Colors.primary : A3Colors.ink)
                          .withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(99),
                    ),
                    child: Text(
                      isNew
                          ? 'ACTION REQUIRED'
                          : deliveryStatusLabel[d.status] ?? d.status,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: isNew ? A3Colors.primaryStrong : A3Colors.ink,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: A3Spacing.md),
              const Divider(color: A3Colors.line, height: 1),
              const SizedBox(height: A3Spacing.md),

              // Drop Address
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(
                    Icons.location_on_rounded,
                    size: 18,
                    color: A3Colors.primaryStrong,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          d.recipient,
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
                          ),
                        ),
                        Text(
                          d.addressLine,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 13,
                            color: A3Colors.muted,
                            height: 1.35,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: A3Spacing.md),

              // Summary footer
              Row(
                children: [
                  Text(
                    '${d.items.fold<int>(0, (s, i) => s + i.quantity)} items',
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: (d.collectCash
                          ? const Color(0xFFFEF3C7)
                          : const Color(0xFFDCFCE7)),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          d.collectCash
                              ? Icons.payments_outlined
                              : Icons.check_circle_outline,
                          size: 14,
                          color: d.collectCash
                              ? const Color(0xFFB45309)
                              : const Color(0xFF15803D),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          d.collectCash
                              ? 'Collect ${formatPaise(d.totalPaise)} cash'
                              : 'Prepaid',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: d.collectCash
                                ? const Color(0xFFB45309)
                                : const Color(0xFF15803D),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Spacer(),
                  const Icon(
                    Icons.arrow_forward_rounded,
                    size: 18,
                    color: A3Colors.primaryStrong,
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

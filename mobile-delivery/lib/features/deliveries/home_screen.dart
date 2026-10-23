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

/// Partner home: Duty Console + active deliveries.
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
      headerWidget: Row(
        children: [
          // Brand Logo
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.white,
              border: Border.all(color: Colors.white38, width: 2),
            ),
            clipBehavior: Clip.antiAlias,
            child: Image.asset('assets/images/logo.png', fit: BoxFit.cover),
          ),
          const SizedBox(width: A3Spacing.sm),
          // App Title + Rider Name
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'A3 Delivery Partner',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    fontFamily: 'Outfit',
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  'Hi, ${(partner?.name ?? 'Rider').split(' ').first}',
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: A3Spacing.xs),
          // Notification Bell
          IconButton(
            icon: const Icon(Icons.notifications_outlined, color: Colors.white),
            tooltip: 'Notifications',
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('No new dispatch notifications')),
              );
            },
          ),
          // Duty toggle switch
          Semantics(
            button: true,
            label: online ? 'Online - tap to go offline' : 'Offline - tap to go online',
            child: InkWell(
              borderRadius: BorderRadius.circular(99),
              onTap: partner == null
                  ? null
                  : () async {
                      try {
                        await ref.read(authProvider.notifier).setOnline(!online);
                      } on ApiException catch (e) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
                        }
                      }
                    },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: online ? const Color(0xFF14532D) : A3Colors.ink,
                  borderRadius: BorderRadius.circular(99),
                  border: Border.all(
                    color: online ? const Color(0xFF4ADE80) : Colors.white24,
                    width: 1.5,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 7,
                      height: 7,
                      decoration: BoxDecoration(
                        color: online ? const Color(0xFF4ADE80) : Colors.white60,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 5),
                    Text(
                      online ? 'ON' : 'OFF',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
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
            // Rider greeting & shift status
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Hi, ${(partner?.name ?? 'Rider').split(' ').first}',
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w800,
                          fontFamily: 'Outfit',
                          color: A3Colors.ink,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Icon(
                            online ? Icons.wifi_tethering : Icons.portable_wifi_off,
                            size: 15,
                            color: online ? A3Colors.success : A3Colors.muted,
                          ),
                          const SizedBox(width: 5),
                          Text(
                            online ? 'GPS Active · Receiving dispatch orders' : 'Offline · Switch on to receive orders',
                            style: TextStyle(
                              fontSize: 13,
                              color: online ? A3Colors.success : A3Colors.muted,
                              fontWeight: online ? FontWeight.w600 : FontWeight.w400,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: A3Spacing.lg),

            // Live Duty Stats Grid
            Row(
              children: [
                Expanded(
                  child: _StatCard(
                    title: 'Delivered',
                    value: '${partner?.todayDelivered ?? 0}',
                    subtitle: 'Today',
                    icon: Icons.check_circle_outline,
                    color: A3Colors.success,
                  ),
                ),
                const SizedBox(width: A3Spacing.md),
                Expanded(
                  child: _StatCard(
                    title: "Today's Pay",
                    value: formatPaise(earnings?.today.earningsPaise ?? 0),
                    subtitle: 'Earned',
                    icon: Icons.currency_rupee,
                    color: A3Colors.primaryStrong,
                  ),
                ),
                const SizedBox(width: A3Spacing.md),
                Expanded(
                  child: _StatCard(
                    title: 'Active',
                    value: '${deliveries.value?.length ?? 0}',
                    subtitle: 'Orders',
                    icon: Icons.two_wheeler,
                    color: A3Colors.ink,
                  ),
                ),
              ],
            ),
            const SizedBox(height: A3Spacing.xl),

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
                        const Icon(Icons.power_settings_new_rounded, size: 48, color: A3Colors.muted),
                        const SizedBox(height: A3Spacing.md),
                        const Text(
                          'You are currently offline',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, fontFamily: 'Outfit'),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Toggle the switch in the top header to go online and receive live delivery dispatches.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: A3Colors.muted, height: 1.4),
                        ),
                        const SizedBox(height: A3Spacing.lg),
                        FilledButton.icon(
                          onPressed: () => ref.read(authProvider.notifier).setOnline(true),
                          icon: const Icon(Icons.bolt),
                          label: const Text('Go Online Now'),
                        ),
                      ],
                    ),
                  );
                }

                if (list.isEmpty) {
                  return Container(
                    padding: const EdgeInsets.all(A3Spacing.xl),
                    decoration: BoxDecoration(
                      color: A3Colors.card,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: A3Colors.line),
                    ),
                    child: Column(
                      children: [
                        Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            color: A3Colors.primarySoft,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.radar_rounded, size: 40, color: A3Colors.primaryStrong),
                        ),
                        const SizedBox(height: A3Spacing.lg),
                        const Text(
                          'Waiting for assignments',
                          style: TextStyle(fontSize: 19, fontWeight: FontWeight.w700, fontFamily: 'Outfit'),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'A3 Kitchen is live. As soon as the kitchen assigns an order to you, it will ring with audio and vibration alert.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: A3Colors.muted, fontSize: 13, height: 1.45),
                        ),
                      ],
                    ),
                  );
                }

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Text(
                          'Active Assignments',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, fontFamily: 'Outfit'),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: A3Colors.primary,
                            borderRadius: BorderRadius.circular(99),
                          ),
                          child: Text(
                            '${list.length}',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: A3Spacing.md),
                    for (final d in list) _DeliveryCard(delivery: d),
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
    required this.subtitle,
    required this.icon,
    required this.color,
  });

  final String title, value, subtitle;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(A3Spacing.md),
      decoration: BoxDecoration(
        color: A3Colors.card,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: color),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              fontFamily: 'Outfit',
              color: A3Colors.ink,
            ),
          ),
          Text(
            title,
            style: const TextStyle(fontSize: 11, color: A3Colors.muted, fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }
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
            color: isNew ? A3Colors.primary.withValues(alpha: 0.12) : Colors.black.withValues(alpha: 0.04),
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
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, fontFamily: 'Outfit'),
                        ),
                        Text(
                          stepLabel,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: isNew ? A3Colors.primaryStrong : A3Colors.muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: (isNew ? A3Colors.primary : A3Colors.ink).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(99),
                    ),
                    child: Text(
                      isNew ? 'ACTION REQUIRED' : deliveryStatusLabel[d.status] ?? d.status,
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
                  const Icon(Icons.location_on_rounded, size: 18, color: A3Colors.primaryStrong),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          d.recipient,
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                        ),
                        Text(
                          d.addressLine,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 13, color: A3Colors.muted, height: 1.35),
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
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                  ),
                  const SizedBox(width: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: (d.collectCash ? const Color(0xFFFEF3C7) : const Color(0xFFDCFCE7)),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          d.collectCash ? Icons.payments_outlined : Icons.check_circle_outline,
                          size: 14,
                          color: d.collectCash ? const Color(0xFFB45309) : const Color(0xFF15803D),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          d.collectCash ? 'Collect ${formatPaise(d.totalPaise)} cash' : 'Prepaid',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: d.collectCash ? const Color(0xFFB45309) : const Color(0xFF15803D),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Spacer(),
                  const Icon(Icons.arrow_forward_rounded, size: 18, color: A3Colors.primaryStrong),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

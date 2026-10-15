import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/api/models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/widgets.dart';
import '../auth/auth_controller.dart';
import 'deliveries_providers.dart';

/// Partner home: online/offline switch + active deliveries (new ones appear automatically).
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final partner = ref.watch(authProvider).value;
    final online = partner?.online ?? false;
    final deliveries = ref.watch(activeDeliveriesProvider);

    return Scaffold(
      appBar: AppBar(
        title: Row(children: [
          ClipOval(child: Image.asset('assets/images/logo.png', width: 32, height: 32, semanticLabel: 'A3 Kitchen logo')),
          const SizedBox(width: A3Spacing.sm),
          const Text('Deliveries'),
        ]),
        actions: [
          Text(online ? 'Online' : 'Offline', style: TextStyle(fontWeight: FontWeight.w600, color: online ? A3Colors.success : A3Colors.muted)),
          Switch(
            value: online,
            activeThumbColor: A3Colors.success,
            onChanged: partner == null
                ? null
                : (v) async {
                    try {
                      await ref.read(authProvider.notifier).setOnline(v);
                    } on ApiException catch (e) {
                      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
                    }
                  },
          ),
          const SizedBox(width: A3Spacing.sm),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(activeDeliveriesProvider);
          await ref.read(authProvider.notifier).reload();
        },
        child: deliveries.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => ErrorView(error: e, onRetry: () => ref.invalidate(activeDeliveriesProvider)),
          data: (list) => ListView(
            padding: const EdgeInsets.all(A3Spacing.lg),
            children: [
              Text('Hi, ${partner?.name.split(' ').first ?? ''}', style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 4),
              Text('${partner?.todayDelivered ?? 0} delivered today', style: const TextStyle(color: A3Colors.muted)),
              const SizedBox(height: A3Spacing.lg),
              if (list.isEmpty)
                SizedBox(
                  height: 360,
                  child: StateView(
                    icon: online ? Icons.delivery_dining : Icons.power_settings_new,
                    title: online ? 'Waiting for an assignment' : 'You’re offline',
                    message: online ? 'New deliveries from the kitchen appear here automatically.' : 'Go online to start receiving deliveries.',
                  ),
                )
              else
                for (final d in list) _DeliveryCard(delivery: d),
            ],
          ),
        ),
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
    return Card(
      margin: const EdgeInsets.only(bottom: A3Spacing.md),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: BorderSide(color: isNew ? A3Colors.primary : A3Colors.line, width: isNew ? 2 : 1)),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => context.push('/delivery/${d.id}'),
        child: Padding(
          padding: const EdgeInsets.all(A3Spacing.lg),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: Text(d.orderNumber, style: const TextStyle(fontWeight: FontWeight.w700))),
              _Pill(text: isNew ? 'New — tap to accept' : deliveryStatusLabel[d.status] ?? d.status, color: isNew ? A3Colors.primaryStrong : A3Colors.warning),
            ]),
            const SizedBox(height: A3Spacing.sm),
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Icon(Icons.location_on_outlined, size: 18, color: A3Colors.muted),
              const SizedBox(width: 6),
              Expanded(child: Text(d.addressLine, style: const TextStyle(height: 1.4))),
            ]),
            const SizedBox(height: A3Spacing.sm),
            Text('${d.items.fold<int>(0, (s, i) => s + i.quantity)} items · ${d.collectCash ? 'Collect ${formatPaise(d.totalPaise)} cash' : 'Prepaid'}',
                style: TextStyle(fontWeight: FontWeight.w600, color: d.collectCash ? A3Colors.warning : A3Colors.success)),
          ]),
        ),
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.text, required this.color});
  final String text;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(999)),
        child: Text(text, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color)),
      );
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/widgets.dart';
import '../auth/auth_controller.dart';
import '../deliveries/deliveries_providers.dart';

class HistoryScreen extends ConsumerWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final history = ref.watch(historyProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('History')),
      body: history.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ErrorView(error: e, onRetry: () => ref.invalidate(historyProvider)),
        data: (list) => list.isEmpty
            ? const StateView(icon: Icons.history, title: 'No deliveries yet', message: 'Completed deliveries will appear here.')
            : RefreshIndicator(
                onRefresh: () async => ref.invalidate(historyProvider),
                child: ListView.separated(
                  padding: const EdgeInsets.all(A3Spacing.lg),
                  itemCount: list.length,
                  separatorBuilder: (_, _) => const SizedBox(height: A3Spacing.sm),
                  itemBuilder: (_, i) {
                    final d = list[i];
                    return Card(
                      child: ListTile(
                        leading: const Icon(Icons.check_circle, color: A3Colors.success),
                        title: Text(d.orderNumber, style: const TextStyle(fontWeight: FontWeight.w600)),
                        subtitle: Text(d.addressLine, maxLines: 1, overflow: TextOverflow.ellipsis),
                        trailing: Text(d.deliveredAt != null ? timeOfDay(d.deliveredAt!) : '', style: const TextStyle(color: A3Colors.muted)),
                      ),
                    );
                  },
                ),
              ),
      ),
    );
  }
}

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = ref.watch(authProvider).value;
    if (p == null) return const SizedBox.shrink();
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(
        padding: const EdgeInsets.all(A3Spacing.lg),
        children: [
          ListTile(
            leading: CircleAvatar(backgroundColor: A3Colors.primarySoft, child: Text(p.name.characters.first, style: const TextStyle(color: A3Colors.primaryStrong, fontWeight: FontWeight.w700))),
            title: Text(p.name, style: const TextStyle(fontWeight: FontWeight.w600)),
            subtitle: Text([p.email, p.phone].whereType<String>().join(' · ')),
          ),
          if (p.vehicle?.isNotEmpty == true) ListTile(leading: const Icon(Icons.two_wheeler), title: const Text('Vehicle'), subtitle: Text(p.vehicle!)),
          ListTile(leading: const Icon(Icons.today_outlined), title: const Text('Delivered today'), trailing: Text('${p.todayDelivered}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16))),
          const Divider(color: A3Colors.line),
          ListTile(
            leading: const Icon(Icons.logout),
            title: const Text('Log out'),
            onTap: () async {
              try {
                await ref.read(authProvider.notifier).logout();
              } catch (_) {/* router sends us to login either way */}
            },
          ),
          const Padding(
            padding: EdgeInsets.all(A3Spacing.lg),
            child: Text('Details wrong? Ask the kitchen admin to update your profile.', style: TextStyle(color: A3Colors.muted, fontSize: 13)),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/api/models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/frame.dart';
import '../../core/widgets/widgets.dart';
import '../orders/orders_providers.dart';

/// Saved addresses. With [selectFor] set (checkout), tapping an address returns it.
class AddressesScreen extends ConsumerWidget {
  const AddressesScreen({super.key, this.selectFor});
  final String? selectFor;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final addresses = ref.watch(addressesProvider);
    final selecting = selectFor != null;

    return FramedPage(
      title: selecting ? 'Deliver to' : 'My addresses',
      bottom: FilledButton.icon(
        onPressed: () async {
          final created = await context.push<Address>('/addresses/new');
          if (created != null && selecting && context.mounted) {
            context.pop(created);
          }
        },
        icon: const Icon(Icons.add_location_alt_outlined),
        label: const Text('Add address'),
      ),
      child: addresses.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => AsyncStateView.error(
          message: '$e',
          onRetry: () => ref.invalidate(addressesProvider),
        ),
        data: (list) => list.isEmpty
            ? const AsyncStateView.empty(
                icon: Icons.location_off_outlined,
                title: 'No saved addresses',
                message: 'Add where we should deliver your food.',
              )
            : ListView.separated(
                padding: const EdgeInsets.fromLTRB(
                  A3Spacing.lg,
                  A3Spacing.lg,
                  A3Spacing.lg,
                  96,
                ),
                itemCount: list.length,
                separatorBuilder: (_, _) =>
                    const SizedBox(height: A3Spacing.md),
                itemBuilder: (context, i) {
                  final a = list[i];
                  final selected = a.id == selectFor;
                  return Card(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                      side: BorderSide(
                        color: selected ? A3Colors.primary : A3Colors.line,
                        width: selected ? 2 : 1,
                      ),
                    ),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(14),
                      onTap: selecting
                          ? () => a.isServiceable
                                ? context.pop(a)
                                : ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(
                                        'Sorry, we don’t deliver to ${a.postalCode} yet.',
                                      ),
                                    ),
                                  )
                          : () => context.push('/addresses/edit', extra: a),
                      child: Padding(
                        padding: const EdgeInsets.all(A3Spacing.lg),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(
                              a.label == 'WORK'
                                  ? Icons.work_outline
                                  : Icons.home_outlined,
                              color: A3Colors.primary,
                            ),
                            const SizedBox(width: A3Spacing.md),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Text(
                                        a.labelText,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w600,
                                          fontSize: 15,
                                        ),
                                      ),
                                      if (a.isDefault) ...[
                                        const SizedBox(width: A3Spacing.sm),
                                        const _Chip(
                                          'Default',
                                          A3Colors.success,
                                        ),
                                      ],
                                      if (!a.isServiceable) ...[
                                        const SizedBox(width: A3Spacing.sm),
                                        const _Chip(
                                          'Not serviceable',
                                          A3Colors.danger,
                                        ),
                                      ],
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '${a.recipientName} · ${a.phone}',
                                    style: const TextStyle(
                                      fontSize: 13,
                                      color: A3Colors.muted,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    a.oneLine,
                                    style: const TextStyle(
                                      fontSize: 13,
                                      height: 1.4,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            if (!selecting)
                              IconButton(
                                tooltip: 'Delete address',
                                icon: const Icon(Icons.delete_outline),
                                onPressed: () => _delete(context, ref, a),
                              ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
      ),
    );
  }

  Future<void> _delete(BuildContext context, WidgetRef ref, Address a) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('Delete this address?'),
        content: Text(a.oneLine),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: const Text('Keep'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(c, true),
            child: const Text(
              'Delete',
              style: TextStyle(color: A3Colors.danger),
            ),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ref.read(apiClientProvider).delete('/addresses/${a.id}');
      ref.invalidate(addressesProvider);
    } on ApiException catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }
}

class _Chip extends StatelessWidget {
  const _Chip(this.text, this.color);
  final String text;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.12),
      borderRadius: BorderRadius.circular(999),
    ),
    child: Text(
      text,
      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: color),
    ),
  );
}

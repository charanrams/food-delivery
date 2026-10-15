import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/api/models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/frame.dart';
import '../../core/widgets/widgets.dart';
import '../orders/orders_providers.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() =>
      _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  /// Swiped-away ids, hidden immediately (Dismissible needs the row gone before the refetch).
  final _removed = <String>{};

  List<AppNotification> _visible(List<AppNotification> all) =>
      all.where((x) => !_removed.contains(x.id)).toList();

  @override
  Widget build(BuildContext context) {
    final notes = ref.watch(notificationsProvider);
    final api = ref.read(apiClientProvider);
    return FramedPage(
      title: 'Notifications',
      actions: [
        if ((notes.value?.unread ?? 0) > 0)
          IconButton(
            tooltip: 'Mark all read',
            color: Colors.white,
            icon: const Icon(Icons.done_all),
            onPressed: () async {
              await api.post('/notifications/read-all');
              ref.invalidate(notificationsProvider);
            },
          ),
      ],
      child: notes.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => AsyncStateView.error(
          message: '$e',
          onRetry: () => ref.invalidate(notificationsProvider),
        ),
        data: (n) => _visible(n.items).isEmpty
            ? const AsyncStateView.empty(
                icon: Icons.notifications_none,
                title: 'No notifications yet',
                message: 'Order updates will show up here.',
              )
            : RefreshIndicator(
                onRefresh: () async => ref.invalidate(notificationsProvider),
                child: ListView.separated(
                  physics: const AlwaysScrollableScrollPhysics(),
                  itemCount: _visible(n.items).length,
                  separatorBuilder: (_, _) =>
                      const Divider(height: 1, color: A3Colors.line),
                  itemBuilder: (context, i) {
                    final item = _visible(n.items)[i];
                    return _NotificationTile(
                      key: ValueKey(item.id),
                      item: item,
                      onOpen: () {
                        // Navigate first; marking read must never block opening the order.
                        if (!item.read) {
                          api
                              .post('/notifications/${item.id}/read')
                              .then(
                                (_) => ref.invalidate(notificationsProvider),
                              )
                              .catchError((_) {});
                        }
                        if (item.orderId != null) {
                          context.go('/orders/${item.orderId}');
                        }
                      },
                      onDismiss: () async {
                        setState(() => _removed.add(item.id));
                        final messenger = ScaffoldMessenger.of(context);
                        try {
                          await api.delete('/notifications/${item.id}');
                        } on ApiException catch (e) {
                          messenger.showSnackBar(
                            SnackBar(content: Text(e.message)),
                          );
                        }
                        ref.invalidate(notificationsProvider);
                      },
                    );
                  },
                ),
              ),
      ),
    );
  }
}

/// One notification: tap opens its order, swipe either way removes it.
class _NotificationTile extends StatelessWidget {
  const _NotificationTile({
    super.key,
    required this.item,
    required this.onOpen,
    required this.onDismiss,
  });
  final AppNotification item;
  final VoidCallback onOpen;
  final Future<void> Function() onDismiss;

  Widget _swipeBg(Alignment align) => Container(
    color: A3Colors.danger,
    alignment: align,
    padding: const EdgeInsets.symmetric(horizontal: 24),
    child: const Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.delete_outline, color: Colors.white),
        SizedBox(width: 8),
        Text(
          'Remove',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
        ),
      ],
    ),
  );

  @override
  Widget build(BuildContext context) {
    return Dismissible(
      key: ValueKey('dismiss-${item.id}'),
      background: _swipeBg(Alignment.centerLeft),
      secondaryBackground: _swipeBg(Alignment.centerRight),
      onDismissed: (_) => onDismiss(),
      child: Semantics(
        hint: item.orderId != null
            ? 'Opens the order. Swipe to remove.'
            : 'Swipe to remove.',
        // Own Material so the unread tint and ink splash are visible.
        child: Material(
          color: item.read
              ? A3Colors.surface
              : A3Colors.primarySoft.withValues(alpha: 0.5),
          child: ListTile(
            leading: Icon(
              item.read ? Icons.notifications_none : Icons.notifications_active,
              color: A3Colors.primary,
            ),
            title: Text(
              item.title,
              style: TextStyle(
                fontWeight: item.read ? FontWeight.w500 : FontWeight.w700,
              ),
            ),
            subtitle: Text('${item.message}\n${shortDate(item.createdAt)}'),
            isThreeLine: true,
            trailing: item.orderId != null
                ? const Icon(Icons.chevron_right, color: A3Colors.muted)
                : null,
            onTap: onOpen,
          ),
        ),
      ),
    );
  }
}

/// Bell with unread badge for app bars.
class NotificationBell extends ConsumerWidget {
  const NotificationBell({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unread = ref.watch(notificationsProvider).value?.unread ?? 0;
    return IconButton(
      tooltip: unread > 0 ? 'Notifications, $unread unread' : 'Notifications',
      onPressed: () => context.push('/notifications'),
      icon: Badge(
        isLabelVisible: unread > 0,
        label: Text('$unread'),
        child: const Icon(Icons.notifications_none),
      ),
    );
  }
}

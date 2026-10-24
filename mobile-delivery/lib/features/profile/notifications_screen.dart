import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/frame.dart';

/// Screen 13 · Notifications (Sheet 1)
/// Single list: tap opens the related screen, swipe either way to delete.
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final List<Map<String, dynamic>> _items = [
    {
      'id': 'n1',
      'title': 'New Order Available',
      'body': 'Order #AK12840 is ready for assignment.',
      'time': '2 min ago',
      'icon': Icons.delivery_dining,
      'color': A3Colors.primary,
      'route': '/',
    },
    {
      'id': 'n2',
      'title': 'Order Delivered',
      'body': 'You earned ₹40 for order #AK12834.',
      'time': '15 min ago',
      'icon': Icons.check_circle_outline,
      'color': A3Colors.success,
      'route': '/history',
    },
    {
      'id': 'n3',
      'title': 'Payout Successful',
      'body': '₹3,200 has been transferred to your bank account.',
      'time': '1 day ago',
      'icon': Icons.account_balance_wallet_outlined,
      'color': Color(0xFF1976D2),
      'route': '/payout-history',
    },
    {
      'id': 'n4',
      'title': 'Account Verification',
      'body': 'Your Aadhaar card has been verified.',
      'time': '2 days ago',
      'icon': Icons.verified_user_outlined,
      'color': A3Colors.success,
      'route': '/bank-kyc',
    },
    {
      'id': 'n5',
      'title': 'Order Cancelled',
      'body': 'Order #AK12812 has been cancelled by the kitchen.',
      'time': '3 days ago',
      'icon': Icons.cancel_outlined,
      'color': A3Colors.danger,
      'route': '/history',
    },
  ];

  void _delete(int index) {
    final removed = _items.removeAt(index);
    setState(() {});
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: const Text('Notification deleted'),
          action: SnackBarAction(
            label: 'Undo',
            onPressed: () => setState(
              () => _items.insert(index.clamp(0, _items.length), removed),
            ),
          ),
        ),
      );
  }

  void _open(String route) {
    // Bottom-nav tabs replace the stack; detail screens push on top.
    const tabs = {'/', '/earnings', '/history', '/profile'};
    tabs.contains(route) ? context.go(route) : context.push(route);
  }

  @override
  Widget build(BuildContext context) {
    return FramedPage(
      title: 'Notifications',
      showBack: true,
      child: _items.isEmpty
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.notifications_off_outlined,
                    size: 48,
                    color: A3Colors.muted,
                  ),
                  SizedBox(height: A3Spacing.md),
                  Text(
                    'No notifications',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 16,
                      color: A3Colors.ink,
                    ),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'New orders and payout updates will show up here.',
                    style: TextStyle(fontSize: 13, color: A3Colors.muted),
                  ),
                ],
              ),
            )
          : ListView.separated(
              padding: const EdgeInsets.all(A3Spacing.lg),
              itemCount: _items.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (context, idx) {
                final item = _items[idx];
                return Dismissible(
                  key: ValueKey(item['id']),
                  background: const _DeleteBackground(Alignment.centerLeft),
                  secondaryBackground: const _DeleteBackground(
                    Alignment.centerRight,
                  ),
                  onDismissed: (_) => _delete(idx),
                  child: Material(
                    color: A3Colors.surface,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                      side: BorderSide(color: A3Colors.line),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: InkWell(
                      onTap: () => _open(item['route'] as String),
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: (item['color'] as Color).withValues(
                                  alpha: 0.12,
                                ),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                item['icon'] as IconData,
                                size: 20,
                                color: item['color'] as Color,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          item['title'] as String,
                                          style: TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 14,
                                            color: A3Colors.ink,
                                          ),
                                        ),
                                      ),
                                      Text(
                                        item['time'] as String,
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: A3Colors.muted,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    item['body'] as String,
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: A3Colors.muted,
                                      height: 1.3,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Icon(
                              Icons.chevron_right_rounded,
                              color: A3Colors.muted,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
    );
  }
}

class _DeleteBackground extends StatelessWidget {
  const _DeleteBackground(this.alignment);
  final Alignment alignment;

  @override
  Widget build(BuildContext context) => Container(
    alignment: alignment,
    padding: const EdgeInsets.symmetric(horizontal: 20),
    decoration: BoxDecoration(
      color: A3Colors.danger,
      borderRadius: BorderRadius.circular(16),
    ),
    child: const Icon(
      Icons.delete_outline_rounded,
      color: Colors.white,
      semanticLabel: 'Delete',
    ),
  );
}

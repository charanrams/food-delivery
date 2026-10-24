import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/frame.dart';

/// Screen 13 · Notifications (Sheet 1)
/// Filter tabs (All / Orders / Earnings / System) and notification history.
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  int _selectedTab = 0; // 0: All, 1: Orders, 2: Earnings, 3: System

  final List<Map<String, dynamic>> _items = [
    {
      'title': 'New Order Available',
      'body': 'Order #AK12840 is ready for assignment.',
      'time': '2 min ago',
      'icon': Icons.delivery_dining,
      'color': A3Colors.primary,
      'cat': 'Orders',
    },
    {
      'title': 'Order Delivered',
      'body': 'You earned ₹40 for order #AK12834.',
      'time': '15 min ago',
      'icon': Icons.check_circle_outline,
      'color': A3Colors.success,
      'cat': 'Orders',
    },
    {
      'title': 'Payout Successful',
      'body': '₹3,200 has been transferred to your bank account.',
      'time': '1 day ago',
      'icon': Icons.account_balance_wallet_outlined,
      'color': Color(0xFF1976D2),
      'cat': 'Earnings',
    },
    {
      'title': 'Account Verification',
      'body': 'Your Aadhaar card has been verified.',
      'time': '2 days ago',
      'icon': Icons.verified_user_outlined,
      'color': A3Colors.success,
      'cat': 'System',
    },
    {
      'title': 'Order Cancelled',
      'body': 'Order #AK12812 has been cancelled by the kitchen.',
      'time': '3 days ago',
      'icon': Icons.cancel_outlined,
      'color': A3Colors.danger,
      'cat': 'Orders',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final filtered = _selectedTab == 0
        ? _items
        : _items
              .where(
                (i) =>
                    i['cat'] ==
                    ['All', 'Orders', 'Earnings', 'System'][_selectedTab],
              )
              .toList();

    return FramedPage(
      title: 'Notifications',
      showBack: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Filter Tabs
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                for (var i = 0; i < 4; i++)
                  PillChip(
                    label: ['All', 'Orders', 'Earnings', 'System'][i],
                    selected: _selectedTab == i,
                    onTap: () => setState(() => _selectedTab = i),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Notifications List
          Expanded(
            child: ListView.separated(
              itemCount: filtered.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (context, idx) {
                final item = filtered[idx];
                return Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: A3Colors.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: A3Colors.line),
                  ),
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
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  item['title'] as String,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                    color: A3Colors.ink,
                                  ),
                                ),
                                Text(
                                  item['time'] as String,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: A3Colors.muted,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              item['body'] as String,
                              style: const TextStyle(
                                fontSize: 13,
                                color: A3Colors.muted,
                                height: 1.3,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

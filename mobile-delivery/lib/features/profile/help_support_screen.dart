import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/frame.dart';

/// Screen 14 · Help & Support (Sheet 1)
/// Search input, issue categories, and direct dispatch helpline launcher.
class HelpSupportScreen extends StatelessWidget {
  const HelpSupportScreen({super.key});

  final List<Map<String, dynamic>> _topics = const [
    {
      'title': 'Order Issues',
      'subtitle': 'Pickup, delivery, cancellation',
      'icon': Icons.takeout_dining_outlined,
      'color': A3Colors.primary,
    },
    {
      'title': 'Earnings & Payouts',
      'subtitle': 'Payments, incentives, bank',
      'icon': Icons.account_balance_wallet_outlined,
      'color': Color(0xFF2E7D4F),
    },
    {
      'title': 'Account & KYC',
      'subtitle': 'Profile, documents, verification',
      'icon': Icons.badge_outlined,
      'color': Color(0xFF1976D2),
    },
    {
      'title': 'App Usage',
      'subtitle': 'How to use the app and duty toggle',
      'icon': Icons.smartphone_outlined,
      'color': Color(0xFFE65100),
    },
    {
      'title': 'Safety & Guidelines',
      'subtitle': 'Safety tips and road rules',
      'icon': Icons.health_and_safety_outlined,
      'color': Color(0xFFC0392B),
    },
    {
      'title': 'Contact Support',
      'subtitle': 'Chat, call or email kitchen dispatch',
      'icon': Icons.support_agent_outlined,
      'color': Color(0xFF6A1B9A),
    },
  ];

  @override
  Widget build(BuildContext context) {
    return FramedPage(
      title: 'Help & Support',
      showBack: true,
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Search Input
            TextField(
              decoration: InputDecoration(
                hintText: 'Search for help...',
                prefixIcon: const Icon(Icons.search, color: A3Colors.muted),
                filled: true,
                fillColor: A3Colors.card,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 18),

            // Topics Grid
            for (final t in _topics) ...[
              Container(
                margin: const EdgeInsets.only(bottom: 10),
                decoration: BoxDecoration(
                  color: A3Colors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: A3Colors.line),
                ),
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  leading: Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: (t['color'] as Color).withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(t['icon'] as IconData, color: t['color'] as Color, size: 22),
                  ),
                  title: Text(t['title'] as String, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: A3Colors.ink)),
                  subtitle: Text(t['subtitle'] as String, style: const TextStyle(fontSize: 12, color: A3Colors.muted)),
                  trailing: const Icon(Icons.chevron_right_rounded, color: A3Colors.muted),
                  onTap: () {
                    if (t['title'] == 'Contact Support') {
                      launchUrl(Uri.parse('tel:+919876543210'));
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Help topic: ${t['title']}')),
                      );
                    }
                  },
                ),
              ),
            ],
            const SizedBox(height: 16),

            // Direct Call CTA Banner
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: A3Colors.primarySoft,
                borderRadius: BorderRadius.circular(18),
              ),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: A3Colors.surface,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.phone_in_talk, color: A3Colors.primary),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text('Kitchen Dispatch Helpline', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: A3Colors.ink)),
                        SizedBox(height: 2),
                        Text('Immediate assistance for active dispatches', style: TextStyle(fontSize: 12, color: A3Colors.primaryStrong)),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => launchUrl(Uri.parse('tel:+919876543210')),
                    icon: const Icon(Icons.call, color: A3Colors.primaryStrong),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

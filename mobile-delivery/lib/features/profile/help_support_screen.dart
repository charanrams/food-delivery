import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/kitchen.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/frame.dart';
import '../../core/widgets/widgets.dart';

/// Screen 15 · Help & Support
/// Searchable FAQ grouped by topic (tap a question to expand the answer),
/// plus call / email the kitchen team.
class HelpSupportScreen extends StatefulWidget {
  const HelpSupportScreen({super.key});

  @override
  State<HelpSupportScreen> createState() => _HelpSupportScreenState();
}

typedef _Faq = ({String topic, IconData icon, String q, String a});

const List<_Faq> _faqs = [
  (
    topic: 'Orders',
    icon: Icons.takeout_dining_outlined,
    q: 'How do I get new orders?',
    a: 'Go Online on the Home screen. The kitchen assigns orders to online partners; you have 30 seconds to accept each one.',
  ),
  (
    topic: 'Orders',
    icon: Icons.takeout_dining_outlined,
    q: 'The customer is not reachable. What should I do?',
    a: 'Call the customer from the delivery screen twice, wait at the address for a few minutes, then call the kitchen. Do not mark the order delivered without the customer’s code.',
  ),
  (
    topic: 'Orders',
    icon: Icons.takeout_dining_outlined,
    q: 'Can I cancel an order after accepting it?',
    a: 'Only the kitchen can reassign an accepted order. Call the kitchen as early as possible so another partner can take it.',
  ),
  (
    topic: 'Earnings',
    icon: Icons.account_balance_wallet_outlined,
    q: 'How are my earnings calculated?',
    a: 'You earn the delivery fee of every order you deliver. See today, this week and this month on the Earnings tab, and weekly statements in Payout History.',
  ),
  (
    topic: 'Earnings',
    icon: Icons.account_balance_wallet_outlined,
    q: 'When do I get paid?',
    a: 'Earnings are settled weekly (Monday to Sunday) to the bank account saved in Bank Details & KYC.',
  ),
  (
    topic: 'Earnings',
    icon: Icons.account_balance_wallet_outlined,
    q: 'What do I do with cash from COD orders?',
    a: 'Hand over all cash collected to the kitchen counter at the end of your shift. The Earnings tab shows how much cash you are holding.',
  ),
  (
    topic: 'Account',
    icon: Icons.badge_outlined,
    q: 'How do I change my name or vehicle?',
    a: 'Open Profile → Edit Profile, update the details and tap Save changes.',
  ),
  (
    topic: 'Account',
    icon: Icons.badge_outlined,
    q: 'How do I change my phone number or email?',
    a: 'They are your sign-in details, so the kitchen team changes them for you. Call or email the kitchen below.',
  ),
  (
    topic: 'Safety',
    icon: Icons.health_and_safety_outlined,
    q: 'What should I do in an emergency?',
    a: 'Use Emergency Assistance (SOS) on the Profile screen to call 112, then inform the kitchen.',
  ),
];

class _HelpSupportScreenState extends State<HelpSupportScreen> {
  final _search = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _email() async {
    final ok = await launchUrl(
      Uri(
        scheme: 'mailto',
        path: kitchenEmail,
        queryParameters: {'subject': 'Delivery partner support'},
      ),
    ).catchError((_) => false);
    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No email app found. Write to $kitchenEmail'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final q = _query.trim().toLowerCase();
    final matches = [
      for (final f in _faqs)
        if (q.isEmpty ||
            f.q.toLowerCase().contains(q) ||
            f.a.toLowerCase().contains(q) ||
            f.topic.toLowerCase().contains(q))
          f,
    ];
    final topics = {for (final f in matches) f.topic};
    final heading = TextStyle(
      fontSize: 17,
      fontWeight: FontWeight.w800,
      fontFamily: 'Outfit',
      color: A3Colors.ink,
    );

    return FramedPage(
      title: 'Help & Support',
      showBack: true,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(
          A3Spacing.lg,
          A3Spacing.xl,
          A3Spacing.lg,
          A3Spacing.xl,
        ),
        children: [
          TextField(
            controller: _search,
            onChanged: (v) => setState(() => _query = v),
            textInputAction: TextInputAction.search,
            decoration: InputDecoration(
              hintText: 'Search help',
              prefixIcon: const Icon(Icons.search_rounded),
              suffixIcon: _query.isEmpty
                  ? null
                  : IconButton(
                      tooltip: 'Clear search',
                      icon: const Icon(Icons.close_rounded),
                      onPressed: () => setState(() {
                        _search.clear();
                        _query = '';
                      }),
                    ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide(color: A3Colors.line),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide(color: A3Colors.line),
              ),
            ),
          ),
          const SizedBox(height: A3Spacing.xl),
          if (matches.isEmpty)
            const StateView(
              icon: Icons.search_off_rounded,
              title: 'No matching answers',
              message: 'Try another word, or contact the kitchen below.',
            ),
          for (final topic in topics) ...[
            Padding(
              padding: const EdgeInsets.only(left: 4, bottom: A3Spacing.sm),
              child: Text(topic, style: heading),
            ),
            Material(
              color: A3Colors.surface,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(18),
                side: BorderSide(color: A3Colors.line),
              ),
              clipBehavior: Clip.antiAlias,
              child: Column(
                children: [
                  for (final (i, f)
                      in matches.where((f) => f.topic == topic).indexed) ...[
                    if (i > 0) Divider(height: 1, color: A3Colors.line),
                    Theme(
                      data: Theme.of(context)
                          .copyWith(dividerColor: Colors.transparent),
                      child: ExpansionTile(
                        leading: Icon(f.icon, color: A3Colors.primary),
                        title: Text(
                          f.q,
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: A3Colors.ink,
                          ),
                        ),
                        iconColor: A3Colors.muted,
                        collapsedIconColor: A3Colors.muted,
                        childrenPadding: const EdgeInsets.fromLTRB(
                          A3Spacing.lg,
                          0,
                          A3Spacing.lg,
                          A3Spacing.lg,
                        ),
                        expandedAlignment: Alignment.centerLeft,
                        children: [
                          Text(
                            f.a,
                            style: TextStyle(
                              fontSize: 14,
                              color: A3Colors.muted,
                              height: 1.45,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: A3Spacing.xl),
          ],
          Text('Still need help?', style: heading),
          const SizedBox(height: A3Spacing.sm),
          Row(
            children: [
              Expanded(
                child: FilledButton.icon(
                  onPressed: () => callNumber(context, kitchenPhone),
                  icon: const Icon(Icons.call_rounded),
                  label: const Text('Call kitchen'),
                ),
              ),
              const SizedBox(width: A3Spacing.md),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _email,
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(48),
                  ),
                  icon: const Icon(Icons.mail_outline_rounded),
                  label: const Text('Email'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

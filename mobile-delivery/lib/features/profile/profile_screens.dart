import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/frame.dart';
import '../../core/widgets/widgets.dart';
import '../auth/auth_controller.dart';
import '../deliveries/deliveries_providers.dart';

/// Earnings & Cash-in-hand (COD) reconciliation tab.
class EarningsScreen extends ConsumerStatefulWidget {
  const EarningsScreen({super.key});

  @override
  ConsumerState<EarningsScreen> createState() => _EarningsScreenState();
}

class _EarningsScreenState extends ConsumerState<EarningsScreen> {
  int _selectedTab = 0; // 0 = Today, 1 = Week (last 7 days), 2 = This month

  @override
  Widget build(BuildContext context) {
    final earnings = ref.watch(earningsProvider);

    return FramedPage(
      title: 'Earnings',
      showBack: false,
      child: earnings.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ErrorView(
          error: e,
          onRetry: () => ref.invalidate(earningsProvider),
        ),
        data: (data) {
          final summary = [data.today, data.week, data.month][_selectedTab];
          final period = ['today', 'this week', 'this month'][_selectedTab];
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(earningsProvider),
            child: ListView(
              padding: const EdgeInsets.all(A3Spacing.lg),
              children: [
                // Period filter pills
                Row(
                  children: [
                    PillChip(
                      label: 'Today',
                      selected: _selectedTab == 0,
                      onTap: () => setState(() => _selectedTab = 0),
                    ),
                    PillChip(
                      label: 'Week',
                      selected: _selectedTab == 1,
                      onTap: () => setState(() => _selectedTab = 1),
                    ),
                    PillChip(
                      label: 'Month',
                      selected: _selectedTab == 2,
                      onTap: () => setState(() => _selectedTab = 2),
                    ),
                  ],
                ),
                const SizedBox(height: A3Spacing.lg),

                // Hero Earnings Card
                Container(
                  padding: const EdgeInsets.all(A3Spacing.xl),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF1E1D1B), Color(0xFF2C2B28)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.15),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            [
                              "Today's earnings",
                              "This week's earnings",
                              "This month's earnings",
                            ][_selectedTab],
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.8),
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: A3Spacing.sm),
                      Text(
                        formatPaise(summary.earningsPaise),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 36,
                          fontWeight: FontWeight.w800,
                          fontFamily: 'Outfit',
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: A3Spacing.md),
                      const Divider(color: Color(0xFF3E3D3A)),
                      const SizedBox(height: A3Spacing.sm),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              const Icon(
                                Icons.check_circle_outline,
                                color: Color(0xFF56D080),
                                size: 18,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                '${summary.deliveredCount} orders delivered',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                          Text(
                            summary.deliveredCount > 0
                                ? '~${formatPaise(summary.earningsPaise ~/ summary.deliveredCount)}/order'
                                : 'No orders yet',
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.7),
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: A3Spacing.lg),

                // Cash-in-hand (COD Reconciliation Card)
                Container(
                  padding: const EdgeInsets.all(A3Spacing.lg),
                  decoration: BoxDecoration(
                    color: A3Colors.warningSoft,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: A3Colors.line),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF59E0B)
                                  .withValues(alpha: 0.2),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              Icons.payments_outlined,
                              color: A3Colors.warning,
                              size: 22,
                            ),
                          ),
                          const SizedBox(width: A3Spacing.md),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Cash in Hand (COD)',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 15,
                                    color: A3Colors.warning,
                                  ),
                                ),
                                Text(
                                  'Collected $period',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: A3Colors.warning,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Text(
                            formatPaise(summary.codCashCollectedPaise),
                            style: TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 20,
                              fontFamily: 'Outfit',
                              color: A3Colors.warning,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: A3Spacing.sm),
                      Text(
                        'Deposit collected cash at the kitchen counter at the end of your shift.',
                        style: TextStyle(
                          fontSize: 12,
                          color: A3Colors.warning,
                          height: 1.4,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: A3Spacing.xl),

                // Performance snapshot
                const SectionTitle('Milestones & Badges'),
                const SizedBox(height: A3Spacing.md),
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(A3Spacing.md),
                        decoration: BoxDecoration(
                          color: A3Colors.card,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(
                              Icons.military_tech_outlined,
                              color: A3Colors.primaryStrong,
                              size: 26,
                            ),
                            const SizedBox(height: 6),
                            Text(
                              '${data.totalDelivered}',
                              style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w800,
                                fontFamily: 'Outfit',
                              ),
                            ),
                            Text(
                              'Lifetime trips',
                              style: TextStyle(
                                fontSize: 12,
                                color: A3Colors.muted,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: A3Spacing.md),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(A3Spacing.md),
                        decoration: BoxDecoration(
                          color: A3Colors.card,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(
                              Icons.calendar_month_rounded,
                              color: A3Colors.success,
                              size: 26,
                            ),
                            const SizedBox(height: 6),
                            Text(
                              '${data.month.deliveredCount}',
                              style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w800,
                                fontFamily: 'Outfit',
                              ),
                            ),
                            Text(
                              'Trips this month',
                              style: TextStyle(
                                fontSize: 12,
                                color: A3Colors.muted,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

/// Past runs with All / Completed / Cancelled filters (mockup 7).
/// "Cancelled" also lists orders the partner declined.
class HistoryScreen extends ConsumerStatefulWidget {
  const HistoryScreen({super.key});

  @override
  ConsumerState<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends ConsumerState<HistoryScreen> {
  int _filter = 0; // 0 = All, 1 = Completed, 2 = Cancelled (incl. declined)

  static bool _completed(Delivery d) =>
      (d.partnerOutcome ?? 'DELIVERED') == 'DELIVERED';

  @override
  Widget build(BuildContext context) {
    final history = ref.watch(historyProvider);

    return FramedPage(
      title: 'Order History',
      showBack: false,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              A3Spacing.lg,
              A3Spacing.lg,
              A3Spacing.lg,
              0,
            ),
            child: Row(
              children: [
                for (final (i, label) in const [
                  'All',
                  'Completed',
                  'Cancelled',
                ].indexed)
                  PillChip(
                    label: label,
                    selected: _filter == i,
                    onTap: () => setState(() => _filter = i),
                  ),
              ],
            ),
          ),
          Expanded(
            child: history.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => ErrorView(
                error: e,
                onRetry: () => ref.invalidate(historyProvider),
              ),
              data: (all) {
                final list = switch (_filter) {
                  1 => all.where(_completed).toList(),
                  2 => all.where((d) => !_completed(d)).toList(),
                  _ => all,
                };
                if (list.isEmpty) {
                  return StateView(
                    icon: Icons.history,
                    title: [
                      'No deliveries yet',
                      'No completed orders',
                      'No cancelled orders',
                    ][_filter],
                    message: _filter == 2
                        ? 'Orders cancelled by the kitchen or declined by you will appear here.'
                        : 'Your completed deliveries will appear here.',
                  );
                }
                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(historyProvider),
                  child: ListView.separated(
                    padding: const EdgeInsets.all(A3Spacing.lg),
                    itemCount: list.length,
                    separatorBuilder: (_, _) =>
                        const SizedBox(height: A3Spacing.sm),
                    itemBuilder: (_, i) => _HistoryRow(d: list[i]),
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

class _HistoryRow extends StatelessWidget {
  const _HistoryRow({required this.d});
  final Delivery d;

  @override
  Widget build(BuildContext context) {
    final outcome = d.partnerOutcome ?? 'DELIVERED';
    final (label, color, icon) = switch (outcome) {
      'CANCELLED' => ('Cancelled', A3Colors.danger, Icons.cancel_rounded),
      'DECLINED' => (
        'Declined',
        A3Colors.muted,
        Icons.do_not_disturb_on_rounded,
      ),
      _ => ('Completed', A3Colors.success, Icons.check_circle),
    };
    // Declined orders now belong to another rider, so they can't be opened.
    final canOpen = outcome != 'DECLINED';
    final at = d.partnerOutcomeAt ?? d.deliveredAt;
    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: canOpen ? () => context.push('/delivery/${d.id}') : null,
      child: Container(
        padding: const EdgeInsets.all(A3Spacing.md),
        decoration: BoxDecoration(
          color: A3Colors.card,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: A3Spacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          d.orderNumber,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 15,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        formatPaise(d.totalPaise),
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                    at != null
                        ? '${timeOfDay(at)} · ${d.addressLine}'
                        : d.addressLine,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 13, color: A3Colors.muted),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(99),
              ),
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: color,
                ),
              ),
            ),
            if (canOpen) Icon(Icons.chevron_right, color: A3Colors.muted),
          ],
        ),
      ),
    );
  }
}

/// Partner profile: identity card with live stats, grouped menus, logout.
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = ref.watch(authProvider).value;
    if (p == null) return const SizedBox.shrink();
    final earnings = ref.watch(earningsProvider).value;

    return FramedPage(
      title: 'Partner Profile',
      showBack: false,
      actions: [
        SoftIconButton(
          icon: Icons.notifications_none_rounded,
          tooltip: 'Notifications',
          onPressed: () => context.push('/notifications'),
        ),
      ],
      child: ListView(
        padding: const EdgeInsets.fromLTRB(
          A3Spacing.lg,
          A3Spacing.lg,
          A3Spacing.lg,
          A3Spacing.xl,
        ),
        children: [
          _PartnerCard(partner: p, earnings: earnings),
          const SizedBox(height: A3Spacing.xl),

          const _GroupHeading(
            'Account & Finance',
            'Manage your personal and payment details',
          ),
          _MenuGroup(
            children: [
              _MenuRow(
                icon: Icons.person_rounded,
                tint: A3Colors.success,
                title: 'Edit Profile',
                subtitle: 'Name, photo, vehicle & contact info',
                onTap: () => context.push('/edit-profile'),
              ),
              _MenuRow(
                icon: Icons.account_balance_rounded,
                tint: A3Colors.primary,
                title: 'Bank Details & KYC',
                subtitle: 'Direct bank account & documents',
                onTap: () => context.push('/bank-kyc'),
              ),
              _MenuRow(
                icon: Icons.receipt_long_rounded,
                tint: const Color(0xFF7C3AED),
                title: 'Payout History',
                subtitle: 'Weekly settlements & transfer UTRs',
                onTap: () => context.push('/payout-history'),
              ),
              _MenuRow(
                icon: Icons.settings_rounded,
                tint: const Color(0xFF2563EB),
                title: 'App Settings',
                subtitle: 'Language, location, dark mode & cache',
                onTap: () => context.push('/settings'),
              ),
            ],
          ),
          const SizedBox(height: A3Spacing.xl),

          const _GroupHeading(
            'Support & Legal',
            'Get help and important information',
          ),
          _MenuGroup(
            children: [
              _MenuRow(
                icon: Icons.help_outline_rounded,
                tint: A3Colors.danger,
                title: 'Help & Support',
                subtitle: 'FAQs, issue resolution & kitchen hotline',
                onTap: () => context.push('/help-support'),
              ),
              _MenuRow(
                icon: Icons.shield_outlined,
                tint: const Color(0xFF2563EB),
                title: 'Privacy Policy',
                subtitle: 'Read our privacy policy',
                onTap: () => openWebPage(context, '/privacy'),
              ),
              _MenuRow(
                icon: Icons.description_outlined,
                tint: A3Colors.primary,
                title: 'Terms & Conditions',
                subtitle: 'Read our terms and conditions',
                onTap: () => openWebPage(context, '/terms'),
              ),
            ],
          ),
          const SizedBox(height: A3Spacing.lg),

          // SOS sits apart from the menus so it is never mistaken for one.
          Material(
            color: A3Colors.dangerSoft,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(18),
              side: BorderSide(color: A3Colors.danger),
            ),
            clipBehavior: Clip.antiAlias,
            child: _MenuRow(
              icon: Icons.emergency_rounded,
              tint: A3Colors.danger,
              title: 'Emergency Assistance (SOS)',
              subtitle: 'Police & emergency medical support (112)',
              danger: true,
              onTap: () => callNumber(context, '112'),
            ),
          ),
          const SizedBox(height: A3Spacing.lg),

          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              foregroundColor: A3Colors.danger,
              side: BorderSide(color: A3Colors.danger),
              minimumSize: const Size.fromHeight(52),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
            icon: const Icon(Icons.logout_rounded),
            label: const Text(
              'Log out of partner app',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
            onPressed: () async {
              final confirm = await showDialog<bool>(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: const Text('Log out?'),
                  content: const Text(
                    'You will stop receiving new delivery assignments.',
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(ctx, false),
                      child: const Text('Cancel'),
                    ),
                    TextButton(
                      onPressed: () => Navigator.pop(ctx, true),
                      child: Text(
                        'Log out',
                        style: TextStyle(color: A3Colors.danger),
                      ),
                    ),
                  ],
                ),
              );
              if (confirm == true) {
                try {
                  await ref.read(authProvider.notifier).logout();
                } catch (_) {}
              }
            },
          ),
          const SizedBox(height: A3Spacing.lg),
          Center(
            child: Text(
              'A3 Kitchen Partner v0.1.0 · Single-Kitchen Fleet',
              style: TextStyle(color: A3Colors.muted, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}

class _PartnerCard extends StatelessWidget {
  const _PartnerCard({required this.partner, required this.earnings});
  final Partner partner;
  final PartnerEarnings? earnings;

  @override
  Widget build(BuildContext context) {
    final p = partner;
    final e = earnings;
    return Container(
      decoration: BoxDecoration(
        color: A3Colors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: A3Colors.line),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 24,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(A3Spacing.lg),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    CircleAvatar(
                      radius: 36,
                      backgroundColor: A3Colors.primarySoft,
                      child: Text(
                        p.name.characters.first.toUpperCase(),
                        style: TextStyle(
                          color: A3Colors.primaryStrong,
                          fontWeight: FontWeight.w800,
                          fontSize: 28,
                          fontFamily: 'Outfit',
                        ),
                      ),
                    ),
                    Positioned(
                      right: -2,
                      bottom: -2,
                      child: Material(
                        color: A3Colors.success,
                        shape: const CircleBorder(
                          side: BorderSide(color: Colors.white, width: 2),
                        ),
                        child: InkWell(
                          customBorder: const CircleBorder(),
                          onTap: () => context.push('/edit-profile'),
                          child: const Padding(
                            padding: EdgeInsets.all(6),
                            child: Icon(
                              Icons.edit_rounded,
                              size: 14,
                              color: Colors.white,
                              semanticLabel: 'Edit profile',
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: A3Spacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              p.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 19,
                                fontFamily: 'Outfit',
                                color: A3Colors.ink,
                              ),
                            ),
                          ),
                          _StatusPill(online: p.online),
                        ],
                      ),
                      const SizedBox(height: 6),
                      _ContactLine(Icons.phone_outlined, p.phone),
                      if (p.email != null)
                        _ContactLine(Icons.mail_outline_rounded, p.email!),
                      const SizedBox(height: A3Spacing.sm),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: A3Colors.successSoft,
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.verified_rounded,
                              size: 15,
                              color: A3Colors.success,
                            ),
                            SizedBox(width: 4),
                            Text(
                              'Verified Partner',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: A3Colors.success,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Divider(height: 1, color: A3Colors.line),
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: A3Spacing.sm,
              vertical: A3Spacing.md,
            ),
            child: IntrinsicHeight(
              child: Row(
                children: [
                  _StatTile(
                    icon: Icons.two_wheeler_rounded,
                    tint: A3Colors.primary,
                    value: e == null ? '–' : '${e.totalDelivered}',
                    label: 'Total trips',
                  ),
                  VerticalDivider(width: 1, color: A3Colors.line),
                  _StatTile(
                    icon: Icons.emoji_events_rounded,
                    tint: A3Colors.success,
                    value: e == null ? '–' : '${e.month.deliveredCount}',
                    label: 'This month',
                  ),
                  VerticalDivider(width: 1, color: A3Colors.line),
                  _StatTile(
                    icon: Icons.account_balance_wallet_rounded,
                    tint: const Color(0xFF7C3AED),
                    value: e == null ? '–' : formatPaise(e.today.earningsPaise),
                    label: "Today's earnings",
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.online});
  final bool online;

  @override
  Widget build(BuildContext context) {
    final color = online ? A3Colors.success : A3Colors.muted;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: online ? A3Colors.successSoft : A3Colors.card,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.circle, size: 8, color: color),
          const SizedBox(width: 6),
          Text(
            online ? 'Online' : 'Offline',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

class _ContactLine extends StatelessWidget {
  const _ContactLine(this.icon, this.text);
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 2),
    child: Row(
      children: [
        Icon(icon, size: 15, color: A3Colors.muted),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            text,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 13, color: A3Colors.muted),
          ),
        ),
      ],
    ),
  );
}

class _StatTile extends StatelessWidget {
  const _StatTile({
    required this.icon,
    required this.tint,
    required this.value,
    required this.label,
  });
  final IconData icon;
  final Color tint;
  final String value, label;

  @override
  Widget build(BuildContext context) => Expanded(
    child: Column(
      children: [
        Icon(icon, size: 22, color: tint),
        const SizedBox(height: 6),
        FittedBox(
          fit: BoxFit.scaleDown,
          child: Text(
            value,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              fontFamily: 'Outfit',
              color: A3Colors.ink,
              fontFeatures: [FontFeature.tabularFigures()],
            ),
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 12, color: A3Colors.muted),
        ),
      ],
    ),
  );
}

class _GroupHeading extends StatelessWidget {
  const _GroupHeading(this.title, this.subtitle);
  final String title, subtitle;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(left: 4, bottom: A3Spacing.sm),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            fontFamily: 'Outfit',
            color: A3Colors.ink,
          ),
        ),
        const SizedBox(height: 2),
        Text(subtitle, style: TextStyle(fontSize: 13, color: A3Colors.muted)),
      ],
    ),
  );
}

class _MenuGroup extends StatelessWidget {
  const _MenuGroup({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Material(
    color: A3Colors.surface,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(18),
      side: BorderSide(color: A3Colors.line),
    ),
    clipBehavior: Clip.antiAlias,
    child: Column(
      children: [
        for (var i = 0; i < children.length; i++) ...[
          if (i > 0) Divider(height: 1, indent: 72, color: A3Colors.line),
          children[i],
        ],
      ],
    ),
  );
}

class _MenuRow extends StatelessWidget {
  const _MenuRow({
    required this.icon,
    required this.tint,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.danger = false,
  });
  final IconData icon;
  final Color tint;
  final String title, subtitle;
  final VoidCallback onTap;
  final bool danger;

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    child: Padding(
      padding: const EdgeInsets.all(A3Spacing.md),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: tint.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: tint, size: 22),
          ),
          const SizedBox(width: A3Spacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                    color: danger ? A3Colors.danger : A3Colors.ink,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 13,
                    color: danger ? A3Colors.danger : A3Colors.muted,
                  ),
                ),
              ],
            ),
          ),
          Icon(
            Icons.chevron_right_rounded,
            color: danger ? A3Colors.danger : A3Colors.muted,
          ),
        ],
      ),
    ),
  );
}

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
  int _selectedTab = 0; // 0 = Today, 1 = Week, 2 = All-time

  @override
  Widget build(BuildContext context) {
    final earnings = ref.watch(earningsProvider);

    return FramedPage(
      title: 'Earnings',
      showBack: false,
      actions: [
        SoftIconButton(
          icon: Icons.refresh_rounded,
          tooltip: 'Refresh earnings',
          onPressed: () => ref.invalidate(earningsProvider),
        ),
      ],
      child: earnings.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ErrorView(
          error: e,
          onRetry: () => ref.invalidate(earningsProvider),
        ),
        data: (data) {
          final summary = _selectedTab == 0 ? data.today : data.week;
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
                      label: 'This Week',
                      selected: _selectedTab == 1,
                      onTap: () => setState(() => _selectedTab = 1),
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
                            _selectedTab == 0 ? "Today's Payout" : "Weekly Payout",
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.8),
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: A3Colors.success.withValues(alpha: 0.25),
                              borderRadius: BorderRadius.circular(99),
                            ),
                            child: const Text(
                              'Verified',
                              style: TextStyle(
                                color: Color(0xFF56D080),
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                              ),
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
                              const Icon(Icons.check_circle_outline, color: Color(0xFF56D080), size: 18),
                              const SizedBox(width: 6),
                              Text(
                                '${summary.deliveredCount} orders delivered',
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                          Text(
                            '~${formatPaise(summary.deliveredCount > 0 ? summary.earningsPaise ~/ summary.deliveredCount : 4000)}/order',
                            style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 13),
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
                    color: const Color(0xFFFFFBEB),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFFDE68A)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF59E0B).withValues(alpha: 0.2),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.payments_outlined, color: Color(0xFFB45309), size: 22),
                          ),
                          const SizedBox(width: A3Spacing.md),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Cash in Hand (COD)',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 15,
                                    color: Color(0xFF92400E),
                                  ),
                                ),
                                Text(
                                  _selectedTab == 0 ? 'Collected today' : 'All unsettled cash',
                                  style: const TextStyle(fontSize: 12, color: Color(0xFFB45309)),
                                ),
                              ],
                            ),
                          ),
                          Text(
                            formatPaise(_selectedTab == 0 ? summary.codCashCollectedPaise : data.unremittedCashPaise),
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 20,
                              fontFamily: 'Outfit',
                              color: Color(0xFF92400E),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: A3Spacing.sm),
                      const Text(
                        'Deposit collected cash at the kitchen counter at the end of your shift.',
                        style: TextStyle(fontSize: 12, color: Color(0xFF78350F), height: 1.4),
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
                            const Icon(Icons.military_tech_outlined, color: A3Colors.primaryStrong, size: 26),
                            const SizedBox(height: 6),
                            Text(
                              '${data.totalDelivered}',
                              style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w800,
                                fontFamily: 'Outfit',
                              ),
                            ),
                            const Text(
                              'Lifetime trips',
                              style: TextStyle(fontSize: 12, color: A3Colors.muted),
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
                        child: const Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(Icons.thumb_up_alt_outlined, color: A3Colors.success, size: 26),
                            SizedBox(height: 6),
                            Text(
                              '100%',
                              style: TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w800,
                                fontFamily: 'Outfit',
                              ),
                            ),
                            Text(
                              'Completion rate',
                              style: TextStyle(fontSize: 12, color: A3Colors.muted),
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

/// History of completed deliveries.
class HistoryScreen extends ConsumerWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final history = ref.watch(historyProvider);

    return FramedPage(
      title: 'History',
      showBack: false,
      actions: [
        SoftIconButton(
          icon: Icons.refresh_rounded,
          tooltip: 'Refresh history',
          onPressed: () => ref.invalidate(historyProvider),
        ),
      ],
      child: history.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ErrorView(
          error: e,
          onRetry: () => ref.invalidate(historyProvider),
        ),
        data: (list) => list.isEmpty
            ? const StateView(
                icon: Icons.history,
                title: 'No deliveries yet',
                message: 'Your completed deliveries will appear here with receipts and timestamps.',
              )
            : RefreshIndicator(
                onRefresh: () async => ref.invalidate(historyProvider),
                child: ListView.separated(
                  padding: const EdgeInsets.all(A3Spacing.lg),
                  itemCount: list.length,
                  separatorBuilder: (_, _) => const SizedBox(height: A3Spacing.sm),
                  itemBuilder: (_, i) {
                    final d = list[i];
                    return InkWell(
                      borderRadius: BorderRadius.circular(18),
                      onTap: () => context.push('/delivery/${d.id}'),
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
                                color: A3Colors.success.withValues(alpha: 0.15),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.check_circle, color: A3Colors.success, size: 20),
                            ),
                            const SizedBox(width: A3Spacing.md),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Text(
                                        d.orderNumber,
                                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                                      ),
                                      const Spacer(),
                                      Text(
                                        d.deliveredAt != null ? timeOfDay(d.deliveredAt!) : 'Delivered',
                                        style: const TextStyle(color: A3Colors.muted, fontSize: 12),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    d.addressLine,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontSize: 13, color: A3Colors.muted),
                                  ),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      Text(
                                        '${d.items.fold<int>(0, (s, item) => s + item.quantity)} items',
                                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                                      ),
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: (d.collectCash ? A3Colors.warning : A3Colors.success).withValues(alpha: 0.15),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          d.collectCash ? 'COD' : 'Prepaid',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w700,
                                            color: d.collectCash ? A3Colors.warning : A3Colors.success,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 6),
                            const Icon(Icons.chevron_right, color: A3Colors.muted),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
      ),
    );
  }
}

/// Profile, Vehicle details & Kitchen Support screen.
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = ref.watch(authProvider).value;
    if (p == null) return const SizedBox.shrink();

    return FramedPage(
      title: 'Partner Profile',
      showBack: false,
      child: ListView(
        padding: const EdgeInsets.all(A3Spacing.lg),
        children: [
          // Partner Card
          Container(
            padding: const EdgeInsets.all(A3Spacing.lg),
            decoration: BoxDecoration(
              color: A3Colors.card,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 30,
                  backgroundColor: A3Colors.primarySoft,
                  child: Text(
                    p.name.characters.first,
                    style: const TextStyle(
                      color: A3Colors.primaryStrong,
                      fontWeight: FontWeight.w800,
                      fontSize: 24,
                      fontFamily: 'Outfit',
                    ),
                  ),
                ),
                const SizedBox(width: A3Spacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        p.name,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18, fontFamily: 'Outfit'),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        p.phone,
                        style: const TextStyle(color: A3Colors.muted, fontSize: 13),
                      ),
                      if (p.email != null)
                        Text(
                          p.email!,
                          style: const TextStyle(color: A3Colors.muted, fontSize: 13),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: A3Spacing.lg),

          // Fleet & Operations Menu
          const SectionTitle('Operations & Shifts'),
          const SizedBox(height: A3Spacing.sm),
          Container(
            decoration: BoxDecoration(
              color: A3Colors.card,
              borderRadius: BorderRadius.circular(18),
            ),
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.coffee_rounded, color: A3Colors.primaryStrong),
                  title: const Text('Break Tracker', style: TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: const Text('Live stopwatch & pause shift'),
                  trailing: const Icon(Icons.chevron_right, color: A3Colors.muted),
                  onTap: () => context.push('/break-tracker'),
                ),
                const Divider(color: A3Colors.line, height: 1),
                ListTile(
                  leading: const Icon(Icons.history_toggle_off_rounded, color: Color(0xFF1976D2)),
                  title: const Text('Duty & Attendance History', style: TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: const Text('Shift timeline and hours logged'),
                  trailing: const Icon(Icons.chevron_right, color: A3Colors.muted),
                  onTap: () => context.push('/duty-history'),
                ),
                const Divider(color: A3Colors.line, height: 1),
                ListTile(
                  leading: const Icon(Icons.notifications_none_rounded, color: Color(0xFF6A1B9A)),
                  title: const Text('Notifications', style: TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: const Text('Order dispatches and payout notices'),
                  trailing: const Icon(Icons.chevron_right, color: A3Colors.muted),
                  onTap: () => context.push('/notifications'),
                ),
              ],
            ),
          ),
          const SizedBox(height: A3Spacing.lg),

          // Account & Finance
          const SectionTitle('Account & Finance'),
          const SizedBox(height: A3Spacing.sm),
          Container(
            decoration: BoxDecoration(
              color: A3Colors.card,
              borderRadius: BorderRadius.circular(18),
            ),
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.badge_outlined, color: A3Colors.ink),
                  title: const Text('Edit Profile', style: TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: const Text('Name, photo, vehicle & contact info'),
                  trailing: const Icon(Icons.chevron_right, color: A3Colors.muted),
                  onTap: () => context.push('/edit-profile'),
                ),
                const Divider(color: A3Colors.line, height: 1),
                ListTile(
                  leading: const Icon(Icons.account_balance_rounded, color: Color(0xFF2E7D4F)),
                  title: const Text('Bank Details & KYC', style: TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: const Text('Direct bank account & documents'),
                  trailing: const Icon(Icons.chevron_right, color: A3Colors.muted),
                  onTap: () => context.push('/bank-kyc'),
                ),
                const Divider(color: A3Colors.line, height: 1),
                ListTile(
                  leading: const Icon(Icons.receipt_long_rounded, color: Color(0xFF00897B)),
                  title: const Text('Payout History', style: TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: const Text('Weekly settlements & transfer UTRs'),
                  trailing: const Icon(Icons.chevron_right, color: A3Colors.muted),
                  onTap: () => context.push('/payout-history'),
                ),
                const Divider(color: A3Colors.line, height: 1),
                ListTile(
                  leading: const Icon(Icons.settings_outlined, color: A3Colors.ink),
                  title: const Text('App Settings', style: TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: const Text('Language, location, dark mode & cache'),
                  trailing: const Icon(Icons.chevron_right, color: A3Colors.muted),
                  onTap: () => context.push('/settings'),
                ),
              ],
            ),
          ),
          const SizedBox(height: A3Spacing.lg),

          // Kitchen Support & Legal
          const SectionTitle('Support & Legal'),
          const SizedBox(height: A3Spacing.sm),
          Container(
            decoration: BoxDecoration(
              color: A3Colors.card,
              borderRadius: BorderRadius.circular(18),
            ),
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.help_outline_rounded, color: A3Colors.primaryStrong),
                  title: const Text('Help & Support', style: TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: const Text('FAQs, issue resolution & kitchen hotline'),
                  trailing: const Icon(Icons.chevron_right, color: A3Colors.muted),
                  onTap: () => context.push('/help-support'),
                ),
                const Divider(color: A3Colors.line, height: 1),
                ListTile(
                  leading: const Icon(Icons.policy_outlined, color: A3Colors.ink),
                  title: const Text('Privacy Policy', style: TextStyle(fontWeight: FontWeight.w600)),
                  trailing: const Icon(Icons.chevron_right, color: A3Colors.muted),
                  onTap: () => context.push('/privacy-policy'),
                ),
                const Divider(color: A3Colors.line, height: 1),
                ListTile(
                  leading: const Icon(Icons.gavel_outlined, color: A3Colors.ink),
                  title: const Text('Terms & Conditions', style: TextStyle(fontWeight: FontWeight.w600)),
                  trailing: const Icon(Icons.chevron_right, color: A3Colors.muted),
                  onTap: () => context.push('/terms-conditions'),
                ),
                const Divider(color: A3Colors.line, height: 1),
                ListTile(
                  leading: const Icon(Icons.emergency_outlined, color: A3Colors.danger),
                  title: const Text('Emergency Assistance (SOS)', style: TextStyle(color: A3Colors.danger, fontWeight: FontWeight.w600)),
                  subtitle: const Text('Police & emergency medical support (112)'),
                  onTap: () => callNumber(context, '112'),
                ),
              ],
            ),
          ),
          const SizedBox(height: A3Spacing.xl),

          // Logout Button
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              foregroundColor: A3Colors.danger,
              side: const BorderSide(color: A3Colors.danger),
              minimumSize: const Size.fromHeight(50),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            icon: const Icon(Icons.logout_rounded),
            label: const Text('Log out of partner app', style: TextStyle(fontWeight: FontWeight.w700)),
            onPressed: () async {
              final confirm = await showDialog<bool>(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: const Text('Log out?'),
                  content: const Text('You will stop receiving new delivery assignments.'),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
                    TextButton(
                      onPressed: () => Navigator.pop(ctx, true),
                      child: const Text('Log out', style: TextStyle(color: A3Colors.danger)),
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
          const Center(
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

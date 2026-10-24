import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/form_fields.dart';
import '../../core/widgets/frame.dart';
import '../../core/widgets/widgets.dart';

import 'package:go_router/go_router.dart';

import '../auth/auth_controller.dart';
import '../deliveries/deliveries_providers.dart';

/// Screen 11 · Payout History
/// Weekly (Mon–Sun) earnings statements built from delivered orders
/// (GET /delivery/statements). Pull down to refresh.
class PayoutHistoryScreen extends ConsumerWidget {
  const PayoutHistoryScreen({super.key});

  static const _months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  static String _d(DateTime d) => '${d.day} ${_months[d.month - 1]}';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statements = ref.watch(statementsProvider);
    final hasBank = ref.watch(
      authProvider.select((a) => a.value?.bank != null),
    );

    return FramedPage(
      title: 'Payout History',
      showBack: true,
      child: statements.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ErrorView(
          error: e,
          onRetry: () => ref.invalidate(statementsProvider),
        ),
        data: (list) {
          final total = list.fold<int>(0, (s, w) => s + w.earningsPaise);
          return RefreshIndicator(
            onRefresh: () => ref.refresh(statementsProvider.future),
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(
                A3Spacing.lg,
                A3Spacing.xl,
                A3Spacing.lg,
                A3Spacing.lg,
              ),
              children: [
                Container(
                  padding: const EdgeInsets.all(A3Spacing.lg),
                  decoration: BoxDecoration(
                    color: A3Colors.primarySoft,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Earned in the last 12 weeks',
                        style: TextStyle(
                          fontSize: 14,
                          color: A3Colors.primaryStrong,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        formatPaise(total),
                        style: TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.w800,
                          fontFamily: 'Outfit',
                          color: A3Colors.ink,
                          fontFeatures: [FontFeature.tabularFigures()],
                        ),
                      ),
                    ],
                  ),
                ),
                if (!hasBank) ...[
                  const SizedBox(height: A3Spacing.md),
                  Material(
                    color: A3Colors.warningSoft,
                    borderRadius: BorderRadius.circular(14),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(14),
                      onTap: () => GoRouter.of(context).push('/bank-kyc'),
                      child: Padding(
                        padding: EdgeInsets.all(A3Spacing.md),
                        child: Row(
                          children: [
                            Icon(
                              Icons.info_outline_rounded,
                              color: A3Colors.warning,
                            ),
                            SizedBox(width: A3Spacing.sm),
                            Expanded(
                              child: Text(
                                'Add your bank details to receive weekly payouts.',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: A3Colors.warning,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                            Icon(
                              Icons.chevron_right_rounded,
                              color: A3Colors.warning,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: A3Spacing.xl),
                Text(
                  'Weekly statements',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    fontFamily: 'Outfit',
                    color: A3Colors.ink,
                  ),
                ),
                const SizedBox(height: A3Spacing.md),
                if (list.isEmpty)
                  const Padding(
                    padding: EdgeInsets.only(top: A3Spacing.xl),
                    child: StateView(
                      icon: Icons.receipt_long_outlined,
                      title: 'No earnings yet',
                      message: 'Your weekly statements will appear here after your first delivery.',
                    ),
                  )
                else
                  for (final w in list) ...[
                    _WeekTile(
                      week: w,
                      range:
                          '${_d(w.weekStart)} – ${_d(w.weekEnd.subtract(const Duration(days: 1)))}',
                    ),
                    const SizedBox(height: A3Spacing.sm),
                  ],
              ],
            ),
          );
        },
      ),
    );
  }
}

class _WeekTile extends StatelessWidget {
  const _WeekTile({required this.week, required this.range});
  final WeeklyStatement week;
  final String range;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(A3Spacing.md),
    decoration: BoxDecoration(
      color: A3Colors.surface,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: A3Colors.line),
    ),
    child: Row(
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: week.current ? A3Colors.primarySoft : A3Colors.successSoft,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(
            week.current
                ? Icons.timelapse_rounded
                : Icons.check_circle_outline_rounded,
            color: week.current ? A3Colors.primary : A3Colors.success,
          ),
        ),
        const SizedBox(width: A3Spacing.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                range,
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 15,
                  color: A3Colors.ink,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                '${week.deliveredCount} ${week.deliveredCount == 1 ? 'delivery' : 'deliveries'}',
                style: TextStyle(fontSize: 13, color: A3Colors.muted),
              ),
            ],
          ),
        ),
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              formatPaise(week.earningsPaise),
              style: TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 16,
                color: A3Colors.ink,
                fontFeatures: [FontFeature.tabularFigures()],
              ),
            ),
            const SizedBox(height: 4),
            week.current
                ? StatusChip(
                    label: 'This week',
                    color: A3Colors.primaryStrong,
                    background: A3Colors.primarySoft,
                  )
                : StatusChip(
                    label: 'Completed',
                    color: A3Colors.success,
                    background: A3Colors.successSoft,
                  ),
          ],
        ),
      ],
    ),
  );
}

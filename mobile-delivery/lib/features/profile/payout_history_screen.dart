import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/frame.dart';

/// Screen 11 · Payout History (Sheet 1)
/// Filter chips (All / Paid / Processing / Failed), total payouts card, and weekly bank transfers.
class PayoutHistoryScreen extends StatefulWidget {
  const PayoutHistoryScreen({super.key});

  @override
  State<PayoutHistoryScreen> createState() => _PayoutHistoryScreenState();
}

class _PayoutHistoryScreenState extends State<PayoutHistoryScreen> {
  int _selectedFilter = 0; // 0: All, 1: Paid, 2: Processing, 3: Failed

  final List<Map<String, dynamic>> _payouts = [
    {
      'date': '15 Oct 2026',
      'amount': '₹3,200',
      'status': 'Paid',
      'ref': 'UTR98231245',
    },
    {
      'date': '8 Oct 2026',
      'amount': '₹3,180',
      'status': 'Paid',
      'ref': 'UTR87213421',
    },
    {
      'date': '1 Oct 2026',
      'amount': '₹2,800',
      'status': 'Paid',
      'ref': 'UTR76124522',
    },
    {
      'date': '24 Sep 2026',
      'amount': '₹3,270',
      'status': 'Paid',
      'ref': 'UTR65012398',
    },
  ];

  @override
  Widget build(BuildContext context) {
    return FramedPage(
      title: 'Payout History',
      showBack: true,
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Total Payouts Hero Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: A3Colors.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: A3Colors.line),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x0A000000),
                    blurRadius: 10,
                    offset: Offset(0, 3),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text(
                    'Total Payouts',
                    style: TextStyle(
                      fontSize: 13,
                      color: A3Colors.muted,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  SizedBox(height: 4),
                  Text(
                    '₹12,450',
                    style: TextStyle(
                      fontFamily: 'Outfit',
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      color: A3Colors.success,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Filter Chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (var i = 0; i < 4; i++)
                    PillChip(
                      label: ['All', 'Paid', 'Processing', 'Failed'][i],
                      selected: _selectedFilter == i,
                      onTap: () => setState(() => _selectedFilter = i),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // Payout Transactions List
            for (final p in _payouts) ...[
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 14,
                ),
                margin: const EdgeInsets.only(bottom: 10),
                decoration: BoxDecoration(
                  color: A3Colors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: A3Colors.line),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          p['date'] as String,
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            color: A3Colors.ink,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          p['ref'] as String,
                          style: const TextStyle(
                            fontSize: 11,
                            color: A3Colors.muted,
                          ),
                        ),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          p['amount'] as String,
                          style: const TextStyle(
                            fontFamily: 'Outfit',
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: A3Colors.ink,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          p['status'] as String,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: A3Colors.success,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

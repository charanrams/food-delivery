import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/frame.dart';

/// Screen 12 · Bank Details & KYC (Sheet 1)
/// Bank payout account details, verification badges, and KYC document management.
class BankKycScreen extends StatelessWidget {
  const BankKycScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return FramedPage(
      title: 'Bank Details & KYC',
      showBack: true,
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Bank Details Section Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Bank Details',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: A3Colors.ink,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE8F5E9),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Row(
                    children: [
                      Icon(
                        Icons.check_circle_rounded,
                        size: 14,
                        color: A3Colors.success,
                      ),
                      SizedBox(width: 4),
                      Text(
                        'Verified',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: A3Colors.success,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Bank Account Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: A3Colors.surface,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: A3Colors.line),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x0A000000),
                    blurRadius: 8,
                    offset: Offset(0, 3),
                  ),
                ],
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: const Color(0xFFE3F2FD),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(
                          Icons.account_balance_rounded,
                          color: Color(0xFF1976D2),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: const [
                            Text(
                              'Suresh Kumar',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 15,
                                color: A3Colors.ink,
                              ),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'XXXX XXXX 4321',
                              style: TextStyle(
                                fontSize: 13,
                                color: A3Colors.muted,
                              ),
                            ),
                            Text(
                              'State Bank of India',
                              style: TextStyle(
                                fontSize: 12,
                                color: A3Colors.muted,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 24, color: A3Colors.line),
                  InkWell(
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text(
                            'Contact kitchen manager to update registered bank account.',
                          ),
                        ),
                      );
                    },
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: const [
                        Text(
                          'Change Bank Details',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: A3Colors.primary,
                          ),
                        ),
                        Icon(
                          Icons.chevron_right_rounded,
                          size: 20,
                          color: A3Colors.primary,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 26),

            // KYC Documents Section
            const Text(
              'KYC Documents',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: A3Colors.ink,
              ),
            ),
            const SizedBox(height: 12),
            _buildDocItem('Aadhaar Card', 'Verified', isVerified: true),
            const SizedBox(height: 10),
            _buildDocItem('PAN Card', 'Verified', isVerified: true),
            const SizedBox(height: 10),
            _buildDocItem('Driving License', 'Pending', isVerified: false),
            const SizedBox(height: 22),

            OutlinedButton.icon(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text(
                      'Upload document submitted for verification.',
                    ),
                  ),
                );
              },
              icon: const Icon(
                Icons.upload_file_outlined,
                size: 20,
                color: A3Colors.primary,
              ),
              label: const Text(
                'Upload Document',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: A3Colors.primary,
                ),
              ),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(50),
                side: const BorderSide(color: A3Colors.primary),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              'Documents are strictly used for weekly direct bank payouts and identity verification.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12,
                color: A3Colors.muted,
                height: 1.4,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDocItem(
    String title,
    String status, {
    required bool isVerified,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: A3Colors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: A3Colors.line),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(
                Icons.description_outlined,
                size: 22,
                color: isVerified ? A3Colors.ink : A3Colors.muted,
              ),
              const SizedBox(width: 12),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: A3Colors.ink,
                ),
              ),
            ],
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: isVerified
                  ? const Color(0xFFE8F5E9)
                  : const Color(0xFFFFF3E0),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Icon(
                  isVerified
                      ? Icons.check_circle_rounded
                      : Icons.pending_outlined,
                  size: 13,
                  color: isVerified
                      ? A3Colors.success
                      : const Color(0xFFEF6C00),
                ),
                const SizedBox(width: 4),
                Text(
                  status,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: isVerified
                        ? A3Colors.success
                        : const Color(0xFFEF6C00),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

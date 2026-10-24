import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/frame.dart';

/// Screen 18 · Privacy Policy (Sheet 1)
class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return FramedPage(
      title: 'Privacy Policy',
      showBack: true,
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text(
              'Last updated: 15 Oct 2026',
              style: TextStyle(
                fontSize: 12,
                color: A3Colors.muted,
                fontStyle: FontStyle.italic,
              ),
            ),
            SizedBox(height: 16),
            Text(
              '1. Information We Collect',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: A3Colors.ink,
              ),
            ),
            SizedBox(height: 6),
            Text(
              '• Personal details (name, phone number, email)\n• Real-time location data (for delivery dispatch & live tracking)\n• Bank details (strictly for weekly earnings payouts)\n• Device and app telemetry',
              style: TextStyle(
                fontSize: 14,
                color: A3Colors.muted,
                height: 1.5,
              ),
            ),
            SizedBox(height: 20),
            Text(
              '2. How We Use Your Information',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: A3Colors.ink,
              ),
            ),
            SizedBox(height: 6),
            Text(
              '• To assign nearest food delivery missions from A3 Kitchen\n• To calculate distance-based incentives and process payouts\n• To provide customer and rider safety',
              style: TextStyle(
                fontSize: 14,
                color: A3Colors.muted,
                height: 1.5,
              ),
            ),
            SizedBox(height: 20),
            Text(
              '3. Data Sharing & Security',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: A3Colors.ink,
              ),
            ),
            SizedBox(height: 6),
            Text(
              'We never sell your personal data. Location is shared with the customer only while an order is actively out for delivery.',
              style: TextStyle(
                fontSize: 14,
                color: A3Colors.muted,
                height: 1.5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Screen 19 · Terms & Conditions (Sheet 1)
class TermsConditionsScreen extends StatelessWidget {
  const TermsConditionsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return FramedPage(
      title: 'Terms & Conditions',
      showBack: true,
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text(
              'Last updated: 15 Oct 2026',
              style: TextStyle(
                fontSize: 12,
                color: A3Colors.muted,
                fontStyle: FontStyle.italic,
              ),
            ),
            SizedBox(height: 16),
            Text(
              '1. Acceptance of Terms',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: A3Colors.ink,
              ),
            ),
            SizedBox(height: 6),
            Text(
              'By accessing the A3 Kitchen Delivery Partner app, you agree to follow all safety protocols and guidelines outlined herein.',
              style: TextStyle(
                fontSize: 14,
                color: A3Colors.muted,
                height: 1.5,
              ),
            ),
            SizedBox(height: 20),
            Text(
              '2. Partner Responsibilities',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: A3Colors.ink,
              ),
            ),
            SizedBox(height: 6),
            Text(
              '• Maintain valid driving license and vehicle registration\n• Follow road safety rules and wear helmets during dispatches\n• Accurately collect and reconcile cash on delivery (COD) payments',
              style: TextStyle(
                fontSize: 14,
                color: A3Colors.muted,
                height: 1.5,
              ),
            ),
            SizedBox(height: 20),
            Text(
              '3. Payment & Settlement Terms',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: A3Colors.ink,
              ),
            ),
            SizedBox(height: 6),
            Text(
              'Payouts are credited directly to your verified bank account weekly. COD cash collected must be remitted at the end of shifts.',
              style: TextStyle(
                fontSize: 14,
                color: A3Colors.muted,
                height: 1.5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

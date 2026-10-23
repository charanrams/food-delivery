import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';

/// Screen 9 · Delivery Confirmation (Sheet 2)
/// Confetti celebration upon entering valid customer OTP, displaying earnings and rating.
class DeliveryConfirmationScreen extends StatelessWidget {
  final String orderNumber;
  final int earningsPaise;

  const DeliveryConfirmationScreen({
    super.key,
    this.orderNumber = '#AK12834',
    this.earningsPaise = 4000,
  });

  @override
  Widget build(BuildContext context) {
    final earningsRupees = (earningsPaise / 100).toStringAsFixed(0);
    return Scaffold(
      backgroundColor: A3Colors.surface,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),
              Center(
                child: Container(
                  width: 140,
                  height: 140,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE8F5E9),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.check_circle_rounded,
                    size: 88,
                    color: A3Colors.success,
                  ),
                ),
              ),
              const SizedBox(height: 28),
              const Text(
                'Order Delivered!',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontFamily: 'Outfit',
                  fontSize: 26,
                  fontWeight: FontWeight.bold,
                  color: A3Colors.ink,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                orderNumber,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: A3Colors.muted,
                ),
              ),
              const SizedBox(height: 24),

              // Earnings Highlight Pill
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F8F4),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: const Color(0xFFC8E6C9)),
                ),
                child: Column(
                  children: [
                    Text(
                      '₹$earningsRupees',
                      style: const TextStyle(
                        fontFamily: 'Outfit',
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                        color: A3Colors.success,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Earned for this delivery',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: A3Colors.ink,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 28),

              // Customer Rating Stars
              const Text(
                'Customer Rating',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: A3Colors.muted),
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (_) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 4),
                    child: Icon(Icons.star_rounded, size: 30, color: Color(0xFFFFB300)),
                  );
                }),
              ),
              const Spacer(),

              FilledButton(
                onPressed: () => context.go('/'),
                style: FilledButton.styleFrom(
                  backgroundColor: A3Colors.primary,
                  minimumSize: const Size.fromHeight(54),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: const Text('Done', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
              const SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }
}

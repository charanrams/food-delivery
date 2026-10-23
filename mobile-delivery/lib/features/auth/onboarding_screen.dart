import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';

/// Screen 2 · Interactive Multi-Slide Onboarding (Sheet 2)
/// Explains the delivery partner value proposition across 3 swipeable slides
/// with animated pill indicators, feature pills, and quick start CTA.
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingSlide {
  final IconData icon;
  final String title;
  final String subtitle;
  final String highlight;
  final List<String> features;

  const _OnboardingSlide({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.highlight,
    required this.features,
  });
}

const _slides = <_OnboardingSlide>[
  _OnboardingSlide(
    icon: Icons.delivery_dining_rounded,
    title: 'Earn with Every Delivery',
    subtitle:
        'Deliver hot, freshly prepared meals from A3 Kitchen and earn reliable weekly payouts with zero delays directly to your bank account.',
    highlight: '₹40 Base Pay · 100% Tips Kept',
    features: [
      'Weekly Direct Bank Transfer',
      'Instant COD Cash Remittance',
      'Peak Lunch & Dinner Bonuses',
    ],
  ),
  _OnboardingSlide(
    icon: Icons.schedule_rounded,
    title: 'Flexible Shift Timings',
    subtitle:
        'Ride on your terms. Full-time, lunch rush, dinner shift, or weekend hours. Pause orders anytime with instant shift break mode.',
    highlight: 'Work When You Want',
    features: [
      'Instant Shift Break Stopwatch',
      'Full-Time or Weekend Freedom',
      'Live Duty Status Toggle',
    ],
  ),
  _OnboardingSlide(
    icon: Icons.security_rounded,
    title: 'Smart Dispatch & Safety',
    subtitle:
        'Live route navigation from kitchen counter to customer doorstep, secure 6-digit OTP delivery confirmation, and 24/7 kitchen dispatch support.',
    highlight: 'Real-Time GPS & 6-Digit OTP',
    features: [
      'Turn-by-Turn Doorstep Navigation',
      'Secure 6-Digit Handover OTP',
      '24/7 Kitchen Dispatch Desk',
    ],
  ),
];

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _pageController = PageController();
  int _currentIndex = 0;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _next() {
    if (_currentIndex < _slides.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 320),
        curve: Curves.easeInOutCubic,
      );
    } else {
      context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLast = _currentIndex == _slides.length - 1;

    return Scaffold(
      backgroundColor: A3Colors.surface,
      body: SafeArea(
        child: Column(
          children: [
            // Top App Bar with Logo & Skip Button
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: A3Colors.primarySoft,
                          border: Border.all(color: A3Colors.primary.withValues(alpha: 0.3)),
                        ),
                        padding: const EdgeInsets.all(2),
                        child: ClipOval(
                          child: Image.asset(
                            'assets/images/logo.png',
                            fit: BoxFit.cover,
                            errorBuilder: (_, _, _) => const Icon(Icons.restaurant, color: A3Colors.primary, size: 20),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      const Text(
                        'A3 Delivery Partner',
                        style: TextStyle(
                          fontFamily: 'Outfit',
                          fontSize: 17,
                          fontWeight: FontWeight.bold,
                          color: A3Colors.ink,
                        ),
                      ),
                    ],
                  ),
                  if (!isLast)
                    TextButton(
                      onPressed: () => context.go('/login'),
                      style: TextButton.styleFrom(
                        foregroundColor: A3Colors.muted,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                      ),
                      child: const Text('Skip'),
                    )
                  else
                    const SizedBox(width: 48),
                ],
              ),
            ),

            // Swipeable PageView of Slides
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                itemCount: _slides.length,
                onPageChanged: (i) => setState(() => _currentIndex = i),
                itemBuilder: (context, index) {
                  final s = _slides[index];
                  // Scrolls on short screens instead of overflowing.
                  return LayoutBuilder(
                    builder: (context, box) => SingleChildScrollView(
                      child: ConstrainedBox(
                        constraints: BoxConstraints(minHeight: box.maxHeight),
                        child: IntrinsicHeight(
                          child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Spacer(),

                        // Central Hero Icon Art with Soft Radial Ring
                        Container(
                          width: 160,
                          height: 160,
                          decoration: BoxDecoration(
                            color: A3Colors.primarySoft,
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: A3Colors.primary.withValues(alpha: 0.2),
                              width: 6,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: A3Colors.primary.withValues(alpha: 0.15),
                                blurRadius: 28,
                                offset: const Offset(0, 10),
                              ),
                            ],
                          ),
                          child: Icon(
                            s.icon,
                            size: 88,
                            color: A3Colors.primary,
                          ),
                        ),
                        const SizedBox(height: 28),

                        // Highlight Badge Pill
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                          decoration: BoxDecoration(
                            color: const Color(0x1F2E7D4F),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: const Color(0x4D2E7D4F)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.verified, size: 16, color: A3Colors.success),
                              const SizedBox(width: 6),
                              Text(
                                s.highlight,
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: A3Colors.success,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Title
                        Text(
                          s.title,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontFamily: 'Outfit',
                            fontSize: 25,
                            fontWeight: FontWeight.bold,
                            color: A3Colors.ink,
                            letterSpacing: -0.5,
                          ),
                        ),
                        const SizedBox(height: 12),

                        // Subtitle
                        Text(
                          s.subtitle,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 14,
                            color: A3Colors.muted,
                            height: 1.5,
                          ),
                        ),
                        const SizedBox(height: 20),

                        // Feature Checklist
                        Column(
                          children: [
                            for (final f in s.features)
                              Padding(
                                padding: const EdgeInsets.symmetric(vertical: 3),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(Icons.check_circle_rounded, size: 16, color: A3Colors.primary),
                                    const SizedBox(width: 8),
                                    Text(
                                      f,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: A3Colors.ink,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                          ],
                        ),

                        const Spacer(),
                      ],
                    ),
                  ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),

            // Bottom Navigation & Progress Section
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 20),
              child: Column(
                children: [
                  // Animated Page Indicator Pills
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      for (var i = 0; i < _slides.length; i++)
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 240),
                          margin: const EdgeInsets.symmetric(horizontal: 4),
                          width: _currentIndex == i ? 28 : 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: _currentIndex == i ? A3Colors.primary : A3Colors.line,
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Next / Get Started CTA Button
                  FilledButton(
                    onPressed: _next,
                    style: FilledButton.styleFrom(
                      backgroundColor: A3Colors.primary,
                      minimumSize: const Size.fromHeight(54),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 0,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          isLast ? 'Get Started · Partner Login' : 'Continue',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(width: 8),
                        Icon(
                          isLast ? Icons.login_rounded : Icons.arrow_forward_rounded,
                          size: 18,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Already a Partner? Direct Login link
                  if (!isLast)
                    TextButton(
                      onPressed: () => context.go('/login'),
                      style: TextButton.styleFrom(
                        foregroundColor: A3Colors.primaryStrong,
                        textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                      ),
                      child: const Text('Already an active partner? Log in here'),
                    )
                  else
                    const Text(
                      'Partner accounts are registered exclusively by A3 Kitchen Admin.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 11, color: A3Colors.muted),
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

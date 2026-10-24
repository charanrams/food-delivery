import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/prefs.dart';
import '../../core/theme/app_theme.dart';
import '../auth/auth_controller.dart';

/// Partner launch splash — one authored brand moment (~1.7 s) on deep orange,
/// deliberately distinct from the customer app's light splash:
///   1. a white ring draws itself (echoing the logo's hand-drawn circle),
///   2. the emblem settles in with a soft spring,
///   3. a scooter rides in along the road beneath it,
///   4. the wordmark wipes in, then the "Partner" tag and tagline.
/// Then Home when a session is saved on this device, otherwise Login.
/// Under reduce-motion the final frame shows immediately.
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen>
    with SingleTickerProviderStateMixin {
  static const _duration = Duration(milliseconds: 1700);
  static const _minimumOnScreen = Duration(milliseconds: 2000);

  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: _duration,
  );

  Animation<double> _seg(
    double begin,
    double end, [
    Curve curve = Curves.easeOutCubic,
  ]) => CurvedAnimation(
    parent: _c,
    curve: Interval(begin, end, curve: curve),
  );

  late final _ring = _seg(0.0, 0.45);
  late final _logoIn = _seg(0.12, 0.40);
  late final _logoScale = Tween(
    begin: 0.6,
    end: 1.0,
  ).animate(_seg(0.12, 0.62, Curves.easeOutBack));
  late final _ride = _seg(0.40, 0.85, Curves.easeOutQuart);
  late final _wordmark = _seg(0.52, 0.82, Curves.easeOutQuart);
  late final _tagline = _seg(0.70, 1.0);

  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    final reduceMotion = MediaQuery.of(context).disableAnimations;
    reduceMotion ? _c.value = 1 : _c.forward();
    unawaited(_route(reduceMotion ? Duration.zero : _minimumOnScreen));
  }

  Future<void> _route(Duration minimum) async {
    final wait = Future<void>.delayed(minimum);
    final user = await ref
        .read(authProvider.future)
        .timeout(const Duration(seconds: 8), onTimeout: () => null)
        .catchError((_) => null);
    await wait;
    // Onboarding shows once per install; after that logged-out partners go straight to login.
    final next = user != null
        ? '/'
        : (await onboardingSeen() ? '/login' : '/onboarding');
    if (mounted) context.go(next);
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    const emblem = 132.0;
    const ring = 164.0;

    return Scaffold(
      backgroundColor: A3Colors.primaryStrong,
      body: Semantics(
        label: 'A3 Kitchen Partner — Deliver fresh. Earn on every trip.',
        child: Center(
          child: ExcludeSemantics(
            child: AnimatedBuilder(
              animation: _c,
              builder: (context, _) => Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: ring,
                    height: ring,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        CustomPaint(
                          size: const Size.square(ring),
                          painter: _RingPainter(_ring.value),
                        ),
                        Opacity(
                          opacity: _logoIn.value,
                          child: Transform.scale(
                            scale: _logoScale.value,
                            child: Container(
                              width: emblem,
                              height: emblem,
                              decoration: BoxDecoration(
                                color: A3Colors.surface,
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(
                                    color: const Color(
                                      0xFF29231F,
                                    ).withValues(alpha: 0.25 * _logoIn.value),
                                    blurRadius: 32,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: ClipOval(
                                child: Image.asset(
                                  'assets/images/logo.png',
                                  fit: BoxFit.cover,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: A3Spacing.md),
                  // Scooter rides in from the left and stops under the emblem.
                  SizedBox(
                    width: 220,
                    height: 40,
                    child: Stack(
                      alignment: Alignment.bottomCenter,
                      children: [
                        Container(
                          height: 2,
                          color: Colors.white.withValues(
                            alpha: 0.35 * _ride.value,
                          ),
                        ),
                        Transform.translate(
                          offset: Offset(-110 * (1 - _ride.value), -2),
                          child: Opacity(
                            opacity: _ride.value,
                            child: const Icon(
                              Icons.delivery_dining_rounded,
                              size: 36,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: A3Spacing.lg),
                  // Wordmark: left-to-right wipe.
                  ClipRect(
                    child: Align(
                      alignment: Alignment.centerLeft,
                      widthFactor: _wordmark.value,
                      child: Text(
                        'A3 Kitchen',
                        style: text.headlineMedium?.copyWith(
                          fontSize: 32,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: A3Spacing.xs),
                  Opacity(
                    opacity: _tagline.value,
                    child: Transform.translate(
                      offset: Offset(0, 8 * (1 - _tagline.value)),
                      child: Column(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(
                              'Partner',
                              style: text.labelLarge?.copyWith(
                                color: A3Colors.primaryStrong,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                          const SizedBox(height: A3Spacing.md),
                          Text(
                            'Deliver fresh. Earn on every trip.',
                            style: text.bodyMedium?.copyWith(
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// The logo's circle, drawn on: a sweep from the top, with a slightly heavier leading tip.
class _RingPainter extends CustomPainter {
  _RingPainter(this.t);
  final double t;

  @override
  void paint(Canvas canvas, Size size) {
    if (t <= 0) return;
    final rect = Rect.fromCircle(
      center: size.center(Offset.zero),
      radius: size.width / 2 - 3,
    );
    final paint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(rect, -math.pi / 2, 2 * math.pi * t, false, paint);
    // Faint second pass, like the double line in the hand-drawn emblem.
    canvas.drawArc(
      rect.deflate(5),
      -math.pi / 2 + 0.6,
      2 * math.pi * t * 0.92,
      false,
      paint
        ..strokeWidth = 1.2
        ..color = Colors.white.withValues(alpha: 0.45),
    );
  }

  @override
  bool shouldRepaint(_RingPainter old) => old.t != t;
}

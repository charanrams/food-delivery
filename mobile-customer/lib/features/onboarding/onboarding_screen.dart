import 'dart:math' as math;
import 'dart:ui' show PathMetric;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../core/prefs.dart';
import '../../core/theme/app_theme.dart';

/// First-launch onboarding — three illustrated slides with story-style progress bars that
/// auto-advance. Touch-and-hold pauses; swipe or Next moves on; Skip / Get started finish.
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

const _img = 'assets/images/onboarding';

class _Slide {
  const _Slide(this.title, this.body, this.art);
  final String title, body;
  final Widget Function(Animation<double> enter) art;
}

final _slides = <_Slide>[
  _Slide(
    'Discover food\nyou’ll love',
    'Biryanis, Andhra meals, curries and tiffins, cooked fresh in the A3 Kitchen.',
    (a) => _OrbitArt(enter: a),
  ),
  _Slide(
    'Track every bite\nin real time',
    'Follow your order from our kitchen to your door, with a delivery code for a safe handover.',
    (a) => _TrackingArt(enter: a),
  ),
  _Slide(
    'Fresh food, delivered\nto your door',
    'Hot, home-style meals at your doorstep. Pay online or cash on delivery.',
    (a) => _CollageArt(enter: a),
  ),
];

class _OnboardingScreenState extends State<OnboardingScreen>
    with TickerProviderStateMixin {
  final _pages = PageController();
  // Story bar for the current slide; when it fills, the next slide comes in.
  late final _progress = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 5200),
  )..addStatusListener(_onProgress);
  // Replays each slide's entrance choreography.
  late final _enter = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1400),
  );
  int _index = 0;
  bool _reduce = false;
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final reduce = MediaQuery.of(context).disableAnimations;
    if (!_started || reduce != _reduce) {
      _started = true;
      _reduce = reduce;
      _start();
    }
  }

  @override
  void dispose() {
    _progress.dispose();
    _enter.dispose();
    _pages.dispose();
    super.dispose();
  }

  void _start() {
    _reduce ? _enter.value = 1 : _enter.forward(from: 0);
    _progress.forward(from: 0);
  }

  void _onProgress(AnimationStatus s) {
    if (s == AnimationStatus.completed &&
        _index < _slides.length - 1 &&
        mounted)
      _goTo(_index + 1);
  }

  void _goTo(int i) {
    if (!_pages.hasClients) return;
    _reduce
        ? _pages.jumpToPage(i)
        : _pages.animateToPage(
            i,
            duration: const Duration(milliseconds: 520),
            curve: Curves.easeOutCubic,
          );
  }

  Future<void> _finish() async {
    _progress.stop();
    await markOnboardingSeen();
    if (mounted) context.go('/login');
  }

  void _pause() => _progress.stop();
  void _resume() {
    if (_progress.value < 1) _progress.forward();
  }

  @override
  Widget build(BuildContext context) {
    final last = _index == _slides.length - 1;
    final slide = _slides[_index];
    final text = Theme.of(context).textTheme;
    return AnnotatedRegion(
      value: SystemUiOverlayStyle.dark,
      child: Scaffold(
        backgroundColor: A3Colors.surface,
        body: Stack(
          children: [
            // Warm wash behind the art (peach → white), like the reference.
            const Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.center,
                    colors: [
                      Color(0xFFFFE3CC),
                      Color(0xFFFFF4EA),
                      Colors.white,
                    ],
                  ),
                ),
              ),
            ),
            SafeArea(
              child: Column(
                children: [
                  // Back · story bars · Skip
                  Padding(
                    padding: const EdgeInsets.fromLTRB(8, 6, 8, 0),
                    child: Row(
                      children: [
                        SizedBox(
                          width: 48,
                          child: AnimatedOpacity(
                            opacity: _index > 0 ? 1 : 0,
                            duration: const Duration(milliseconds: 200),
                            child: IconButton(
                              tooltip: 'Previous',
                              onPressed: _index > 0
                                  ? () => _goTo(_index - 1)
                                  : null,
                              style: IconButton.styleFrom(
                                backgroundColor: Colors.white.withValues(
                                  alpha: 0.8,
                                ),
                              ),
                              icon: const Icon(Icons.chevron_left_rounded),
                            ),
                          ),
                        ),
                        Expanded(
                          child: Semantics(
                            label: 'Slide ${_index + 1} of ${_slides.length}',
                            child: AnimatedBuilder(
                              animation: _progress,
                              builder: (_, _) => Row(
                                children: [
                                  for (var i = 0; i < _slides.length; i++)
                                    Expanded(
                                      child: Container(
                                        height: 4,
                                        margin: const EdgeInsets.symmetric(
                                          horizontal: 3,
                                        ),
                                        decoration: BoxDecoration(
                                          color: A3Colors.ink.withValues(
                                            alpha: 0.12,
                                          ),
                                          borderRadius: BorderRadius.circular(
                                            9,
                                          ),
                                        ),
                                        alignment: Alignment.centerLeft,
                                        child: FractionallySizedBox(
                                          widthFactor: i < _index
                                              ? 1
                                              : i == _index
                                              ? _progress.value
                                              : 0,
                                          child: Container(
                                            decoration: BoxDecoration(
                                              color: A3Colors.ink,
                                              borderRadius:
                                                  BorderRadius.circular(9),
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        SizedBox(
                          width: 64,
                          child: TextButton(
                            onPressed: _finish,
                            style: TextButton.styleFrom(
                              foregroundColor: A3Colors.ink,
                              padding: EdgeInsets.zero,
                            ),
                            child: const Text('Skip'),
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Illustrations — swipe, or touch-and-hold to pause the timer.
                  Expanded(
                    flex: 11,
                    child: GestureDetector(
                      onLongPressStart: (_) => _pause(),
                      onLongPressEnd: (_) => _resume(),
                      child: PageView.builder(
                        controller: _pages,
                        itemCount: _slides.length,
                        onPageChanged: (i) {
                          setState(() => _index = i);
                          HapticFeedback.selectionClick();
                          _start();
                        },
                        itemBuilder: (_, i) => Padding(
                          padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                          // Off-screen pages show their finished state; the active one replays its entrance.
                          child: _slides[i].art(
                            i == _index
                                ? _enter
                                : const AlwaysStoppedAnimation(1),
                          ),
                        ),
                      ),
                    ),
                  ),
                  // Copy + button
                  Expanded(
                    flex: 7,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(28, 8, 28, 12),
                      child: Column(
                        children: [
                          const Spacer(),
                          AnimatedSwitcher(
                            duration: Duration(milliseconds: _reduce ? 0 : 380),
                            switchInCurve: Curves.easeOutCubic,
                            transitionBuilder: (child, a) => FadeTransition(
                              opacity: a,
                              child: SlideTransition(
                                position: Tween(
                                  begin: const Offset(0, 0.18),
                                  end: Offset.zero,
                                ).animate(a),
                                child: child,
                              ),
                            ),
                            child: Column(
                              key: ValueKey(_index),
                              children: [
                                Text(
                                  slide.title,
                                  textAlign: TextAlign.center,
                                  style: text.headlineMedium?.copyWith(
                                    fontSize: 28,
                                    height: 1.15,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: -0.4,
                                  ),
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  slide.body,
                                  textAlign: TextAlign.center,
                                  style: text.bodyLarge?.copyWith(
                                    color: A3Colors.muted,
                                    height: 1.5,
                                    fontSize: 15,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const Spacer(),
                          SizedBox(
                            width: double.infinity,
                            height: 56,
                            child: FilledButton(
                              onPressed: last
                                  ? _finish
                                  : () => _goTo(_index + 1),
                              style: FilledButton.styleFrom(
                                backgroundColor: A3Colors.ink,
                                foregroundColor: Colors.white,
                                shape: const StadiumBorder(),
                                textStyle: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  AnimatedSwitcher(
                                    duration: const Duration(milliseconds: 200),
                                    child: Text(
                                      last ? 'Get started' : 'Next',
                                      key: ValueKey(last),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  const Icon(
                                    Icons.arrow_forward_rounded,
                                    size: 20,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
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

// =========================================================================== shared bits

/// Staggered entrance: [index]-th element of [count] eases in (scale + fade + rise).
Widget _enterItem(
  Animation<double> enter,
  int index,
  int count,
  Widget child, {
  double rise = 18,
}) {
  final start = (index / (count + 2)).clamp(0.0, 0.7);
  final curve = CurvedAnimation(
    parent: enter,
    curve: Interval(
      start,
      (start + 0.45).clamp(0.0, 1.0),
      curve: Curves.easeOutBack,
    ),
  );
  final fade = CurvedAnimation(
    parent: enter,
    curve: Interval(
      start,
      (start + 0.3).clamp(0.0, 1.0),
      curve: Curves.easeOut,
    ),
  );
  return AnimatedBuilder(
    animation: enter,
    builder: (_, c) => Opacity(
      opacity: fade.value.clamp(0.0, 1.0),
      child: Transform.translate(
        offset: Offset(0, (1 - curve.value) * rise),
        child: Transform.scale(scale: 0.7 + 0.3 * curve.value, child: c),
      ),
    ),
    child: child,
  );
}

/// Gentle endless bob — skipped when the user asks for less motion.
class _Float extends StatefulWidget {
  const _Float({required this.child, this.phase = 0, this.amplitude = 6});
  final Widget child;
  final double phase, amplitude;
  @override
  State<_Float> createState() => _FloatState();
}

class _FloatState extends State<_Float> with SingleTickerProviderStateMixin {
  late final _c = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 4),
  );
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    MediaQuery.of(context).disableAnimations ? _c.stop() : _c.repeat();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _c,
    builder: (_, child) => Transform.translate(
      offset: Offset(
        0,
        math.sin((_c.value + widget.phase) * 2 * math.pi) * widget.amplitude,
      ),
      child: child,
    ),
    child: widget.child,
  );
}

class _Photo extends StatelessWidget {
  const _Photo(this.name, {required this.size, this.ring = 4});
  final String name;
  final double size, ring;
  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    padding: EdgeInsets.all(ring),
    decoration: const BoxDecoration(
      shape: BoxShape.circle,
      color: Colors.white,
      boxShadow: [
        BoxShadow(
          color: Color(0x2E7A3B10),
          blurRadius: 18,
          offset: Offset(0, 8),
        ),
      ],
    ),
    child: ClipOval(
      child: Image.asset(
        '$_img/$name.jpg',
        fit: BoxFit.cover,
        cacheWidth: (size * 2.5).round(),
      ),
    ),
  );
}

class _Badge extends StatelessWidget {
  const _Badge(this.icon, {this.size = 40});
  final IconData icon;
  final double size;
  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: const BoxDecoration(
      color: A3Colors.ink,
      shape: BoxShape.circle,
      boxShadow: [
        BoxShadow(
          color: Color(0x3329231F),
          blurRadius: 10,
          offset: Offset(0, 4),
        ),
      ],
    ),
    child: Icon(icon, color: Colors.white, size: size * 0.48),
  );
}

class _Spark extends StatelessWidget {
  const _Spark({this.size = 14});
  final double size;
  @override
  Widget build(BuildContext context) => Icon(
    Icons.auto_awesome,
    size: size,
    color: A3Colors.primary.withValues(alpha: 0.75),
  );
}

// =========================================================================== slide 1 — orbit

class _OrbitArt extends StatelessWidget {
  const _OrbitArt({required this.enter});
  final Animation<double> enter;
  static const _dishes = [
    'chicken-dum-biryani',
    'paneer-butter-masala',
    'ghee-masala-dosa',
    'gulab-jamun',
    'andhra-veg-meals',
    'gongura-mutton-curry',
    'butter-naan',
  ];

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, c) {
        final w = c.maxWidth, h = c.maxHeight;
        final center = Offset(w / 2, h / 2);
        final rx = w * 0.36, ry = h * 0.36;
        final big = math.min(w, h) * 0.27;
        final items = <Widget>[
          // Dashed orbit ring.
          Positioned.fill(
            child: CustomPaint(
              painter: _OrbitPainter(rx: rx, ry: ry),
            ),
          ),
        ];
        for (var i = 0; i < _dishes.length; i++) {
          final t = -math.pi / 2 + i * 2 * math.pi / _dishes.length;
          final s = i.isEven ? big : big * 0.82;
          items.add(
            Positioned(
              left: center.dx + rx * math.cos(t) - s / 2,
              top: center.dy + ry * math.sin(t) - s / 2,
              child: _enterItem(
                enter,
                i,
                _dishes.length + 3,
                _Float(
                  phase: i / _dishes.length,
                  amplitude: 5,
                  child: _Photo(_dishes[i], size: s),
                ),
              ),
            ),
          );
        }
        items.addAll([
          Positioned(
            left: w * 0.04,
            top: h * 0.06,
            child: _enterItem(
              enter,
              7,
              10,
              const _Float(phase: 0.3, child: _Badge(Icons.storefront_rounded)),
            ),
          ),
          Positioned(
            right: w * 0.04,
            top: h * 0.08,
            child: _enterItem(
              enter,
              8,
              10,
              const _Float(
                phase: 0.7,
                child: _Badge(Icons.shopping_bag_rounded),
              ),
            ),
          ),
          Positioned(
            right: w * 0.1,
            bottom: h * 0.04,
            child: _enterItem(
              enter,
              9,
              10,
              const _Float(phase: 0.5, child: _Badge(Icons.restaurant_rounded)),
            ),
          ),
          Positioned(left: w * 0.2, top: h * 0.3, child: const _Spark()),
          Positioned(
            right: w * 0.24,
            top: h * 0.62,
            child: const _Spark(size: 12),
          ),
          Positioned(
            left: w * 0.3,
            bottom: h * 0.1,
            child: const _Spark(size: 10),
          ),
          // Centre chip.
          Positioned(
            left: 0,
            right: 0,
            top: center.dy - 20,
            child: Center(
              child: _enterItem(
                enter,
                10,
                10,
                Container(
                  padding: const EdgeInsets.fromLTRB(8, 8, 14, 8),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(99),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x2229231F),
                        blurRadius: 16,
                        offset: Offset(0, 6),
                      ),
                    ],
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      CircleAvatar(
                        radius: 12,
                        backgroundColor: A3Colors.ink,
                        child: Icon(
                          Icons.check_rounded,
                          size: 16,
                          color: Colors.white,
                        ),
                      ),
                      SizedBox(width: 8),
                      Text(
                        'Cooked fresh, delivered hot',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ]);
        return Stack(clipBehavior: Clip.none, children: items);
      },
    );
  }
}

class _OrbitPainter extends CustomPainter {
  _OrbitPainter({required this.rx, required this.ry});
  final double rx, ry;
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = A3Colors.primary.withValues(alpha: 0.35)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4;
    final rect = Rect.fromCenter(
      center: size.center(Offset.zero),
      width: rx * 2,
      height: ry * 2,
    );
    const dash = 0.06;
    for (var a = 0.0; a < 2 * math.pi; a += dash * 2) {
      canvas.drawArc(rect, a, dash, false, paint);
    }
  }

  @override
  bool shouldRepaint(_OrbitPainter old) => old.rx != rx || old.ry != ry;
}

// =========================================================================== slide 2 — live tracking

class _TrackingArt extends StatelessWidget {
  const _TrackingArt({required this.enter});
  final Animation<double> enter;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, c) {
        final w = c.maxWidth, h = c.maxHeight;
        final mapH = h * 0.78;
        return Stack(
          clipBehavior: Clip.none,
          children: [
            // Map card with the route drawing itself and the rider riding along.
            Positioned(
              left: w * 0.04,
              right: w * 0.04,
              top: 0,
              height: mapH,
              child: _enterItem(
                enter,
                0,
                6,
                Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFFF6F2EE),
                    borderRadius: BorderRadius.circular(28),
                    border: Border.all(color: Colors.white, width: 4),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x2229231F),
                        blurRadius: 24,
                        offset: Offset(0, 10),
                      ),
                    ],
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: _RouteMap(enter: enter),
                ),
                rise: 30,
              ),
            ),
            // Status cards pop in one after another.
            Positioned(
              right: 0,
              top: mapH * 0.08,
              child: _enterItem(
                enter,
                2,
                6,
                const _Float(
                  phase: 0.1,
                  amplitude: 4,
                  child: _StatusCard(
                    icon: Icons.soup_kitchen_rounded,
                    title: 'Order accepted',
                    sub: 'The kitchen is cooking',
                    pill: 'Preparing',
                  ),
                ),
              ),
            ),
            Positioned(
              left: 0,
              top: mapH * 0.4,
              child: _enterItem(
                enter,
                3,
                6,
                const _Float(
                  phase: 0.5,
                  amplitude: 4,
                  child: _StatusCard(
                    icon: Icons.timer_outlined,
                    title: 'Arriving in 12 min',
                    sub: 'Fresh and hot',
                    pill: '12 min',
                  ),
                ),
              ),
            ),
            Positioned(
              right: w * 0.02,
              top: mapH * 0.66,
              child: _enterItem(
                enter,
                4,
                6,
                const _Float(
                  phase: 0.8,
                  amplitude: 4,
                  child: _StatusCard(
                    icon: Icons.two_wheeler_rounded,
                    title: 'Rider is on the way',
                    sub: 'Share your code at the door',
                  ),
                ),
              ),
            ),
            // Row of dishes along the bottom.
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: _enterItem(
                enter,
                5,
                6,
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    for (final (i, d) in const [
                      'chicken-dum-biryani',
                      'paneer-butter-masala',
                      'ghee-masala-dosa',
                      'gulab-jamun',
                      'palak-paneer',
                    ].indexed)
                      Align(
                        widthFactor: 0.78,
                        child: _Float(
                          phase: i * 0.18,
                          amplitude: 3,
                          child: _Photo(
                            d,
                            size: math.min(64, w / 5.2),
                            ring: 3,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _StatusCard extends StatelessWidget {
  const _StatusCard({
    required this.icon,
    required this.title,
    required this.sub,
    this.pill,
  });
  final IconData icon;
  final String title, sub;
  final String? pill;
  @override
  Widget build(BuildContext context) => Container(
    width: 196,
    padding: const EdgeInsets.all(10),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      boxShadow: const [
        BoxShadow(
          color: Color(0x2229231F),
          blurRadius: 16,
          offset: Offset(0, 6),
        ),
      ],
    ),
    child: Row(
      children: [
        Container(
          width: 34,
          height: 34,
          decoration: BoxDecoration(
            color: A3Colors.primarySoft,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 19, color: A3Colors.primaryStrong),
        ),
        const SizedBox(width: 9),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w800,
                ),
              ),
              Text(
                sub,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 11, color: A3Colors.muted),
              ),
              if (pill != null) ...[
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 7,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0x1F2E7D4F),
                    borderRadius: BorderRadius.circular(99),
                  ),
                  child: Text(
                    pill!,
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: A3Colors.success,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    ),
  );
}

/// Streets + a route that draws itself, a rider moving along it, kitchen and home pins.
class _RouteMap extends StatefulWidget {
  const _RouteMap({required this.enter});
  final Animation<double> enter;
  @override
  State<_RouteMap> createState() => _RouteMapState();
}

class _RouteMapState extends State<_RouteMap>
    with SingleTickerProviderStateMixin {
  late final _ride = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 5),
  );
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    MediaQuery.of(context).disableAnimations
        ? _ride.value = 0.6
        : _ride.repeat();
  }

  @override
  void dispose() {
    _ride.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: Listenable.merge([_ride, widget.enter]),
    builder: (_, _) => CustomPaint(
      painter: _RoutePainter(
        draw: Curves.easeInOut.transform(widget.enter.value.clamp(0.0, 1.0)),
        ride: _ride.value,
      ),
      child: const SizedBox.expand(),
    ),
  );
}

class _RoutePainter extends CustomPainter {
  _RoutePainter({required this.draw, required this.ride});
  final double draw, ride;

  @override
  void paint(Canvas canvas, Size s) {
    // Streets.
    final street = Paint()
      ..color = Colors.white
      ..strokeWidth = 10
      ..strokeCap = StrokeCap.round;
    for (final f in [0.22, 0.5, 0.78]) {
      canvas.drawLine(
        Offset(0, s.height * f),
        Offset(s.width, s.height * (f + 0.06)),
        street,
      );
    }
    for (final f in [0.18, 0.46, 0.8]) {
      canvas.drawLine(
        Offset(s.width * f, 0),
        Offset(s.width * (f - 0.05), s.height),
        street,
      );
    }
    final park = Paint()..color = const Color(0x332E7D4F);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(
          s.width * 0.55,
          s.height * 0.28,
          s.width * 0.2,
          s.height * 0.16,
        ),
        const Radius.circular(10),
      ),
      park,
    );

    // Route: kitchen (top-left) → home (bottom-right).
    final route = Path()
      ..moveTo(s.width * 0.2, s.height * 0.16)
      ..cubicTo(
        s.width * 0.25,
        s.height * 0.45,
        s.width * 0.5,
        s.height * 0.35,
        s.width * 0.52,
        s.height * 0.58,
      )
      ..cubicTo(
        s.width * 0.54,
        s.height * 0.78,
        s.width * 0.72,
        s.height * 0.72,
        s.width * 0.78,
        s.height * 0.86,
      );
    final metric = route.computeMetrics().first;
    final drawn = metric.extractPath(0, metric.length * draw);
    canvas.drawPath(
      drawn,
      Paint()
        ..color = A3Colors.ink
        ..style = PaintingStyle.stroke
        ..strokeWidth = 4
        ..strokeCap = StrokeCap.round,
    );

    _pin(
      canvas,
      metric.getTangentForOffset(0)!.position,
      A3Colors.ink,
      Icons.storefront_rounded,
    );
    if (draw > 0.95)
      _pin(
        canvas,
        metric.getTangentForOffset(metric.length)!.position,
        A3Colors.primary,
        Icons.home_rounded,
      );
    if (draw > 0.6) _rider(canvas, metric, ride);
  }

  void _pin(Canvas canvas, Offset at, Color color, IconData icon) {
    canvas.drawCircle(at, 16, Paint()..color = Colors.white);
    canvas.drawCircle(at, 13, Paint()..color = color);
    _icon(canvas, at, icon, 15, Colors.white);
  }

  void _rider(Canvas canvas, PathMetric metric, double t) {
    final pos = metric
        .getTangentForOffset(metric.length * (0.08 + 0.84 * t))!
        .position;
    canvas.drawCircle(
      pos,
      19,
      Paint()..color = A3Colors.primary.withValues(alpha: 0.22),
    );
    canvas.drawCircle(pos, 14, Paint()..color = Colors.white);
    _icon(canvas, pos, Icons.two_wheeler_rounded, 18, A3Colors.primaryStrong);
  }

  void _icon(
    Canvas canvas,
    Offset at,
    IconData icon,
    double size,
    Color color,
  ) {
    final tp = TextPainter(
      text: TextSpan(
        text: String.fromCharCode(icon.codePoint),
        style: TextStyle(
          fontSize: size,
          fontFamily: icon.fontFamily,
          package: icon.fontPackage,
          color: color,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    tp.paint(canvas, at - Offset(tp.width / 2, tp.height / 2));
  }

  @override
  bool shouldRepaint(_RoutePainter old) => old.draw != draw || old.ride != ride;
}

// =========================================================================== slide 3 — capsule collage

class _CollageArt extends StatefulWidget {
  const _CollageArt({required this.enter});
  final Animation<double> enter;
  @override
  State<_CollageArt> createState() => _CollageArtState();
}

class _CollageArtState extends State<_CollageArt>
    with SingleTickerProviderStateMixin {
  // Columns drift slowly in opposite directions — a calm "auto-scroll".
  late final _drift = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 7),
  );
  static const _cols = [
    ['chicken-dum-biryani', 'andhra-veg-meals', 'gulab-jamun'],
    ['paneer-butter-masala', 'ghee-masala-dosa', 'palak-paneer'],
    ['gongura-mutton-curry', 'paneer-tikka-biryani', 'butter-naan'],
  ];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    MediaQuery.of(context).disableAnimations
        ? _drift.stop()
        : _drift.repeat(reverse: true);
  }

  @override
  void dispose() {
    _drift.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, c) {
        final colW = (c.maxWidth - 24) / 3;
        final capH = colW * 1.55;
        return ClipRRect(
          borderRadius: BorderRadius.circular(28),
          child: ShaderMask(
            // Soft fade top and bottom so the moving columns feel endless.
            shaderCallback: (r) => const LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Colors.transparent,
                Colors.black,
                Colors.black,
                Colors.transparent,
              ],
              stops: [0, 0.1, 0.9, 1],
            ).createShader(r),
            blendMode: BlendMode.dstIn,
            child: AnimatedBuilder(
              animation: _drift,
              builder: (_, _) {
                final d = Curves.easeInOut.transform(_drift.value);
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    for (var col = 0; col < 3; col++) ...[
                      if (col > 0) const SizedBox(width: 12),
                      SizedBox(
                        width: colW,
                        height: c.maxHeight,
                        child: OverflowBox(
                          alignment: Alignment.topCenter,
                          maxHeight: double.infinity,
                          child: Transform.translate(
                            offset: Offset(
                              0,
                              (col.isOdd ? -capH * 0.35 : 0) +
                                  (col.isOdd ? 1 : -1) * 22 * d,
                            ),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                for (final (i, name) in _cols[col].indexed)
                                  Padding(
                                    padding: const EdgeInsets.only(bottom: 12),
                                    child: _enterItem(
                                      widget.enter,
                                      col + i * 2,
                                      8,
                                      _Capsule(
                                        name: name,
                                        width: colW,
                                        height: capH,
                                        badge: col == 1 && i == 1
                                            ? Icons.two_wheeler_rounded
                                            : col == 0 && i == 1
                                            ? Icons.shopping_bag_rounded
                                            : col == 2 && i == 0
                                            ? Icons
                                                  .local_fire_department_rounded
                                            : null,
                                      ),
                                      rise: 30,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ],
                );
              },
            ),
          ),
        );
      },
    );
  }
}

class _Capsule extends StatelessWidget {
  const _Capsule({
    required this.name,
    required this.width,
    required this.height,
    this.badge,
  });
  final String name;
  final double width, height;
  final IconData? badge;
  @override
  Widget build(BuildContext context) => SizedBox(
    width: width,
    height: height,
    child: Stack(
      clipBehavior: Clip.none,
      children: [
        Positioned.fill(
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(width / 2),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x2629231F),
                  blurRadius: 14,
                  offset: Offset(0, 6),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(width / 2),
              child: Image.asset(
                '$_img/$name.jpg',
                fit: BoxFit.cover,
                cacheWidth: (width * 2.5).round(),
              ),
            ),
          ),
        ),
        if (badge != null)
          Positioned(
            bottom: -6,
            left: 0,
            right: 0,
            child: Center(child: _Badge(badge!, size: 36)),
          ),
      ],
    ),
  );
}

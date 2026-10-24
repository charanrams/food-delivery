import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../api/models.dart';
import '../theme/app_theme.dart';

/// Network food photo with a tinted placeholder for loading, missing or failed images.
class FoodImage extends StatelessWidget {
  const FoodImage({
    super.key,
    required this.url,
    this.width = 600,
    this.radius = 12,
    this.dimmed = false,
    this.semanticLabel,
  });
  final String? url;
  final int width;
  final double radius;
  final bool dimmed;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final placeholder = Container(
      color: A3Colors.primarySoft,
      alignment: Alignment.center,
      child: const Icon(Icons.restaurant, color: A3Colors.primary, size: 28),
    );
    final image = url == null
        ? placeholder
        : CachedNetworkImage(
            imageUrl: sizedImage(url!, width),
            fit: BoxFit.cover,
            placeholder: (_, _) => placeholder,
            errorWidget: (_, _, _) => placeholder,
          );
    return Semantics(
      image: true,
      label: semanticLabel,
      excludeSemantics: true,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(radius),
        child: Opacity(opacity: dimmed ? 0.45 : 1, child: image),
      ),
    );
  }
}

class VegMark extends StatelessWidget {
  const VegMark({super.key, required this.veg});
  final bool veg;

  @override
  Widget build(BuildContext context) {
    final c = veg ? A3Colors.success : A3Colors.danger;
    return Semantics(
      label: veg ? 'Vegetarian' : 'Non-vegetarian',
      child: Container(
        width: 14,
        height: 14,
        decoration: BoxDecoration(
          border: Border.all(color: c, width: 1.5),
          borderRadius: BorderRadius.circular(3),
        ),
        alignment: Alignment.center,
        child: Container(
          width: 6,
          height: 6,
          decoration: BoxDecoration(color: c, shape: BoxShape.circle),
        ),
      ),
    );
  }
}

/// Loading / error / empty states shared by every async screen (CLAUDE.md §13).
class AsyncStateView extends StatelessWidget {
  const AsyncStateView.error({
    super.key,
    required String this.message,
    required VoidCallback this.onRetry,
  }) : icon = Icons.wifi_off_rounded,
       title = 'We couldn’t load this';
  const AsyncStateView.empty({
    super.key,
    required this.icon,
    required this.title,
    required String this.message,
  }) : onRetry = null;

  final IconData icon;
  final String title;
  final String? message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(A3Spacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: onRetry != null
                    ? A3Colors.danger.withValues(alpha: 0.1)
                    : A3Colors.primarySoft,
                borderRadius: BorderRadius.circular(18),
              ),
              child: Icon(
                icon,
                size: 28,
                color: onRetry != null
                    ? A3Colors.danger
                    : A3Colors.primaryStrong,
              ),
            ),
            const SizedBox(height: A3Spacing.lg),
            Text(title, style: text.headlineSmall, textAlign: TextAlign.center),
            if (message != null) ...[
              const SizedBox(height: A3Spacing.sm),
              Text(
                message!,
                textAlign: TextAlign.center,
                style: text.bodyLarge?.copyWith(color: A3Colors.muted),
              ),
            ],
            if (onRetry != null) ...[
              const SizedBox(height: A3Spacing.lg),
              OutlinedButton(
                onPressed: onRetry,
                child: const Text('Try again'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Order status pill — same colours as the web StatusBadge.
class StatusChip extends StatelessWidget {
  const StatusChip({super.key, required this.status});
  final String status;

  @override
  Widget build(BuildContext context) {
    final color = switch (status) {
      'DELIVERED' => A3Colors.success,
      'REJECTED' || 'CANCELLED' => A3Colors.danger,
      'ASSIGNED' || 'PICKED_UP' || 'OUT_FOR_DELIVERY' => A3Colors.warning,
      'PLACED' => A3Colors.muted,
      _ => A3Colors.primaryStrong,
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 6),
          Text(
            orderStatusLabel[status] ?? status,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

/// Shown to guests on screens that need an account (Orders, Profile).
class LoginPrompt extends StatelessWidget {
  const LoginPrompt({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
    required this.onLogin,
  });
  final IconData icon;
  final String title, message;
  final VoidCallback onLogin;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(A3Spacing.xl),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          AsyncStateView.empty(icon: icon, title: title, message: message),
          FilledButton(
            onPressed: onLogin,
            child: const Text('Log in or sign up'),
          ),
        ],
      ),
    ),
  );
}

/// Solid quantity stepper used on product cards once a dish is in the cart.
/// At 1 the minus becomes a bin, so the same control removes the dish.
class QtyStepper extends StatelessWidget {
  const QtyStepper({
    super.key,
    required this.value,
    required this.label,
    required this.onChanged,
    this.max = 20,
  });
  final int value, max;
  final String label;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    Widget btn(IconData icon, String tip, VoidCallback? onTap) => Semantics(
      button: true,
      label: tip,
      excludeSemantics: true,
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: onTap,
        child: SizedBox(
          width: 40,
          height: 40,
          child: Icon(
            icon,
            size: 18,
            color: onTap == null ? Colors.white54 : Colors.white,
          ),
        ),
      ),
    );
    return Semantics(
      container: true,
      label: 'Quantity for $label: $value',
      child: Material(
        color: A3Colors.primary,
        borderRadius: BorderRadius.circular(12),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            btn(
              value <= 1 ? Icons.delete_outline_rounded : Icons.remove_rounded,
              value <= 1 ? 'Remove $label' : 'Decrease quantity',
              () => onChanged(value - 1),
            ),
            AnimatedSwitcher(
              duration: MediaQuery.of(context).disableAnimations
                  ? Duration.zero
                  : const Duration(milliseconds: 160),
              transitionBuilder: (c, a) => SlideTransition(
                position: Tween(
                  begin: const Offset(0, 0.4),
                  end: Offset.zero,
                ).animate(a),
                child: FadeTransition(opacity: a, child: c),
              ),
              child: SizedBox(
                key: ValueKey(value),
                width: 22,
                child: Text(
                  '$value',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                    fontFeatures: [FontFeature.tabularFigures()],
                  ),
                ),
              ),
            ),
            btn(
              Icons.add_rounded,
              'Increase quantity',
              value >= max ? null : () => onChanged(value + 1),
            ),
          ],
        ),
      ),
    );
  }
}

/// Shimmering placeholder block for loading lists (static when animations are reduced).
class SkeletonBox extends StatefulWidget {
  const SkeletonBox({super.key, this.height = 96, this.radius = 20});
  final double height, radius;

  @override
  State<SkeletonBox> createState() => _SkeletonBoxState();
}

class _SkeletonBoxState extends State<SkeletonBox>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1400),
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
  Widget build(BuildContext context) => ExcludeSemantics(
    child: AnimatedBuilder(
      animation: _c,
      builder: (_, _) => Container(
        height: widget.height,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(widget.radius),
          gradient: LinearGradient(
            begin: Alignment(-1.5 + _c.value * 3, 0),
            end: Alignment(-0.5 + _c.value * 3, 0),
            colors: const [A3Colors.card, Color(0xFFFAF9F7), A3Colors.card],
          ),
        ),
      ),
    ),
  );
}

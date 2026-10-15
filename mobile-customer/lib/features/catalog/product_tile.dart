import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/widgets.dart';
import '../cart/cart_controller.dart';

/// Adds a dish to the cart. Dishes with several portions open the detail page so the
/// customer picks one; single-price dishes go straight in.
void quickAdd(BuildContext context, WidgetRef ref, Product p) {
  if (p.variants.length > 1) {
    context.push('/product/${p.slug}', extra: p);
    return;
  }
  HapticFeedback.lightImpact();
  ref.read(cartProvider.notifier).add(p, p.defaultVariant);
}

int displayPrice(Product p) => p.defaultVariant?.pricePaise ?? p.pricePaise;

/// Shared-element tag: the card photo flies into the product screen's hero image.
String productHeroTag(Product p) => 'product-photo-${p.id}';

/// Card shell: tinted fill, 20px radius, gentle press-down scale (skipped with reduce motion).
class _PressableCard extends StatefulWidget {
  const _PressableCard({
    required this.onTap,
    required this.child,
    required this.semanticLabel,
  });
  final VoidCallback onTap;
  final Widget child;
  final String semanticLabel;

  @override
  State<_PressableCard> createState() => _PressableCardState();
}

class _PressableCardState extends State<_PressableCard> {
  bool _down = false;

  @override
  Widget build(BuildContext context) {
    final reduce = MediaQuery.of(context).disableAnimations;
    return Semantics(
      button: true,
      label: widget.semanticLabel,
      child: AnimatedScale(
        scale: _down && !reduce ? 0.98 : 1,
        duration: const Duration(milliseconds: 120),
        curve: Curves.easeOut,
        child: Material(
          color: A3Colors.card,
          borderRadius: BorderRadius.circular(20),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: widget.onTap,
            onHighlightChanged: (v) => setState(() => _down = v),
            child: widget.child,
          ),
        ),
      ),
    );
  }
}

/// Add control: "+ Add" → inline stepper once the dish is in the cart (single-price dishes).
class CartControl extends ConsumerWidget {
  const CartControl({super.key, required this.product});
  final Product product;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = product;
    if (!p.isAvailable) {
      return const Text(
        'Unavailable',
        style: TextStyle(
          color: A3Colors.muted,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      );
    }
    final lines = ref
        .watch(cartProvider)
        .where((l) => l.product.id == p.id)
        .toList();
    final qty = lines.fold<int>(0, (n, l) => n + l.quantity);
    final multi = p.variants.length > 1;

    final Widget child = (qty > 0 && !multi)
        ? QtyStepper(
            key: const ValueKey('stepper'),
            value: qty,
            label: p.name,
            onChanged: (v) {
              HapticFeedback.selectionClick();
              ref.read(cartProvider.notifier).setQuantity(lines.first.key, v);
            },
          )
        : _AddPill(
            key: const ValueKey('add'),
            label: multi ? 'Choose' : 'Add',
            count: qty,
            semantic: multi
                ? 'Choose a portion of ${p.name}'
                : 'Add ${p.name} to cart',
            onTap: () => quickAdd(context, ref, p),
          );

    return AnimatedSwitcher(
      duration: MediaQuery.of(context).disableAnimations
          ? Duration.zero
          : const Duration(milliseconds: 180),
      switchInCurve: Curves.easeOutCubic,
      transitionBuilder: (c, a) => FadeTransition(
        opacity: a,
        child: ScaleTransition(
          scale: Tween(begin: 0.92, end: 1.0).animate(a),
          child: c,
        ),
      ),
      child: child,
    );
  }
}

class _AddPill extends StatelessWidget {
  const _AddPill({
    super.key,
    required this.label,
    required this.count,
    required this.semantic,
    required this.onTap,
  });
  final String label, semantic;
  final int count;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: semantic,
    excludeSemantics: true,
    child: Material(
      color: A3Colors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: A3Colors.primary.withValues(alpha: 0.45)),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 40, minWidth: 48),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.add_rounded,
                  size: 18,
                  color: A3Colors.primaryStrong,
                ),
                const SizedBox(width: 4),
                Text(
                  label,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    color: A3Colors.primaryStrong,
                    fontSize: 13,
                  ),
                ),
                if (count > 0) ...[
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 1,
                    ),
                    decoration: BoxDecoration(
                      color: A3Colors.primaryStrong,
                      borderRadius: BorderRadius.circular(99),
                    ),
                    child: Text(
                      '$count',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    ),
  );
}

class ProductGridCard extends StatelessWidget {
  const ProductGridCard({super.key, required this.product});
  final Product product;

  @override
  Widget build(BuildContext context) {
    final p = product;
    return _PressableCard(
      semanticLabel: '${p.name}, ${formatPaise(displayPrice(p))}',
      onTap: () => context.push('/product/${p.slug}', extra: p),
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Hero(
                    tag: productHeroTag(p),
                    child: FoodImage(
                      url: p.imageUrl,
                      width: 420,
                      radius: 14,
                      dimmed: !p.isAvailable,
                      semanticLabel: p.name,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      VegMark(veg: p.isVegetarian),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          p.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 15,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          formatPaise(displayPrice(p)),
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 16,
                          ),
                        ),
                      ),
                      CartControl(product: p),
                    ],
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

/// List card (category list, search, favourites): photo left, details right.
class ProductListCard extends StatelessWidget {
  const ProductListCard({super.key, required this.product});
  final Product product;

  @override
  Widget build(BuildContext context) {
    final p = product;
    return _PressableCard(
      semanticLabel: '${p.name}, ${formatPaise(displayPrice(p))}',
      onTap: () => context.push('/product/${p.slug}', extra: p),
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 96,
              height: 96,
              child: Hero(
                tag: productHeroTag(p),
                child: FoodImage(
                  url: p.imageUrl,
                  width: 240,
                  radius: 14,
                  dimmed: !p.isAvailable,
                  semanticLabel: p.name,
                ),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: ConstrainedBox(
                // Grows with large text instead of overflowing; keeps the photo height as the minimum.
                constraints: const BoxConstraints(minHeight: 96),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        VegMark(veg: p.isVegetarian),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            p.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 15,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      p.description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12.5,
                        color: A3Colors.muted,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            formatPaise(displayPrice(p)),
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 16,
                            ),
                          ),
                        ),
                        CartControl(product: p),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

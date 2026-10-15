import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/frame.dart';
import '../../core/widgets/widgets.dart';
import '../auth/auth_controller.dart';
import '../cart/cart_controller.dart';
import '../catalog/catalog_providers.dart';
import '../catalog/product_tile.dart';
import '../notifications/notifications_screen.dart';
import '../orders/orders_providers.dart';
import 'offer_rows.dart';

const _gutter = 20.0;

/// Customer home (mockup screen 7): white page with the delivery address on top, search +
/// filter, a peach "Freshly Prepared" banner, category tiles and the "Popular Near You" grid.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categories = ref.watch(categoriesProvider);
    final user = ref.watch(authProvider).value;

    return AnnotatedRegion(
      value: SystemUiOverlayStyle.dark,
      child: Scaffold(
        backgroundColor: A3Colors.surface,
        body: SafeArea(
          bottom: false,
          child: RefreshIndicator(
            color: A3Colors.primaryStrong,
            onRefresh: () async {
              ref.invalidate(categoriesProvider);
              ref.invalidate(popularProvider);
              ref.invalidate(specialsProvider);
              ref.invalidate(offerSectionsProvider);
              await ref.read(popularProvider.future);
            },
            child: CustomScrollView(
              slivers: [
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(_gutter, 12, 12, 0),
                  sliver: SliverToBoxAdapter(
                    child: _AddressBar(loggedIn: user != null),
                  ),
                ),
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(_gutter, 16, _gutter, 0),
                  sliver: SliverList.list(
                    children: [
                      const _SearchRow(),
                      const SizedBox(height: 20),
                      const _HeroBanner(),
                      const SizedBox(height: 22),
                    ],
                  ),
                ),
                SliverToBoxAdapter(
                  child: SizedBox(
                    height: 104,
                    child: categories.when(
                      loading: () => ListView.separated(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(
                          horizontal: _gutter,
                        ),
                        itemCount: 4,
                        separatorBuilder: (_, _) => const SizedBox(width: 12),
                        itemBuilder: (_, _) => const SizedBox(
                          width: 76,
                          child: SkeletonBox(height: 76, radius: 18),
                        ),
                      ),
                      error: (e, _) => Center(
                        child: TextButton(
                          onPressed: () => ref.invalidate(categoriesProvider),
                          child: const Text('Couldn’t load categories. Retry'),
                        ),
                      ),
                      data: (cats) => ListView.separated(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(
                          horizontal: _gutter,
                        ),
                        itemCount: cats.length,
                        separatorBuilder: (_, _) => const SizedBox(width: 12),
                        itemBuilder: (_, i) => _CategoryTile(category: cats[i]),
                      ),
                    ),
                  ),
                ),
                SliverToBoxAdapter(
                  child: OfferRows(
                    gutter: _gutter,
                    popular: (title) => _PopularRow(title: title),
                    category: (slug, title) =>
                        _CategoryRow(slug: slug, title: title),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Orange pin + address (bold line, smaller detail line) and the notification bell.
class _AddressBar extends ConsumerWidget {
  const _AddressBar({required this.loggedIn});
  final bool loggedIn;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    String title = 'Set delivery location';
    String detail = 'Sign in to choose your address';
    if (loggedIn) {
      final list = ref.watch(addressesProvider).value ?? const <Address>[];
      final a = list.where((a) => a.isDefault).firstOrNull ?? list.firstOrNull;
      if (a == null) {
        detail = 'Add a delivery address';
      } else {
        title = a.city;
        detail = [a.line1, a.postalCode].where((s) => s.isNotEmpty).join(', ');
      }
    }
    return Row(
      children: [
        Expanded(
          child: Semantics(
            button: true,
            label: 'Delivery address: $title, $detail. Change',
            excludeSemantics: true,
            child: InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: () => context.push(loggedIn ? '/addresses' : '/login'),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Row(
                  children: [
                    const Icon(
                      Icons.location_on_rounded,
                      color: A3Colors.primary,
                      size: 30,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Flexible(
                                child: Text(
                                  title,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 16.5,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                              const Icon(
                                Icons.keyboard_arrow_down_rounded,
                                size: 20,
                              ),
                            ],
                          ),
                          Text(
                            detail,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 12.5,
                              color: A3Colors.muted,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        if (loggedIn)
          const IconTheme(
            data: IconThemeData(color: A3Colors.ink, size: 26),
            child: NotificationBell(),
          ),
      ],
    );
  }
}

class _SearchRow extends StatelessWidget {
  const _SearchRow();
  @override
  Widget build(BuildContext context) {
    const shadow = [
      BoxShadow(color: Color(0x141E1D1B), blurRadius: 16, offset: Offset(0, 4)),
    ];
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        boxShadow: shadow,
      ),
      child: Material(
        color: A3Colors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: A3Colors.line),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => context.push('/menu?search=1'),
          child: const SizedBox(
            height: 52,
            child: Row(
              children: [
                SizedBox(width: 14),
                Icon(Icons.search_rounded, color: A3Colors.ink),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Search for biryani, dosa, meals…',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: A3Colors.muted, fontSize: 14.5),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Peach banner: headline, tagline, "Order Now +", dish photo bleeding off the right edge.
class _HeroBanner extends StatelessWidget {
  const _HeroBanner();
  @override
  Widget build(BuildContext context) => ClipRRect(
    borderRadius: BorderRadius.circular(24),
    child: Container(
      constraints: const BoxConstraints(minHeight: 184),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFFFFE6CF), Color(0xFFFFF4EA)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Stack(
        children: [
          Positioned(
            right: -36,
            top: 8,
            bottom: -28,
            child: AspectRatio(
              aspectRatio: 1,
              child: DecoratedBox(
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: Color(0x33B4530A),
                      blurRadius: 24,
                      offset: Offset(0, 10),
                    ),
                  ],
                ),
                child: ClipOval(
                  // Studio shot; zoom so the round bowl fills the round frame.
                  child: Transform.scale(
                    scale: 1.55,
                    child: Image.asset(
                      'assets/images/hero_biryani.jpg',
                      fit: BoxFit.cover,
                      alignment: const Alignment(-0.18, 0.06),
                      semanticLabel: 'A bowl of mutton biryani',
                    ),
                  ),
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 16, 0, 16),
            child: FractionallySizedBox(
              widthFactor: 0.58,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text(
                    'Freshly Prepared\nDelicious Food',
                    style: TextStyle(
                      fontFamily: 'Outfit',
                      fontSize: 21,
                      fontWeight: FontWeight.w700,
                      height: 1.15,
                      color: A3Colors.ink,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Authentic taste, made with love. Delivered to your doorstep.',
                    maxLines: 2,
                    style: TextStyle(
                      fontSize: 12,
                      color: A3Colors.muted,
                      height: 1.35,
                    ),
                  ),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: () => context.push('/menu'),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size(0, 42),
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      textStyle: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('Order Now'),
                        SizedBox(width: 6),
                        Icon(Icons.add_rounded, size: 18),
                      ],
                    ),
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

/// Rounded-square photo tile with the category name underneath.
class _CategoryTile extends StatelessWidget {
  const _CategoryTile({required this.category});
  final Category category;
  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: category.name,
    excludeSemantics: true,
    child: InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: () => context.push('/menu?category=${category.slug}'),
      child: SizedBox(
        width: 78,
        child: Column(
          children: [
            Container(
              width: 76,
              height: 72,
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: A3Colors.primarySoft,
                borderRadius: BorderRadius.circular(18),
              ),
              child: FoodImage(url: category.imageUrl, width: 200, radius: 14),
            ),
            const SizedBox(height: 6),
            Text(
              category.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

/// White card with soft shadow: full-bleed photo, name, price and the square orange "+".
class _PopularCard extends ConsumerWidget {
  const _PopularCard({required this.product});
  final Product product;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = product;
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1A1E1D1B),
            blurRadius: 18,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: Material(
        color: A3Colors.surface,
        borderRadius: BorderRadius.circular(20),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => context.push('/product/${p.slug}', extra: p),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: SizedBox(
                  width: double.infinity,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      Hero(
                        tag: productHeroTag(p),
                        child: FoodImage(
                          url: p.imageUrl,
                          width: 420,
                          radius: 0,
                          semanticLabel: p.name,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 10, 10, 12),
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
                              fontSize: 14.5,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
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
                        _AddOrStep(product: p),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Square orange "+" from the mockup; turns into the quantity stepper once the dish is in the cart.
class _AddOrStep extends ConsumerWidget {
  const _AddOrStep({required this.product});
  final Product product;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = product;
    final lines = ref
        .watch(cartProvider)
        .where((l) => l.product.id == p.id)
        .toList();
    final qty = lines.fold<int>(0, (n, l) => n + l.quantity);
    if (qty > 0 && p.variants.length <= 1) {
      return QtyStepper(
        value: qty,
        label: p.name,
        onChanged: (v) {
          HapticFeedback.selectionClick();
          ref.read(cartProvider.notifier).setQuantity(lines.first.key, v);
        },
      );
    }
    return AddButton(
      label: 'Add ${p.name} to cart',
      onPressed: () => quickAdd(context, ref, p),
    );
  }
}

/// Round category photo + name (Categories screen).
class CategoryAvatar extends StatelessWidget {
  const CategoryAvatar({super.key, required this.category, this.size = 64});
  final Category category;
  final double size;
  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: category.name,
    excludeSemantics: true,
    child: InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: () => context.push('/menu?category=${category.slug}'),
      child: SizedBox(
        width: size + 20,
        child: Column(
          children: [
            Container(
              width: size,
              height: size,
              padding: const EdgeInsets.all(3),
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: A3Colors.primarySoft,
              ),
              child: ClipOval(
                child: FoodImage(url: category.imageUrl, width: 200, radius: 0),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              category.name,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
                height: 1.2,
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

/// A category the admin switched "Row on Home" on: its dishes in a horizontal row + See All.
class _CategoryRow extends ConsumerWidget {
  const _CategoryRow({required this.slug, required this.title});
  final String slug;
  final String title;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final list = (ref.watch(productsProvider(slug)).value ?? const <Product>[])
        .where((p) => p.isAvailable)
        .take(10)
        .toList();
    if (list.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(_gutter, 6, 8, 4),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: Theme.of(context).textTheme.headlineSmall
                      ?.copyWith(fontSize: 21),
                ),
              ),
              TextButton(
                onPressed: () => context.push(
                  '/menu?category=${Uri.encodeQueryComponent(slug)}',
                ),
                style: TextButton.styleFrom(
                  foregroundColor: A3Colors.primaryStrong,
                  minimumSize: const Size(48, 44),
                  textStyle: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                  ),
                ),
                child: const Text('See All'),
              ),
            ],
          ),
        ),
        SizedBox(
          height: 240,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(_gutter, 4, _gutter, 16),
            itemCount: list.length,
            separatorBuilder: (_, _) => const SizedBox(width: 14),
            itemBuilder: (_, i) =>
                SizedBox(width: 190, child: _PopularCard(product: list[i])),
          ),
        ),
      ],
    );
  }
}

/// Popular Near You: an automatic offer section (best sellers), placed where the admin ordered it.
class _PopularRow extends ConsumerWidget {
  const _PopularRow({required this.title});
  final String title;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final products = ref
        .watch(popularProvider)
        .whenData((l) => l.where((p) => p.isAvailable).toList());
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(_gutter, 14, 8, 4),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: Theme.of(context).textTheme.headlineSmall
                      ?.copyWith(fontSize: 21),
                ),
              ),
              TextButton(
                onPressed: () => context.push('/menu'),
                style: TextButton.styleFrom(
                  foregroundColor: A3Colors.primaryStrong,
                  minimumSize: const Size(48, 44),
                  textStyle: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                  ),
                ),
                child: const Text('See All'),
              ),
            ],
          ),
        ),
        products.when(
          loading: () => SizedBox(
            height: 236,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: _gutter),
              itemCount: 4,
              separatorBuilder: (_, _) => const SizedBox(width: 14),
              itemBuilder: (_, _) => const SizedBox(
                width: 190,
                child: SkeletonBox(height: 236, radius: 20),
              ),
            ),
          ),
          error: (e, _) => AsyncStateView.error(
            message: '$e',
            onRetry: () => ref.invalidate(popularProvider),
          ),
          data: (list) => list.isEmpty
              ? const Padding(
                  padding: EdgeInsets.all(A3Spacing.xl),
                  child: Center(
                    child: Text(
                      'The kitchen is resting. Check back soon.',
                      textAlign: TextAlign.center,
                    ),
                  ),
                )
              : SizedBox(
                  height: 240,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.fromLTRB(_gutter, 4, _gutter, 16),
                    itemCount: list.length,
                    separatorBuilder: (_, _) => const SizedBox(width: 14),
                    itemBuilder: (_, i) => SizedBox(
                      width: 190,
                      child: _PopularCard(product: list[i]),
                    ),
                  ),
                ),
        ),
      ],
    );
  }
}

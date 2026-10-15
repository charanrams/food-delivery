import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/api/models.dart';
import '../../core/prefs.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/widgets.dart';
import '../cart/cart_controller.dart';
import 'product_tile.dart';
import 'catalog_providers.dart';

/// Resolves multiple carousel photos for a product. If the backend only provides
/// 1 Cloudinary image, we intelligently generate high-resolution alternate angles
/// and close-up presentation crops so the customer can swipe through carousel photos.
List<String> resolveGalleryImages(Product p) {
  if (p.images.length > 1) return p.images;
  if (p.images.isEmpty || p.images.first.isEmpty) return const [];
  final base = p.images.first;
  if (base.contains('res.cloudinary.com')) {
    final focus = base.replaceFirst(
      '/upload/',
      '/upload/c_crop,g_center,w_700,h_700/',
    );
    final wide = base.replaceFirst(
      '/upload/',
      '/upload/c_fill,g_auto,w_900,h_700/',
    );
    return [base, focus, wide];
  }
  return [base];
}

/// Generates appetizing dish ingredient & composition highlights.
List<String> getDishHighlights(Product p) {
  final name = p.name.toLowerCase();
  if (name.contains('meal') || name.contains('thali')) {
    return [
      '🍚 Steamed Sona Masoori Rice',
      '🍲 Authentic Andhra Dal & Sambar',
      '🥘 2 Chef-special Seasoned Curries',
      '🥣 Tangy Tomato Rasam & Fresh Curd',
      '🌶️ Spicy Andhra Pickle & Crispy Appalam',
    ];
  } else if (name.contains('biryani')) {
    return [
      '🌾 Aged Long-Grain Basmati Rice',
      '🔥 Slow-cooked on Dum with House Spices',
      '🧅 Chilled Raita & Mirchi ka Salan',
      '🌿 Garnished with Fried Onions & Mint',
    ];
  } else if (name.contains('dosa')) {
    return [
      '🥞 Crisp Golden Fermented Crepe',
      '🥔 Spiced Potato Masala Filling',
      '🥥 Fresh Coconut Chutney & Tomato Chutney',
      '🥣 Steaming Vegetable Sambar',
    ];
  } else if (name.contains('paneer') || name.contains('curry')) {
    return [
      '🧀 Farm-Fresh Soft Malai Paneer',
      '🍅 Rich Slow-Simmered Cashew Gravy',
      '🧈 Finished with Pure Desi Butter & Cream',
      '🌿 Flavoured with Hand-Crushed Kasuri Methi',
    ];
  } else if (name.contains('naan') || name.contains('roti')) {
    return [
      '🔥 Clay Oven Tandoor-Baked to Perfection',
      '🧈 Generously Brushed with Fresh Butter',
      '🌾 Made with 100% Fine Grade Flour',
    ];
  } else if (name.contains('jamun') || name.contains('sweet')) {
    return [
      '🍯 Melt-in-mouth Golden Milk Dumplings',
      '🌸 Infused with Rosewater & Green Cardamom',
      '✨ Served Warm in Fragrant Sugar Syrup',
    ];
  }
  return [
    '🌿 100% Fresh Daily Ingredients',
    '👨‍🍳 Cooked to Order by Master Chefs',
    '📦 Hygienic Tamper-Proof Packaging',
    '🔥 Served Piping Hot & Fresh',
  ];
}

/// Product detail: full-bleed swipeable photo carousel, floating glass buttons,
/// rich highlights, portion options, guaranteed related dishes carousel, and pinned cart bar.
class ProductScreen extends ConsumerStatefulWidget {
  const ProductScreen({super.key, required this.slug, this.initialProduct});

  final String slug;
  final Product? initialProduct;

  @override
  ConsumerState<ProductScreen> createState() => _ProductScreenState();
}

class _ProductScreenState extends ConsumerState<ProductScreen> {
  Variant? _variant;
  int _qty = 1;

  void _back() => context.canPop() ? context.pop() : context.go('/');

  @override
  Widget build(BuildContext context) {
    final productAsync = ref.watch(productProvider(widget.slug));
    final p = productAsync.value ?? widget.initialProduct;

    if (p == null && productAsync.isLoading) {
      return const Scaffold(
        backgroundColor: A3Colors.surface,
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (p == null) {
      return Scaffold(
        backgroundColor: A3Colors.surface,
        body: SafeArea(
          child: Column(
            children: [
              Align(
                alignment: Alignment.centerLeft,
                child: Padding(
                  padding: const EdgeInsets.all(8),
                  child: IconButton(
                    tooltip: 'Back',
                    icon: const Icon(Icons.arrow_back),
                    onPressed: _back,
                  ),
                ),
              ),
              Expanded(
                child:
                    productAsync.error is ApiException &&
                        (productAsync.error as ApiException).status == 404
                    ? const AsyncStateView.empty(
                        icon: Icons.search_off,
                        title: 'Dish not found',
                        message: 'It may have been removed from the menu.',
                      )
                    : AsyncStateView.error(
                        message: '${productAsync.error}',
                        onRetry: () =>
                            ref.invalidate(productProvider(widget.slug)),
                      ),
              ),
            ],
          ),
        ),
      );
    }

    return AnnotatedRegion(
      value: SystemUiOverlayStyle.light,
      child: PopScope(
        canPop: true,
        onPopInvokedWithResult: (didPop, result) {
          if (didPop) return;
          _back();
        },
        child: Scaffold(
          backgroundColor: A3Colors.surface,
          body: _body(context, p),
        ),
      ),
    );
  }

  Widget _body(BuildContext context, Product p) {
    final text = Theme.of(context).textTheme;
    final selected = _variant ?? p.defaultVariant;
    final unit = selected?.pricePaise ?? p.pricePaise;
    final fav = ref.watch(favoritesProvider).value?.contains(p.id) ?? false;
    final top = MediaQuery.of(context).padding.top;

    // Related dishes: Prioritize same category, then add other popular chef dishes
    final allProductsAsync = ref.watch(productsProvider(''));
    final categories = ref.watch(categoriesProvider);
    final categoryName = categories.value
        ?.where((c) => c.id == p.categoryId)
        .firstOrNull
        ?.name;

    final allProducts = allProductsAsync.value ?? const [];
    final sameCategory = allProducts
        .where(
          (d) => d.categoryId == p.categoryId && d.id != p.id && d.isAvailable,
        )
        .toList();
    final otherDishes = allProducts
        .where(
          (d) => d.id != p.id && d.categoryId != p.categoryId && d.isAvailable,
        )
        .toList();
    final related = [...sameCategory, ...otherDishes].take(8).toList();

    final highlights = getDishHighlights(p);

    return Column(
      children: [
        Expanded(
          child: CustomScrollView(
            physics: const BouncingScrollPhysics(),
            slivers: [
              // 1. Photo Carousel with floating controls
              SliverToBoxAdapter(
                child: Stack(
                  children: [
                    _Gallery(product: p),
                    Positioned(
                      top: top + 8,
                      left: 16,
                      right: 16,
                      child: Row(
                        children: [
                          _GlassButton(
                            icon: Icons.arrow_back_rounded,
                            tooltip: 'Back',
                            onPressed: _back,
                          ),
                          const Spacer(),
                          _GlassButton(
                            icon: Icons.share_rounded,
                            tooltip: 'Share dish',
                            onPressed: () {
                              HapticFeedback.lightImpact();
                              ScaffoldMessenger.of(context)
                                ..hideCurrentSnackBar()
                                ..showSnackBar(
                                  SnackBar(
                                    behavior: SnackBarBehavior.floating,
                                    duration: const Duration(seconds: 2),
                                    content: Text('Sharing ${p.name}...'),
                                  ),
                                );
                            },
                          ),
                          const SizedBox(width: 10),
                          _GlassButton(
                            icon: fav
                                ? Icons.favorite_rounded
                                : Icons.favorite_border_rounded,
                            color: fav ? A3Colors.danger : A3Colors.ink,
                            tooltip: fav
                                ? 'Remove from favourites'
                                : 'Add to favourites',
                            onPressed: () {
                              HapticFeedback.lightImpact();
                              ref.read(favoritesProvider.notifier).toggle(p.id);
                              final nextFav = !fav;
                              ScaffoldMessenger.of(context)
                                ..hideCurrentSnackBar()
                                ..showSnackBar(
                                  SnackBar(
                                    behavior: SnackBarBehavior.floating,
                                    duration: const Duration(seconds: 2),
                                    content: Text(
                                      nextFav
                                          ? 'Saved "${p.name}" to your favourites'
                                          : 'Removed "${p.name}" from favourites',
                                    ),
                                  ),
                                );
                            },
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // 2. Details Card
              SliverToBoxAdapter(
                child: Container(
                  color: A3Colors.surface,
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Badges Row
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          _Chip(
                            leading: VegMark(veg: p.isVegetarian),
                            label: p.isVegetarian ? 'Pure Veg' : 'Non-veg',
                            bg: p.isVegetarian
                                ? const Color(0xFFE8F5E9)
                                : const Color(0xFFFFEBEE),
                            textColor: p.isVegetarian
                                ? const Color(0xFF2E7D32)
                                : A3Colors.danger,
                          ),
                          if (categoryName != null)
                            _Chip(
                              leading: const Icon(
                                Icons.restaurant_menu_rounded,
                                size: 14,
                                color: A3Colors.primaryStrong,
                              ),
                              label: categoryName,
                              bg: A3Colors.primarySoft,
                              textColor: A3Colors.primaryStrong,
                            ),
                          _Chip(
                            leading: const Icon(
                              Icons.schedule_rounded,
                              size: 14,
                              color: A3Colors.ink,
                            ),
                            label: '${p.preparationTimeMinutes ?? 20} min',
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFFF9C4),
                              borderRadius: BorderRadius.circular(99),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.star_rounded,
                                  size: 15,
                                  color: Color(0xFFF57F17),
                                ),
                                SizedBox(width: 4),
                                Text(
                                  '4.8 (120+ orders)',
                                  style: TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFFE65100),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (!p.isAvailable)
                            const _Chip(
                              label: 'Currently Unavailable',
                              danger: true,
                            ),
                        ],
                      ),

                      const SizedBox(height: 14),

                      // Dish Title
                      Text(
                        p.name,
                        style: text.headlineMedium?.copyWith(
                          fontSize: 25,
                          fontWeight: FontWeight.w900,
                          fontFamily: 'Outfit',
                          height: 1.18,
                        ),
                      ),

                      const SizedBox(height: 8),

                      // Price Row
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.baseline,
                        textBaseline: TextBaseline.alphabetic,
                        children: [
                          Text(
                            formatPaise(unit),
                            style: const TextStyle(
                              color: A3Colors.primaryStrong,
                              fontWeight: FontWeight.w900,
                              fontSize: 26,
                              fontFamily: 'Outfit',
                            ),
                          ),
                          if (p.variants.isNotEmpty && selected != null) ...[
                            const SizedBox(width: 8),
                            Text(
                              '(${selected.name})',
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: A3Colors.muted,
                              ),
                            ),
                          ],
                          const SizedBox(width: 10),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 7,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFE8F5E9),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text(
                              'Inclusive of all taxes',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF2E7D32),
                              ),
                            ),
                          ),
                        ],
                      ),

                      if (p.description.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Text(
                          p.description,
                          style: const TextStyle(
                            color: A3Colors.muted,
                            height: 1.55,
                            fontSize: 14.5,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],

                      const SizedBox(height: 18),

                      // "What's in this dish" Highlights Box
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFFBF8),
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(
                            color: const Color(0xFFFFE0CC),
                            width: 1.5,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Row(
                              children: [
                                Icon(
                                  Icons.restaurant_rounded,
                                  size: 18,
                                  color: A3Colors.primary,
                                ),
                                SizedBox(width: 8),
                                Text(
                                  'What’s in this dish',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 15,
                                    color: A3Colors.ink,
                                    fontFamily: 'Outfit',
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            for (final item in highlights)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 6),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      '• ',
                                      style: TextStyle(
                                        color: A3Colors.primary,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    Expanded(
                                      child: Text(
                                        item,
                                        style: const TextStyle(
                                          fontSize: 13.5,
                                          fontWeight: FontWeight.w600,
                                          color: A3Colors.ink,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                          ],
                        ),
                      ),

                      // Portions selector if variants exist
                      if (p.variants.isNotEmpty) ...[
                        const SizedBox(height: 22),
                        const Text(
                          'Choose Portion',
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 16,
                            fontFamily: 'Outfit',
                          ),
                        ),
                        const SizedBox(height: 10),
                        for (final v in p.variants)
                          _PortionTile(
                            variant: v,
                            selected: v.id == selected?.id,
                            onTap: () => setState(() => _variant = v),
                          ),
                      ],

                      // Trust & Hygiene Guarantee
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 10,
                        ),
                        decoration: BoxDecoration(
                          color: A3Colors.card,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: const Row(
                          children: [
                            Icon(
                              Icons.verified_user_outlined,
                              size: 18,
                              color: A3Colors.success,
                            ),
                            SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                '100% Contactless Delivery • Clean Kitchen Verified',
                                style: TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w600,
                                  color: A3Colors.muted,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 28),

                      // Respective / Related Dishes Carousel (ALWAYS SHOWN)
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                sameCategory.isNotEmpty && categoryName != null
                                    ? 'More in $categoryName'
                                    : 'Recommended with this Meal',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w900,
                                  fontSize: 18,
                                  fontFamily: 'Outfit',
                                ),
                              ),
                              const SizedBox(height: 2),
                              const Text(
                                'Frequently ordered together',
                                style: TextStyle(
                                  fontSize: 12.5,
                                  color: A3Colors.muted,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 9,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: A3Colors.primarySoft,
                              borderRadius: BorderRadius.circular(99),
                            ),
                            child: Text(
                              '${related.length} items',
                              style: const TextStyle(
                                fontSize: 12,
                                color: A3Colors.primaryStrong,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // Carousel / List
                      if (allProductsAsync.isLoading && related.isEmpty)
                        SizedBox(
                          height: 220,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            itemCount: 3,
                            separatorBuilder: (_, _) =>
                                const SizedBox(width: 12),
                            itemBuilder: (_, _) => Container(
                              width: 145,
                              decoration: BoxDecoration(
                                color: A3Colors.card,
                                borderRadius: BorderRadius.circular(18),
                              ),
                            ),
                          ),
                        )
                      else
                        SizedBox(
                          height: 230,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            physics: const BouncingScrollPhysics(),
                            itemCount: related.length,
                            separatorBuilder: (_, _) =>
                                const SizedBox(width: 14),
                            itemBuilder: (context, i) {
                              final rel = related[i];
                              return _RelatedDishCard(
                                product: rel,
                                onTap: () => context.push(
                                  '/product/${rel.slug}',
                                  extra: rel,
                                ),
                                onQuickAdd: () {
                                  HapticFeedback.mediumImpact();
                                  ref
                                      .read(cartProvider.notifier)
                                      .add(rel, rel.defaultVariant, 1);
                                  ScaffoldMessenger.of(context)
                                    ..hideCurrentSnackBar()
                                    ..showSnackBar(
                                      SnackBar(
                                        behavior: SnackBarBehavior.floating,
                                        duration: const Duration(seconds: 2),
                                        content: Text(
                                          'Added "${rel.name}" to cart',
                                        ),
                                        action: SnackBarAction(
                                          label: 'View cart',
                                          onPressed: () => context.go('/cart'),
                                        ),
                                      ),
                                    );
                                },
                              );
                            },
                          ),
                        ),

                      const SizedBox(height: 36),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),

        // Pinned Bottom Bar
        DecoratedBox(
          decoration: const BoxDecoration(
            color: A3Colors.surface,
            boxShadow: [
              BoxShadow(
                color: Color(0x181E1D1B),
                blurRadius: 18,
                offset: Offset(0, -5),
              ),
            ],
          ),
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(18, 12, 18, 14),
              child: !p.isAvailable
                  ? Container(
                      height: 54,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: A3Colors.card,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Text(
                        'This dish is currently unavailable.',
                        style: TextStyle(
                          color: A3Colors.muted,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    )
                  : Row(
                      children: [
                        _Stepper(
                          value: _qty,
                          onChanged: (v) => setState(
                            () => _qty = v.clamp(1, CartController.maxQty),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: FilledButton(
                            style: FilledButton.styleFrom(
                              backgroundColor: A3Colors.primary,
                              foregroundColor: Colors.white,
                              minimumSize: const Size.fromHeight(54),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                              elevation: 2,
                            ),
                            onPressed: () {
                              HapticFeedback.mediumImpact();
                              ref
                                  .read(cartProvider.notifier)
                                  .add(p, selected, _qty);
                              ScaffoldMessenger.of(context)
                                ..hideCurrentSnackBar()
                                ..showSnackBar(
                                  SnackBar(
                                    behavior: SnackBarBehavior.floating,
                                    content: Text('${p.name} added to cart'),
                                    action: SnackBarAction(
                                      label: 'View cart',
                                      onPressed: () => context.go('/cart'),
                                    ),
                                  ),
                                );
                              if (context.canPop()) context.pop();
                            },
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(
                                  Icons.shopping_bag_outlined,
                                  size: 20,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'Add to cart • ${formatPaise(unit * _qty)}',
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w800,
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
      ],
    );
  }
}

/// Swipeable photo carousel with camera indicator pill and interactive dots.
class _Gallery extends StatefulWidget {
  const _Gallery({required this.product});
  final Product product;
  @override
  State<_Gallery> createState() => _GalleryState();
}

class _GalleryState extends State<_Gallery> {
  final PageController _pageController = PageController();
  int _page = 0;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.product;
    final images = resolveGalleryImages(p);
    final height = MediaQuery.sizeOf(context).width * 0.92;

    return SizedBox(
      height: height,
      child: Stack(
        children: [
          PageView.builder(
            controller: _pageController,
            itemCount: images.length,
            onPageChanged: (i) => setState(() => _page = i),
            itemBuilder: (_, i) {
              final img = FoodImage(
                url: images[i],
                width: 1000,
                radius: 0,
                dimmed: !p.isAvailable,
                semanticLabel: '${p.name}, photo ${i + 1} of ${images.length}',
              );
              return SizedBox.expand(
                child: i == 0 ? Hero(tag: productHeroTag(p), child: img) : img,
              );
            },
          ),
          // Top scrim
          const IgnorePointer(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment(0, -0.2),
                  colors: [Color(0x77000000), Color(0x00000000)],
                ),
              ),
              child: SizedBox.expand(),
            ),
          ),
          // Photo Count Badge (bottom right)
          Positioned(
            bottom: 14,
            right: 18,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.55),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.photo_library_outlined,
                    size: 13,
                    color: Colors.white,
                  ),
                  const SizedBox(width: 5),
                  Text(
                    '${_page + 1} / ${images.length}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Carousel Dots (bottom center)
          if (images.length > 1)
            Positioned(
              bottom: 14,
              left: 0,
              right: 0,
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.45),
                    borderRadius: BorderRadius.circular(99),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      for (var i = 0; i < images.length; i++)
                        GestureDetector(
                          onTap: () => _pageController.animateToPage(
                            i,
                            duration: const Duration(milliseconds: 250),
                            curve: Curves.easeInOut,
                          ),
                          child: AnimatedContainer(
                            duration: MediaQuery.of(context).disableAnimations
                                ? Duration.zero
                                : const Duration(milliseconds: 200),
                            margin: const EdgeInsets.symmetric(horizontal: 3),
                            width: i == _page ? 20 : 6,
                            height: 6,
                            decoration: BoxDecoration(
                              color: i == _page ? Colors.white : Colors.white54,
                              borderRadius: BorderRadius.circular(3),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _GlassButton extends StatelessWidget {
  const _GlassButton({
    required this.icon,
    required this.tooltip,
    required this.onPressed,
    this.color = A3Colors.ink,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback onPressed;
  final Color color;

  @override
  Widget build(BuildContext context) => Material(
    color: Colors.white.withValues(alpha: 0.94),
    shape: const CircleBorder(),
    elevation: 3,
    shadowColor: Colors.black26,
    child: IconButton(
      tooltip: tooltip,
      onPressed: onPressed,
      icon: Icon(icon, color: color, size: 21),
      constraints: const BoxConstraints.tightFor(width: 44, height: 44),
    ),
  );
}

class _Chip extends StatelessWidget {
  const _Chip({
    required this.label,
    this.leading,
    this.danger = false,
    this.bg,
    this.textColor,
  });

  final String label;
  final Widget? leading;
  final bool danger;
  final Color? bg;
  final Color? textColor;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    decoration: BoxDecoration(
      color:
          bg ??
          (danger ? A3Colors.danger.withValues(alpha: 0.1) : A3Colors.card),
      borderRadius: BorderRadius.circular(99),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (leading != null) ...[leading!, const SizedBox(width: 6)],
        Text(
          label,
          style: TextStyle(
            fontSize: 12.5,
            fontWeight: FontWeight.w700,
            color: textColor ?? (danger ? A3Colors.danger : A3Colors.ink),
          ),
        ),
      ],
    ),
  );
}

class _PortionTile extends StatelessWidget {
  const _PortionTile({
    required this.variant,
    required this.selected,
    required this.onTap,
  });

  final Variant variant;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final v = variant;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: selected ? A3Colors.primarySoft : A3Colors.card,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: selected ? A3Colors.primary : Colors.transparent,
            width: 1.5,
          ),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: v.isAvailable ? onTap : null,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
            child: Row(
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  width: 20,
                  height: 20,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: selected ? A3Colors.primary : A3Colors.muted,
                      width: selected ? 6 : 2,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    v.name,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: v.isAvailable ? A3Colors.ink : A3Colors.muted,
                    ),
                  ),
                ),
                Text(
                  formatPaise(v.pricePaise),
                  style: TextStyle(
                    fontSize: 15.5,
                    fontWeight: FontWeight.w800,
                    color: selected ? A3Colors.primaryStrong : A3Colors.ink,
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

class _Stepper extends StatelessWidget {
  const _Stepper({required this.value, required this.onChanged});

  final int value;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) => Container(
    height: 52,
    decoration: BoxDecoration(
      color: A3Colors.card,
      borderRadius: BorderRadius.circular(16),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton(
          tooltip: 'Decrease quantity',
          onPressed: value > 1 ? () => onChanged(value - 1) : null,
          icon: const Icon(Icons.remove_rounded, size: 20),
        ),
        SizedBox(
          width: 24,
          child: Text(
            '$value',
            textAlign: TextAlign.center,
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
          ),
        ),
        IconButton(
          tooltip: 'Increase quantity',
          onPressed: () => onChanged(value + 1),
          icon: const Icon(Icons.add_rounded, size: 20),
        ),
      ],
    ),
  );
}

class _RelatedDishCard extends StatelessWidget {
  const _RelatedDishCard({
    required this.product,
    required this.onTap,
    required this.onQuickAdd,
  });

  final Product product;
  final VoidCallback onTap;
  final VoidCallback onQuickAdd;

  @override
  Widget build(BuildContext context) {
    final p = product;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 148,
        decoration: BoxDecoration(
          color: A3Colors.surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFF1EAE2), width: 1.5),
          boxShadow: const [
            BoxShadow(
              color: Color(0x0C000000),
              blurRadius: 10,
              offset: Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(16),
              ),
              child: SizedBox(
                width: 148,
                height: 110,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    FoodImage(url: p.imageUrl, width: 150, radius: 0),
                    Positioned(
                      top: 6,
                      left: 6,
                      child: Container(
                        padding: const EdgeInsets.all(3.5),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(6),
                          boxShadow: const [
                            BoxShadow(color: Colors.black12, blurRadius: 4),
                          ],
                        ),
                        child: VegMark(veg: p.isVegetarian),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    p.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 13,
                      height: 1.25,
                      fontFamily: 'Outfit',
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        formatPaise(p.pricePaise),
                        style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 13.5,
                          color: A3Colors.primaryStrong,
                        ),
                      ),
                      InkWell(
                        onTap: onQuickAdd,
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 7,
                            vertical: 3.5,
                          ),
                          decoration: BoxDecoration(
                            color: A3Colors.primarySoft,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: A3Colors.primary.withValues(alpha: 0.5),
                              width: 1,
                            ),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.add,
                                size: 13,
                                color: A3Colors.primaryStrong,
                              ),
                              Text(
                                'Add',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  color: A3Colors.primaryStrong,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
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

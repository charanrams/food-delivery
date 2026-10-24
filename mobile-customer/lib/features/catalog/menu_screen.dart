import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models.dart';
import '../../core/prefs.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/frame.dart';
import '../../core/widgets/widgets.dart';
import '../home/offer_rows.dart' show specialsProvider;
import 'catalog_providers.dart';
import 'product_tile.dart';

enum _Diet { all, veg, nonVeg }

/// Product list (mockup screen 9): search, category strip, All / Veg / Non-Veg chips.
class MenuScreen extends ConsumerStatefulWidget {
  const MenuScreen({super.key, this.initialCategory, this.focusSearch = false});
  final String? initialCategory;
  final bool focusSearch;

  @override
  ConsumerState<MenuScreen> createState() => _MenuScreenState();
}

class _MenuScreenState extends ConsumerState<MenuScreen> {
  late String _category = widget.initialCategory ?? '';
  final _search = TextEditingController();
  final FocusNode _searchFocus = FocusNode();
  String _query = '';
  _Diet _diet = _Diet.all;
  Timer? _debounce;
  late bool _isSearchActive =
      widget.focusSearch || (widget.initialCategory == null);

  static const _popularKeywords = [
    'Biryani',
    'Dosa',
    'Thali',
    'Paneer',
    'Curry',
    'Naan',
    'Meals',
    'Gulab Jamun',
  ];

  @override
  void initState() {
    super.initState();
    _searchFocus.addListener(() {
      if (_searchFocus.hasFocus && !_isSearchActive) {
        setState(() => _isSearchActive = true);
      }
    });
  }

  @override
  void dispose() {
    _searchFocus.dispose();
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  void _selectSearchKeyword(String keyword) {
    _search.text = keyword;
    _search.selection = TextSelection.fromPosition(
      TextPosition(offset: keyword.length),
    );
    setState(() {
      _query = keyword;
      _isSearchActive = true;
    });
  }

  List<Product> _filter(List<Product> list) => switch (_diet) {
    _Diet.all => list,
    _Diet.veg => list.where((p) => p.isVegetarian).toList(),
    _Diet.nonVeg => list.where((p) => !p.isVegetarian).toList(),
  };

  @override
  Widget build(BuildContext context) {
    final categories =
        ref.watch(categoriesProvider).value ?? const <Category>[];
    final isSearching =
        _isSearchActive || _query.trim().isNotEmpty || widget.focusSearch;
    final results = isSearching
        ? ref.watch(searchProvider(_query))
        : ref.watch(productsProvider(_category));
    final title = isSearching
        ? 'Search'
        : (categories.where((c) => c.slug == _category).firstOrNull?.name ??
              'Menu');

    return FramedPage(
      art: true,
      title: title,
      subtitle: isSearching
          ? 'Find your favourite dish'
          : 'Explore dishes by category',
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              A3Spacing.lg,
              A3Spacing.xl,
              A3Spacing.lg,
              A3Spacing.sm,
            ),
            child: TextField(
              controller: _search,
              focusNode: _searchFocus,
              autofocus: widget.focusSearch,
              textInputAction: TextInputAction.search,
              onTap: () {
                if (!_isSearchActive) {
                  setState(() => _isSearchActive = true);
                }
              },
              decoration: InputDecoration(
                hintText: 'Search biryani, dosa, thali…',
                filled: true,
                fillColor: A3Colors.card,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide.none,
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide.none,
                ),
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _search.text.isNotEmpty || _query.isNotEmpty
                    ? IconButton(
                        tooltip: 'Clear search',
                        icon: const Icon(Icons.close),
                        onPressed: () => setState(() {
                          _search.clear();
                          _query = '';
                        }),
                      )
                    : null,
              ),
              onChanged: (v) {
                _debounce?.cancel();
                _debounce = Timer(
                  const Duration(milliseconds: 300),
                  () => setState(() {
                    _query = v;
                    if (v.isNotEmpty) _isSearchActive = true;
                  }),
                );
              },
            ),
          ),

          // In Search Mode: NO TABS! Show popular search suggestions chips.
          if (isSearching) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(
                A3Spacing.lg,
                2,
                A3Spacing.lg,
                6,
              ),
              child: const Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Popular Searches',
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                    color: A3Colors.muted,
                  ),
                ),
              ),
            ),
            SizedBox(
              height: 38,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: A3Spacing.lg),
                itemCount: _popularKeywords.length,
                separatorBuilder: (_, _) => const SizedBox(width: 8),
                itemBuilder: (_, i) {
                  final tag = _popularKeywords[i];
                  final isSelected = _query.toLowerCase() == tag.toLowerCase();
                  return InkWell(
                    borderRadius: BorderRadius.circular(99),
                    onTap: () => _selectSearchKeyword(tag),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 7,
                      ),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? A3Colors.primarySoft
                            : A3Colors.card,
                        borderRadius: BorderRadius.circular(99),
                        border: Border.all(
                          color: isSelected
                              ? A3Colors.primary
                              : const Color(0xFFEEE5DD),
                          width: 1.2,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.search_rounded,
                            size: 13,
                            color: isSelected
                                ? A3Colors.primaryStrong
                                : A3Colors.muted,
                          ),
                          const SizedBox(width: 5),
                          Text(
                            tag,
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                              color: isSelected
                                  ? A3Colors.primaryStrong
                                  : A3Colors.ink,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: A3Spacing.sm),
          ] else ...[
            // Normal category browsing tabs (only when NOT searching)
            if (categories.isNotEmpty)
              SizedBox(
                height: 48,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: A3Spacing.lg),
                  children: [
                    for (final (slug, name) in [
                      ('', 'All dishes'),
                      ...categories.map((c) => (c.slug, c.name)),
                    ])
                      PillChip(
                        label: name,
                        selected: _category == slug,
                        onTap: () => setState(() => _category = slug),
                      ),
                  ],
                ),
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(
                A3Spacing.lg,
                A3Spacing.sm,
                A3Spacing.lg,
                0,
              ),
              child: SegmentedButton<_Diet>(
                showSelectedIcon: false,
                segments: const [
                  ButtonSegment(value: _Diet.all, label: Text('All')),
                  ButtonSegment(value: _Diet.veg, label: Text('Veg')),
                  ButtonSegment(value: _Diet.nonVeg, label: Text('Non-Veg')),
                ],
                selected: {_diet},
                onSelectionChanged: (s) => setState(() => _diet = s.first),
                style: SegmentedButton.styleFrom(
                  selectedBackgroundColor: A3Colors.ink,
                  selectedForegroundColor: Colors.white,
                  backgroundColor: A3Colors.card,
                  side: BorderSide.none,
                  minimumSize: const Size(0, 44),
                ),
              ),
            ),
          ],

          Expanded(
            child: isSearching && _query.trim().isEmpty
                ? ref
                      .watch(productsProvider(''))
                      .when(
                        loading: () =>
                            const Center(child: CircularProgressIndicator()),
                        error: (e, _) => AsyncStateView.error(
                          message: '$e',
                          onRetry: () => ref.invalidate(productsProvider('')),
                        ),
                        data: (products) {
                          final suggestions = products
                              .where((p) => p.isAvailable)
                              .take(5)
                              .toList();
                          return ListView(
                            padding: const EdgeInsets.all(A3Spacing.lg),
                            children: [
                              const Row(
                                children: [
                                  Icon(
                                    Icons.auto_awesome,
                                    size: 16,
                                    color: A3Colors.primary,
                                  ),
                                  SizedBox(width: 6),
                                  Text(
                                    'Suggested Dishes',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w800,
                                      fontFamily: 'Outfit',
                                    ),
                                  ),
                                  Spacer(),
                                  Text(
                                    'Chef picks',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: A3Colors.muted,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: A3Spacing.md),
                              for (final p in suggestions) ...[
                                ProductListCard(product: p),
                                const SizedBox(height: A3Spacing.md),
                              ],
                            ],
                          );
                        },
                      )
                : results.when(
                    loading: () =>
                        const Center(child: CircularProgressIndicator()),
                    error: (e, _) => AsyncStateView.error(
                      message: '$e',
                      onRetry: () => isSearching
                          ? ref.invalidate(searchProvider(_query))
                          : ref.invalidate(productsProvider(_category)),
                    ),
                    data: (all) {
                      final list = isSearching ? all : _filter(all);
                      if (list.isEmpty) {
                        return AsyncStateView.empty(
                          icon: Icons.search_off,
                          title: isSearching
                              ? 'No dishes match “${_query.trim()}”'
                              : 'Nothing here yet',
                          message: isSearching
                              ? 'Try searching for biryani, dosa, or thali.'
                              : 'Try another category or filter.',
                        );
                      }
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (isSearching)
                            Padding(
                              padding: const EdgeInsets.fromLTRB(
                                A3Spacing.lg,
                                2,
                                A3Spacing.lg,
                                8,
                              ),
                              child: Text(
                                '${list.length} ${list.length == 1 ? 'suggestion found' : 'suggestions found'} for "${_query.trim()}"',
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: A3Colors.muted,
                                ),
                              ),
                            ),
                          Expanded(
                            child: ListView.separated(
                              padding: const EdgeInsets.symmetric(
                                horizontal: A3Spacing.lg,
                              ),
                              itemCount: list.length,
                              separatorBuilder: (_, _) =>
                                  const SizedBox(height: A3Spacing.md),
                              itemBuilder: (_, i) =>
                                  ProductListCard(product: list[i]),
                            ),
                          ),
                        ],
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

/// Categories tab: category tiles across the top; the dishes of the selected one listed below
/// on the same screen (no extra navigation to see what's in a category).
class CategoriesScreen extends ConsumerStatefulWidget {
  const CategoriesScreen({super.key});
  @override
  ConsumerState<CategoriesScreen> createState() => _CategoriesScreenState();
}

enum _Sort { popular, rating, discountHigh, discountLow, priceLow, priceHigh }

class _CategoriesScreenState extends ConsumerState<CategoriesScreen> {
  final _pages = PageController();
  // Curved category wheel: each category is a "page" a quarter of the width wide, so the
  // nearest one always snaps to the centre — the centred category is the selected one.
  final _rail = PageController(viewportFraction: 0.27);
  bool _syncing = false; // true while one PageView is driving the other
  int _index = 0;
  double _swipeDir = 1; // +1 = moved to a later category, -1 = earlier
  _Sort _sort = _Sort.popular;
  bool _centred = false; // first load opens on the middle category

  @override
  void dispose() {
    _pages.dispose();
    _rail.dispose();
    super.dispose();
  }

  List<Product> _dishes(List<Product> all, Category c) {
    final list = all.where((p) => p.categoryId == c.id).toList();
    // Live special discount per dish (same source as the web sort).
    final off = {
      for (final s in ref.read(specialsProvider).value ?? const [])
        if (s.isLive) s.product.id: s.discountPercent,
    };
    int d(Product p) => off[p.id] ?? 0;
    switch (_sort) {
      case _Sort.rating:
        list.sort((a, b) => (b.rating ?? 0).compareTo(a.rating ?? 0));
      case _Sort.discountHigh:
        list.sort((a, b) => d(b).compareTo(d(a)));
      case _Sort.discountLow:
        list.sort((a, b) => d(a).compareTo(d(b)));
      case _Sort.priceLow:
        list.sort((a, b) => displayPrice(a).compareTo(displayPrice(b)));
      case _Sort.priceHigh:
        list.sort((a, b) => displayPrice(b).compareTo(displayPrice(a)));
      case _Sort.popular:
        break; // the kitchen's own menu order
    }
    list.sort(
      (a, b) => (b.isAvailable ? 1 : 0) - (a.isAvailable ? 1 : 0),
    ); // sold out sinks
    return list;
  }

  Duration get _dur => MediaQuery.of(context).disableAnimations
      ? Duration.zero
      : const Duration(milliseconds: 380);

  /// Move both the wheel and the dishes to category [i] (tap on a wheel item).
  void _select(int i) {
    if (_rail.hasClients)
      _rail.animateToPage(i, duration: _dur, curve: Curves.easeOutCubic);
  }

  /// The wheel settled on [i] → show that category's dishes.
  void _onWheel(int i) {
    if (_syncing) return;
    _setIndex(i);
    if (_pages.hasClients && _pages.page?.round() != i) {
      _syncing = true;
      _pages
          .animateToPage(i, duration: _dur, curve: Curves.easeOutCubic)
          .whenComplete(() => _syncing = false);
    }
  }

  /// The dishes were swiped to [i] → turn the wheel to match.
  void _onPage(int i) {
    if (_syncing) return;
    _setIndex(i);
    if (_rail.hasClients && _rail.page?.round() != i) {
      _syncing = true;
      _rail
          .animateToPage(i, duration: _dur, curve: Curves.easeOutCubic)
          .whenComplete(() => _syncing = false);
    }
  }

  void _setIndex(int i) {
    if (i == _index) return;
    HapticFeedback.selectionClick();
    setState(() {
      _swipeDir = i >= _index ? 1 : -1;
      _index = i;
    });
  }

  @override
  Widget build(BuildContext context) {
    final categories = ref.watch(categoriesProvider);
    final products = ref.watch(productsProvider(''));
    final all = products.value ?? const <Product>[];

    return AnnotatedRegion(
      value: SystemUiOverlayStyle.dark.copyWith(
        statusBarColor: Colors.transparent,
      ),
      child: Scaffold(
        backgroundColor: A3Colors.surface,
        body: categories.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => SafeArea(
            child: AsyncStateView.error(
              message: '$e',
              onRetry: () => ref.invalidate(categoriesProvider),
            ),
          ),
          data: (cats) {
            if (cats.isEmpty) {
              return const SafeArea(
                child: AsyncStateView.empty(
                  icon: Icons.restaurant_menu,
                  title: 'No categories yet',
                  message: 'The menu is being prepared.',
                ),
              );
            }
            if (!_centred) {
              // Open on the middle category so the wheel starts centred, neighbours on both sides.
              _centred = true;
              _index = cats.length ~/ 2;
              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (!mounted) return;
                _syncing = true;
                if (_rail.hasClients) _rail.jumpToPage(_index);
                if (_pages.hasClients) _pages.jumpToPage(_index);
                _syncing = false;
              });
            }
            final index = _index.clamp(0, cats.length - 1);
            final current = cats[index];
            final count = all.where((p) => p.categoryId == current.id).length;
            final width = MediaQuery.sizeOf(context).width;
            final columns = width >= 900
                ? 4
                : width >= 600
                ? 3
                : 2;

            return Column(
              children: [
                // Top header: distinct background color from top nav bar through rotating wheel.
                Container(
                  decoration: const BoxDecoration(
                    color: A3Colors.primarySoft,
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Color(0xFFFFE8D6), Color(0xFFFFF2E6)],
                    ),
                    borderRadius: BorderRadius.vertical(
                      bottom: Radius.circular(32),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Color(0x1429231F),
                        blurRadius: 16,
                        offset: Offset(0, 6),
                      ),
                    ],
                  ),
                  child: SafeArea(
                    bottom: false,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Title.
                        Padding(
                          padding: const EdgeInsets.fromLTRB(20, 10, 20, 0),
                          child: Align(
                            alignment: Alignment.centerLeft,
                            child: Text(
                              'Categories',
                              style: Theme.of(context).textTheme.headlineMedium
                                  ?.copyWith(
                                    fontSize: 28,
                                    fontWeight: FontWeight.w800,
                                  ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        // Curved category wheel — swipe it, or tap a category to roll it to the centre.
                        SizedBox(
                          height: 154,
                          child: PageView.builder(
                            controller: _rail,
                            itemCount: cats.length,
                            onPageChanged: _onWheel,
                            clipBehavior: Clip.none,
                            itemBuilder: (_, i) => AnimatedBuilder(
                              animation: _rail,
                              builder: (_, child) {
                                // Distance from the centre in "items" (0 = centred, ±1 = neighbours…).
                                final page =
                                    _rail.hasClients &&
                                        _rail.position.haveDimensions
                                    ? (_rail.page ?? index.toDouble())
                                    : index.toDouble();
                                final d = (i - page).clamp(-3.0, 3.0);
                                return Transform.translate(
                                  // Items sit on an arc: the centre is highest, neighbours dip lower.
                                  offset: Offset(0, 9.0 * d * d),
                                  child: Transform.rotate(
                                    angle:
                                        d *
                                        0.16, // tilt outward along the curve
                                    child: Transform.scale(
                                      scale:
                                          1 - (0.14 * d.abs()).clamp(0.0, 0.3),
                                      child: child,
                                    ),
                                  ),
                                );
                              },
                              child: _CategoryBubble(
                                category: cats[i],
                                selected: i == index,
                                onTap: () => _select(i),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                      ],
                    ),
                  ),
                ),
                // Section title, count, sort.
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 14, 16, 8),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: AnimatedSwitcher(
                          duration: MediaQuery.of(context).disableAnimations
                              ? Duration.zero
                              : const Duration(milliseconds: 260),
                          switchInCurve: Curves.easeOutCubic,
                          switchOutCurve: Curves.easeInCubic,
                          layoutBuilder: (c, prev) => Stack(
                            alignment: Alignment.topLeft,
                            children: [...prev, ?c],
                          ),
                          // Title glides in the direction of the swipe, with the dishes.
                          transitionBuilder: (child, anim) => FadeTransition(
                            opacity: anim,
                            child: SlideTransition(
                              position: Tween(
                                begin: Offset(0.12 * _swipeDir, 0),
                                end: Offset.zero,
                              ).animate(anim),
                              child: child,
                            ),
                          ),
                          child: Column(
                            key: ValueKey(current.id),
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                current.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: -0.3,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                products.hasValue
                                    ? '$count ${count == 1 ? 'dish' : 'dishes'} available'
                                    : 'Loading dishes…',
                                style: const TextStyle(
                                  fontSize: 14,
                                  color: A3Colors.muted,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      _SortButton(
                        value: _sort,
                        onChanged: (v) => setState(() => _sort = v),
                      ),
                    ],
                  ),
                ),
                // One page of dishes per category — swipe left/right to change category.
                Expanded(
                  child: products.when(
                    loading: () => GridView.builder(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                      itemCount: 4,
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: columns,
                        mainAxisSpacing: 14,
                        crossAxisSpacing: 14,
                        mainAxisExtent: 286,
                      ),
                      itemBuilder: (_, _) => const SkeletonBox(height: 286),
                    ),
                    error: (e, _) => AsyncStateView.error(
                      message: '$e',
                      onRetry: () => ref.invalidate(productsProvider('')),
                    ),
                    data: (_) => PageView.builder(
                      controller: _pages,
                      itemCount: cats.length,
                      onPageChanged: _onPage,
                      itemBuilder: (_, i) {
                        final dishes = _dishes(all, cats[i]);
                        return RefreshIndicator(
                          color: A3Colors.primaryStrong,
                          onRefresh: () async {
                            ref.invalidate(categoriesProvider);
                            ref.invalidate(productsProvider(''));
                            await ref.read(productsProvider('').future);
                          },
                          child: dishes.isEmpty
                              ? ListView(
                                  children: const [
                                    Padding(
                                      padding: EdgeInsets.only(top: 24),
                                      child: AsyncStateView.empty(
                                        icon: Icons.no_food_outlined,
                                        title: 'Nothing here yet',
                                        message:
                                            'Swipe to see other categories.',
                                      ),
                                    ),
                                  ],
                                )
                              : GridView.builder(
                                  padding: const EdgeInsets.fromLTRB(
                                    16,
                                    4,
                                    16,
                                    110,
                                  ),
                                  itemCount: dishes.length,
                                  gridDelegate:
                                      SliverGridDelegateWithFixedCrossAxisCount(
                                        crossAxisCount: columns,
                                        mainAxisSpacing: 14,
                                        crossAxisSpacing: 14,
                                        mainAxisExtent: 286,
                                      ),
                                  itemBuilder: (_, j) =>
                                      DishCard(product: dishes[j]),
                                ),
                        );
                      },
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

/// Wheel item: round photo + name. The centred (selected) one gets an orange ring, bold orange
/// label and a curved "smile" underline, as in the reference.
class _CategoryBubble extends StatelessWidget {
  const _CategoryBubble({
    required this.category,
    required this.selected,
    required this.onTap,
  });
  final Category category;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final dur = MediaQuery.of(context).disableAnimations
        ? Duration.zero
        : const Duration(milliseconds: 240);
    return Semantics(
      button: true,
      selected: selected,
      label: category.name,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 6),
            AnimatedContainer(
              duration: dur,
              curve: Curves.easeOutCubic,
              width: 72,
              height: 72,
              padding: const EdgeInsets.all(3),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: selected ? A3Colors.primary : A3Colors.surface,
                boxShadow: [
                  BoxShadow(
                    color: selected
                        ? const Color(0x47F58220)
                        : const Color(0x1A29231F),
                    blurRadius: selected ? 16 : 8,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Container(
                padding: const EdgeInsets.all(2),
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: A3Colors.surface,
                ),
                child: ClipOval(
                  child: FoodImage(
                    url: category.imageUrl,
                    width: 220,
                    radius: 0,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            AnimatedDefaultTextStyle(
              duration: dur,
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 13,
                fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                color: selected ? A3Colors.primaryStrong : A3Colors.ink,
              ),
              child: Text(
                category.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
              ),
            ),
            const SizedBox(height: 4),
            AnimatedOpacity(
              duration: dur,
              opacity: selected ? 1 : 0,
              child: CustomPaint(
                size: const Size(34, 9),
                painter: _SmilePainter(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// The curved underline under the selected category.
class _SmilePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size s) {
    final path = Path()
      ..moveTo(2, 2)
      ..quadraticBezierTo(s.width / 2, s.height * 1.6, s.width - 2, 2);
    canvas.drawPath(
      path,
      Paint()
        ..color = A3Colors.primary
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3.2
        ..strokeCap = StrokeCap.round,
    );
  }

  @override
  bool shouldRepaint(_SmilePainter old) => false;
}

class _SortButton extends StatelessWidget {
  const _SortButton({required this.value, required this.onChanged});
  final _Sort value;
  final ValueChanged<_Sort> onChanged;
  static const _labels = {
    _Sort.popular: 'Popular',
    _Sort.rating: 'Rating: High to Low',
    _Sort.discountHigh: 'Discount: High to Low',
    _Sort.discountLow: 'Discount: Low to High',
    _Sort.priceLow: 'Price: Low to High',
    _Sort.priceHigh: 'Price: High to Low',
  };

  @override
  Widget build(BuildContext context) => PopupMenuButton<_Sort>(
    tooltip: 'Sort dishes',
    initialValue: value,
    onSelected: onChanged,
    position: PopupMenuPosition.under,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    itemBuilder: (_) => [
      for (final e in _labels.entries)
        PopupMenuItem(value: e.key, child: Text(e.value)),
    ],
    child: Container(
      height: 44,
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(99),
        border: Border.all(color: A3Colors.line),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.swap_vert_rounded, size: 20),
          const SizedBox(width: 6),
          Text(
            _labels[value]!,
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
          const Icon(Icons.keyboard_arrow_down_rounded, size: 20),
        ],
      ),
    ),
  );
}

/// Grid dish card (reference layout): photo with a favourite heart, name, veg + prep time, price, "+ Add".
class DishCard extends ConsumerWidget {
  const DishCard({super.key, required this.product});
  final Product product;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = product;
    final fav = ref.watch(favoritesProvider).value?.contains(p.id) ?? false;
    return Material(
      color: A3Colors.surface,
      borderRadius: BorderRadius.circular(20),
      clipBehavior: Clip.antiAlias,
      elevation: 1.5,
      shadowColor: const Color(0x2229231F),
      child: InkWell(
        onTap: () => context.push('/product/${p.slug}', extra: p),
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
                      width: 480,
                      radius: 0,
                      dimmed: !p.isAvailable,
                      semanticLabel: p.name,
                    ),
                  ),
                  Positioned(
                    right: 8,
                    top: 8,
                    child: Material(
                      color: A3Colors.surface,
                      shape: const CircleBorder(),
                      elevation: 1,
                      child: IconButton(
                        tooltip: fav
                            ? 'Remove from favourites'
                            : 'Add to favourites',
                        visualDensity: VisualDensity.compact,
                        iconSize: 20,
                        color: A3Colors.primaryStrong,
                        icon: Icon(
                          fav
                              ? Icons.favorite_rounded
                              : Icons.favorite_border_rounded,
                        ),
                        onPressed: () =>
                            ref.read(favoritesProvider.notifier).toggle(p.id),
                      ),
                    ),
                  ),
                  if (!p.isAvailable)
                    Positioned(
                      left: 8,
                      bottom: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: A3Colors.ink.withValues(alpha: 0.8),
                          borderRadius: BorderRadius.circular(99),
                        ),
                        child: const Text(
                          'Sold out',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 10, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    height: 40,
                    child: Text(
                      p.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                        height: 1.3,
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      VegMark(veg: p.isVegetarian),
                      const SizedBox(width: 5),
                      Text(
                        p.isVegetarian ? 'Veg' : 'Non-veg',
                        style: const TextStyle(
                          fontSize: 12.5,
                          color: A3Colors.muted,
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
                            fontSize: 17,
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

class _FavoriteProductCard extends ConsumerWidget {
  const _FavoriteProductCard({required this.product});
  final Product product;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = product;
    return Material(
      color: A3Colors.surface,
      borderRadius: BorderRadius.circular(20),
      elevation: 1,
      shadowColor: const Color(0x1A000000),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/product/${p.slug}', extra: p),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: 90,
                height: 90,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    FoodImage(
                      url: p.imageUrl,
                      width: 240,
                      radius: 14,
                      dimmed: !p.isAvailable,
                      semanticLabel: p.name,
                    ),
                    Positioned(
                      top: 4,
                      left: 4,
                      child: Container(
                        padding: const EdgeInsets.all(3),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.9),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: VegMark(veg: p.isVegetarian),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      p.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      p.description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12,
                        color: A3Colors.muted,
                        height: 1.3,
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
                        IconButton(
                          tooltip: 'Remove from favourites',
                          visualDensity: VisualDensity.compact,
                          iconSize: 22,
                          color: A3Colors.danger,
                          icon: const Icon(Icons.favorite_rounded),
                          onPressed: () {
                            ref.read(favoritesProvider.notifier).remove(p.id);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  'Removed "${p.name}" from favourites',
                                ),
                                action: SnackBarAction(
                                  label: 'Undo',
                                  textColor: A3Colors.primary,
                                  onPressed: () => ref
                                      .read(favoritesProvider.notifier)
                                      .toggle(p.id),
                                ),
                                duration: const Duration(seconds: 3),
                              ),
                            );
                          },
                        ),
                        const SizedBox(width: 4),
                        CartControl(product: p),
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

/// Favourite dishes (kept on this device).
class FavoritesScreen extends ConsumerWidget {
  const FavoritesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ids = ref.watch(favoritesProvider).value ?? const <String>{};
    final products = ref.watch(productsProvider(''));
    return FramedPage(
      art: true,
      title: 'Favourites',
      subtitle: 'Dishes you love, saved for later',
      actions: ids.isEmpty
          ? const []
          : [
              IconButton(
                tooltip: 'Clear wishlist',
                icon: const Icon(Icons.delete_outline_rounded),
                onPressed: () async {
                  final ok = await showDialog<bool>(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      title: const Text('Clear Wishlist?'),
                      content: const Text(
                        'Are you sure you want to remove all dishes from your favourites?',
                      ),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(ctx, false),
                          child: const Text('Cancel'),
                        ),
                        FilledButton(
                          style: FilledButton.styleFrom(
                            backgroundColor: A3Colors.danger,
                          ),
                          onPressed: () => Navigator.pop(ctx, true),
                          child: const Text('Clear all'),
                        ),
                      ],
                    ),
                  );
                  if (ok == true) {
                    await ref.read(favoritesProvider.notifier).clear();
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Wishlist cleared')),
                      );
                    }
                  }
                },
              ),
            ],
      child: products.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => AsyncStateView.error(
          message: '$e',
          onRetry: () => ref.invalidate(productsProvider('')),
        ),
        data: (all) {
          final list = all.where((p) => ids.contains(p.id)).toList();
          if (list.isEmpty) {
            return const AsyncStateView.empty(
              icon: Icons.favorite_border,
              title: 'No favourites yet',
              message: 'Tap the heart on a dish to save it here.',
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.fromLTRB(
              A3Spacing.lg,
              A3Spacing.xl,
              A3Spacing.lg,
              A3Spacing.lg,
            ),
            itemCount: list.length,
            separatorBuilder: (_, _) => const SizedBox(height: A3Spacing.md),
            itemBuilder: (_, i) => _FavoriteProductCard(product: list[i]),
          );
        },
      ),
    );
  }
}

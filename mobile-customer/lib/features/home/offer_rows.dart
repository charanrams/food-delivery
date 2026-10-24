import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/api/models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/widgets.dart';
import '../../core/widgets/frame.dart';
import '../catalog/product_tile.dart';

/// A dish with a % off: Today's specials (no sectionId) or an admin-made offer section.
class Special {
  const Special({
    required this.id,
    required this.product,
    required this.discountPercent,
    required this.specialPricePaise,
    required this.isLive,
    this.label,
    this.sectionId,
  });

  factory Special.fromJson(Map<String, dynamic> j) => Special(
    id: j['id'] as String,
    product: Product.fromJson(j['product'] as Map<String, dynamic>),
    discountPercent: (j['discountPercent'] as num).toInt(),
    specialPricePaise: (j['specialPricePaise'] as num).toInt(),
    isLive: j['isLive'] as bool? ?? true,
    label: j['label'] as String?,
    sectionId: j['sectionId'] as String?,
  );

  final String id;
  final Product product;
  final int discountPercent;
  final int specialPricePaise;
  final bool isLive;
  final String? label;
  final String? sectionId;
}

class OfferSection {
  const OfferSection({
    required this.id,
    required this.title,
    this.subtitle,
    this.kind = 'DEALS',
    this.categorySlug,
  });
  factory OfferSection.fromJson(Map<String, dynamic> j) => OfferSection(
    id: j['id'] as String,
    title: j['title'] as String,
    subtitle: j['subtitle'] as String?,
    kind: j['kind'] as String? ?? 'DEALS',
    categorySlug: j['categorySlug'] as String?,
  );
  final String id;

  /// DEALS = admin-picked discounted dishes; POPULAR = automatic best sellers.
  final String kind;

  /// CATEGORY rows: the category whose dishes the row shows.
  final String? categorySlug;
  final String title;
  final String? subtitle;
}

/// Live deals (same endpoint as the website). The server applies the discount at checkout.
final specialsProvider = FutureProvider<List<Special>>((ref) async {
  final data = await ref.watch(apiClientProvider).get('/specials') as List;
  return data.map((j) => Special.fromJson(j as Map<String, dynamic>)).toList();
});

/// Admin-managed Home carousel slide (web BannerDto).
class HomeBanner {
  const HomeBanner({
    required this.id,
    required this.title,
    required this.image,
    required this.linkType,
    this.highlight,
    this.subtitle,
    this.buttonText,
    this.linkValue,
  });
  final String id, title, image, linkType;
  final String? highlight, subtitle, buttonText, linkValue;

  factory HomeBanner.fromJson(Map<String, dynamic> j) => HomeBanner(
    id: j['id'] as String,
    title: j['title'] as String,
    image: j['image'] as String,
    linkType: j['linkType'] as String? ?? 'none',
    highlight: j['highlight'] as String?,
    subtitle: j['subtitle'] as String?,
    buttonText: j['buttonText'] as String?,
    linkValue: j['linkValue'] as String?,
  );
}

/// Live Home banners (admin → Home banners), in their admin order.
final bannersProvider = FutureProvider<List<HomeBanner>>((ref) async {
  final data = await ref.watch(apiClientProvider).get('/banners') as List;
  return data
      .map((j) => HomeBanner.fromJson(j as Map<String, dynamic>))
      .toList();
});

/// Switched-on offer sections in Home order.
final offerSectionsProvider = FutureProvider<List<OfferSection>>((ref) async {
  final data =
      await ref.watch(apiClientProvider).get('/offer-sections') as List;
  return data
      .map((j) => OfferSection.fromJson(j as Map<String, dynamic>))
      .toList();
});

/// Today's specials row, then one row per offer section. Rows with no live dishes are hidden,
/// and a failed load just hides them (Home still works).
/// Home rows in the admin's order. POPULAR sections are drawn by [popular] (best sellers).
class OfferRows extends ConsumerWidget {
  const OfferRows({
    super.key,
    required this.gutter,
    required this.popular,
    required this.category,
  });
  final double gutter;
  final Widget Function(String title) popular;
  final Widget Function(String slug, String title) category;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final specials = ref.watch(specialsProvider).value ?? const <Special>[];
    final sections =
        ref.watch(offerSectionsProvider).value ?? const <OfferSection>[];
    final live = specials.where((s) => s.isLive && s.product.isAvailable);
    final rows = <Widget>[
      for (final x in sections)
        if (x.kind == 'POPULAR')
          popular(x.title)
        else if (x.kind == 'CATEGORY')
          category(x.categorySlug ?? '', x.title)
        else
          _OfferRow(
            id: x.id,
            title: x.title,
            deals: live.where((s) => s.sectionId == x.id).toList(),
            gutter: gutter,
          ),
    ];
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: rows);
  }
}

class _OfferRow extends StatelessWidget {
  const _OfferRow({
    required this.id,
    required this.title,
    required this.deals,
    required this.gutter,
  });
  final String id;
  final String title;
  final List<Special> deals;
  final double gutter;

  @override
  Widget build(BuildContext context) {
    if (deals.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(gutter, 0, 8, 0),
            child: Row(
              children: [
                Expanded(
                  child: Semantics(
                    header: true,
                    child: Text(
                      title,
                      style: Theme.of(context).textTheme.headlineSmall
                          ?.copyWith(fontSize: 21),
                    ),
                  ),
                ),
                TextButton(
                  onPressed: () => context.push('/offers/$id'),
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
          const SizedBox(height: 10),
          SizedBox(
            height: 236,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: EdgeInsets.fromLTRB(gutter, 0, gutter, 12),
              itemCount: deals.length,
              separatorBuilder: (_, _) => const SizedBox(width: 14),
              itemBuilder: (_, i) =>
                  SizedBox(width: 210, child: _DealCard(deal: deals[i])),
            ),
          ),
        ],
      ),
    );
  }
}

class _DealCard extends StatelessWidget {
  const _DealCard({required this.deal});
  final Special deal;

  @override
  Widget build(BuildContext context) {
    final p = deal.product;
    return Semantics(
      button: true,
      label:
          '${p.name}, ${deal.discountPercent}% off, ${formatPaise(deal.specialPricePaise)}',
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        elevation: 2,
        shadowColor: Colors.black26,
        clipBehavior: Clip.antiAlias,
        child: InkWell(
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
                      FoodImage(url: p.imageUrl, width: 420, radius: 14),
                      Positioned(
                        left: 8,
                        top: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 9,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: A3Colors.primaryStrong,
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            deal.label ?? '${deal.discountPercent}% OFF',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
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
                const SizedBox(height: 6),
                Row(
                  children: [
                    Expanded(
                      child: Wrap(
                        crossAxisAlignment: WrapCrossAlignment.end,
                        spacing: 6,
                        children: [
                          Text(
                            formatPaise(deal.specialPricePaise),
                            style: const TextStyle(
                              color: A3Colors.primaryStrong,
                              fontWeight: FontWeight.w800,
                              fontSize: 16,
                            ),
                          ),
                          Text(
                            formatPaise(displayPrice(p)),
                            style: const TextStyle(
                              color: A3Colors.muted,
                              fontSize: 13,
                              decoration: TextDecoration.lineThrough,
                            ),
                          ),
                        ],
                      ),
                    ),
                    CartControl(product: p),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// /offers/:id — every live dish in one offer section ('today' = section-less specials).
class OfferSectionScreen extends ConsumerWidget {
  const OfferSectionScreen({super.key, required this.sectionId});
  final String sectionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final specials = ref.watch(specialsProvider);
    final sections =
        ref.watch(offerSectionsProvider).value ?? const <OfferSection>[];
    final id = sectionId == 'today' ? null : sectionId;
    final title = id == null
        ? 'Today’s Specials'
        : sections.where((x) => x.id == id).firstOrNull?.title ?? 'Offers';
    return FramedPage(
      title: title,
      child: specials.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => AsyncStateView.error(
          message: '$e',
          onRetry: () => ref.invalidate(specialsProvider),
        ),
        data: (list) {
          final deals = list
              .where(
                (s) => s.isLive && s.product.isAvailable && s.sectionId == id,
              )
              .toList();
          if (deals.isEmpty) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  'No deals here right now. Check back soon.',
                  textAlign: TextAlign.center,
                ),
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () => ref.refresh(specialsProvider.future),
            child: LayoutBuilder(
              builder: (context, c) => GridView.builder(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: c.maxWidth > 600 ? 3 : 2,
                  mainAxisSpacing: 14,
                  crossAxisSpacing: 14,
                  mainAxisExtent: 236,
                ),
                itemCount: deals.length,
                itemBuilder: (_, i) => _DealCard(deal: deals[i]),
              ),
            ),
          );
        },
      ),
    );
  }
}

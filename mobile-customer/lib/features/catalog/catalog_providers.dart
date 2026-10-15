import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/models.dart';

final categoriesProvider = FutureProvider<List<Category>>((ref) async {
  final data = await ref.watch(apiClientProvider).get('/categories') as List;
  return data.map((j) => Category.fromJson(j as Map<String, dynamic>)).toList();
});

/// Products for a category slug ('' = all). Same endpoint and filters as the website.
final productsProvider = FutureProvider.family<List<Product>, String>((
  ref,
  categorySlug,
) async {
  final q = categorySlug.isEmpty
      ? ''
      : '&categorySlug=${Uri.encodeQueryComponent(categorySlug)}';
  final data =
      await ref.watch(apiClientProvider).get('/products?limit=50$q') as List;
  return data.map((j) => Product.fromJson(j as Map<String, dynamic>)).toList();
});

final searchProvider = FutureProvider.family<List<Product>, String>((
  ref,
  query,
) async {
  if (query.trim().isEmpty) return const [];
  final data =
      await ref
              .watch(apiClientProvider)
              .get(
                '/products?limit=50&search=${Uri.encodeQueryComponent(query.trim())}',
              )
          as List;
  return data.map((j) => Product.fromJson(j as Map<String, dynamic>)).toList();
});

final productProvider = FutureProvider.family<Product, String>((
  ref,
  slug,
) async {
  final data = await ref
      .watch(apiClientProvider)
      .get('/products/${Uri.encodeComponent(slug)}');
  return Product.fromJson(data as Map<String, dynamic>);
});

/// "Popular Near You": real best sellers (last 30 days), topped up from the menu. Same as the website.
final popularProvider = FutureProvider<List<Product>>((ref) async {
  final data =
      await ref.watch(apiClientProvider).get('/products/popular') as List;
  return data.map((j) => Product.fromJson(j as Map<String, dynamic>)).toList();
});

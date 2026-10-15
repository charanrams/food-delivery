import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:a3_customer/core/api/models.dart';
import 'package:a3_customer/features/home/offer_rows.dart';
import 'package:a3_customer/features/cart/cart_controller.dart';
import 'package:a3_customer/features/catalog/catalog_providers.dart';
import 'package:a3_customer/features/home/home_screen.dart';

Product dish(
  String id,
  int paise, {
  bool available = true,
  List<Variant> variants = const [],
}) => Product(
  id: id,
  categoryId: 'c1',
  name: id,
  slug: id,
  description: 'Tasty $id',
  images: const [],
  pricePaise: paise,
  isAvailable: available,
  isVegetarian: true,
  variants: variants,
);

void main() {
  testWidgets(
    'home renders categories and only available specials from the API',
    (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            categoriesProvider.overrideWith(
              (ref) async => const [
                Category(
                  id: 'c1',
                  name: 'Biryani & Rice',
                  slug: 'biryani-rice',
                ),
              ],
            ),
            popularProvider.overrideWith(
              (ref) async => [
                dish('Dum Biryani', 24900),
                dish('Sold Out Curry', 32900, available: false),
              ],
            ),
            specialsProvider.overrideWith((ref) async => const <Special>[]),
            offerSectionsProvider.overrideWith(
              (ref) async => const [
                OfferSection(
                  id: 'p',
                  title: 'Popular Near You',
                  kind: 'POPULAR',
                ),
              ],
            ),
          ],
          child: const MaterialApp(home: HomeScreen()),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.textContaining('Freshly Prepared'), findsOneWidget);
      expect(find.text('Biryani & Rice'), findsOneWidget);
      await tester.scrollUntilVisible(
        find.text('Dum Biryani'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('Dum Biryani'), findsOneWidget);
      expect(find.text('Sold Out Curry'), findsNothing);
    },
  );

  test('cart totals match the web: free delivery above ₹499, 5% GST', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    final cart = container.read(cartProvider.notifier);
    const full = Variant(
      id: 'full',
      name: 'Full',
      pricePaise: 24900,
      isAvailable: true,
    );
    cart.add(dish('biryani', 24900, variants: [full]), full, 2);
    cart.add(dish('paneer', 21900), null);
    cart.add(dish('jamun', 6900), null);

    final t = CartTotals.of(container.read(cartProvider));
    expect(t.itemTotalPaise, 78600);
    expect(t.deliveryFeePaise, 0);
    expect(t.taxPaise, 3930);
    expect(t.totalPaise, 82530);
    expect(container.read(cartCountProvider), 4);

    cart.setQuantity('biryani:full', 0);
    expect(CartTotals.of(container.read(cartProvider)).deliveryFeePaise, 3900);
  });

  test('formats paise in Indian rupees', () {
    expect(formatPaise(24900), '₹249');
    expect(formatPaise(12345678), '₹1,23,456.78');
  });
}

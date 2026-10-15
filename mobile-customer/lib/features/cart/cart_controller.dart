import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/models.dart';

class CartLine {
  const CartLine({required this.product, this.variant, required this.quantity});
  final Product product;
  final Variant? variant;
  final int quantity;

  String get key => '${product.id}:${variant?.id ?? ''}';
  int get unitPricePaise => variant?.pricePaise ?? product.pricePaise;
  int get lineTotalPaise => unitPricePaise * quantity;

  CartLine copyWith({int? quantity}) => CartLine(
    product: product,
    variant: variant,
    quantity: quantity ?? this.quantity,
  );
}

/// Display-only totals; the server recalculates everything at checkout (SECURITY.md §5).
/// Kept identical to frontend/src/features/cart/CartContext.tsx.
class CartTotals {
  const CartTotals(this.itemTotalPaise, this.deliveryFeePaise, this.taxPaise);
  final int itemTotalPaise;
  final int deliveryFeePaise;
  final int taxPaise;
  int get totalPaise => itemTotalPaise + deliveryFeePaise + taxPaise;

  static const taxRateBps = 500;
  static const deliveryFee = 3900;
  static const freeDeliveryAbove = 49900;

  factory CartTotals.of(List<CartLine> lines) {
    final items = lines.fold<int>(0, (s, l) => s + l.lineTotalPaise);
    final fee = items == 0 || items >= freeDeliveryAbove ? 0 : deliveryFee;
    return CartTotals(items, fee, (items * taxRateBps / 10000).round());
  }
}

class CartController extends Notifier<List<CartLine>> {
  static const maxQty = 20;

  @override
  List<CartLine> build() => const [];

  void add(Product product, Variant? variant, [int quantity = 1]) {
    final key = '${product.id}:${variant?.id ?? ''}';
    final i = state.indexWhere((l) => l.key == key);
    if (i == -1) {
      state = [
        ...state,
        CartLine(
          product: product,
          variant: variant,
          quantity: quantity.clamp(1, maxQty),
        ),
      ];
    } else {
      setQuantity(key, state[i].quantity + quantity);
    }
  }

  void setQuantity(String key, int quantity) {
    state = quantity <= 0
        ? state.where((l) => l.key != key).toList()
        : [
            for (final l in state)
              l.key == key
                  ? l.copyWith(quantity: quantity.clamp(1, maxQty))
                  : l,
          ];
  }

  void clear() => state = const [];
}

final cartProvider = NotifierProvider<CartController, List<CartLine>>(
  CartController.new,
);
final cartCountProvider = Provider<int>(
  (ref) => ref.watch(cartProvider).fold(0, (s, l) => s + l.quantity),
);

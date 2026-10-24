/// Typed mirrors of backend/contracts/src/dto.ts. Money is integer paise.
class AppUser {
  const AppUser({
    required this.id,
    required this.name,
    required this.role,
    this.email,
    this.phone,
  });
  final String id;
  final String name;
  final String role;
  final String? email;
  final String? phone;

  factory AppUser.fromJson(Map<String, dynamic> j) => AppUser(
    id: j['id'] as String,
    name: j['name'] as String,
    role: j['role'] as String,
    email: j['email'] as String?,
    phone: j['phone'] as String?,
  );
}

class Category {
  const Category({
    required this.id,
    required this.name,
    required this.slug,
    this.imageUrl,
    this.productCount = 0,
    this.showOnHome = false,
  });
  final String id;
  final String name;
  final String slug;
  final String? imageUrl;
  final int productCount;

  /// Admin switched on "Row on Home" for this category.
  final bool showOnHome;

  factory Category.fromJson(Map<String, dynamic> j) => Category(
    id: j['id'] as String,
    name: j['name'] as String,
    slug: j['slug'] as String,
    imageUrl: j['imageUrl'] as String?,
    productCount: (j['productCount'] as num?)?.toInt() ?? 0,
    showOnHome: j['showOnHome'] as bool? ?? false,
  );
}

class Variant {
  const Variant({
    required this.id,
    required this.name,
    required this.pricePaise,
    required this.isAvailable,
  });
  final String id;
  final String name;
  final int pricePaise;
  final bool isAvailable;

  factory Variant.fromJson(Map<String, dynamic> j) => Variant(
    id: j['id'] as String,
    name: j['name'] as String,
    pricePaise: (j['pricePaise'] as num).toInt(),
    isAvailable: j['isAvailable'] as bool? ?? true,
  );
}

class Product {
  const Product({
    required this.id,
    required this.categoryId,
    required this.name,
    required this.slug,
    required this.description,
    required this.images,
    required this.pricePaise,
    required this.isAvailable,
    required this.isVegetarian,
    required this.variants,
    this.preparationTimeMinutes,
    this.rating,
  });

  final String id;
  final String categoryId;
  final String name;
  final String slug;
  final String description;
  final List<String> images;
  final int pricePaise;
  final bool isAvailable;
  final bool isVegetarian;
  final int? preparationTimeMinutes;

  /// Average customer rating (1–5) from order reviews; null until reviewed.
  final double? rating;
  final List<Variant> variants;

  String? get imageUrl => images.isEmpty ? null : images.first;

  /// "Full" portion when offered, else the first available one (matches the web card).
  Variant? get defaultVariant {
    for (final v in variants) {
      if (v.isAvailable && v.name == 'Full') return v;
    }
    for (final v in variants) {
      if (v.isAvailable) return v;
    }
    return null;
  }

  factory Product.fromJson(Map<String, dynamic> j) => Product(
    id: j['id'] as String,
    categoryId: j['categoryId'] as String,
    name: j['name'] as String,
    slug: j['slug'] as String,
    description: j['description'] as String? ?? '',
    images: (j['images'] as List? ?? const []).cast<String>(),
    pricePaise: (j['pricePaise'] as num).toInt(),
    isAvailable: j['isAvailable'] as bool? ?? true,
    isVegetarian: j['isVegetarian'] as bool? ?? false,
    preparationTimeMinutes: (j['preparationTimeMinutes'] as num?)?.toInt(),
    rating: (j['rating'] as num?)?.toDouble(),
    variants: (j['variants'] as List? ?? const [])
        .map((v) => Variant.fromJson(v as Map<String, dynamic>))
        .toList(),
  );
}

/// ₹249 / ₹249.50 — Indian rupees from paise.
String formatPaise(int paise) {
  final rupees = paise ~/ 100;
  final rest = paise % 100;
  final whole = rupees.toString().replaceAllMapped(
    RegExp(r'(\d)(?=(\d\d)+\d$)'),
    (m) => '${m[1]},',
  );
  return rest == 0 ? '₹$whole' : '₹$whole.${rest.toString().padLeft(2, '0')}';
}

/// Cloudinary thumbnail transform; untouched for other hosts.
/// Cloudinary resize. Forces WebP: `f_auto` serves AVIF to Chrome, which Flutter web's
/// CanvasKit (and older Android decoders) can't decode — every photo fell back to the placeholder.
String sizedImage(String url, int width) => url.contains('res.cloudinary.com')
    ? url.replaceFirst('/upload/', '/upload/f_webp,q_auto,c_fill,w_$width/')
    : url;

// ---------------------------------------------------------------- addresses & orders

class Address {
  const Address({
    required this.id,
    required this.label,
    required this.recipientName,
    required this.phone,
    required this.line1,
    this.line2,
    this.landmark,
    required this.city,
    required this.state,
    required this.postalCode,
    required this.isDefault,
    required this.isServiceable,
    this.lat,
    this.lng,
  });
  final String id, label, recipientName, phone, line1, city, state, postalCode;
  final String? line2, landmark;
  final bool isDefault, isServiceable;
  final double? lat, lng;

  String get oneLine => [
    line1,
    line2,
    landmark,
    city,
    postalCode,
  ].whereType<String>().where((s) => s.isNotEmpty).join(', ');
  String get labelText => switch (label) {
    'WORK' => 'Work',
    'OTHER' => 'Other',
    _ => 'Home',
  };

  factory Address.fromJson(Map<String, dynamic> j) => Address(
    id: j['id'] as String,
    label: j['label'] as String? ?? 'HOME',
    recipientName: j['recipientName'] as String,
    phone: j['phone'] as String,
    line1: j['line1'] as String,
    line2: j['line2'] as String?,
    landmark: j['landmark'] as String?,
    city: j['city'] as String,
    state: j['state'] as String,
    postalCode: j['postalCode'] as String,
    isDefault: j['isDefault'] as bool? ?? false,
    isServiceable: j['isServiceable'] as bool? ?? true,
    lat: (j['lat'] as num?)?.toDouble(),
    lng: (j['lng'] as num?)?.toDouble(),
  );
}

/// A place from /geo/search or /geo/reverse (map picker).
class Place {
  const Place({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.lat,
    required this.lng,
    this.line1,
    this.line2,
    this.city,
    this.state,
    this.postalCode,
  });
  final String id, title, subtitle;
  final double lat, lng;
  final String? line1, line2, city, state, postalCode;

  factory Place.fromJson(Map<String, dynamic> j) => Place(
    id: j['id'] as String,
    title: j['title'] as String,
    subtitle: j['subtitle'] as String? ?? '',
    lat: (j['lat'] as num).toDouble(),
    lng: (j['lng'] as num).toDouble(),
    line1: j['line1'] as String?,
    line2: j['line2'] as String?,
    city: j['city'] as String?,
    state: j['state'] as String?,
    postalCode: j['postalCode'] as String?,
  );
}

class OrderItem {
  const OrderItem({
    required this.productId,
    required this.name,
    this.imageUrl,
    this.variantName,
    required this.quantity,
    required this.lineTotalPaise,
  });
  final String productId, name;
  final String? imageUrl, variantName;
  final int quantity, lineTotalPaise;

  factory OrderItem.fromJson(Map<String, dynamic> j) => OrderItem(
    productId: j['productId'] as String,
    name: j['productName'] as String,
    imageUrl: j['imageUrl'] as String?,
    variantName: j['variantName'] as String?,
    quantity: (j['quantity'] as num).toInt(),
    lineTotalPaise: (j['lineTotalPaise'] as num).toInt(),
  );
}

class OrderPartner {
  const OrderPartner({required this.name, required this.phone, this.vehicle});
  final String name, phone;
  final String? vehicle;
}

class Order {
  const Order({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.paymentStatus,
    required this.paymentMethod,
    required this.items,
    required this.address,
    required this.subtotalPaise,
    this.discountPaise = 0,
    required this.deliveryFeePaise,
    required this.taxPaise,
    required this.totalPaise,
    required this.timeline,
    required this.actions,
    this.partner,
    this.deliveryOtp,
    this.reason,
    this.reviewRating,
  });
  final String id, orderNumber, status, paymentStatus, paymentMethod;

  /// 1–5 once the customer has rated this delivered order.
  final int? reviewRating;
  final List<OrderItem> items;
  final Map<String, dynamic> address;
  final int subtotalPaise,
      discountPaise,
      deliveryFeePaise,
      taxPaise,
      totalPaise;
  final Map<String, DateTime> timeline;
  final List<String> actions;
  final OrderPartner? partner;
  final String? deliveryOtp, reason;

  bool get isActive =>
      !const ['DELIVERED', 'CANCELLED', 'REJECTED'].contains(status);
  DateTime get placedAt => timeline['placedAt'] ?? DateTime.now();
  String get addressLine => [
    address['line1'],
    address['line2'],
    address['city'],
    address['postalCode'],
  ].whereType<String>().join(', ');

  factory Order.fromJson(Map<String, dynamic> j) {
    final p = j['partner'] as Map<String, dynamic>?;
    final t = (j['timeline'] as Map<String, dynamic>? ?? const {});
    return Order(
      id: j['id'] as String,
      orderNumber: j['orderNumber'] as String,
      status: j['status'] as String,
      paymentStatus: j['paymentStatus'] as String,
      paymentMethod: j['paymentMethod'] as String,
      items: (j['items'] as List)
          .map((i) => OrderItem.fromJson(i as Map<String, dynamic>))
          .toList(),
      address: j['deliveryAddress'] as Map<String, dynamic>,
      subtotalPaise: (j['subtotalPaise'] as num).toInt(),
      discountPaise: (j['discountPaise'] as num? ?? 0).toInt(),
      deliveryFeePaise: (j['deliveryFeePaise'] as num).toInt(),
      taxPaise: (j['taxPaise'] as num).toInt(),
      totalPaise: (j['totalPaise'] as num).toInt(),
      timeline: {
        for (final e in t.entries)
          if (e.value is String)
            e.key: DateTime.parse(e.value as String).toLocal(),
      },
      actions: (j['actions'] as List? ?? const []).cast<String>(),
      reviewRating: ((j['review'] as Map<String, dynamic>?)?['rating'] as num?)
          ?.toInt(),
      partner: p == null
          ? null
          : OrderPartner(
              name: p['name'] as String,
              phone: p['phone'] as String,
              vehicle: [
                p['vehicleType'],
                p['vehicleNumber'],
              ].whereType<String>().join(' · '),
            ),
      deliveryOtp: j['deliveryOtp'] as String?,
      reason: (j['rejectionReason'] ?? j['cancellationReason']) as String?,
    );
  }
}

class AppNotification {
  const AppNotification({
    required this.id,
    required this.title,
    required this.message,
    this.orderId,
    required this.read,
    required this.createdAt,
  });
  final String id, title, message;
  final String? orderId;
  final bool read;
  final DateTime createdAt;

  factory AppNotification.fromJson(Map<String, dynamic> j) => AppNotification(
    id: j['id'] as String,
    title: j['title'] as String,
    message: j['message'] as String,
    orderId: j['orderId'] as String?,
    read: j['readAt'] != null,
    createdAt: DateTime.parse(j['createdAt'] as String).toLocal(),
  );
}

/// Same labels as the web StatusBadge.
const orderStatusLabel = {
  'PLACED': 'Placed',
  'ACCEPTED': 'Accepted',
  'PREPARING': 'Preparing',
  'READY_FOR_PICKUP': 'Ready for pickup',
  'ASSIGNED': 'Partner assigned',
  'PICKED_UP': 'Picked up',
  'OUT_FOR_DELIVERY': 'Out for delivery',
  'DELIVERED': 'Delivered',
  'REJECTED': 'Rejected',
  'CANCELLED': 'Cancelled',
};

String timeOfDay(DateTime d) {
  final h = d.hour % 12 == 0 ? 12 : d.hour % 12;
  return '$h:${d.minute.toString().padLeft(2, '0')} ${d.hour < 12 ? 'AM' : 'PM'}';
}

String shortDate(DateTime d) {
  const m = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return '${d.day} ${m[d.month - 1]}, ${timeOfDay(d)}';
}

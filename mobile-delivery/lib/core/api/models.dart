/// Typed mirrors of backend/contracts/src/dto.ts used by the delivery app. Money is integer paise.
class Partner {
  const Partner({
    required this.id,
    required this.name,
    required this.phone,
    this.email,
    required this.online,
    this.vehicle,
    this.vehicleType,
    this.vehicleNumber,
    required this.todayDelivered,
    this.bank,
  });
  final String id, name, phone;
  final String? email, vehicle, vehicleType, vehicleNumber;
  final bool online;
  final int todayDelivered;
  final PartnerBank? bank;

  factory Partner.fromJson(Map<String, dynamic> j) => Partner(
    id: j['id'] as String,
    name: j['name'] as String,
    phone: j['phone'] as String,
    email: j['email'] as String?,
    online: j['availability'] == 'ONLINE',
    vehicle: [
      j['vehicleType'],
      j['vehicleNumber'],
    ].whereType<String>().join(' · '),
    vehicleType: j['vehicleType'] as String?,
    vehicleNumber: j['vehicleNumber'] as String?,
    todayDelivered: (j['todayDelivered'] as num? ?? 0).toInt(),
    bank: j['bank'] == null
        ? null
        : PartnerBank.fromJson(j['bank'] as Map<String, dynamic>),
  );
}

/// Payout account; the server only ever returns the account's last 4 digits.
class PartnerBank {
  const PartnerBank({
    required this.holderName,
    required this.accountLast4,
    required this.ifsc,
    this.upiId,
  });
  final String holderName, accountLast4, ifsc;
  final String? upiId;

  factory PartnerBank.fromJson(Map<String, dynamic> j) => PartnerBank(
    holderName: j['holderName'] as String,
    accountLast4: j['accountLast4'] as String,
    ifsc: j['ifsc'] as String,
    upiId: j['upiId'] as String?,
  );
}

/// One Monday–Sunday earnings statement.
class WeeklyStatement {
  const WeeklyStatement({
    required this.weekStart,
    required this.weekEnd,
    required this.current,
    required this.deliveredCount,
    required this.earningsPaise,
    required this.codCashCollectedPaise,
  });
  final DateTime weekStart, weekEnd;
  final bool current;
  final int deliveredCount, earningsPaise, codCashCollectedPaise;

  factory WeeklyStatement.fromJson(Map<String, dynamic> j) => WeeklyStatement(
    weekStart: DateTime.parse(j['weekStart'] as String).toLocal(),
    weekEnd: DateTime.parse(j['weekEnd'] as String).toLocal(),
    current: j['current'] as bool? ?? false,
    deliveredCount: (j['deliveredCount'] as num).toInt(),
    earningsPaise: (j['earningsPaise'] as num).toInt(),
    codCashCollectedPaise: (j['codCashCollectedPaise'] as num? ?? 0).toInt(),
  );
}

class DeliveryItem {
  const DeliveryItem({
    required this.name,
    this.variant,
    required this.quantity,
    this.lineTotalPaise = 0,
  });
  final String name;
  final String? variant;
  final int quantity;
  final int lineTotalPaise;
}

class Delivery {
  const Delivery({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.paymentMethod,
    required this.paymentStatus,
    required this.totalPaise,
    this.deliveryFeePaise = 0,
    required this.items,
    required this.customerName,
    required this.customerPhone,
    required this.address,
    required this.actions,
    this.deliveredAt,
    this.assignedAt,
    this.partnerOutcome,
    this.partnerOutcomeAt,
  });
  final String id,
      orderNumber,
      status,
      paymentMethod,
      paymentStatus,
      customerName,
      customerPhone;
  final int totalPaise;

  /// Delivery fee on the order = what the partner earns for it.
  final int deliveryFeePaise;
  final List<DeliveryItem> items;
  final Map<String, dynamic> address;
  final List<String> actions;
  final DateTime? deliveredAt;

  /// When the kitchen assigned this order to the partner (starts the 30 s accept window).
  final DateTime? assignedAt;

  /// History only: what happened for this partner — DELIVERED, CANCELLED or DECLINED.
  final String? partnerOutcome;
  final DateTime? partnerOutcomeAt;

  /// Customer's map pin, when they dropped one on their address.
  double? get lat => (address['lat'] as num?)?.toDouble();
  double? get lng => (address['lng'] as num?)?.toDouble();

  /// Cash to collect at the door (COD that isn't paid yet).
  bool get collectCash => paymentMethod == 'COD' && paymentStatus != 'PAID';
  String get addressLine => [
    address['line1'],
    address['line2'],
    address['landmark'],
    address['city'],
    address['postalCode'],
  ].whereType<String>().where((s) => s.isNotEmpty).join(', ');
  String get recipient => address['recipientName'] as String? ?? customerName;
  String get recipientPhone => address['phone'] as String? ?? customerPhone;

  factory Delivery.fromJson(Map<String, dynamic> j) {
    final customer = j['customer'] as Map<String, dynamic>? ?? const {};
    final timeline = j['timeline'] as Map<String, dynamic>? ?? const {};
    return Delivery(
      id: j['id'] as String,
      orderNumber: j['orderNumber'] as String,
      status: j['status'] as String,
      paymentMethod: j['paymentMethod'] as String,
      paymentStatus: j['paymentStatus'] as String,
      totalPaise: (j['totalPaise'] as num).toInt(),
      deliveryFeePaise: (j['deliveryFeePaise'] as num? ?? 0).toInt(),
      items: [
        for (final i in (j['items'] as List).cast<Map<String, dynamic>>())
          DeliveryItem(
            name: i['productName'] as String,
            variant: i['variantName'] as String?,
            quantity: (i['quantity'] as num).toInt(),
            lineTotalPaise: (i['lineTotalPaise'] as num? ?? 0).toInt(),
          ),
      ],
      customerName: customer['name'] as String? ?? 'Customer',
      customerPhone: customer['phone'] as String? ?? '',
      address: j['deliveryAddress'] as Map<String, dynamic>,
      actions: (j['actions'] as List? ?? const []).cast<String>(),
      deliveredAt: timeline['deliveredAt'] is String
          ? DateTime.parse(timeline['deliveredAt'] as String).toLocal()
          : null,
      assignedAt: timeline['assignedAt'] is String
          ? DateTime.parse(timeline['assignedAt'] as String).toLocal()
          : null,
      partnerOutcome: j['partnerOutcome'] as String?,
      partnerOutcomeAt: j['partnerOutcomeAt'] is String
          ? DateTime.parse(j['partnerOutcomeAt'] as String).toLocal()
          : null,
    );
  }
}

String formatPaise(int paise) {
  final rupees = paise ~/ 100;
  final rest = paise % 100;
  final whole = rupees.toString().replaceAllMapped(
    RegExp(r'(\d)(?=(\d\d)+\d$)'),
    (m) => '${m[1]},',
  );
  return rest == 0 ? '₹$whole' : '₹$whole.${rest.toString().padLeft(2, '0')}';
}

String timeOfDay(DateTime d) {
  final h = d.hour % 12 == 0 ? 12 : d.hour % 12;
  return '$h:${d.minute.toString().padLeft(2, '0')} ${d.hour < 12 ? 'AM' : 'PM'}';
}

const deliveryStatusLabel = {
  'ASSIGNED': 'New assignment',
  'PICKED_UP': 'Picked up',
  'OUT_FOR_DELIVERY': 'Out for delivery',
  'DELIVERED': 'Delivered',
};

class EarningsSummary {
  const EarningsSummary({
    required this.deliveredCount,
    required this.earningsPaise,
    required this.codCashCollectedPaise,
  });
  final int deliveredCount, earningsPaise, codCashCollectedPaise;

  factory EarningsSummary.fromJson(Map<String, dynamic> j) => EarningsSummary(
    deliveredCount: (j['deliveredCount'] as num? ?? 0).toInt(),
    earningsPaise: (j['earningsPaise'] as num? ?? 0).toInt(),
    codCashCollectedPaise: (j['codCashCollectedPaise'] as num? ?? 0).toInt(),
  );
}

class PartnerEarnings {
  const PartnerEarnings({
    required this.today,
    required this.week,
    required this.month,
    required this.totalDelivered,
    required this.unremittedCashPaise,
  });
  final EarningsSummary today, week, month;
  final int totalDelivered, unremittedCashPaise;

  factory PartnerEarnings.fromJson(Map<String, dynamic> j) => PartnerEarnings(
    today: EarningsSummary.fromJson(
      j['today'] as Map<String, dynamic>? ?? const {},
    ),
    week: EarningsSummary.fromJson(
      j['week'] as Map<String, dynamic>? ?? const {},
    ),
    month: EarningsSummary.fromJson(
      j['month'] as Map<String, dynamic>? ?? const {},
    ),
    totalDelivered: (j['totalDelivered'] as num? ?? 0).toInt(),
    unremittedCashPaise: (j['unremittedCashPaise'] as num? ?? 0).toInt(),
  );
}

import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';

import '../../core/api/api_client.dart';

/// Outcome of one Razorpay attempt.
enum PayResult { paid, failed, cancelled }

/// Opens Razorpay Checkout for an order the server already created, then asks the
/// server to verify the signature. The app never decides "paid" by itself
/// (docs/SECURITY.md §6) — only the server's /payments/razorpay/verify does.
class RazorpayPayer {
  RazorpayPayer(this._api);
  final ApiClient _api;

  /// Razorpay's native SDK exists only on Android and iOS.
  static bool get supported =>
      !kIsWeb &&
      (defaultTargetPlatform == TargetPlatform.android ||
          defaultTargetPlatform == TargetPlatform.iOS);

  Future<({PayResult result, String? message})> pay({
    required String orderId,
    required Map<String, dynamic> checkout,
  }) async {
    if (!supported) {
      return (
        result: PayResult.failed,
        message: 'Online payment works in the Android and iOS apps.',
      );
    }
    final done = Completer<({PayResult result, String? message})>();
    final rp = Razorpay();

    rp.on(Razorpay.EVENT_PAYMENT_SUCCESS, (PaymentSuccessResponse r) async {
      try {
        await _api.post('/payments/razorpay/verify', {
          'razorpay_order_id': r.orderId,
          'razorpay_payment_id': r.paymentId,
          'razorpay_signature': r.signature,
        });
        if (!done.isCompleted) {
          done.complete((result: PayResult.paid, message: null));
        }
      } on ApiException catch (e) {
        // The webhook may still confirm it; the order screen will show the final state.
        if (!done.isCompleted) {
          done.complete((result: PayResult.failed, message: e.message));
        }
      }
    });
    rp.on(Razorpay.EVENT_PAYMENT_ERROR, (PaymentFailureResponse r) async {
      final cancelled = r.code == Razorpay.PAYMENT_CANCELLED;
      try {
        await _api.post('/payments/razorpay/failed', {'orderId': orderId});
      } catch (_) {
        /* best effort */
      }
      if (!done.isCompleted) {
        done.complete((
          result: cancelled ? PayResult.cancelled : PayResult.failed,
          message: cancelled
              ? 'You closed the payment screen. No money was taken.'
              : (r.message?.isNotEmpty == true
                    ? r.message
                    : 'The payment didn’t go through.'),
        ));
      }
    });
    rp.on(Razorpay.EVENT_EXTERNAL_WALLET, (_) {});

    rp.open({
      'key': checkout['keyId'],
      'order_id': checkout['providerOrderId'],
      'amount': checkout['amountPaise'],
      'currency': checkout['currency'] ?? 'INR',
      'name': 'A3 Kitchen',
      'description': 'Order ${checkout['orderNumber']}',
      'prefill': checkout['prefill'],
      'theme': {'color': '#F58220'},
      'retry': {'enabled': true, 'max_count': 2},
    });

    try {
      return await done.future;
    } finally {
      rp.clear();
    }
  }

  /// Fresh checkout data for an existing unpaid order (retry after a failure).
  Future<Map<String, dynamic>> reopen(String orderId) async =>
      await _api.post('/payments/razorpay/order', {'orderId': orderId})
          as Map<String, dynamic>;
}

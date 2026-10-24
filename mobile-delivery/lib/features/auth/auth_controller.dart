import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/models.dart';

/// Session for the delivery app — only DELIVERY_PARTNER accounts are admitted.
/// Partner accounts are created by the kitchen admin (credentials arrive by email).
class AuthController extends AsyncNotifier<Partner?> {
  ApiClient get _api => ref.read(apiClientProvider);

  @override
  Future<Partner?> build() async {
    _api.onSessionLost = () => state = const AsyncData(null);
    if (!await _api.refresh()) return null;
    try {
      return Partner.fromJson(
        await _api.get('/delivery/me') as Map<String, dynamic>,
      );
    } on ApiException catch (e) {
      if (e.status == 403) await _api.tokens.clear(); // not a partner account
      return null;
    }
  }

  /// Step 1 of login: is it an email or a mobile number, and does an account use it?
  Future<({bool isEmail, bool exists})> checkIdentifier(
    String identifier,
  ) async {
    final data = await _api.post('/auth/check', {
      'identifier': identifier.trim(),
    }) as Map<String, dynamic>;
    return (isEmail: data['kind'] == 'email', exists: data['exists'] == true);
  }

  Future<void> login(String identifier, String password) async {
    final data = await _api.post('/auth/login', {
      'identifier': identifier.trim(),
      'password': password,
    }) as Map<String, dynamic>;
    await _acceptPartner(data);
  }

  /// Asks the server for a login code. No SMS provider yet, so the server returns the code.
  Future<String?> sendPhoneOtp(String phone) async {
    final data = await _api.post('/auth/phone/otp', {
      'phone': phone,
    }) as Map<String, dynamic>;
    return data['devCode'] as String?;
  }

  Future<void> loginWithOtp(String phone, String otp) async {
    final data = await _api.post('/auth/phone/verify', {
      'phone': phone,
      'otp': otp,
    }) as Map<String, dynamic>;
    await _acceptPartner(data);
  }

  /// Only DELIVERY_PARTNER sessions are kept; any other account's fresh session is revoked.
  Future<void> _acceptPartner(Map<String, dynamic> data) async {
    final role = (data['user'] as Map<String, dynamic>)['role'];
    if (role != 'DELIVERY_PARTNER') {
      final rt = data['refreshToken'] as String?;
      if (rt != null) {
        try {
          await _api.post('/auth/logout', {'refreshToken': rt});
        } catch (_) {
          /* best effort */
        }
      }
      throw ApiException(
        403,
        'FORBIDDEN',
        'This app is for A3 Kitchen delivery partners. Customers please use the A3 Kitchen app.',
      );
    }
    await _api.acceptSession(data);
    state = AsyncData(
      Partner.fromJson(await _api.get('/delivery/me') as Map<String, dynamic>),
    );
  }

  /// Re-reads the profile (availability, today's count).
  Future<void> reload() async {
    state = AsyncData(
      Partner.fromJson(await _api.get('/delivery/me') as Map<String, dynamic>),
    );
  }

  /// Saves name / vehicle; returns the refreshed profile into state.
  Future<void> updateProfile({
    required String name,
    String? vehicleType,
    String? vehicleNumber,
  }) async {
    final data = await _api.patch('/delivery/me', {
      'name': name,
      'vehicleType': ?vehicleType,
      'vehicleNumber': ?vehicleNumber,
    });
    state = AsyncData(Partner.fromJson(data as Map<String, dynamic>));
  }

  Future<void> updateBank({
    required String holderName,
    required String accountNumber,
    required String ifsc,
    String? upiId,
  }) async {
    final data = await _api.put('/delivery/me/bank', {
      'holderName': holderName,
      'accountNumber': accountNumber,
      'ifsc': ifsc,
      'upiId': ?upiId,
    });
    state = AsyncData(Partner.fromJson(data as Map<String, dynamic>));
  }

  Future<void> setOnline(bool online) async {
    final data = await _api.patch('/delivery/availability', {
      'availability': online ? 'ONLINE' : 'OFFLINE',
    });
    state = AsyncData(Partner.fromJson(data as Map<String, dynamic>));
  }

  Future<void> logout() async {
    final rt = await _api.tokens.readRefresh();
    try {
      await _api.post('/auth/logout', {'refreshToken': ?rt});
    } catch (_) {
      /* offline logout still clears the device */
    }
    await _api.tokens.clear();
    state = const AsyncData(null);
  }
}

final authProvider = AsyncNotifierProvider<AuthController, Partner?>(
  AuthController.new,
);

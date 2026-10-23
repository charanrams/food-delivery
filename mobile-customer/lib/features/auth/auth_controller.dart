import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/models.dart';

/// Session state: null = logged out. The customer app only admits CUSTOMER accounts —
/// kitchen staff and delivery partners use the web dashboards / delivery app.
class AuthController extends AsyncNotifier<AppUser?> {
  ApiClient get _api => ref.read(apiClientProvider);

  @override
  Future<AppUser?> build() async {
    _api.onSessionLost = () => state = const AsyncData(null);
    if (!await _api.refresh()) return null;
    final me = AppUser.fromJson(
      await _api.get('/users/me') as Map<String, dynamic>,
    );
    return me.role == 'CUSTOMER' ? me : null;
  }

  /// One-field login (driveflow pattern): is this email / phone registered?
  Future<({bool isEmail, bool exists})> checkIdentifier(
    String identifier,
  ) async {
    final data = await _api.post('/auth/check', {
      'identifier': identifier.trim(),
    }) as Map<String, dynamic>;
    return (isEmail: data['kind'] == 'email', exists: data['exists'] == true);
  }

  /// Email + password login.
  Future<void> loginWithPassword(String email, String password) async {
    final data = await _api.post('/auth/login', {
      'identifier': email.trim(),
      'password': password,
    }) as Map<String, dynamic>;
    await _acceptCustomer(data);
  }

  /// Sends the phone OTP (login or sign-up). Returns the dummy code in test mode.
  Future<String?> sendPhoneOtp(String phone) async {
    final data = await _api.post('/auth/phone/otp', {
      'phone': phone,
    }) as Map<String, dynamic>;
    return data['devCode'] as String?;
  }

  /// Phone OTP login for a registered number.
  Future<void> loginWithOtp(String phone, String otp) async {
    final data = await _api.post('/auth/phone/verify', {
      'phone': phone,
      'otp': otp,
    }) as Map<String, dynamic>;
    await _acceptCustomer(data);
  }

  /// Sign-up: name, email, password + mobile number (no OTP).
  Future<void> signup({
    required String name,
    required String email,
    required String phone,
    required String password,
  }) async {
    final data = await _api.post('/auth/signup', {
      'name': name.trim(),
      'email': email.trim(),
      'phone': phone,
      'password': password,
    }) as Map<String, dynamic>;
    await _acceptCustomer(data);
  }

  Future<void> _acceptCustomer(Map<String, dynamic> data) async {
    final user = AppUser.fromJson(data['user'] as Map<String, dynamic>);
    if (user.role != 'CUSTOMER') {
      await _api.tokens.clear();
      throw ApiException(
        403,
        'FORBIDDEN',
        'This app is for customers. Staff please use the A3 Kitchen web dashboard.',
      );
    }
    await _api.acceptSession(data);
    state = AsyncData(user);
  }

  Future<AppUser> updateProfile({
    String? name,
    String? email,
    String? phone,
  }) async {
    final body = <String, dynamic>{};
    if (name != null && name.trim().isNotEmpty) body['name'] = name.trim();
    if (email != null && email.trim().isNotEmpty) body['email'] = email.trim();
    if (phone != null && phone.trim().isNotEmpty) body['phone'] = phone.trim();
    final data = await _api.patch('/users/me', body) as Map<String, dynamic>;
    final user = AppUser.fromJson(data);
    state = AsyncData(user);
    return user;
  }

  Future<void> deleteAccount() async {
    try {
      await _api.delete('/users/me');
    } catch (_) {
      // Local cleanup proceeds regardless
    }
    await _api.tokens.clear();
    state = const AsyncData(null);
  }

  Future<void> logout() async {
    final rt = await _api.tokens.readRefresh();
    try {
      await _api.post('/auth/logout', {'refreshToken': ?rt});
    } catch (_) {
      // Logging out locally still succeeds when offline.
    }
    await _api.tokens.clear();
    state = const AsyncData(null);
  }
}

final authProvider = AsyncNotifierProvider<AuthController, AppUser?>(
  AuthController.new,
);

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
      return Partner.fromJson(await _api.get('/delivery/me') as Map<String, dynamic>);
    } on ApiException catch (e) {
      if (e.status == 403) await _api.tokens.clear(); // not a partner account
      return null;
    }
  }

  Future<void> login(String identifier, String password) async {
    final data = await _api.post('/auth/login', {'identifier': identifier.trim(), 'password': password}) as Map<String, dynamic>;
    final role = (data['user'] as Map<String, dynamic>)['role'];
    if (role != 'DELIVERY_PARTNER') {
      throw ApiException(403, 'FORBIDDEN', 'This app is for A3 Kitchen delivery partners. Customers please use the A3 Kitchen app.');
    }
    await _api.acceptSession(data);
    state = AsyncData(Partner.fromJson(await _api.get('/delivery/me') as Map<String, dynamic>));
  }

  /// Re-reads the profile (availability, today's count).
  Future<void> reload() async {
    state = AsyncData(Partner.fromJson(await _api.get('/delivery/me') as Map<String, dynamic>));
  }

  Future<void> setOnline(bool online) async {
    final data = await _api.patch('/delivery/availability', {'availability': online ? 'ONLINE' : 'OFFLINE'});
    state = AsyncData(Partner.fromJson(data as Map<String, dynamic>));
  }

  Future<void> logout() async {
    final rt = await _api.tokens.readRefresh();
    try {
      await _api.post('/auth/logout', {'refreshToken': ?rt});
    } catch (_) {/* offline logout still clears the device */}
    await _api.tokens.clear();
    state = const AsyncData(null);
  }
}

final authProvider = AsyncNotifierProvider<AuthController, Partner?>(AuthController.new);

import 'dart:async';
import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

import '../env.dart';

/// Resolved once from [Env] (local via adb reverse, or production).
final String apiBaseUrl = Env.apiBaseUrl;

class ApiException implements Exception {
  ApiException(this.status, this.code, this.message);
  final int status;
  final String code;
  final String message;
  @override
  String toString() => message;
}

/// Refresh token lives in platform secure storage (docs/SECURITY.md §1); access token in memory.
class TokenStore {
  TokenStore([FlutterSecureStorage? storage])
    : _storage = storage ?? const FlutterSecureStorage();
  final FlutterSecureStorage _storage;
  static const _key = 'a3_refresh_token';
  String? accessToken;

  Future<String?> readRefresh() => _storage.read(key: _key);
  Future<void> saveRefresh(String token) =>
      _storage.write(key: _key, value: token);
  Future<void> clear() async {
    accessToken = null;
    await _storage.delete(key: _key);
  }
}

class ApiClient {
  ApiClient({http.Client? client, TokenStore? tokens})
    : _http = client ?? http.Client(),
      tokens = tokens ?? TokenStore();

  final http.Client _http;
  final TokenStore tokens;
  Future<bool>? _refreshing;

  /// Called when the session can't be refreshed (e.g. revoked) so the UI can log out.
  void Function()? onSessionLost;

  Map<String, String> _headers() => {
    'Content-Type': 'application/json',
    'X-Client':
        'mobile', // tells the API to return the refresh token in the body
    if (tokens.accessToken != null)
      'Authorization': 'Bearer ${tokens.accessToken}',
  };

  Future<dynamic> get(String path) => _send('GET', path);
  Future<dynamic> post(String path, [Object? body]) =>
      _send('POST', path, body);
  Future<dynamic> patch(String path, [Object? body]) =>
      _send('PATCH', path, body);
  Future<dynamic> put(String path, [Object? body]) => _send('PUT', path, body);
  Future<dynamic> delete(String path) => _send('DELETE', path);

  /// POST with extra headers (e.g. Idempotency-Key for checkout).
  Future<dynamic> postWith(
    String path,
    Object? body,
    Map<String, String> headers,
  ) => _send('POST', path, body, true, headers);

  Future<dynamic> _send(
    String method,
    String path, [
    Object? body,
    bool retry = true,
    Map<String, String> extra = const {},
  ]) async {
    final uri = Uri.parse('$apiBaseUrl$path');
    http.Response res;
    try {
      final req = http.Request(method, uri)
        ..headers.addAll(_headers())
        ..headers.addAll(extra);
      if (body != null) req.body = jsonEncode(body);
      res = await http.Response.fromStream(
        await _http.send(req).timeout(const Duration(seconds: 15)),
      );
    } on TimeoutException {
      throw ApiException(
        0,
        'NETWORK_ERROR',
        'Can’t reach the A3 Kitchen server ($apiBaseUrl). Check your connection and try again.',
      );
    } catch (_) {
      throw ApiException(
        0,
        'NETWORK_ERROR',
        'Can’t reach the A3 Kitchen server ($apiBaseUrl). Check your connection and try again.',
      );
    }

    if (res.statusCode == 401 && retry && !path.startsWith('/auth/')) {
      if (await refresh()) return _send(method, path, body, false, extra);
      onSessionLost?.call();
    }

    final decoded = res.body.isEmpty ? null : jsonDecode(res.body);
    if (decoded is Map && decoded['success'] == true) return decoded['data'];
    final err = decoded is Map ? decoded['error'] as Map? : null;
    throw ApiException(
      res.statusCode,
      err?['code'] as String? ?? 'INTERNAL_ERROR',
      err?['message'] as String? ?? 'Something went wrong. Please try again.',
    );
  }

  /// Rotates the refresh token; only one refresh runs at a time.
  Future<bool> refresh() =>
      _refreshing ??= _doRefresh().whenComplete(() => _refreshing = null);

  Future<bool> _doRefresh() async {
    final rt = await tokens.readRefresh();
    if (rt == null) return false;
    try {
      final data = await _send('POST', '/auth/refresh', {
        'refreshToken': rt,
      }, false) as Map<String, dynamic>;
      await acceptSession(data);
      return true;
    } on ApiException catch (e) {
      // Only a server "no" ends the session; being offline keeps the saved login for later.
      if (e.status == 401 || e.status == 403) await tokens.clear();
      return false;
    }
  }

  /// True when a login is saved on this device (used to tell "logged out" from "offline").
  Future<bool> hasSavedSession() async => await tokens.readRefresh() != null;

  Future<void> acceptSession(Map<String, dynamic> data) async {
    tokens.accessToken = data['accessToken'] as String;
    final rt = data['refreshToken'] as String?;
    if (rt != null) await tokens.saveRefresh(rt);
  }
}

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());

/// Where the app finds the A3 Kitchen API.
///
/// Default (every build, debug and release): production at https://fooddelivery.speshway.site.
/// Local backend instead:  --dart-define=USE_LOCAL=true   (http://localhost:4000 via `adb reverse tcp:4000 tcp:4000`)
/// One-off override:       --dart-define=API_BASE_URL=http://192.168.1.83:4000/api/v1
abstract final class Env {
  static const bool useLocal = bool.fromEnvironment('USE_LOCAL');

  static const String _override = String.fromEnvironment('API_BASE_URL');
  static const String _production = 'https://fooddelivery.speshway.site/api/v1';
  static const String _local = 'http://localhost:4000/api/v1';

  static String get apiBaseUrl =>
      _override.isNotEmpty ? _override : (useLocal ? _local : _production);

  /// Website that hosts /terms and /privacy (opened in the browser via url_launcher).
  static const String _webOverride = String.fromEnvironment('WEB_BASE_URL');
  static const String _webProduction = 'https://fooddelivery.speshway.site';
  static const String _webLocal = 'http://localhost:5173';

  static String get webBaseUrl => _webOverride.isNotEmpty
      ? _webOverride
      : (useLocal ? _webLocal : _webProduction);
}

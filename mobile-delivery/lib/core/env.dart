/// Where the app finds the A3 Kitchen API (same pattern as the driveflow project).
///
/// Local development — phone over USB **or** emulator:
///   the app calls http://localhost:4000 and `adb reverse tcp:4000 tcp:4000` tunnels it to
///   the PC. No IP addresses, no firewall rules, works on any Wi-Fi. VS Code (F5) and
///   `npm run phone` set the tunnel up automatically.
///
/// Production build:  flutter build apk --dart-define=USE_PRODUCTION=true
/// One-off override:  --dart-define=API_BASE_URL=http://192.168.1.83:4000/api/v1
abstract final class Env {
  static const bool useProduction = bool.fromEnvironment('USE_PRODUCTION');

  static const String _override = String.fromEnvironment('API_BASE_URL');
  static const String _production = String.fromEnvironment('PROD_API_BASE_URL', defaultValue: 'https://api.a3kitchen.in/api/v1');
  static const String _local = 'http://localhost:4000/api/v1';

  static String get apiBaseUrl => _override.isNotEmpty ? _override : (useProduction ? _production : _local);
}

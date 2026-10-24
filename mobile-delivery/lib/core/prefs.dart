import 'package:shared_preferences/shared_preferences.dart';

/// On-device preferences (not secrets — tokens live in secure storage).
const _onboardingKey = 'onboarding_seen_v1';

Future<bool> onboardingSeen() async =>
    (await SharedPreferences.getInstance()).getBool(_onboardingKey) ?? false;
Future<void> markOnboardingSeen() async =>
    (await SharedPreferences.getInstance()).setBool(_onboardingKey, true);

const _themeKey = 'theme_mode_v1';

/// Saved appearance: 'light', 'dark' or 'system' (default).
Future<String> savedThemeMode() async =>
    (await SharedPreferences.getInstance()).getString(_themeKey) ?? 'system';
Future<void> saveThemeMode(String mode) async =>
    (await SharedPreferences.getInstance()).setString(_themeKey, mode);

import 'package:shared_preferences/shared_preferences.dart';

/// On-device preferences (not secrets — tokens live in secure storage).
const _onboardingKey = 'onboarding_seen_v1';

Future<bool> onboardingSeen() async =>
    (await SharedPreferences.getInstance()).getBool(_onboardingKey) ?? false;
Future<void> markOnboardingSeen() async =>
    (await SharedPreferences.getInstance()).setBool(_onboardingKey, true);

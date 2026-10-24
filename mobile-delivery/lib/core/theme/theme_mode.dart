import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../prefs.dart';

/// Appearance choice: 'system' (follow the phone), 'light' or 'dark'.
/// The saved value is read in main() and injected via [initialThemeMode].
final initialThemeMode = Provider<String>((_) => 'system');

final themeModeProvider = NotifierProvider<ThemeModeController, String>(
  ThemeModeController.new,
);

class ThemeModeController extends Notifier<String> {
  @override
  String build() => ref.read(initialThemeMode);

  Future<void> set(String mode) async {
    state = mode;
    await saveThemeMode(mode);
  }
}

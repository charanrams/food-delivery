import 'package:flutter/material.dart';

/// Design tokens — mirror of docs/DESIGN_SYSTEM.md §3 and frontend/src/index.css.
/// The delivery app supports light and dark: every token resolves against
/// [A3Colors.dark], which the app root sets from the saved theme choice before
/// building. Because tokens are runtime getters they cannot be used inside
/// `const` expressions.
abstract final class A3Colors {
  static bool dark = false;
  static Color _t(int light, int darkValue) => Color(dark ? darkValue : light);

  static Color get primary => const Color(0xFFF58220);
  static Color get primaryStrong => _t(0xFFB4530A, 0xFFFFB27A);
  static Color get primarySoft => _t(0xFFFFF0E3, 0xFF3A2616);
  static Color get background => _t(0xFFF6F5F2, 0xFF121110);
  static Color get surface => _t(0xFFFFFFFF, 0xFF1D1C1A);
  static Color get ink => _t(0xFF1E1D1B, 0xFFF2F0EC);
  static Color get muted => _t(0xFF62605B, 0xFFADA9A1);
  static Color get line => _t(0xFFE6E4DF, 0xFF35332F);
  static Color get success => _t(0xFF2E7D4F, 0xFF62C48F);
  static Color get danger => _t(0xFFC0392B, 0xFFF0776A);
  static Color get warning => _t(0xFFB7791F, 0xFFE3AE55);
  static Color get frame => _t(0xFFE6721A, 0xFF8A420C);
  static Color get card => _t(0xFFF3F2EF, 0xFF262420);

  /// Soft status tints (success / warning / danger backgrounds).
  static Color get successSoft => _t(0xFFE7F5EC, 0xFF1C3326);
  static Color get warningSoft => _t(0xFFFEF3C7, 0xFF3A2E12);
  static Color get dangerSoft => _t(0xFFFDECEA, 0xFF3A1D1A);
}

abstract final class A3Spacing {
  static const xs = 4.0, sm = 8.0, md = 12.0, lg = 16.0, xl = 24.0, xxl = 32.0;
}

ThemeData buildA3Theme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: A3Colors.primary,
    // Brand orange #F58220 drives buttons, switches, progress and focus. White-on-#F58220 is ~2.6:1,
    // so button labels are bold/16sp; small orange TEXT (links, prices) uses primaryStrong instead.
    primary: A3Colors.primary,
    onPrimary: Colors.white,
    primaryContainer: A3Colors.primarySoft,
    onPrimaryContainer: A3Colors.primaryStrong,
    secondary: A3Colors.primaryStrong,
    surface: A3Colors.surface,
    onSurface: A3Colors.ink,
    error: A3Colors.danger,
    outline: A3Colors.line,
    brightness: A3Colors.dark ? Brightness.dark : Brightness.light,
  );
  // Fonts are bundled in assets/fonts (pubspec.yaml) so they work offline.
  final display = TextStyle(
    fontFamily: 'Outfit',
    fontWeight: FontWeight.w600,
    letterSpacing: -0.4,
    color: A3Colors.ink,
  );
  final text =
      ThemeData(
            useMaterial3: true,
            brightness: A3Colors.dark ? Brightness.dark : Brightness.light,
          ).textTheme
          .apply(
            fontFamily: 'Inter',
            bodyColor: A3Colors.ink,
            displayColor: A3Colors.ink,
          )
          .copyWith(
            displaySmall: display.copyWith(fontSize: 36),
            headlineMedium: display.copyWith(fontSize: 28, height: 1.2),
            headlineSmall: display.copyWith(fontSize: 22),
          );

  return ThemeData(
    useMaterial3: true,
    brightness: A3Colors.dark ? Brightness.dark : Brightness.light,
    fontFamily: 'Inter',
    colorScheme: scheme,
    scaffoldBackgroundColor: A3Colors.background,
    textTheme: text,
    appBarTheme: AppBarTheme(
      backgroundColor: A3Colors.background,
      foregroundColor: A3Colors.ink,
      elevation: 0,
      scrolledUnderElevation: 0,
      titleTextStyle: text.titleLarge?.copyWith(fontWeight: FontWeight.w600),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        backgroundColor: A3Colors.primary,
        foregroundColor: Colors.white,
        disabledBackgroundColor: A3Colors.line,
        disabledForegroundColor: A3Colors.muted,
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(48, 48),
        foregroundColor: A3Colors.primaryStrong,
        side: BorderSide(color: A3Colors.primary),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: A3Colors.primaryStrong,
        minimumSize: const Size(48, 48),
      ),
    ),
    progressIndicatorTheme: ProgressIndicatorThemeData(color: A3Colors.primary),
    cardTheme: CardThemeData(
      color: A3Colors.surface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: A3Colors.line),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: A3Colors.surface,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: A3Colors.line),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: A3Colors.line),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: A3Colors.primary, width: 2),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: A3Colors.surface,
      indicatorColor: A3Colors.primarySoft,
      iconTheme: WidgetStateProperty.resolveWith(
        (s) => IconThemeData(
          color: s.contains(WidgetState.selected)
              ? A3Colors.primary
              : A3Colors.muted,
        ),
      ),
    ),
  );
}

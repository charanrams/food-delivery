import 'package:flutter/material.dart';

/// Design tokens — mirror of docs/DESIGN_SYSTEM.md §3 and frontend/src/index.css.
/// Keep this file identical in mobile-customer and mobile-delivery.
abstract final class A3Colors {
  static const primary = Color(0xFFF58220);
  static const primaryStrong = Color(0xFFB4530A);
  static const primarySoft = Color(0xFFFFF0E3);
  static const background = Color(0xFFF6F5F2);
  static const surface = Color(0xFFFFFFFF);
  static const ink = Color(0xFF1E1D1B);
  static const muted = Color(0xFF62605B);
  static const line = Color(0xFFE6E4DF);
  static const success = Color(0xFF2E7D4F);
  static const danger = Color(0xFFC0392B);
  static const warning = Color(0xFFB7791F);
  static const frame = Color(0xFFE6721A);
  static const card = Color(0xFFF3F2EF);
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
  );
  // Fonts are bundled in assets/fonts (pubspec.yaml) so they work offline.
  const display = TextStyle(
    fontFamily: 'Outfit',
    fontWeight: FontWeight.w600,
    letterSpacing: -0.4,
    color: A3Colors.ink,
  );
  final text = ThemeData(useMaterial3: true).textTheme
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
        side: const BorderSide(color: A3Colors.primary),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: A3Colors.primaryStrong,
        minimumSize: const Size(48, 48),
      ),
    ),
    progressIndicatorTheme: const ProgressIndicatorThemeData(
      color: A3Colors.primary,
    ),
    cardTheme: CardThemeData(
      color: A3Colors.surface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: A3Colors.line),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: A3Colors.surface,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: A3Colors.line),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: A3Colors.line),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: A3Colors.primary, width: 2),
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

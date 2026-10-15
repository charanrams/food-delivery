import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/env.dart';
import '../../core/theme/app_theme.dart';

/// Auth screens use the driveflow app's workflow and layout (centred emblem + headline,
/// divider, one field at a time, Skip top-right) in A3 Kitchen's own palette:
/// cream background, charcoal text, orange accents (docs/DESIGN_SYSTEM.md).
abstract final class AuthColors {
  static const top = A3Colors.background; // cream
  static const bottom = A3Colors.background;
  static const fieldFill = A3Colors.surface;
  static const fieldBorder = A3Colors.line;
  static const text = A3Colors.ink;
  static const textSoft = A3Colors.muted;
  static const hint = A3Colors.muted;
  static const error = A3Colors.danger;
}

final phonePattern = RegExp(r'^[6-9]\d{9}$');
final emailPattern = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

class AuthBackdrop extends StatefulWidget {
  const AuthBackdrop({
    super.key,
    required this.children,
    this.onSkip,
    this.onBack,
  });
  final List<Widget> children;

  /// "Skip" top-right — browse as a guest.
  final VoidCallback? onSkip;

  /// Back arrow top-left (e.g. from the OTP step).
  final VoidCallback? onBack;

  @override
  State<AuthBackdrop> createState() => _AuthBackdropState();
}

class _AuthBackdropState extends State<AuthBackdrop>
    with SingleTickerProviderStateMixin {
  // One entrance: content fades in and rises 24 px (skipped under reduce-motion).
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 650),
  );
  late final _fade = CurvedAnimation(parent: _c, curve: Curves.easeOutCubic);
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    MediaQuery.of(context).disableAnimations ? _c.value = 1 : _c.forward();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion(
      value: SystemUiOverlayStyle
          .dark, // dark status-bar icons on the cream background
      child: Scaffold(
        backgroundColor: AuthColors.top,
        resizeToAvoidBottomInset: true,
        extendBodyBehindAppBar: true,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          surfaceTintColor: Colors.transparent,
          systemOverlayStyle: SystemUiOverlayStyle.dark,
          automaticallyImplyLeading: false,
          leading: widget.onBack == null
              ? null
              : IconButton(
                  tooltip: 'Back',
                  onPressed: widget.onBack,
                  icon: const Icon(
                    Icons.arrow_back,
                    color: AuthColors.textSoft,
                  ),
                ),
          actions: [
            if (widget.onSkip != null)
              TextButton(
                onPressed: widget.onSkip,
                style: TextButton.styleFrom(
                  foregroundColor: AuthColors.textSoft,
                  minimumSize: const Size(64, 48),
                ),
                child: const Text(
                  'Skip',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.2,
                  ),
                ),
              ),
            const SizedBox(width: A3Spacing.xs),
          ],
        ),
        body: Stack(
          children: [
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [AuthColors.top, AuthColors.bottom],
                ),
              ),
              child: SizedBox.expand(),
            ),
            // Warm glow behind the emblem.
            Align(
              alignment: const Alignment(0, -0.45),
              child: Container(
                width: 420,
                height: 420,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      A3Colors.primary.withValues(alpha: 0.10),
                      Colors.transparent,
                    ],
                    stops: const [0, 0.7],
                  ),
                ),
              ),
            ),
            SafeArea(
              child: AnimatedBuilder(
                animation: _fade,
                builder: (context, child) => Opacity(
                  opacity: _fade.value,
                  child: Transform.translate(
                    offset: Offset(0, 24 * (1 - _fade.value)),
                    child: child,
                  ),
                ),
                child: LayoutBuilder(
                  builder: (context, constraints) => SingleChildScrollView(
                    keyboardDismissBehavior:
                        ScrollViewKeyboardDismissBehavior.onDrag,
                    padding: const EdgeInsets.symmetric(
                      horizontal: A3Spacing.xl,
                    ),
                    child: ConstrainedBox(
                      constraints: BoxConstraints(
                        minHeight: constraints.maxHeight,
                      ),
                      child: Center(
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 420),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: widget.children,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Emblem + two-tone headline + fading divider.
class AuthBrand extends StatelessWidget {
  const AuthBrand({super.key, this.compact = false});
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final size = compact ? 84.0 : 116.0;
    final headline = Theme.of(context).textTheme.headlineMedium?.copyWith(
      fontSize: compact ? 24 : 28,
      height: 1.2,
      color: AuthColors.text,
    );
    return Column(
      children: [
        Container(
          width: size,
          height: size,
          padding: const EdgeInsets.all(3),
          decoration: BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
            boxShadow: const [
              BoxShadow(
                color: Color(0x1229231F),
                blurRadius: 28,
                offset: Offset(0, 4),
              ),
            ],
          ),
          child: ClipOval(
            child: Image.asset(
              'assets/images/logo.png',
              semanticLabel: 'A3 Kitchen logo',
            ),
          ),
        ),
        const SizedBox(height: A3Spacing.lg),
        Text.rich(
          TextSpan(
            children: [
              TextSpan(
                text: 'Freshly Prepared. ',
                style: headline?.copyWith(color: A3Colors.primaryStrong),
              ),
              TextSpan(text: 'Delivered with Care.', style: headline),
            ],
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: A3Spacing.lg),
        Container(
          height: 1.5,
          margin: const EdgeInsets.symmetric(horizontal: 40),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                Colors.transparent,
                A3Colors.primary.withValues(alpha: 0.5),
                A3Colors.primary,
                A3Colors.primary.withValues(alpha: 0.5),
                Colors.transparent,
              ],
              stops: const [0, 0.3, 0.5, 0.7, 1],
            ),
          ),
        ),
      ],
    );
  }
}

/// Section title + helper line on the dark backdrop.
class AuthTitle extends StatelessWidget {
  const AuthTitle({super.key, required this.title, required this.subtitle});
  final String title;
  final String subtitle;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        title,
        style: const TextStyle(
          color: AuthColors.text,
          fontSize: 22,
          fontWeight: FontWeight.w700,
        ),
      ),
      const SizedBox(height: 6),
      Text(
        subtitle,
        style: const TextStyle(
          color: AuthColors.textSoft,
          fontSize: 14,
          height: 1.45,
        ),
      ),
    ],
  );
}

/// Translucent field with an orange leading icon (driveflow "glass field").
class GlassField extends StatelessWidget {
  const GlassField({
    super.key,
    required this.controller,
    required this.hint,
    required this.icon,
    this.keyboardType,
    this.textInputAction,
    this.maxLength,
    this.prefixText,
    this.suffix,
    this.enabled = true,
    this.obscureText = false,
    this.autofocus = false,
    this.autofillHints,
    this.digitsOnly = false,
    this.letterSpacing,
    this.textCapitalization = TextCapitalization.none,
    this.onChanged,
    this.onSubmitted,
  });

  final TextEditingController controller;
  final String hint;
  final IconData icon;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final int? maxLength;
  final String? prefixText;
  final Widget? suffix;
  final bool enabled, autofocus, digitsOnly, obscureText;
  final Iterable<String>? autofillHints;
  final double? letterSpacing;
  final TextCapitalization textCapitalization;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;

  @override
  Widget build(BuildContext context) {
    OutlineInputBorder border(Color c, [double w = 1]) => OutlineInputBorder(
      borderRadius: BorderRadius.circular(16),
      borderSide: BorderSide(color: c, width: w),
    );
    return TextField(
      controller: controller,
      enabled: enabled,
      obscureText: obscureText,
      autofocus: autofocus,
      keyboardType: keyboardType,
      textInputAction: textInputAction,
      textCapitalization: textCapitalization,
      autofillHints: autofillHints,
      maxLength: maxLength,
      buildCounter: (
        context, {
        required currentLength,
        required isFocused,
        maxLength,
      }) => null,
      cursorColor: A3Colors.primary,
      style: TextStyle(
        color: enabled ? AuthColors.text : AuthColors.textSoft,
        fontSize: 16,
        letterSpacing: letterSpacing,
      ),
      inputFormatters: [if (digitsOnly) FilteringTextInputFormatter.digitsOnly],
      onChanged: onChanged,
      onSubmitted: onSubmitted,
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(
          color: AuthColors.hint,
          fontSize: 15,
          letterSpacing: 0,
        ),
        // Country code stays visible even before typing (prefixText only shows on focus/input).
        prefixIcon: prefixText == null
            ? Icon(icon, color: A3Colors.primary, size: 20)
            : Padding(
                padding: const EdgeInsets.only(left: 14, right: 10),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(icon, color: A3Colors.primary, size: 20),
                    const SizedBox(width: 10),
                    Text(
                      prefixText!.trim(),
                      style: const TextStyle(
                        color: AuthColors.textSoft,
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    Container(
                      width: 1,
                      height: 22,
                      margin: const EdgeInsets.only(left: 10),
                      color: AuthColors.fieldBorder,
                    ),
                  ],
                ),
              ),
        suffixIcon: suffix,
        filled: true,
        fillColor: AuthColors.fieldFill,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 18,
        ),
        border: border(AuthColors.fieldBorder),
        enabledBorder: border(AuthColors.fieldBorder),
        disabledBorder: border(AuthColors.fieldBorder),
        focusedBorder: border(A3Colors.primary, 1.5),
      ),
    );
  }
}

/// Tall orange primary button with a soft glow and a loading state.
class AuthButton extends StatelessWidget {
  const AuthButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.busy = false,
  });
  final String label;
  final VoidCallback? onPressed;
  final bool busy;

  @override
  Widget build(BuildContext context) => SizedBox(
    height: 56,
    child: ElevatedButton(
      onPressed: busy ? null : onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: A3Colors.primary,
        foregroundColor: Colors.white,
        elevation: 4,
        shadowColor: A3Colors.primary.withValues(alpha: 0.45),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        disabledBackgroundColor: A3Colors.primary.withValues(alpha: 0.6),
        disabledForegroundColor: Colors.white,
        textStyle: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.2,
        ),
      ),
      child: busy
          ? const SizedBox.square(
              dimension: 22,
              child: CircularProgressIndicator(
                strokeWidth: 2.5,
                color: Colors.white,
              ),
            )
          : Text(label),
    ),
  );
}

/// Inline error box (driveflow style).
class AuthError extends StatelessWidget {
  const AuthError(this.message, {super.key});
  final String? message;
  @override
  Widget build(BuildContext context) {
    if (message == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: A3Spacing.lg),
      child: Semantics(
        liveRegion: true,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: AuthColors.error.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Row(
            children: [
              const Icon(
                Icons.error_outline,
                color: AuthColors.error,
                size: 18,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  message!,
                  style: const TextStyle(
                    color: AuthColors.error,
                    fontSize: 13,
                    height: 1.35,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// "Resend OTP in 30s" countdown link.
class ResendOtp extends StatefulWidget {
  const ResendOtp({super.key, required this.onResend, this.seconds = 30});
  final Future<void> Function() onResend;
  final int seconds;
  @override
  State<ResendOtp> createState() => _ResendOtpState();
}

class _ResendOtpState extends State<ResendOtp> {
  late int _left = widget.seconds;
  Timer? _timer;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _start();
  }

  void _start() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_left <= 1) t.cancel();
      if (mounted) setState(() => _left--);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ready = _left <= 0 && !_busy;
    return TextButton(
      onPressed: ready
          ? () async {
              setState(() => _busy = true);
              try {
                await widget.onResend();
                _left = widget.seconds;
                _start();
              } catch (_) {
                // The screen shows the error.
              } finally {
                if (mounted) setState(() => _busy = false);
              }
            }
          : null,
      style: TextButton.styleFrom(
        foregroundColor: A3Colors.primary,
        disabledForegroundColor: AuthColors.hint,
      ),
      child: Text(
        _left > 0
            ? 'Resend OTP in ${_left}s'
            : (_busy ? 'Sending…' : 'Resend OTP'),
        style: const TextStyle(fontWeight: FontWeight.w600),
      ),
    );
  }
}

/// Opens a page of the A3 Kitchen website (e.g. `/terms`) in the in-app browser tab.
Future<void> openWebPage(BuildContext context, String path) async {
  final ok = await launchUrl(
    Uri.parse('${Env.webBaseUrl}$path'),
    mode: LaunchMode.inAppBrowserView,
  ).catchError((_) => false);
  if (!ok && context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Couldn’t open the page. Check your connection and try again.',
        ),
      ),
    );
  }
}

/// "By continuing you agree to the Terms & Conditions and Privacy Policy" — both open the website pages.
class LegalConsent extends StatelessWidget {
  const LegalConsent({super.key, required this.action});
  final String action;

  @override
  Widget build(BuildContext context) {
    const base = TextStyle(color: AuthColors.hint, fontSize: 12, height: 1.4);
    Widget link(String label, String path) => TextButton(
      onPressed: () => openWebPage(context, path),
      style: TextButton.styleFrom(
        foregroundColor: A3Colors.primaryStrong,
        minimumSize: const Size(0, 44),
        padding: const EdgeInsets.symmetric(horizontal: 4),
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        textStyle: base.copyWith(
          fontWeight: FontWeight.w600,
          decoration: TextDecoration.underline,
        ),
      ),
      child: Text(label),
    );
    return Wrap(
      alignment: WrapAlignment.center,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        Text(
          'By $action you agree to A3 Kitchen’s',
          style: base,
          textAlign: TextAlign.center,
        ),
        link('Terms & Conditions', '/terms'),
        const Text('and', style: base),
        link('Privacy Policy', '/privacy'),
      ],
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/theme/app_theme.dart';

/// Shared look for every partner auth screen (login, password, code, forgot, reset):
/// illustrated hero → round icon badge → two-tone title → fields → dark pill button.

/// Page colour under the hero (the illustration fades into it).
const authPage = Color(0xFFFDFBF9);

class AuthLayout extends StatelessWidget {
  const AuthLayout({
    super.key,
    required this.lead,
    required this.accent,
    required this.subtitle,
    required this.badgeIcon,
    required this.children,
    required this.buttonLabel,
    required this.onSubmit,
    required this.onBack,
    this.busy = false,
    this.error,
    this.stepKey,
  });

  /// Title is "[lead][accent]" with the accent in brand orange.
  final String lead, accent, subtitle, buttonLabel;
  final IconData badgeIcon;
  final List<Widget> children;
  final VoidCallback onSubmit;
  final VoidCallback? onBack;
  final bool busy;
  final String? error;

  /// Changes when the content should cross-fade (e.g. login step).
  final Object? stepKey;

  @override
  Widget build(BuildContext context) {
    final reduce = MediaQuery.of(context).disableAnimations;
    return AnnotatedRegion(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: authPage,
        body: LayoutBuilder(
          builder: (context, box) => SingleChildScrollView(
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: box.maxHeight),
              child: IntrinsicHeight(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _Hero(
                      onBack: busy ? null : onBack,
                      onInfo: () => showPartnerInfo(context),
                    ),
                    Expanded(
                      child: Padding(
                        padding: EdgeInsets.fromLTRB(
                          24,
                          0,
                          24,
                          16 + MediaQuery.of(context).padding.bottom,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            // Badge overlaps the hero's wave.
                            Transform.translate(
                              offset: const Offset(0, -46),
                              child: Center(child: _Badge(badgeIcon)),
                            ),
                            Transform.translate(
                              offset: const Offset(0, -30),
                              child: AnimatedSwitcher(
                                duration: Duration(
                                  milliseconds: reduce ? 0 : 320,
                                ),
                                switchInCurve: Curves.easeOutCubic,
                                transitionBuilder: (child, a) => FadeTransition(
                                  opacity: a,
                                  child: SlideTransition(
                                    position: Tween(
                                      begin: const Offset(0.06, 0),
                                      end: Offset.zero,
                                    ).animate(a),
                                    child: child,
                                  ),
                                ),
                                child: Column(
                                  key: ValueKey(stepKey),
                                  crossAxisAlignment:
                                      CrossAxisAlignment.stretch,
                                  children: [
                                    Text.rich(
                                      TextSpan(
                                        text: lead,
                                        children: [
                                          TextSpan(
                                            text: accent,
                                            style: const TextStyle(
                                              color: A3Colors.primary,
                                            ),
                                          ),
                                        ],
                                      ),
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(
                                        fontFamily: 'Outfit',
                                        fontSize: 32,
                                        height: 1.1,
                                        fontWeight: FontWeight.w700,
                                        letterSpacing: -0.6,
                                        color: A3Colors.ink,
                                      ),
                                    ),
                                    const SizedBox(height: 10),
                                    Text(
                                      subtitle,
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(
                                        color: A3Colors.muted,
                                        height: 1.5,
                                        fontSize: 15,
                                      ),
                                    ),
                                    const SizedBox(height: 24),
                                    ...children,
                                    if (error != null) ...[
                                      const SizedBox(height: 12),
                                      AuthErrorNote(error!),
                                    ],
                                  ],
                                ),
                              ),
                            ),
                            const Spacer(),
                            _ContinueButton(
                              label: buttonLabel,
                              busy: busy,
                              onPressed: onSubmit,
                            ),
                            const SizedBox(height: 16),
                            const Text(
                              'Partner accounts are created by A3 Kitchen. Need help? Contact the kitchen.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: A3Colors.muted,
                                fontSize: 13,
                                height: 1.45,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

void showPartnerInfo(BuildContext context) {
  showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    backgroundColor: Colors.white,
    builder: (_) => const SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(24, 0, 24, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Partner accounts',
              style: TextStyle(
                fontFamily: 'Outfit',
                fontSize: 20,
                fontWeight: FontWeight.w700,
              ),
            ),
            SizedBox(height: 4),
            _InfoLine(
              Icons.badge_outlined,
              'A3 Kitchen creates your partner account and emails your login details.',
            ),
            _InfoLine(
              Icons.phone_android_rounded,
              'Log in with your registered mobile number (code) or email (password).',
            ),
            _InfoLine(
              Icons.toggle_on_outlined,
              'Go online when you start your shift; orders are assigned to you automatically.',
            ),
            _InfoLine(
              Icons.support_agent_rounded,
              'Can’t log in? Contact the kitchen manager.',
            ),
          ],
        ),
      ),
    ),
  );
}

/// Illustrated header (rider, city, A3 Kitchen mark). The back button and "Partner Info"
/// are drawn in the artwork; real buttons sit exactly on top of them.
class _Hero extends StatelessWidget {
  const _Hero({required this.onBack, required this.onInfo});
  final VoidCallback? onBack;
  final VoidCallback onInfo;

  // Artwork is 845 × 825; hot-spots are measured on it and scale with the width.
  static const _w = 845.0, _h = 825.0;

  @override
  Widget build(BuildContext context) => AspectRatio(
    aspectRatio: _w / _h,
    child: LayoutBuilder(
      builder: (context, c) {
        final k = c.maxWidth / _w;
        return Stack(
          fit: StackFit.expand,
          children: [
            Semantics(
              image: true,
              label: 'A3 Kitchen delivery partner on a scooter. Delivery Partner: partner with us to deliver happiness.',
              child: Image.asset(
                'assets/images/login_hero.jpg',
                fit: BoxFit.cover,
                cacheWidth:
                    (c.maxWidth * MediaQuery.of(context).devicePixelRatio)
                        .round(),
              ),
            ),
            Positioned(
              left: 48 * k,
              top: 72 * k,
              width: 74 * k,
              height: 74 * k,
              child: _HotSpot(label: 'Back', onTap: onBack, circle: true),
            ),
            Positioned(
              left: 600 * k,
              top: 76 * k,
              width: 210 * k,
              height: 52 * k,
              child: _HotSpot(label: 'Partner info', onTap: onInfo),
            ),
          ],
        );
      },
    ),
  );
}

class _HotSpot extends StatelessWidget {
  const _HotSpot({
    required this.label,
    required this.onTap,
    this.circle = false,
  });
  final String label;
  final VoidCallback? onTap;
  final bool circle;
  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: label,
    child: Material(
      type: MaterialType.transparency,
      child: InkWell(
        onTap: onTap,
        customBorder: circle
            ? const CircleBorder()
            : RoundedRectangleBorder(borderRadius: BorderRadius.circular(99)),
        splashColor: Colors.white24,
        child: const SizedBox.expand(),
      ),
    ),
  );
}

class _Badge extends StatelessWidget {
  const _Badge(this.icon);
  final IconData icon;
  @override
  Widget build(BuildContext context) => Container(
    width: 92,
    height: 92,
    padding: const EdgeInsets.all(8),
    decoration: const BoxDecoration(
      shape: BoxShape.circle,
      color: Colors.white,
      boxShadow: [
        BoxShadow(
          color: Color(0x1F7A3B10),
          blurRadius: 20,
          offset: Offset(0, 8),
        ),
      ],
    ),
    child: DecoratedBox(
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        color: A3Colors.primarySoft,
      ),
      child: Icon(icon, size: 44, color: A3Colors.primary),
    ),
  );
}

class _ContinueButton extends StatelessWidget {
  const _ContinueButton({
    required this.label,
    required this.busy,
    required this.onPressed,
  });
  final String label;
  final bool busy;
  final VoidCallback onPressed;
  @override
  Widget build(BuildContext context) => SizedBox(
    height: 62,
    child: DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(99),
        boxShadow: const [
          BoxShadow(
            color: Color(0x33F58220),
            blurRadius: 22,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: FilledButton(
        onPressed: busy ? null : onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: A3Colors.ink,
          foregroundColor: Colors.white,
          disabledBackgroundColor: A3Colors.ink.withValues(alpha: 0.7),
          disabledForegroundColor: Colors.white,
          shape: const StadiumBorder(),
          padding: const EdgeInsets.fromLTRB(24, 0, 7, 0),
          textStyle: const TextStyle(
            fontFamily: 'Outfit',
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
        ),
        child: Row(
          children: [
            const SizedBox(width: 48),
            Expanded(
              child: Center(
                child: busy
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.4,
                          color: Colors.white,
                        ),
                      )
                    : Text(label),
              ),
            ),
            Container(
              width: 48,
              height: 48,
              decoration: const BoxDecoration(
                color: A3Colors.primary,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.arrow_forward_rounded,
                color: Colors.white,
                size: 24,
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

/// White rounded input with the icon on a peach disc, as in the mockup.
class AuthField extends StatelessWidget {
  const AuthField({
    super.key,
    required this.controller,
    required this.hint,
    required this.icon,
    this.keyboardType,
    this.obscure = false,
    this.autofocus = false,
    this.maxLength,
    this.digitsOnly = false,
    this.letterSpacing,
    this.suffix,
    this.autofillHints,
    this.textInputAction = TextInputAction.done,
    this.onChanged,
    this.onSubmitted,
  });
  final TextEditingController controller;
  final String hint;
  final IconData icon;
  final TextInputType? keyboardType;
  final bool obscure, autofocus, digitsOnly;
  final int? maxLength;
  final double? letterSpacing;
  final Widget? suffix;
  final Iterable<String>? autofillHints;
  final TextInputAction textInputAction;
  final ValueChanged<String>? onChanged, onSubmitted;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(22),
      boxShadow: const [
        BoxShadow(
          color: Color(0x0F29231F),
          blurRadius: 16,
          offset: Offset(0, 6),
        ),
      ],
    ),
    child: TextField(
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscure,
      autofocus: autofocus,
      maxLength: maxLength,
      autofillHints: autofillHints,
      textInputAction: textInputAction,
      inputFormatters: digitsOnly
          ? [FilteringTextInputFormatter.digitsOnly]
          : null,
      onChanged: onChanged,
      onSubmitted: onSubmitted,
      style: TextStyle(
        fontSize: 16.5,
        fontWeight: FontWeight.w500,
        color: A3Colors.ink,
        letterSpacing: letterSpacing,
      ),
      decoration: InputDecoration(
        hintText: hint,
        counterText: '',
        filled: true,
        fillColor: Colors.white,
        prefixIcon: Padding(
          padding: const EdgeInsets.only(left: 14, right: 10),
          child: Container(
            width: 40,
            height: 40,
            decoration: const BoxDecoration(
              color: A3Colors.primarySoft,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: A3Colors.primary, size: 22),
          ),
        ),
        prefixIconConstraints: const BoxConstraints(
          minWidth: 64,
          minHeight: 40,
        ),
        suffixIcon: suffix,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 24,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(22),
          borderSide: const BorderSide(color: A3Colors.line),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(22),
          borderSide: const BorderSide(color: A3Colors.primary, width: 1.6),
        ),
      ),
    ),
  );
}

/// Eye button for password fields.
class PasswordEye extends StatelessWidget {
  const PasswordEye({super.key, required this.visible, required this.onToggle});
  final bool visible;
  final VoidCallback onToggle;
  @override
  Widget build(BuildContext context) => IconButton(
    tooltip: visible ? 'Hide password' : 'Show password',
    onPressed: onToggle,
    icon: Icon(
      visible ? Icons.visibility_off_outlined : Icons.visibility_outlined,
      color: A3Colors.muted,
      size: 20,
    ),
  );
}

/// "Resend in Ns" / "Resend code" link beside a hint.
class AuthResendRow extends StatelessWidget {
  const AuthResendRow({
    super.key,
    required this.hint,
    required this.resendIn,
    required this.onResend,
    this.leading,
  });
  final String hint;
  final int resendIn;
  final VoidCallback? onResend;

  /// Replaces the hint text (e.g. a "Change mobile number" button).
  final Widget? leading;
  @override
  Widget build(BuildContext context) => Row(
    children: [
      Expanded(
        child: Align(
          alignment: Alignment.centerLeft,
          child:
              leading ??
              Text(
                hint,
                style: const TextStyle(color: A3Colors.muted, fontSize: 13),
              ),
        ),
      ),
      TextButton(
        onPressed: resendIn > 0 ? null : onResend,
        style: TextButton.styleFrom(foregroundColor: A3Colors.primaryStrong),
        child: Text(resendIn > 0 ? 'Resend in ${resendIn}s' : 'Resend code'),
      ),
    ],
  );
}

/// Shows the login code the server returned (no SMS provider yet).
class AuthCodeNote extends StatelessWidget {
  const AuthCodeNote({super.key, required this.code});
  final String code;
  @override
  Widget build(BuildContext context) => Semantics(
    liveRegion: true,
    label: 'Your login code is ${code.split('').join(' ')}',
    child: ExcludeSemantics(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: A3Colors.primarySoft,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          children: [
            const Icon(
              Icons.sms_outlined,
              color: A3Colors.primaryStrong,
              size: 20,
            ),
            const SizedBox(width: 10),
            const Expanded(
              child: Text(
                'Your login code',
                style: TextStyle(
                  color: A3Colors.ink,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            Text(
              code,
              style: const TextStyle(
                fontFamily: 'Outfit',
                fontSize: 20,
                fontWeight: FontWeight.w700,
                letterSpacing: 3,
                color: A3Colors.primaryStrong,
                fontFeatures: [FontFeature.tabularFigures()],
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class _InfoLine extends StatelessWidget {
  const _InfoLine(this.icon, this.text);
  final IconData icon;
  final String text;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 12),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 22, color: A3Colors.primaryStrong),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(fontSize: 14.5, height: 1.45),
          ),
        ),
      ],
    ),
  );
}

class AuthErrorNote extends StatelessWidget {
  const AuthErrorNote(this.message, {super.key});
  final String message;
  @override
  Widget build(BuildContext context) => Semantics(
    liveRegion: true,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: A3Colors.danger.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.error_outline_rounded,
            color: A3Colors.danger,
            size: 20,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                color: A3Colors.danger,
                fontSize: 13.5,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

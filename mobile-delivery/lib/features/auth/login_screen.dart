import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import 'auth_controller.dart';

enum _Step { identifier, password, otp }

/// Partner login, same workflow as the customer app and styled like onboarding:
/// one field (mobile number or email) → mobile = login code, email = password.
/// Partner accounts are created by the kitchen, so there's no sign-up here.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _id = TextEditingController();
  final _password = TextEditingController();
  final _otp = TextEditingController();
  _Step _step = _Step.identifier;
  bool _busy = false, _showPassword = false;
  String? _error, _devCode;
  int _resendIn = 0;
  Timer? _resendTimer;

  static final _email = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
  static final _phone = RegExp(r'^[6-9]\d{9}$');

  AuthController get _auth => ref.read(authProvider.notifier);

  String get _phoneDigits {
    final d = _id.text.replaceAll(RegExp(r'\D'), '');
    return d.length == 12 && d.startsWith('91') ? d.substring(2) : d;
  }

  @override
  void dispose() {
    _resendTimer?.cancel();
    for (final c in [_id, _password, _otp]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _run(Future<void> Function() action) async {
    if (_busy) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _continue() async {
    final raw = _id.text.trim();
    final isEmail = raw.contains('@');
    if (isEmail ? !_email.hasMatch(raw) : !_phone.hasMatch(_phoneDigits)) {
      return setState(
        () => _error = 'Enter your 10-digit mobile number or email.',
      );
    }
    await _run(() async {
      final r = await _auth.checkIdentifier(raw);
      if (!r.exists) {
        setState(
          () => _error =
              'No partner account uses this ${r.isEmail ? 'email' : 'number'}. Please contact the kitchen.',
        );
        return;
      }
      if (r.isEmail) {
        _password.clear();
        setState(() => _step = _Step.password);
      } else {
        _otp.clear();
        await _sendCode();
        setState(() => _step = _Step.otp);
      }
    });
  }

  Future<void> _sendCode() async {
    final code = await _auth.sendPhoneOtp(_phoneDigits);
    // No SMS provider yet: the server hands the code back, so fill it in.
    _devCode = code;
    if (code != null) _otp.text = code;
    _startResendTimer();
  }

  void _startResendTimer() {
    _resendTimer?.cancel();
    setState(() => _resendIn = 30);
    _resendTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return t.cancel();
      setState(() => _resendIn--);
      if (_resendIn <= 0) t.cancel();
    });
  }

  Future<void> _login() async {
    if (_step == _Step.password && _password.text.isEmpty) {
      return setState(() => _error = 'Enter your password.');
    }
    if (_step == _Step.otp && _otp.text.length != 6) {
      return setState(() => _error = 'Enter the 6-digit code.');
    }
    await _run(() async {
      _step == _Step.password
          ? await _auth.login(_id.text.trim(), _password.text)
          : await _auth.loginWithOtp(_phoneDigits, _otp.text);
      HapticFeedback.lightImpact();
      if (mounted) context.go('/');
    });
  }

  void _back() {
    if (_step == _Step.identifier) {
      context.go('/onboarding');
      return;
    }
    _resendTimer?.cancel();
    setState(() {
      _step = _Step.identifier;
      _error = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final (title, subtitle) = switch (_step) {
      _Step.identifier => (
        'Delivery Partner',
        'Log in with your mobile number or email to start your shift.',
      ),
      _Step.password => ('Enter your password', _id.text.trim()),
      _Step.otp => ('Enter the code', 'Sent for +91 $_phoneDigits'),
    };
    return AnnotatedRegion(
      value: SystemUiOverlayStyle.dark,
      child: Scaffold(
        backgroundColor: A3Colors.surface,
        body: Stack(
          children: [
            // Same warm wash as onboarding.
            const Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.center,
                    colors: [
                      Color(0xFFFFE3CC),
                      Color(0xFFFFF4EA),
                      Colors.white,
                    ],
                  ),
                ),
              ),
            ),
            SafeArea(
              child: LayoutBuilder(
                builder: (context, box) => SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(24, 6, 24, 24),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(minHeight: box.maxHeight - 30),
                    child: IntrinsicHeight(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Align(
                            alignment: Alignment.centerLeft,
                            child: IconButton(
                              tooltip: 'Back',
                              onPressed: _busy ? null : _back,
                              style: IconButton.styleFrom(
                                backgroundColor: Colors.white.withValues(
                                  alpha: 0.8,
                                ),
                              ),
                              icon: const Icon(Icons.chevron_left_rounded),
                            ),
                          ),
                          const SizedBox(height: 20),
                          const Center(child: _HeroMark()),
                          const SizedBox(height: 28),
                          AnimatedSwitcher(
                            duration: Duration(
                              milliseconds:
                                  MediaQuery.of(context).disableAnimations
                                  ? 0
                                  : 320,
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
                              key: ValueKey(_step),
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Text(
                                  title,
                                  textAlign: TextAlign.center,
                                  style: text.headlineMedium?.copyWith(
                                    fontSize: 28,
                                    height: 1.15,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: -0.4,
                                  ),
                                ),
                                const SizedBox(height: 10),
                                Text(
                                  subtitle,
                                  textAlign: TextAlign.center,
                                  style: text.bodyLarge?.copyWith(
                                    color: A3Colors.muted,
                                    height: 1.5,
                                    fontSize: 15,
                                  ),
                                ),
                                const SizedBox(height: 28),
                                ..._fields(),
                              ],
                            ),
                          ),
                          if (_error != null) ...[
                            const SizedBox(height: 14),
                            _ErrorNote(_error!),
                          ],
                          const Spacer(),
                          const SizedBox(height: 24),
                          SizedBox(
                            height: 56,
                            child: FilledButton(
                              onPressed: _busy
                                  ? null
                                  : (_step == _Step.identifier
                                        ? _continue
                                        : _login),
                              style: FilledButton.styleFrom(
                                backgroundColor: A3Colors.ink,
                                foregroundColor: Colors.white,
                                disabledBackgroundColor: A3Colors.ink
                                    .withValues(alpha: 0.6),
                                shape: const StadiumBorder(),
                                textStyle: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              child: _busy
                                  ? const SizedBox(
                                      width: 22,
                                      height: 22,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2.4,
                                        color: Colors.white,
                                      ),
                                    )
                                  : Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: [
                                        Text(
                                          _step == _Step.identifier
                                              ? 'Continue'
                                              : 'Log in',
                                        ),
                                        const SizedBox(width: 8),
                                        const Icon(
                                          Icons.arrow_forward_rounded,
                                          size: 20,
                                        ),
                                      ],
                                    ),
                            ),
                          ),
                          const SizedBox(height: 14),
                          const Text(
                            'Partner accounts are created by A3 Kitchen. Need help? Contact the kitchen.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: A3Colors.muted,
                              fontSize: 13,
                              height: 1.4,
                            ),
                          ),
                        ],
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

  List<Widget> _fields() => switch (_step) {
    _Step.identifier => [
      _Field(
        controller: _id,
        hint: 'Mobile number or email',
        icon: Icons.person_outline_rounded,
        keyboardType: TextInputType.emailAddress,
        autofillHints: const [AutofillHints.username],
        onChanged: (_) => setState(() => _error = null),
        onSubmitted: (_) => _continue(),
      ),
    ],
    _Step.password => [
      _Field(
        controller: _password,
        hint: 'Password',
        icon: Icons.lock_outline_rounded,
        obscure: !_showPassword,
        autofocus: true,
        autofillHints: const [AutofillHints.password],
        suffix: IconButton(
          tooltip: _showPassword ? 'Hide password' : 'Show password',
          onPressed: () => setState(() => _showPassword = !_showPassword),
          icon: Icon(
            _showPassword
                ? Icons.visibility_off_outlined
                : Icons.visibility_outlined,
            color: A3Colors.muted,
            size: 20,
          ),
        ),
        onChanged: (_) => setState(() => _error = null),
        onSubmitted: (_) => _login(),
      ),
      Align(
        alignment: Alignment.centerRight,
        child: TextButton(
          onPressed: () => context.push('/forgot-password'),
          style: TextButton.styleFrom(foregroundColor: A3Colors.primaryStrong),
          child: const Text('Forgot password?'),
        ),
      ),
    ],
    _Step.otp => [
      _Field(
        controller: _otp,
        hint: '6-digit code',
        icon: Icons.pin_outlined,
        keyboardType: TextInputType.number,
        maxLength: 6,
        digitsOnly: true,
        letterSpacing: 6,
        autofocus: _devCode == null,
        autofillHints: const [AutofillHints.oneTimeCode],
        onChanged: (_) => setState(() => _error = null),
        onSubmitted: (_) => _login(),
      ),
      const SizedBox(height: 8),
      Row(
        children: [
          Expanded(
            child: Text(
              _devCode != null
                  ? 'Your code is $_devCode (filled in for you)'
                  : 'Code sent to +91 $_phoneDigits',
              style: const TextStyle(color: A3Colors.muted, fontSize: 13),
            ),
          ),
          TextButton(
            onPressed: _busy || _resendIn > 0 ? null : () => _run(_sendCode),
            style: TextButton.styleFrom(
              foregroundColor: A3Colors.primaryStrong,
            ),
            child: Text(
              _resendIn > 0 ? 'Resend in ${_resendIn}s' : 'Resend code',
            ),
          ),
        ],
      ),
    ],
  };
}

/// Scooter on a peach disc with a white ring — the onboarding's icon style.
class _HeroMark extends StatelessWidget {
  const _HeroMark();
  @override
  Widget build(BuildContext context) => Container(
    width: 112,
    height: 112,
    padding: const EdgeInsets.all(6),
    decoration: const BoxDecoration(
      shape: BoxShape.circle,
      color: Colors.white,
      boxShadow: [
        BoxShadow(
          color: Color(0x2E7A3B10),
          blurRadius: 18,
          offset: Offset(0, 8),
        ),
      ],
    ),
    child: const DecoratedBox(
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: A3Colors.primarySoft,
      ),
      child: Icon(
        Icons.two_wheeler_rounded,
        size: 50,
        color: A3Colors.primaryStrong,
      ),
    ),
  );
}

class _Field extends StatelessWidget {
  const _Field({
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
  final ValueChanged<String>? onChanged, onSubmitted;

  @override
  Widget build(BuildContext context) => TextField(
    controller: controller,
    keyboardType: keyboardType,
    obscureText: obscure,
    autofocus: autofocus,
    maxLength: maxLength,
    autofillHints: autofillHints,
    textInputAction: TextInputAction.done,
    inputFormatters: digitsOnly
        ? [FilteringTextInputFormatter.digitsOnly]
        : null,
    onChanged: onChanged,
    onSubmitted: onSubmitted,
    style: TextStyle(
      fontSize: 16,
      fontWeight: FontWeight.w600,
      letterSpacing: letterSpacing,
    ),
    decoration: InputDecoration(
      hintText: hint,
      counterText: '',
      filled: true,
      fillColor: Colors.white,
      prefixIcon: Icon(icon, color: A3Colors.primary),
      suffixIcon: suffix,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: const BorderSide(color: A3Colors.line),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(18),
        borderSide: const BorderSide(color: A3Colors.primary, width: 1.6),
      ),
    ),
  );
}

class _ErrorNote extends StatelessWidget {
  const _ErrorNote(this.message);
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

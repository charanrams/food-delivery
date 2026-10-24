import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import 'auth_controller.dart';
import 'auth_layout.dart';

enum _Step { identifier, password, otp }

/// Partner login, same workflow as the customer app:
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
  void initState() {
    super.initState();
    _id.addListener(() => setState(() {})); // shows/hides the clear button
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
    return switch (_step) {
      _Step.identifier => AuthLayout(
        stepKey: _step,
        lead: 'Delivery ',
        accent: 'Partner',
        subtitle:
            'Log in with your mobile number or email to start your shift.',
        badgeIcon: Icons.delivery_dining_rounded,
        buttonLabel: 'Continue',
        busy: _busy,
        error: _error,
        onBack: _back,
        onSubmit: _continue,
        children: [
          AuthField(
            controller: _id,
            hint: 'Mobile number or email',
            icon: Icons.person_outline_rounded,
            keyboardType: TextInputType.emailAddress,
            autofillHints: const [AutofillHints.username],
            suffix: _id.text.isEmpty
                ? null
                : IconButton(
                    tooltip: 'Clear',
                    onPressed: _id.clear,
                    icon: const Icon(
                      Icons.cancel_rounded,
                      color: Color(0xFFB9B6B1),
                    ),
                  ),
            onChanged: (_) => setState(() => _error = null),
            onSubmitted: (_) => _continue(),
          ),
        ],
      ),
      _Step.password => AuthLayout(
        stepKey: _step,
        lead: 'Enter ',
        accent: 'Password',
        subtitle: _id.text.trim(),
        badgeIcon: Icons.lock_outline_rounded,
        buttonLabel: 'Log in',
        busy: _busy,
        error: _error,
        onBack: _back,
        onSubmit: _login,
        children: [
          AuthField(
            controller: _password,
            hint: 'Password',
            icon: Icons.lock_outline_rounded,
            obscure: !_showPassword,
            autofocus: true,
            autofillHints: const [AutofillHints.password],
            suffix: PasswordEye(
              visible: _showPassword,
              onToggle: () => setState(() => _showPassword = !_showPassword),
            ),
            onChanged: (_) => setState(() => _error = null),
            onSubmitted: (_) => _login(),
          ),
          // Wraps to two lines on narrow screens / large text instead of overflowing.
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              TextButton.icon(
                onPressed: _busy ? null : _back,
                style: TextButton.styleFrom(foregroundColor: A3Colors.ink),
                icon: const Icon(Icons.edit_outlined, size: 18),
                label: const Text('Change email'),
              ),
              TextButton(
                onPressed: () =>
                    context.push('/forgot-password', extra: _id.text.trim()),
                style: TextButton.styleFrom(
                  foregroundColor: A3Colors.primaryStrong,
                ),
                child: const Text('Forgot password?'),
              ),
            ],
          ),
        ],
      ),
      _Step.otp => AuthLayout(
        stepKey: _step,
        lead: 'Enter ',
        accent: 'Code',
        subtitle: 'Enter the 6-digit code for +91 $_phoneDigits',
        badgeIcon: Icons.sms_outlined,
        buttonLabel: 'Log in',
        busy: _busy,
        error: _error,
        onBack: _back,
        onSubmit: _login,
        children: [
          AuthField(
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
          if (_devCode != null) ...[
            const SizedBox(height: 12),
            // No SMS provider yet: show the code the server sent back.
            AuthCodeNote(code: _devCode!),
          ],
          const SizedBox(height: 4),
          AuthResendRow(
            leading: TextButton.icon(
              onPressed: _busy ? null : _back,
              style: TextButton.styleFrom(foregroundColor: A3Colors.ink),
              icon: const Icon(Icons.edit_outlined, size: 18),
              label: const Text('Change mobile number'),
            ),
            hint: '',
            resendIn: _resendIn,
            onResend: _busy ? null : () => _run(_sendCode),
          ),
        ],
      ),
    };
  }
}

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import 'auth_layout.dart';

/// Reset password with the emailed code (POST /auth/password/reset). Success signs out
/// every device on the server, so the partner logs in again with the new password.
class ResetPasswordScreen extends ConsumerStatefulWidget {
  const ResetPasswordScreen({super.key, this.email});
  final String? email;

  @override
  ConsumerState<ResetPasswordScreen> createState() =>
      _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends ConsumerState<ResetPasswordScreen> {
  final _code = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  bool _busy = false, _show = false;
  String? _error;
  int _resendIn = 60; // the server allows a new code once a minute
  Timer? _timer;

  String get _email => widget.email ?? '';

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  @override
  void dispose() {
    _timer?.cancel();
    for (final c in [_code, _password, _confirm]) {
      c.dispose();
    }
    super.dispose();
  }

  void _startTimer() {
    _timer?.cancel();
    _resendIn = 60;
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return t.cancel();
      setState(() => _resendIn--);
      if (_resendIn <= 0) t.cancel();
    });
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

  Future<void> _reset() async {
    if (_code.text.length != 6) {
      return setState(() => _error = 'Enter the 6-digit code from the email.');
    }
    if (_password.text.length < 8) {
      return setState(
        () => _error = 'Use at least 8 characters for the new password.',
      );
    }
    if (_password.text != _confirm.text) {
      return setState(() => _error = 'Passwords don’t match.');
    }
    await _run(() async {
      await ref.read(apiClientProvider).post('/auth/password/reset', {
        'email': _email,
        'otp': _code.text,
        'password': _password.text,
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Password updated. Log in with your new password.'),
          backgroundColor: A3Colors.success,
        ),
      );
      context.go('/login');
    });
  }

  Future<void> _resend() => _run(() async {
    await ref.read(apiClientProvider).post('/auth/password/forgot', {
      'email': _email,
    });
    _startTimer();
  });

  @override
  Widget build(BuildContext context) {
    void clear() => setState(() => _error = null);
    return AuthLayout(
      lead: 'Reset ',
      accent: 'Password',
      subtitle: _email.isEmpty
          ? 'Enter the code from the email and a new password.'
          : 'We emailed a 6-digit code to $_email',
      badgeIcon: Icons.key_rounded,
      buttonLabel: 'Update password',
      busy: _busy,
      error: _error,
      onBack: () => context.canPop() ? context.pop() : context.go('/login'),
      onSubmit: _reset,
      children: [
        AuthField(
          controller: _code,
          hint: '6-digit code',
          icon: Icons.pin_outlined,
          keyboardType: TextInputType.number,
          maxLength: 6,
          digitsOnly: true,
          letterSpacing: 6,
          autofocus: true,
          autofillHints: const [AutofillHints.oneTimeCode],
          textInputAction: TextInputAction.next,
          onChanged: (_) => clear(),
        ),
        AuthResendRow(
          hint: 'Didn’t get it? Check spam.',
          resendIn: _resendIn,
          onResend: _busy ? null : _resend,
        ),
        AuthField(
          controller: _password,
          hint: 'New password (8+ characters)',
          icon: Icons.lock_outline_rounded,
          obscure: !_show,
          autofillHints: const [AutofillHints.newPassword],
          textInputAction: TextInputAction.next,
          suffix: PasswordEye(
            visible: _show,
            onToggle: () => setState(() => _show = !_show),
          ),
          onChanged: (_) => clear(),
        ),
        const SizedBox(height: 14),
        AuthField(
          controller: _confirm,
          hint: 'Confirm new password',
          icon: Icons.lock_outline_rounded,
          obscure: !_show,
          autofillHints: const [AutofillHints.newPassword],
          onChanged: (_) => clear(),
          onSubmitted: (_) => _reset(),
        ),
      ],
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import 'auth_controller.dart';
import 'auth_widgets.dart';

/// Register: name, email, password + mobile number (no OTP; the number isn't verified).
/// Opened from login when the email / number isn't registered — that value arrives pre-filled.
class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key, this.email, this.phone});
  final String? email;
  final String? phone;

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _name = TextEditingController();
  late final _email = TextEditingController(text: widget.email);
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  late final _phone = TextEditingController(text: widget.phone);
  bool _busy = false, _showPassword = false;
  String? _error;

  @override
  void dispose() {
    for (final c in [_name, _email, _password, _confirm, _phone]) {
      c.dispose();
    }
    super.dispose();
  }

  AuthController get _auth => ref.read(authProvider.notifier);

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

  /// Validates the details; returns an error message or null.
  String? _validate() {
    if (_name.text.trim().length < 2) return 'Enter your full name.';
    if (!emailPattern.hasMatch(_email.text.trim())) {
      return 'Enter a valid email address.';
    }
    if (_password.text.length < 8) {
      return 'Password must be at least 8 characters.';
    }
    if (_password.text != _confirm.text) return 'Passwords don’t match.';
    if (!phonePattern.hasMatch(_phone.text.trim())) {
      return 'Enter a valid 10-digit mobile number.';
    }
    return null;
  }

  Future<void> _create() async {
    final problem = _validate();
    if (problem != null) return setState(() => _error = problem);
    await _run(() async {
      await _auth.signup(
        name: _name.text,
        email: _email.text,
        phone: _phone.text.trim(),
        password: _password.text,
      );
      if (mounted) context.canPop() ? context.pop() : context.go('/');
    });
  }

  Widget _gap() => const SizedBox(height: A3Spacing.md);

  @override
  Widget build(BuildContext context) {
    final eye = IconButton(
      tooltip: _showPassword ? 'Hide password' : 'Show password',
      icon: Icon(
        _showPassword
            ? Icons.visibility_off_outlined
            : Icons.visibility_outlined,
        color: AuthColors.textSoft,
        size: 20,
      ),
      onPressed: () => setState(() => _showPassword = !_showPassword),
    );
    return AuthBackdrop(
      onBack: () => context.pushReplacement('/login'),
      children: [
        const SizedBox(height: A3Spacing.lg),
        const AuthBrand(compact: true),
        const SizedBox(height: 32),
        const AuthTitle(
          title: 'Create your account',
          subtitle: 'Order in a few taps and track every delivery.',
        ),
        const SizedBox(height: A3Spacing.xl),
        AutofillGroup(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              GlassField(
                controller: _name,
                hint: 'Full name',
                icon: Icons.person_outline,
                textCapitalization: TextCapitalization.words,
                textInputAction: TextInputAction.next,
                autofillHints: const [AutofillHints.name],
                autofocus: true,
                onChanged: (_) => setState(() => _error = null),
              ),
              _gap(),
              GlassField(
                controller: _email,
                hint: 'Email',
                icon: Icons.mail_outline,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                autofillHints: const [AutofillHints.email],
                onChanged: (_) => setState(() => _error = null),
              ),
              _gap(),
              GlassField(
                controller: _password,
                hint: 'Password (at least 8 characters)',
                icon: Icons.lock_outline,
                obscureText: !_showPassword,
                textInputAction: TextInputAction.next,
                autofillHints: const [AutofillHints.newPassword],
                suffix: eye,
                onChanged: (_) => setState(() => _error = null),
              ),
              _gap(),
              GlassField(
                controller: _confirm,
                hint: 'Confirm password',
                icon: Icons.lock_outline,
                obscureText: !_showPassword,
                textInputAction: TextInputAction.next,
                autofillHints: const [AutofillHints.newPassword],
                onChanged: (_) => setState(() => _error = null),
              ),
              _gap(),
              GlassField(
                controller: _phone,
                hint: 'Mobile number',
                icon: Icons.phone_iphone,
                prefixText: '+91',
                keyboardType: TextInputType.phone,
                maxLength: 10,
                digitsOnly: true,
                autofillHints: const [AutofillHints.telephoneNumberNational],
                onChanged: (_) => setState(() => _error = null),
                onSubmitted: (_) => _create(),
              ),
            ],
          ),
        ),
        AuthError(_error),
        const SizedBox(height: A3Spacing.xl),
        AuthButton(
          label: 'Create account',
          busy: _busy,
          onPressed: _create,
        ),
        const SizedBox(height: A3Spacing.md),
        TextButton(
          onPressed: () => context.pushReplacement('/login'),
          child: const Text('Already have an account? Log in'),
        ),
        const SizedBox(height: A3Spacing.md),
        const Text(
          'By creating an account you agree to A3 Kitchen’s Terms and Privacy Policy.',
          textAlign: TextAlign.center,
          style: TextStyle(color: AuthColors.hint, fontSize: 12, height: 1.4),
        ),
        const SizedBox(height: A3Spacing.lg),
      ],
    );
  }
}

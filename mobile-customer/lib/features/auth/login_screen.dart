import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import 'auth_controller.dart';
import 'auth_widgets.dart';

enum _Step { identifier, password, otp }

/// One-field login (driveflow workflow):
///   email + registered  → password step
///   phone + registered  → OTP step
///   not registered      → Register, pre-filled with what was typed.
/// "Skip" browses as a guest; ordering asks for a login later.
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
  String? _error;
  String? _devCode;

  @override
  void dispose() {
    _id.dispose();
    _password.dispose();
    _otp.dispose();
    super.dispose();
  }

  AuthController get _auth => ref.read(authProvider.notifier);
  String get _identifier => _id.text.trim();
  String get _phoneDigits => _identifier
      .replaceAll(RegExp(r'\D'), '')
      .replaceFirst(RegExp(r'^91(?=\d{10}$)'), '');

  /// Back to where the user came from (e.g. the cart), else Home.
  void _leave() => context.canPop() ? context.pop() : context.go('/');

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
    final isEmail = _identifier.contains('@');
    if (isEmail
        ? !emailPattern.hasMatch(_identifier)
        : !phonePattern.hasMatch(_phoneDigits)) {
      return setState(
        () => _error = 'Enter a valid email or 10-digit mobile number.',
      );
    }
    await _run(() async {
      final r = await _auth.checkIdentifier(
        isEmail ? _identifier : _phoneDigits,
      );
      if (!mounted) return;
      if (!r.exists) {
        // Not registered: go to Register with the email / number already filled in.
        context.pushReplacement(
          '/register',
          extra: isEmail
              ? (email: _identifier, phone: null)
              : (email: null, phone: _phoneDigits),
        );
        return;
      }
      if (r.isEmail) {
        setState(() {
          _password.clear();
          _step = _Step.password;
        });
      } else {
        final code = await _auth.sendPhoneOtp(_phoneDigits);
        setState(() {
          _devCode = code;
          _otp.text = code ?? ''; // no SMS yet: the server hands the code back, fill it in
          _step = _Step.otp;
        });
      }
    });
  }

  Future<void> _loginWithPassword() async {
    if (_password.text.isEmpty) {
      return setState(() => _error = 'Enter your password.');
    }
    await _run(() async {
      await _auth.loginWithPassword(_identifier, _password.text);
      if (mounted) _leave();
    });
  }

  Future<void> _loginWithOtp() async {
    if (_otp.text.length != 6) {
      return setState(() => _error = 'Enter the 6-digit OTP.');
    }
    await _run(() async {
      await _auth.loginWithOtp(_phoneDigits, _otp.text);
      if (mounted) _leave();
    });
  }

  void _back() => setState(() {
    _step = _Step.identifier;
    _error = null;
  });

  @override
  Widget build(BuildContext context) {
    final (title, subtitle) = switch (_step) {
      _Step.identifier => (
        'Log in or sign up',
        'Enter your email or mobile number to continue.',
      ),
      _Step.password => ('Enter your password', 'Logging in as $_identifier'),
      _Step.otp => (
        'Verify your number',
        'Enter the 6-digit OTP sent to +91 $_phoneDigits.',
      ),
    };
    return PopScope(
      canPop: _step == _Step.identifier,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _back();
      },
      child: AuthBackdrop(
        onSkip: _leave,
        onBack: _step == _Step.identifier ? null : _back,
        children: [
          const SizedBox(height: A3Spacing.xl),
          const AuthBrand(),
          const SizedBox(height: 40),
          AuthTitle(title: title, subtitle: subtitle),
          const SizedBox(height: A3Spacing.xl),
          ...switch (_step) {
            _Step.identifier => [
              GlassField(
                controller: _id,
                hint: 'Email or mobile number',
                icon: Icons.person_outline,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.done,
                autofillHints: const [
                  AutofillHints.email,
                  AutofillHints.telephoneNumber,
                ],
                onChanged: (_) => setState(() => _error = null),
                onSubmitted: (_) => _continue(),
              ),
            ],
            _Step.password => [
              GlassField(
                controller: _password,
                hint: 'Password',
                icon: Icons.lock_outline,
                obscureText: !_showPassword,
                autofocus: true,
                textInputAction: TextInputAction.done,
                autofillHints: const [AutofillHints.password],
                suffix: IconButton(
                  tooltip: _showPassword ? 'Hide password' : 'Show password',
                  icon: Icon(
                    _showPassword
                        ? Icons.visibility_off_outlined
                        : Icons.visibility_outlined,
                    color: AuthColors.textSoft,
                    size: 20,
                  ),
                  onPressed: () =>
                      setState(() => _showPassword = !_showPassword),
                ),
                onChanged: (_) => setState(() => _error = null),
                onSubmitted: (_) => _loginWithPassword(),
              ),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: _back,
                  child: const Text('Change email'),
                ),
              ),
            ],
            _Step.otp => [
              GlassField(
                controller: _otp,
                hint: '6-digit OTP',
                icon: Icons.sms_outlined,
                keyboardType: TextInputType.number,
                textInputAction: TextInputAction.done,
                autofillHints: const [AutofillHints.oneTimeCode],
                maxLength: 6,
                digitsOnly: true,
                letterSpacing: 6,
                autofocus: true,
                onChanged: (v) {
                  setState(() => _error = null);
                  if (v.length == 6) {
                    _loginWithOtp(); // auto-submit once all digits are in
                  }
                },
                onSubmitted: (_) => _loginWithOtp(),
              ),
              if (_devCode != null)
                Padding(
                  padding: const EdgeInsets.only(top: A3Spacing.sm),
                  child: Text(
                    'Your code is $_devCode (filled in for you)',
                    style: const TextStyle(
                      color: AuthColors.hint,
                      fontSize: 13,
                    ),
                  ),
                ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  TextButton(
                    onPressed: _back,
                    style: TextButton.styleFrom(
                      foregroundColor: AuthColors.textSoft,
                    ),
                    child: const Text('Change mobile number'),
                  ),
                  ResendOtp(
                    onResend: () async {
                      try {
                        final code = await _auth.sendPhoneOtp(_phoneDigits);
                        setState(() {
                          _devCode = code;
                          _otp.text = code ?? '';
                        });
                      } on ApiException catch (e) {
                        setState(() => _error = e.message);
                        rethrow;
                      }
                    },
                  ),
                ],
              ),
            ],
          },
          AuthError(_error),
          const SizedBox(height: A3Spacing.xl),
          AuthButton(
            label: switch (_step) {
              _Step.identifier => 'Continue',
              _Step.password => 'Log in',
              _Step.otp => 'Verify & log in',
            },
            busy: _busy,
            onPressed: switch (_step) {
              _Step.identifier => _continue,
              _Step.password => _loginWithPassword,
              _Step.otp => _loginWithOtp,
            },
          ),
          const SizedBox(height: A3Spacing.xl),
          const Text(
            'By continuing you agree to A3 Kitchen’s Terms and Privacy Policy.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AuthColors.hint, fontSize: 12, height: 1.4),
          ),
          const SizedBox(height: A3Spacing.lg),
        ],
      ),
    );
  }
}

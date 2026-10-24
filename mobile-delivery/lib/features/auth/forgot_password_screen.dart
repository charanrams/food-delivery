import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import 'auth_layout.dart';

/// Forgot password: emails a 6-digit reset code (POST /auth/password/forgot). The server
/// always answers "sent" so it never reveals which emails have accounts.
class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key, this.email});
  final String? email;

  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  late final _email = TextEditingController(
    text: widget.email?.contains('@') == true ? widget.email : '',
  );
  bool _busy = false;
  String? _error;

  static final _pattern = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final email = _email.text.trim();
    if (!_pattern.hasMatch(email)) {
      return setState(
        () => _error = 'Enter the email on your partner account.',
      );
    }
    FocusScope.of(context).unfocus();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(apiClientProvider).post('/auth/password/forgot', {
        'email': email,
      });
      if (mounted) context.push('/reset-password', extra: email);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => AuthLayout(
    lead: 'Forgot ',
    accent: 'Password?',
    subtitle:
        'Enter your account email and we’ll send you a 6-digit reset code.',
    badgeIcon: Icons.lock_reset_rounded,
    buttonLabel: 'Send code',
    busy: _busy,
    error: _error,
    onBack: () => context.canPop() ? context.pop() : context.go('/login'),
    onSubmit: _send,
    children: [
      AuthField(
        controller: _email,
        hint: 'Email address',
        icon: Icons.mail_outline_rounded,
        keyboardType: TextInputType.emailAddress,
        autofocus: _email.text.isEmpty,
        autofillHints: const [AutofillHints.email],
        onChanged: (_) => setState(() => _error = null),
        onSubmitted: (_) => _send(),
      ),
    ],
  );
}

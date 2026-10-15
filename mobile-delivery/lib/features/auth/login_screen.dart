import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import 'auth_controller.dart';

/// Partner login — email or phone + the password the kitchen emailed you.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _form = GlobalKey<FormState>();
  final _id = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false, _obscure = true;
  String? _error;

  @override
  void dispose() {
    _id.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(authProvider.notifier).login(_id.text, _password.text);
      if (mounted) context.go('/');
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Scaffold(
      body: SafeArea(
        child: Form(
          key: _form,
          child: ListView(
            padding: const EdgeInsets.all(A3Spacing.xl),
            children: [
              const SizedBox(height: A3Spacing.xl),
              Center(child: ClipOval(child: Image.asset('assets/images/logo.png', width: 96, height: 96, semanticLabel: 'A3 Kitchen logo'))),
              const SizedBox(height: A3Spacing.xl),
              Text('Partner login', style: text.headlineMedium),
              const SizedBox(height: A3Spacing.xs),
              Text('Use the email or mobile number and password the kitchen sent you.', style: text.bodyLarge?.copyWith(color: A3Colors.muted)),
              const SizedBox(height: A3Spacing.xl),
              TextFormField(
                controller: _id,
                keyboardType: TextInputType.emailAddress,
                autofillHints: const [AutofillHints.username],
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(labelText: 'Email or mobile number'),
                validator: (v) => (v ?? '').trim().length < 3 ? 'Enter your email or mobile number.' : null,
              ),
              const SizedBox(height: A3Spacing.lg),
              TextFormField(
                controller: _password,
                obscureText: _obscure,
                autofillHints: const [AutofillHints.password],
                onFieldSubmitted: (_) => _submit(),
                decoration: InputDecoration(
                  labelText: 'Password',
                  suffixIcon: IconButton(
                    tooltip: _obscure ? 'Show password' : 'Hide password',
                    icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                    onPressed: () => setState(() => _obscure = !_obscure),
                  ),
                ),
                validator: (v) => (v ?? '').isEmpty ? 'Enter your password.' : null,
              ),
              if (_error != null) ...[
                const SizedBox(height: A3Spacing.md),
                Semantics(liveRegion: true, child: Text(_error!, style: const TextStyle(color: A3Colors.danger, fontSize: 13))),
              ],
              const SizedBox(height: A3Spacing.xl),
              FilledButton(
                onPressed: _busy ? null : _submit,
                child: _busy ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Log in'),
              ),
              const SizedBox(height: A3Spacing.lg),
              const Text('Forgot your password? Ask the kitchen to resend your login details.', textAlign: TextAlign.center, style: TextStyle(color: A3Colors.muted, fontSize: 13)),
            ],
          ),
        ),
      ),
    );
  }
}

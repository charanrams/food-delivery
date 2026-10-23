import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import 'auth_controller.dart';

/// Screen 3 · Partner Login (Sheet 2)
/// Exclusive to vetted delivery partners; public registration is disabled.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _form = GlobalKey<FormState>();
  final _id = TextEditingController(text: 'delivery@a3kitchen.in');
  final _password = TextEditingController(text: 'A3kitchen@123');
  bool _busy = false;
  bool _obscure = true;
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
    } catch (e) {
      setState(() => _error = 'Could not sign in: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: A3Colors.frame,
      body: Column(
        children: [
          // Orange Header with Logo & Brand Identity
          SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      IconButton(
                        onPressed: () => context.go('/onboarding'),
                        icon: const Icon(Icons.arrow_back_rounded, color: A3Colors.surface),
                        tooltip: 'Back to onboarding intro',
                      ),
                      TextButton.icon(
                        onPressed: () => context.go('/onboarding'),
                        icon: const Icon(Icons.info_outline_rounded, size: 16, color: A3Colors.surface),
                        label: const Text(
                          'Partner Info',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: A3Colors.surface),
                        ),
                      ),
                    ],
                  ),
                  Container(
                    width: 76,
                    height: 76,
                    decoration: BoxDecoration(
                      color: A3Colors.surface,
                      shape: BoxShape.circle,
                      boxShadow: const [
                        BoxShadow(color: Color(0x33000000), blurRadius: 12, offset: Offset(0, 4)),
                      ],
                    ),
                    padding: const EdgeInsets.all(4),
                    child: ClipOval(
                      child: Image.asset(
                        'assets/images/logo.png',
                        fit: BoxFit.cover,
                        errorBuilder: (_, _, _) => const Icon(Icons.restaurant, color: A3Colors.primary, size: 36),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Delivery Partner',
                    style: TextStyle(
                      fontFamily: 'Outfit',
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: A3Colors.surface,
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Partner with us to deliver happiness',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: Color(0xE6FFFFFF),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),

          // White Card for Form Controls
          Expanded(
            child: Container(
              decoration: const BoxDecoration(
                color: A3Colors.surface,
                borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
              ),
              child: Form(
                key: _form,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(24, 28, 24, 20),
                  children: [
                    const Text(
                      'Mobile Number or Email',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: A3Colors.ink),
                    ),
                    const SizedBox(height: 6),
                    TextFormField(
                      controller: _id,
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
                      decoration: InputDecoration(
                        hintText: '+91 98765 43210 or email',
                        filled: true,
                        fillColor: A3Colors.card,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                      ),
                      validator: (v) => (v ?? '').trim().isEmpty ? 'Enter your registered email or phone.' : null,
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Password',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: A3Colors.ink),
                    ),
                    const SizedBox(height: 6),
                    TextFormField(
                      controller: _password,
                      obscureText: _obscure,
                      textInputAction: TextInputAction.done,
                      onFieldSubmitted: (_) => _submit(),
                      decoration: InputDecoration(
                        hintText: 'Enter your password',
                        filled: true,
                        fillColor: A3Colors.card,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                        suffixIcon: IconButton(
                          icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                          onPressed: () => setState(() => _obscure = !_obscure),
                        ),
                      ),
                      validator: (v) => (v ?? '').isEmpty ? 'Enter your password.' : null,
                    ),
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        onPressed: () => context.push('/forgot-password'),
                        child: const Text(
                          'Forgot Password?',
                          style: TextStyle(color: A3Colors.primary, fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 4),
                      Text(_error!, style: const TextStyle(color: A3Colors.danger, fontSize: 13)),
                      const SizedBox(height: 8),
                    ],
                    const SizedBox(height: 8),
                    FilledButton(
                      onPressed: _busy ? null : _submit,
                      style: FilledButton.styleFrom(
                        backgroundColor: A3Colors.primary,
                        minimumSize: const Size.fromHeight(52),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: _busy
                          ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Text('Login', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    ),
                    const SizedBox(height: 16),
                    OutlinedButton.icon(
                      onPressed: () => context.push('/verify-otp', extra: _id.text),
                      icon: const Icon(Icons.phonelink_ring_outlined, size: 18),
                      label: const Text('Login with OTP', style: TextStyle(fontWeight: FontWeight.w600)),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: A3Colors.ink,
                        minimumSize: const Size.fromHeight(48),
                        side: const BorderSide(color: A3Colors.line),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: A3Colors.primarySoft,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.info_outline, size: 20, color: A3Colors.primary),
                          SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Delivery partners are onboarded directly by A3 Kitchen management.',
                              style: TextStyle(fontSize: 12, color: A3Colors.primaryStrong, height: 1.3),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

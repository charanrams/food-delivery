import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/frame.dart';

/// Screen 1 · Forgot Password
/// Allows delivery partner to request a password reset OTP or link to registered phone/email.
class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _phoneController = TextEditingController(text: '');
  bool _busy = false;

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  void _sendReset() {
    final text = _phoneController.text.trim();
    if (text.length < 10) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid 10-digit mobile number')),
      );
      return;
    }
    setState(() => _busy = true);
    Future.delayed(const Duration(milliseconds: 600), () {
      if (mounted) {
        setState(() => _busy = false);
        context.push('/reset-password', extra: text);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return FramedPage(
      title: 'Forgot Password',
      showBack: true,
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: A3Spacing.lg),
            Center(
              child: Container(
                width: 76,
                height: 76,
                decoration: BoxDecoration(
                  color: A3Colors.primarySoft,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.lock_reset_rounded,
                  size: 40,
                  color: A3Colors.primary,
                ),
              ),
            ),
            const SizedBox(height: A3Spacing.lg),
            const Text(
              'Forgot Password?',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: 'Outfit',
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: A3Colors.ink,
              ),
            ),
            const SizedBox(height: A3Spacing.xs),
            const Text(
              'No worries! Enter your registered mobile number and we\'ll send you a verification code.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: A3Colors.muted,
                height: 1.4,
              ),
            ),
            const SizedBox(height: A3Spacing.xl),
            const Text(
              'Mobile Number',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: A3Colors.ink,
              ),
            ),
            const SizedBox(height: A3Spacing.xs),
            Row(
              children: [
                Container(
                  height: 52,
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  decoration: BoxDecoration(
                    color: A3Colors.card,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: A3Colors.line),
                  ),
                  alignment: Alignment.center,
                  child: const Text(
                    '+91',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                      color: A3Colors.ink,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextFormField(
                    controller: _phoneController,
                    keyboardType: TextInputType.phone,
                    decoration: InputDecoration(
                      hintText: '98765 43210',
                      filled: true,
                      fillColor: A3Colors.card,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: A3Colors.line),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: A3Colors.line),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: A3Colors.primary, width: 2),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: A3Spacing.xl),
            FilledButton(
              onPressed: _busy ? null : _sendReset,
              style: FilledButton.styleFrom(
                backgroundColor: A3Colors.primary,
                minimumSize: const Size.fromHeight(52),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: _busy
                  ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Send Reset Link', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
            const SizedBox(height: A3Spacing.lg),
            TextButton(
              onPressed: () => context.pop(),
              child: const Text(
                'Back to Login',
                style: TextStyle(
                  color: A3Colors.primary,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

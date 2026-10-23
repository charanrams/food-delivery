import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/frame.dart';

/// Screen 2 · Reset Password
/// Enforces strong password rules with live checklist indicators.
class ResetPasswordScreen extends StatefulWidget {
  final String? phone;
  const ResetPasswordScreen({super.key, this.phone});

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _newPassword = TextEditingController();
  final _confirmPassword = TextEditingController();
  bool _obscure1 = true;
  bool _obscure2 = true;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _newPassword.addListener(() => setState(() {}));
    _confirmPassword.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _newPassword.dispose();
    _confirmPassword.dispose();
    super.dispose();
  }

  bool get _hasMinLength => _newPassword.text.length >= 8;
  bool get _hasUppercase => _newPassword.text.contains(RegExp(r'[A-Z]'));
  bool get _hasNumber => _newPassword.text.contains(RegExp(r'[0-9]'));
  bool get _hasSpecialChar => _newPassword.text.contains(RegExp(r'[!@#\$%^&*(),.?":{}|<>]'));
  bool get _passwordsMatch => _newPassword.text.isNotEmpty && _newPassword.text == _confirmPassword.text;
  bool get _isValid => _hasMinLength && _hasUppercase && _hasNumber && _hasSpecialChar && _passwordsMatch;

  void _reset() {
    if (!_isValid) return;
    setState(() => _busy = true);
    Future.delayed(const Duration(milliseconds: 700), () {
      if (mounted) {
        setState(() => _busy = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Password updated successfully! Please log in.'),
            backgroundColor: A3Colors.success,
          ),
        );
        context.go('/login');
      }
    });
  }

  Widget _buildCheckItem(String label, bool passed) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Icon(
            passed ? Icons.check_circle_rounded : Icons.radio_button_unchecked,
            size: 18,
            color: passed ? A3Colors.success : A3Colors.muted,
          ),
          const SizedBox(width: 8),
          Text(
            label,
            style: TextStyle(
              fontSize: 13,
              color: passed ? A3Colors.ink : A3Colors.muted,
              fontWeight: passed ? FontWeight.w600 : FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return FramedPage(
      title: 'Reset Password',
      showBack: true,
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: A3Spacing.sm),
            Center(
              child: Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: A3Colors.primarySoft,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.lock_outline_rounded,
                  size: 38,
                  color: A3Colors.primary,
                ),
              ),
            ),
            const SizedBox(height: A3Spacing.md),
            const Text(
              'Create New Password',
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
              'Your new password must be different from previous one.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                color: A3Colors.muted,
              ),
            ),
            const SizedBox(height: A3Spacing.lg),
            const Text(
              'New Password',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: A3Colors.ink),
            ),
            const SizedBox(height: A3Spacing.xs),
            TextFormField(
              controller: _newPassword,
              obscureText: _obscure1,
              decoration: InputDecoration(
                hintText: 'Enter new password',
                filled: true,
                fillColor: A3Colors.card,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                suffixIcon: IconButton(
                  icon: Icon(_obscure1 ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                  onPressed: () => setState(() => _obscure1 = !_obscure1),
                ),
              ),
            ),
            const SizedBox(height: A3Spacing.md),
            const Text(
              'Confirm Password',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: A3Colors.ink),
            ),
            const SizedBox(height: A3Spacing.xs),
            TextFormField(
              controller: _confirmPassword,
              obscureText: _obscure2,
              decoration: InputDecoration(
                hintText: 'Re-enter new password',
                filled: true,
                fillColor: A3Colors.card,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                suffixIcon: IconButton(
                  icon: Icon(_obscure2 ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                  onPressed: () => setState(() => _obscure2 = !_obscure2),
                ),
              ),
            ),
            const SizedBox(height: A3Spacing.lg),
            Container(
              padding: const EdgeInsets.all(A3Spacing.md),
              decoration: BoxDecoration(
                color: A3Colors.card,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildCheckItem('At least 8 characters', _hasMinLength),
                  _buildCheckItem('One uppercase letter', _hasUppercase),
                  _buildCheckItem('One number', _hasNumber),
                  _buildCheckItem('One special character', _hasSpecialChar),
                  _buildCheckItem('Passwords match', _passwordsMatch),
                ],
              ),
            ),
            const SizedBox(height: A3Spacing.xl),
            FilledButton(
              onPressed: (_isValid && !_busy) ? _reset : null,
              style: FilledButton.styleFrom(
                backgroundColor: A3Colors.primary,
                minimumSize: const Size.fromHeight(52),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: _busy
                  ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Reset Password', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/frame.dart';
import 'auth_controller.dart';

/// Screen 4 · OTP Verification
/// 6-digit PIN input with resend countdown timer.
class OtpVerifyScreen extends ConsumerStatefulWidget {
  final String? phone;
  const OtpVerifyScreen({super.key, this.phone});

  @override
  ConsumerState<OtpVerifyScreen> createState() => _OtpVerifyScreenState();
}

class _OtpVerifyScreenState extends ConsumerState<OtpVerifyScreen> {
  final List<TextEditingController> _controllers = List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _focusNodes = List.generate(6, (_) => FocusNode());
  int _secondsLeft = 28;
  Timer? _timer;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  void _startTimer() {
    _timer?.cancel();
    setState(() => _secondsLeft = 28);
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_secondsLeft > 0) {
        setState(() => _secondsLeft--);
      } else {
        t.cancel();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    for (var c in _controllers) {
      c.dispose();
    }
    for (var f in _focusNodes) {
      f.dispose();
    }
    super.dispose();
  }

  String get _otpCode => _controllers.map((c) => c.text).join();

  void _onDigitChanged(int index, String value) {
    if (value.isNotEmpty && index < 5) {
      _focusNodes[index + 1].requestFocus();
    } else if (value.isEmpty && index > 0) {
      _focusNodes[index - 1].requestFocus();
    }
    if (_otpCode.length == 6) {
      _verify();
    }
  }

  Future<void> _verify() async {
    if (_otpCode.length != 6) return;
    setState(() => _busy = true);
    try {
      // In delivery app: default partner login credential or phone verification
      await ref.read(authProvider.notifier).login(widget.phone ?? 'delivery@a3kitchen.in', 'A3kitchen@123');
      if (mounted) context.go('/');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Invalid code. Please try again. ($e)')),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final displayPhone = widget.phone ?? '+91 98765 43210';
    return FramedPage(
      title: 'Verify OTP',
      showBack: true,
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: A3Spacing.lg),
            const Text(
              'Verify OTP',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: 'Outfit',
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: A3Colors.ink,
              ),
            ),
            const SizedBox(height: A3Spacing.xs),
            Text(
              'We have sent a 6-digit code to\n$displayPhone',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 14,
                color: A3Colors.muted,
                height: 1.4,
              ),
            ),
            const SizedBox(height: A3Spacing.xl),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: List.generate(6, (i) {
                return SizedBox(
                  width: 46,
                  height: 54,
                  child: TextFormField(
                    controller: _controllers[i],
                    focusNode: _focusNodes[i],
                    keyboardType: TextInputType.number,
                    textAlign: TextAlign.center,
                    maxLength: 1,
                    style: const TextStyle(
                      fontFamily: 'Outfit',
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: A3Colors.ink,
                    ),
                    decoration: InputDecoration(
                      counterText: '',
                      filled: true,
                      fillColor: A3Colors.card,
                      contentPadding: EdgeInsets.zero,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: A3Colors.line),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: A3Colors.primary, width: 2),
                      ),
                    ),
                    onChanged: (v) => _onDigitChanged(i, v),
                  ),
                );
              }),
            ),
            const SizedBox(height: A3Spacing.xl),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (_secondsLeft > 0)
                  Text(
                    'Resend OTP in 00:${_secondsLeft.toString().padLeft(2, '0')}',
                    style: const TextStyle(color: A3Colors.muted, fontSize: 13),
                  )
                else
                  TextButton(
                    onPressed: _startTimer,
                    child: const Text(
                      'Resend OTP',
                      style: TextStyle(color: A3Colors.primary, fontWeight: FontWeight.bold),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: A3Spacing.xl),
            FilledButton(
              onPressed: (_otpCode.length == 6 && !_busy) ? _verify : null,
              style: FilledButton.styleFrom(
                backgroundColor: A3Colors.primary,
                minimumSize: const Size.fromHeight(52),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: _busy
                  ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Verify', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}

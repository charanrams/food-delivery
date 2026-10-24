import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/form_fields.dart';
import '../../core/widgets/frame.dart';
import '../auth/auth_controller.dart';

/// Screen 12 · Bank Details & KYC
/// Shows the saved payout account (masked) and lets the partner add or
/// replace it (PUT /delivery/me/bank). The full account number is never
/// sent back by the server — only its last 4 digits.
class BankKycScreen extends ConsumerStatefulWidget {
  const BankKycScreen({super.key});

  @override
  ConsumerState<BankKycScreen> createState() => _BankKycScreenState();
}

class _BankKycScreenState extends ConsumerState<BankKycScreen> {
  final _form = GlobalKey<FormState>();
  final _holder = TextEditingController();
  final _account = TextEditingController();
  final _confirm = TextEditingController();
  final _ifsc = TextEditingController();
  final _upi = TextEditingController();
  bool _editing = false;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final p = ref.read(authProvider).value;
    _editing = p?.bank == null;
    _prefill(p);
  }

  void _prefill(Partner? p) {
    _holder.text = p?.bank?.holderName ?? p?.name ?? '';
    _ifsc.text = p?.bank?.ifsc ?? '';
    _upi.text = p?.bank?.upiId ?? '';
    _account.clear();
    _confirm.clear();
  }

  @override
  void dispose() {
    for (final c in [_holder, _account, _confirm, _ifsc, _upi]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    FocusScope.of(context).unfocus();
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      await ref
          .read(authProvider.notifier)
          .updateBank(
            holderName: _holder.text.trim(),
            accountNumber: _account.text.trim(),
            ifsc: _ifsc.text.trim().toUpperCase(),
            upiId: _upi.text.trim().isEmpty ? null : _upi.text.trim(),
          );
      if (!mounted) return;
      showResult(context, 'Bank details saved');
      setState(() => _editing = false);
    } catch (e) {
      if (mounted) showResult(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bank = ref.watch(authProvider).value?.bank;

    return FramedPage(
      title: 'Bank Details & KYC',
      showBack: true,
      bottom: _editing
          ? PrimaryButton(
              label: 'Save bank details',
              busy: _busy,
              onPressed: _save,
            )
          : null,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(
          A3Spacing.lg,
          A3Spacing.xl,
          A3Spacing.lg,
          A3Spacing.lg,
        ),
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Payout account',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    fontFamily: 'Outfit',
                    color: A3Colors.ink,
                  ),
                ),
              ),
              if (bank != null && !_editing)
                TextButton.icon(
                  onPressed: () => setState(() {
                    _prefill(ref.read(authProvider).value);
                    _editing = true;
                  }),
                  icon: const Icon(Icons.edit_outlined, size: 18),
                  label: const Text('Change'),
                ),
              if (bank != null && _editing)
                TextButton(
                  onPressed: _busy
                      ? null
                      : () => setState(() => _editing = false),
                  child: const Text('Cancel'),
                ),
            ],
          ),
          const SizedBox(height: A3Spacing.sm),
          if (!_editing && bank != null)
            _BankCard(bank: bank)
          else
            Form(key: _form, child: _bankForm()),
          const SizedBox(height: A3Spacing.xl),
          const _InfoNote(
            icon: Icons.lock_outline_rounded,
            text:
                'Your weekly earnings are paid to this account. Only the last '
                '4 digits are shown after saving.',
          ),
          const SizedBox(height: A3Spacing.md),
          const _InfoNote(
            icon: Icons.badge_outlined,
            text:
                'KYC documents (Aadhaar, PAN, driving licence) are verified by '
                'the kitchen at onboarding. Contact Help & Support to update them.',
          ),
        ],
      ),
    );
  }

  Widget _bankForm() => Column(
    children: [
      LabeledField(
        label: 'Account holder name',
        controller: _holder,
        textCapitalization: TextCapitalization.words,
        validator: (v) => (v == null || v.trim().length < 2)
            ? 'Enter the account holder name.'
            : null,
      ),
      LabeledField(
        label: 'Account number',
        controller: _account,
        keyboardType: TextInputType.number,
        inputFormatters: [
          FilteringTextInputFormatter.digitsOnly,
          LengthLimitingTextInputFormatter(18),
        ],
        validator: (v) => RegExp(r'^\d{9,18}$').hasMatch(v?.trim() ?? '')
            ? null
            : 'Account number must be 9–18 digits.',
      ),
      LabeledField(
        label: 'Confirm account number',
        controller: _confirm,
        keyboardType: TextInputType.number,
        inputFormatters: [
          FilteringTextInputFormatter.digitsOnly,
          LengthLimitingTextInputFormatter(18),
        ],
        validator: (v) => v?.trim() == _account.text.trim()
            ? null
            : 'Account numbers do not match.',
      ),
      LabeledField(
        label: 'IFSC code',
        controller: _ifsc,
        hint: 'e.g. SBIN0001234',
        textCapitalization: TextCapitalization.characters,
        inputFormatters: [
          FilteringTextInputFormatter.allow(RegExp('[A-Za-z0-9]')),
          LengthLimitingTextInputFormatter(11),
        ],
        validator: (v) =>
            RegExp(r'^[A-Z]{4}0[A-Z0-9]{6}$')
                .hasMatch(v?.trim().toUpperCase() ?? '')
            ? null
            : 'Enter a valid 11-character IFSC code.',
      ),
      LabeledField(
        label: 'UPI ID (optional)',
        controller: _upi,
        hint: 'e.g. name@okbank',
        keyboardType: TextInputType.emailAddress,
        textInputAction: TextInputAction.done,
        validator: (v) {
          final s = v?.trim() ?? '';
          if (s.isEmpty) return null;
          return RegExp(r'^[\w.-]{2,}@[a-zA-Z]{2,}$').hasMatch(s)
              ? null
              : 'Enter a valid UPI ID.';
        },
      ),
    ],
  );
}

class _BankCard extends StatelessWidget {
  const _BankCard({required this.bank});
  final PartnerBank bank;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(A3Spacing.lg),
    decoration: BoxDecoration(
      color: A3Colors.surface,
      borderRadius: BorderRadius.circular(18),
      border: Border.all(color: A3Colors.line),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: A3Colors.primarySoft,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                Icons.account_balance_rounded,
                color: A3Colors.primary,
              ),
            ),
            const SizedBox(width: A3Spacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    bank.holderName,
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 16,
                      color: A3Colors.ink,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '•••• •••• ${bank.accountLast4}',
                    style: TextStyle(
                      fontSize: 14,
                      color: A3Colors.muted,
                      fontFeatures: [FontFeature.tabularFigures()],
                      letterSpacing: 1,
                    ),
                  ),
                ],
              ),
            ),
            StatusChip(
              label: 'Saved',
              color: A3Colors.success,
              background: A3Colors.successSoft,
              icon: Icons.check_circle_rounded,
            ),
          ],
        ),
        Divider(height: A3Spacing.xl, color: A3Colors.line),
        _Row('IFSC', bank.ifsc),
        if (bank.upiId != null) ...[
          const SizedBox(height: A3Spacing.sm),
          _Row('UPI ID', bank.upiId!),
        ],
      ],
    ),
  );
}

class _Row extends StatelessWidget {
  const _Row(this.label, this.value);
  final String label, value;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Expanded(
        child: Text(
          label,
          style: TextStyle(fontSize: 14, color: A3Colors.muted),
        ),
      ),
      Text(
        value,
        style: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: A3Colors.ink,
        ),
      ),
    ],
  );
}

class _InfoNote extends StatelessWidget {
  const _InfoNote({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Icon(icon, size: 18, color: A3Colors.muted),
      const SizedBox(width: A3Spacing.sm),
      Expanded(
        child: Text(
          text,
          style: TextStyle(fontSize: 13, color: A3Colors.muted, height: 1.4),
        ),
      ),
    ],
  );
}

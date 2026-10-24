import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/form_fields.dart';
import '../../core/widgets/frame.dart';
import '../auth/auth_controller.dart';

/// Screen 17 · Edit Profile
/// Name and vehicle are editable and saved to the server (PATCH /delivery/me).
/// Phone and email are sign-in identifiers, so they are shown read-only.
class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  static const _vehicleTypes = [
    'Bike',
    'Scooter',
    'Electric Vehicle',
    'Bicycle',
  ];

  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _vehicleNumber = TextEditingController();
  String? _vehicleType;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final p = ref.read(authProvider).value;
    _name.text = p?.name ?? '';
    _phone.text = p?.phone ?? '';
    _email.text = p?.email ?? '';
    _vehicleNumber.text = p?.vehicleNumber ?? '';
    _vehicleType = _vehicleTypes.contains(p?.vehicleType)
        ? p!.vehicleType
        : null;
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _email.dispose();
    _vehicleNumber.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    FocusScope.of(context).unfocus();
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      await ref
          .read(authProvider.notifier)
          .updateProfile(
            name: _name.text.trim(),
            vehicleType: _vehicleType,
            vehicleNumber: _vehicleNumber.text.trim().isEmpty
                ? null
                : _vehicleNumber.text.trim().toUpperCase(),
          );
      if (!mounted) return;
      showResult(context, 'Profile updated');
      context.pop();
    } catch (e) {
      if (mounted) showResult(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final initial = _name.text.trim().isEmpty
        ? '?'
        : _name.text.trim().characters.first.toUpperCase();

    return FramedPage(
      title: 'Edit Profile',
      showBack: true,
      bottom: PrimaryButton(
        label: 'Save changes',
        busy: _busy,
        onPressed: _save,
      ),
      child: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(
            A3Spacing.lg,
            A3Spacing.xl,
            A3Spacing.lg,
            A3Spacing.lg,
          ),
          children: [
            Center(
              child: CircleAvatar(
                radius: 44,
                backgroundColor: A3Colors.primarySoft,
                child: Text(
                  initial,
                  style: TextStyle(
                    color: A3Colors.primaryStrong,
                    fontWeight: FontWeight.w800,
                    fontSize: 34,
                    fontFamily: 'Outfit',
                  ),
                ),
              ),
            ),
            const SizedBox(height: A3Spacing.xl),

            const _GroupLabel('Personal details'),
            LabeledField(
              label: 'Full name',
              controller: _name,
              textCapitalization: TextCapitalization.words,
              validator: (v) => (v == null || v.trim().length < 2)
                  ? 'Enter your full name.'
                  : null,
            ),
            LabeledField(
              label: 'Mobile number',
              controller: _phone,
              readOnly: true,
              helper: 'Used to sign in. Contact the kitchen to change it.',
              suffix: Padding(
                padding: EdgeInsets.only(right: 12),
                child: Icon(
                  Icons.verified_rounded,
                  color: A3Colors.success,
                  semanticLabel: 'Verified',
                ),
              ),
            ),
            if (_email.text.isNotEmpty)
              LabeledField(
                label: 'Email',
                controller: _email,
                readOnly: true,
                helper: 'Used to sign in. Contact the kitchen to change it.',
              ),
            const SizedBox(height: A3Spacing.sm),

            const _GroupLabel('Vehicle'),
            Text(
              'Vehicle type',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: A3Colors.ink,
              ),
            ),
            const SizedBox(height: 6),
            Wrap(
              spacing: A3Spacing.sm,
              runSpacing: A3Spacing.sm,
              children: [
                for (final t in _vehicleTypes)
                  ChoiceChip(
                    label: Text(t),
                    selected: _vehicleType == t,
                    onSelected: (_) => setState(() => _vehicleType = t),
                    selectedColor: A3Colors.primarySoft,
                    labelStyle: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: _vehicleType == t
                          ? A3Colors.primaryStrong
                          : A3Colors.ink,
                    ),
                    side: BorderSide(
                      color: _vehicleType == t
                          ? A3Colors.primary
                          : A3Colors.line,
                    ),
                    showCheckmark: false,
                  ),
              ],
            ),
            const SizedBox(height: A3Spacing.lg),
            LabeledField(
              label: 'Vehicle number',
              controller: _vehicleNumber,
              hint: 'e.g. TS09AB1234',
              textCapitalization: TextCapitalization.characters,
              textInputAction: TextInputAction.done,
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp('[A-Za-z0-9 -]')),
                LengthLimitingTextInputFormatter(15),
              ],
              validator: (v) {
                final s = v?.trim() ?? '';
                if (s.isEmpty) return null;
                return RegExp(r'^[A-Za-z0-9 -]{4,15}$').hasMatch(s)
                    ? null
                    : 'Enter a valid vehicle number.';
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _GroupLabel extends StatelessWidget {
  const _GroupLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: A3Spacing.md),
    child: Text(
      text,
      style: TextStyle(
        fontSize: 17,
        fontWeight: FontWeight.w800,
        fontFamily: 'Outfit',
        color: A3Colors.ink,
      ),
    ),
  );
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/kitchen.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/theme_mode.dart';
import '../../core/widgets/frame.dart';
import '../../core/widgets/widgets.dart';
import '../auth/auth_controller.dart';

/// Screen 16 · App Settings
/// Appearance (system / light / dark, saved on the device), cache clearing,
/// app version, account deactivation request and logout.
class AppSettingsScreen extends ConsumerWidget {
  const AppSettingsScreen({super.key});

  static const _version = '0.1.0';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(themeModeProvider);

    return FramedPage(
      title: 'App Settings',
      showBack: true,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(
          A3Spacing.lg,
          A3Spacing.xl,
          A3Spacing.lg,
          A3Spacing.xl,
        ),
        children: [
          const _Heading('Appearance'),
          _Group(
            children: [
              Padding(
                padding: const EdgeInsets.all(A3Spacing.md),
                child: SegmentedButton<String>(
                  showSelectedIcon: false,
                  segments: const [
                    ButtonSegment(
                      value: 'system',
                      label: Text('System'),
                      icon: Icon(Icons.brightness_auto_outlined),
                    ),
                    ButtonSegment(
                      value: 'light',
                      label: Text('Light'),
                      icon: Icon(Icons.light_mode_outlined),
                    ),
                    ButtonSegment(
                      value: 'dark',
                      label: Text('Dark'),
                      icon: Icon(Icons.dark_mode_outlined),
                    ),
                  ],
                  selected: {mode},
                  onSelectionChanged: (s) =>
                      ref.read(themeModeProvider.notifier).set(s.first),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  A3Spacing.md,
                  0,
                  A3Spacing.md,
                  A3Spacing.md,
                ),
                child: Text(
                  'System follows your phone’s light or dark setting.',
                  style: TextStyle(fontSize: 13, color: A3Colors.muted),
                ),
              ),
            ],
          ),
          const SizedBox(height: A3Spacing.xl),

          const _Heading('App'),
          _Group(
            children: [
              _Row(
                icon: Icons.language_rounded,
                title: 'Language',
                trailing: Text(
                  'English',
                  style: TextStyle(fontSize: 14, color: A3Colors.muted),
                ),
              ),
              _Row(
                icon: Icons.cleaning_services_outlined,
                title: 'Clear image cache',
                subtitle: 'Frees memory used by downloaded images',
                onTap: () {
                  PaintingBinding.instance.imageCache
                    ..clear()
                    ..clearLiveImages();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Image cache cleared')),
                  );
                },
              ),
              _Row(
                icon: Icons.info_outline_rounded,
                title: 'App version',
                trailing: Text(
                  'v$_version',
                  style: TextStyle(fontSize: 14, color: A3Colors.muted),
                ),
              ),
            ],
          ),
          const SizedBox(height: A3Spacing.xl),

          const _Heading('Account'),
          _Group(
            children: [
              _Row(
                icon: Icons.person_off_outlined,
                title: 'Deactivate account',
                subtitle: 'Handled by the kitchen team',
                onTap: () => _deactivate(context),
              ),
              _Row(
                icon: Icons.logout_rounded,
                title: 'Log out',
                danger: true,
                onTap: () => _logout(context, ref),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _deactivate(BuildContext context) => showDialog<void>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: const Text('Deactivate account?'),
      content: const Text(
        'Partner accounts are managed by the kitchen. Call the kitchen team and '
        'they will deactivate your account and settle any pending earnings.',
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx),
          child: const Text('Cancel'),
        ),
        TextButton(
          onPressed: () {
            Navigator.pop(ctx);
            callNumber(context, kitchenPhone);
          },
          child: const Text('Call kitchen'),
        ),
      ],
    ),
  );

  Future<void> _logout(BuildContext context, WidgetRef ref) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Log out?'),
        content: const Text(
          'You will stop receiving new delivery assignments.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text('Log out', style: TextStyle(color: A3Colors.danger)),
          ),
        ],
      ),
    );
    if (ok == true) {
      try {
        await ref.read(authProvider.notifier).logout();
      } catch (_) {}
    }
  }
}

class _Heading extends StatelessWidget {
  const _Heading(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(left: 4, bottom: A3Spacing.sm),
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

class _Group extends StatelessWidget {
  const _Group({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Material(
    color: A3Colors.surface,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(18),
      side: BorderSide(color: A3Colors.line),
    ),
    clipBehavior: Clip.antiAlias,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < children.length; i++) ...[
          if (i > 0 && children[i] is _Row)
            Divider(height: 1, indent: 56, color: A3Colors.line),
          children[i],
        ],
      ],
    ),
  );
}

class _Row extends StatelessWidget {
  const _Row({
    required this.icon,
    required this.title,
    this.subtitle,
    this.trailing,
    this.onTap,
    this.danger = false,
  });
  final IconData icon;
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final fg = danger ? A3Colors.danger : A3Colors.ink;
    return InkWell(
      onTap: onTap,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 56),
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: A3Spacing.lg,
            vertical: A3Spacing.md,
          ),
          child: Row(
            children: [
              Icon(icon, color: fg, size: 22),
              const SizedBox(width: A3Spacing.lg),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: fg,
                      ),
                    ),
                    if (subtitle != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        subtitle!,
                        style: TextStyle(fontSize: 13, color: A3Colors.muted),
                      ),
                    ],
                  ],
                ),
              ),
              ?trailing,
              if (onTap != null && trailing == null)
                Icon(Icons.chevron_right_rounded, color: fg),
            ],
          ),
        ),
      ),
    );
  }
}

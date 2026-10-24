import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/frame.dart';
import '../auth/auth_controller.dart';

/// Screen 22 · App Settings (Sheet 1)
/// Toggles for Location, Notifications, Dark Mode, Clear Cache, and Logout Confirmation dialog.
class AppSettingsScreen extends ConsumerStatefulWidget {
  const AppSettingsScreen({super.key});

  @override
  ConsumerState<AppSettingsScreen> createState() => _AppSettingsScreenState();
}

class _AppSettingsScreenState extends ConsumerState<AppSettingsScreen> {
  bool _locationEnabled = true;
  bool _notificationsEnabled = true;
  bool _darkMode = false;

  void _showLogoutDialog() {
    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
          ),
          contentPadding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: const BoxDecoration(
                  color: Color(0xFFFFEBEE),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.logout_rounded,
                  size: 30,
                  color: A3Colors.danger,
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Logout?',
                style: TextStyle(
                  fontFamily: 'Outfit',
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: A3Colors.ink,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Are you sure you want to logout? You will stop receiving order assignments.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: A3Colors.muted),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(ctx),
                      style: OutlinedButton.styleFrom(
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        side: const BorderSide(color: A3Colors.line),
                      ),
                      child: const Text(
                        'Cancel',
                        style: TextStyle(
                          color: A3Colors.ink,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      onPressed: () {
                        Navigator.pop(ctx);
                        ref.read(authProvider.notifier).logout();
                      },
                      style: FilledButton.styleFrom(
                        backgroundColor: A3Colors.danger,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text(
                        'Logout',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  void _showDeactivateDialog() {
    int choice = 0; // 0: Temporary, 1: Permanent
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Padding(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: A3Colors.primarySoft,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.sentiment_dissatisfied_outlined,
                        size: 32,
                        color: A3Colors.primary,
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  const Text(
                    'Deactivate Account',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: 'Outfit',
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: A3Colors.ink,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Your account will be deactivated and you won\'t receive new orders.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 13, color: A3Colors.muted),
                  ),
                  const SizedBox(height: 20),
                  InkWell(
                    onTap: () => setSheetState(() => choice = 0),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Row(
                        children: [
                          Icon(
                            choice == 0
                                ? Icons.radio_button_checked
                                : Icons.radio_button_unchecked,
                            color: A3Colors.primary,
                            size: 20,
                          ),
                          const SizedBox(width: 10),
                          const Expanded(
                            child: Text(
                              'Temporary (I\'ll come back later)',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  InkWell(
                    onTap: () => setSheetState(() => choice = 1),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Row(
                        children: [
                          Icon(
                            choice == 1
                                ? Icons.radio_button_checked
                                : Icons.radio_button_unchecked,
                            color: A3Colors.danger,
                            size: 20,
                          ),
                          const SizedBox(width: 10),
                          const Expanded(
                            child: Text(
                              'Permanent (Delete my account)',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),
                  FilledButton(
                    onPressed: () {
                      Navigator.pop(ctx);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text(
                            'Deactivation request submitted to kitchen management.',
                          ),
                        ),
                      );
                    },
                    style: FilledButton.styleFrom(
                      backgroundColor: choice == 1
                          ? A3Colors.danger
                          : A3Colors.primary,
                      minimumSize: const Size.fromHeight(50),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: const Text(
                      'Deactivate Account',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return FramedPage(
      title: 'App Settings',
      showBack: true,
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              decoration: BoxDecoration(
                color: A3Colors.surface,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: A3Colors.line),
              ),
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(
                      Icons.language_rounded,
                      color: A3Colors.ink,
                    ),
                    title: const Text(
                      'Language',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                    trailing: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'English',
                          style: TextStyle(color: A3Colors.muted, fontSize: 13),
                        ),
                        SizedBox(width: 4),
                        Icon(
                          Icons.chevron_right_rounded,
                          color: A3Colors.muted,
                        ),
                      ],
                    ),
                    onTap: () => showModalBottomSheet<void>(
                      context: context,
                      showDragHandle: true,
                      builder: (_) => const SafeArea(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            ListTile(
                              title: Text(
                                'English',
                                style: TextStyle(fontWeight: FontWeight.w600),
                              ),
                              trailing: Icon(
                                Icons.check_circle_rounded,
                                color: A3Colors.primary,
                              ),
                            ),
                            Padding(
                              padding: EdgeInsets.fromLTRB(16, 4, 16, 20),
                              child: Text(
                                'Telugu and Hindi are coming soon.',
                                style: TextStyle(
                                  color: A3Colors.muted,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const Divider(height: 1, color: A3Colors.line),
                  SwitchListTile(
                    secondary: const Icon(
                      Icons.location_on_outlined,
                      color: A3Colors.ink,
                    ),
                    title: const Text(
                      'Location Services',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                    subtitle: const Text(
                      'Required for live order dispatching',
                      style: TextStyle(fontSize: 12, color: A3Colors.muted),
                    ),
                    value: _locationEnabled,
                    activeThumbColor: A3Colors.primary,
                    onChanged: (v) => setState(() => _locationEnabled = v),
                  ),
                  const Divider(height: 1, color: A3Colors.line),
                  SwitchListTile(
                    secondary: const Icon(
                      Icons.notifications_none_rounded,
                      color: A3Colors.ink,
                    ),
                    title: const Text(
                      'Push Notifications',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                    subtitle: const Text(
                      'Order dispatches and payout notices',
                      style: TextStyle(fontSize: 12, color: A3Colors.muted),
                    ),
                    value: _notificationsEnabled,
                    activeThumbColor: A3Colors.primary,
                    onChanged: (v) => setState(() => _notificationsEnabled = v),
                  ),
                  const Divider(height: 1, color: A3Colors.line),
                  SwitchListTile(
                    secondary: const Icon(
                      Icons.dark_mode_outlined,
                      color: A3Colors.ink,
                    ),
                    title: const Text(
                      'Dark Mode',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                    value: _darkMode,
                    activeThumbColor: A3Colors.primary,
                    onChanged: (v) => setState(() => _darkMode = v),
                  ),
                  const Divider(height: 1, color: A3Colors.line),
                  ListTile(
                    leading: const Icon(
                      Icons.cleaning_services_outlined,
                      color: A3Colors.ink,
                    ),
                    title: const Text(
                      'Clear Cache',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                    trailing: const Text(
                      '12.5 MB',
                      style: TextStyle(color: A3Colors.muted, fontSize: 13),
                    ),
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('App cache cleared successfully.'),
                        ),
                      );
                    },
                  ),
                  const Divider(height: 1, color: A3Colors.line),
                  ListTile(
                    leading: const Icon(
                      Icons.info_outline,
                      color: A3Colors.ink,
                    ),
                    title: const Text(
                      'App Version',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                    trailing: const Text(
                      'v1.0.0',
                      style: TextStyle(
                        color: A3Colors.muted,
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Account Actions
            Container(
              decoration: BoxDecoration(
                color: A3Colors.surface,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: A3Colors.line),
              ),
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(
                      Icons.person_off_outlined,
                      color: A3Colors.muted,
                    ),
                    title: const Text(
                      'Deactivate Account',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                        color: A3Colors.ink,
                      ),
                    ),
                    trailing: const Icon(
                      Icons.chevron_right_rounded,
                      color: A3Colors.muted,
                    ),
                    onTap: _showDeactivateDialog,
                  ),
                  const Divider(height: 1, color: A3Colors.line),
                  ListTile(
                    leading: const Icon(
                      Icons.logout_rounded,
                      color: A3Colors.danger,
                    ),
                    title: const Text(
                      'Logout',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        color: A3Colors.danger,
                      ),
                    ),
                    trailing: const Icon(
                      Icons.chevron_right_rounded,
                      color: A3Colors.danger,
                    ),
                    onTap: _showLogoutDialog,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

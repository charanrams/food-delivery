import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models.dart';
import '../../core/prefs.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/frame.dart';
import '../../core/widgets/widgets.dart';
import '../auth/auth_controller.dart';
import '../orders/orders_providers.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);

    return FramedPage(
      art: true,
      title: 'Profile',
      subtitle: 'Your account, orders and saved places',
      showBack: false,
      child: auth.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => AsyncStateView.error(
          message: '$e',
          onRetry: () => ref.invalidate(authProvider),
        ),
        data: (user) {
          if (user == null) {
            return Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(
                  horizontal: A3Spacing.xl,
                  vertical: A3Spacing.xxl,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 90,
                      height: 90,
                      decoration: const BoxDecoration(
                        color: A3Colors.primarySoft,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.person_rounded,
                        size: 48,
                        color: A3Colors.primaryStrong,
                      ),
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'Welcome to Special Delivery',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        fontFamily: 'Outfit',
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Sign in or create an account to place orders, track deliveries, and save your favourite dishes.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: A3Colors.muted,
                        fontSize: 14.5,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 28),
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: FilledButton(
                        style: FilledButton.styleFrom(
                          backgroundColor: A3Colors.primary,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        onPressed: () => context.push('/login'),
                        child: const Text(
                          'Sign In / Register',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }

          final ordersCount = ref.watch(ordersProvider).value?.length ?? 0;
          final favsCount = ref.watch(favoritesProvider).value?.length ?? 0;
          final addrsCount = ref.watch(addressesProvider).value?.length ?? 0;

          final firstLetter = user.name.isNotEmpty
              ? user.name.characters.first.toUpperCase()
              : 'U';

          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 36),
            children: [
              // User Card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: A3Colors.surface,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: const Color(0xFFF1EAE2),
                    width: 1.5,
                  ),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x0A000000),
                      blurRadius: 16,
                      offset: Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 60,
                          height: 60,
                          decoration: BoxDecoration(
                            color: A3Colors.primary,
                            borderRadius: BorderRadius.circular(20),
                            boxShadow: const [
                              BoxShadow(
                                color: Color(0x33F25822),
                                blurRadius: 10,
                                offset: Offset(0, 4),
                              ),
                            ],
                          ),
                          child: Center(
                            child: Text(
                              firstLetter,
                              style: const TextStyle(
                                fontFamily: 'Outfit',
                                fontSize: 28,
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                user.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w800,
                                  fontFamily: 'Outfit',
                                  height: 1.2,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: A3Colors.primarySoft,
                                  borderRadius: BorderRadius.circular(99),
                                ),
                                child: const Text(
                                  'MEMBER',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                    color: A3Colors.primaryStrong,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        Material(
                          color: A3Colors.primarySoft,
                          borderRadius: BorderRadius.circular(20),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(20),
                            onTap: () =>
                                _showEditProfileSheet(context, ref, user),
                            child: const Padding(
                              padding: EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 12,
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    Icons.edit_outlined,
                                    size: 15,
                                    color: A3Colors.primaryStrong,
                                  ),
                                  SizedBox(width: 4),
                                  Text(
                                    'Edit',
                                    style: TextStyle(
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.w700,
                                      color: A3Colors.primaryStrong,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    const Divider(height: 1, color: A3Colors.line),
                    const SizedBox(height: 12),
                    _ContactLine(
                      icon: Icons.email_outlined,
                      value: user.email?.isNotEmpty == true ? user.email : null,
                      placeholder: 'Add email address',
                    ),
                    const SizedBox(height: 8),
                    _ContactLine(
                      icon: Icons.phone_outlined,
                      value: user.phone?.isNotEmpty == true ? user.phone : null,
                      placeholder: 'Add mobile number',
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Quick Stats
              Row(
                children: [
                  Expanded(
                    child: _StatCard(
                      label: 'Orders',
                      count: '$ordersCount',
                      icon: Icons.receipt_long_rounded,
                      onTap: () => context.go('/orders'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _StatCard(
                      label: 'Saved',
                      count: '$favsCount',
                      icon: Icons.favorite_rounded,
                      onTap: () => context.push('/favorites'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _StatCard(
                      label: 'Addresses',
                      count: '$addrsCount',
                      icon: Icons.location_on_rounded,
                      onTap: () => context.push('/addresses'),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 24),

              // Group 1: Activity
              const Padding(
                padding: EdgeInsets.only(left: 4, bottom: 8),
                child: Text(
                  'ACTIVITY & ORDERS',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.8,
                    color: A3Colors.muted,
                  ),
                ),
              ),
              _ModernGroup(
                children: [
                  _ModernTile(
                    icon: Icons.receipt_long_outlined,
                    iconBg: const Color(0xFFFFF1EB),
                    iconColor: A3Colors.primaryStrong,
                    title: 'My Orders',
                    subtitle: 'Order status, history & bills',
                    onTap: () => context.go('/orders'),
                  ),
                  _divider,
                  _ModernTile(
                    icon: Icons.favorite_border_rounded,
                    iconBg: const Color(0xFFFFECEB),
                    iconColor: A3Colors.danger,
                    title: 'Favourite Dishes',
                    subtitle: 'Quick access to what you love',
                    onTap: () => context.push('/favorites'),
                  ),
                  _divider,
                  _ModernTile(
                    icon: Icons.location_on_outlined,
                    iconBg: const Color(0xFFEAF5FF),
                    iconColor: const Color(0xFF1976D2),
                    title: 'Saved Delivery Addresses',
                    subtitle: 'Home, work, and other places',
                    onTap: () => context.push('/addresses'),
                  ),
                  _divider,
                  _ModernTile(
                    icon: Icons.notifications_none_rounded,
                    iconBg: const Color(0xFFF3EDFF),
                    iconColor: const Color(0xFF7B1FA2),
                    title: 'Notifications',
                    subtitle: 'Offers, order updates & alerts',
                    onTap: () => context.push('/notifications'),
                  ),
                ],
              ),

              const SizedBox(height: 24),

              // Group 2: Help & App info
              const Padding(
                padding: EdgeInsets.only(left: 4, bottom: 8),
                child: Text(
                  'SUPPORT & INFORMATION',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.8,
                    color: A3Colors.muted,
                  ),
                ),
              ),
              _ModernGroup(
                children: [
                  _ModernTile(
                    icon: Icons.headset_mic_outlined,
                    iconBg: const Color(0xFFE8F5E9),
                    iconColor: const Color(0xFF2E7D32),
                    title: 'Help & Customer Support',
                    subtitle: 'Get help with your order or account',
                    onTap: () {
                      showModalBottomSheet(
                        context: context,
                        backgroundColor: A3Colors.surface,
                        shape: const RoundedRectangleBorder(
                          borderRadius: BorderRadius.vertical(
                            top: Radius.circular(24),
                          ),
                        ),
                        builder: (c) => SafeArea(
                          child: Padding(
                            padding: const EdgeInsets.all(24),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Customer Support',
                                  style: TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                const SizedBox(height: 10),
                                const Text(
                                  'We are here to help you 24/7. Reach out via email or phone for any assistance.',
                                  style: TextStyle(
                                    color: A3Colors.muted,
                                    fontSize: 14,
                                  ),
                                ),
                                const SizedBox(height: 20),
                                ListTile(
                                  leading: const Icon(
                                    Icons.email_outlined,
                                    color: A3Colors.primary,
                                  ),
                                  title: const Text(
                                    'support@specialdelivery.com',
                                  ),
                                  contentPadding: EdgeInsets.zero,
                                ),
                                ListTile(
                                  leading: const Icon(
                                    Icons.phone_outlined,
                                    color: A3Colors.primary,
                                  ),
                                  title: const Text('+91 1800-123-4567'),
                                  contentPadding: EdgeInsets.zero,
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                  _divider,
                  _ModernTile(
                    icon: Icons.description_outlined,
                    iconBg: const Color(0xFFFFF3E0),
                    iconColor: const Color(0xFFE65100),
                    title: 'Terms & Conditions',
                    subtitle: 'Rules, delivery terms & policies',
                    onTap: () => _showTermsSheet(context),
                  ),
                  _divider,
                  _ModernTile(
                    icon: Icons.privacy_tip_outlined,
                    iconBg: const Color(0xFFE8EAF6),
                    iconColor: const Color(0xFF283593),
                    title: 'Privacy Policy',
                    subtitle: 'How your data is protected',
                    onTap: () => _showPrivacySheet(context),
                  ),
                  _divider,
                  _ModernTile(
                    icon: Icons.info_outline_rounded,
                    iconBg: const Color(0xFFF5F5F5),
                    iconColor: A3Colors.ink,
                    title: 'About App',
                    subtitle: 'Special Delivery v1.0.0',
                    onTap: () {},
                  ),
                  _divider,
                  _ModernTile(
                    icon: Icons.delete_outline_rounded,
                    iconBg: const Color(0xFFFFEBEE),
                    iconColor: A3Colors.danger,
                    title: 'Delete Account',
                    subtitle: 'Permanently remove your account and data',
                    onTap: () async {
                      final ok = await showDialog<bool>(
                        context: context,
                        builder: (c) => AlertDialog(
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                          ),
                          title: const Text(
                            'Delete Account?',
                            style: TextStyle(
                              fontWeight: FontWeight.w800,
                              color: A3Colors.danger,
                            ),
                          ),
                          content: const Text(
                            'Are you sure you want to permanently delete your account? All order history, saved addresses, and profile details will be removed immediately. This cannot be undone.',
                          ),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(c, false),
                              child: const Text('Cancel'),
                            ),
                            FilledButton(
                              style: FilledButton.styleFrom(
                                backgroundColor: A3Colors.danger,
                              ),
                              onPressed: () => Navigator.pop(c, true),
                              child: const Text('Delete Account'),
                            ),
                          ],
                        ),
                      );
                      if (ok == true) {
                        await ref.read(authProvider.notifier).deleteAccount();
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Account permanently deleted.'),
                            ),
                          );
                        }
                      }
                    },
                  ),
                ],
              ),

              const SizedBox(height: 24),

              // Group 3: Logout
              Container(
                decoration: BoxDecoration(
                  color: A3Colors.surface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: const Color(0xFFFFCDD2),
                    width: 1.5,
                  ),
                ),
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(20),
                    onTap: () async {
                      final ok = await showDialog<bool>(
                        context: context,
                        builder: (c) => AlertDialog(
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                          ),
                          title: const Text(
                            'Log out?',
                            style: TextStyle(fontWeight: FontWeight.w800),
                          ),
                          content: const Text(
                            'Are you sure you want to log out of your account?',
                          ),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(c, false),
                              child: const Text('Cancel'),
                            ),
                            FilledButton(
                              style: FilledButton.styleFrom(
                                backgroundColor: A3Colors.danger,
                              ),
                              onPressed: () => Navigator.pop(c, true),
                              child: const Text('Log out'),
                            ),
                          ],
                        ),
                      );
                      if (ok == true) {
                        await ref.read(authProvider.notifier).logout();
                      }
                    },
                    child: const Padding(
                      padding: EdgeInsets.symmetric(
                        horizontal: 18,
                        vertical: 16,
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.logout_rounded,
                            color: A3Colors.danger,
                            size: 22,
                          ),
                          SizedBox(width: 14),
                          Expanded(
                            child: Text(
                              'Log Out',
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 16,
                                color: A3Colors.danger,
                              ),
                            ),
                          ),
                          Icon(
                            Icons.chevron_right,
                            color: A3Colors.danger,
                            size: 20,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  static const Widget _divider = Divider(
    height: 1,
    thickness: 1,
    indent: 58,
    color: Color(0xFFF1EAE2),
  );
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.count,
    required this.icon,
    required this.onTap,
  });

  final String label;
  final String count;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: A3Colors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: const BorderSide(color: Color(0xFFF1EAE2), width: 1.5),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 14),
          child: Column(
            children: [
              Icon(icon, size: 22, color: A3Colors.primary),
              const SizedBox(height: 6),
              Text(
                count,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  fontFamily: 'Outfit',
                ),
              ),
              const SizedBox(height: 2),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: A3Colors.muted,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ModernGroup extends StatelessWidget {
  const _ModernGroup({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Material(
    color: A3Colors.surface,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(20),
      side: const BorderSide(color: Color(0xFFF1EAE2), width: 1.5),
    ),
    clipBehavior: Clip.antiAlias,
    child: Column(children: children),
  );
}

class _ModernTile extends StatelessWidget {
  const _ModernTile({
    required this.icon,
    required this.iconBg,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final Color iconBg;
  final Color iconColor;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => ListTile(
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
    onTap: onTap,
    leading: Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: iconBg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(icon, size: 20, color: iconColor),
    ),
    title: Text(
      title,
      style: const TextStyle(
        fontWeight: FontWeight.w700,
        fontSize: 15,
        color: A3Colors.ink,
      ),
    ),
    subtitle: Text(
      subtitle,
      style: const TextStyle(fontSize: 12.5, color: A3Colors.muted),
    ),
    trailing: const Icon(
      Icons.chevron_right_rounded,
      color: A3Colors.muted,
      size: 20,
    ),
  );
}

void _showEditProfileSheet(BuildContext context, WidgetRef ref, AppUser user) {
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (sheetContext) => _EditProfileSheet(user: user),
  );
}

class _EditProfileSheet extends ConsumerStatefulWidget {
  const _EditProfileSheet({required this.user});
  final AppUser user;

  @override
  ConsumerState<_EditProfileSheet> createState() => _EditProfileSheetState();
}

class _EditProfileSheetState extends ConsumerState<_EditProfileSheet> {
  late final TextEditingController _nameCtrl;
  late final TextEditingController _phoneCtrl;
  late final TextEditingController _emailCtrl;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: widget.user.name);
    _phoneCtrl = TextEditingController(text: widget.user.phone ?? '');
    _emailCtrl = TextEditingController(text: widget.user.email ?? '');
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final name = _nameCtrl.text.trim();
    if (name.length < 2) {
      setState(() => _error = 'Name must be at least 2 characters');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      await ref
          .read(authProvider.notifier)
          .updateProfile(
            name: name,
            phone: _phoneCtrl.text.trim(),
            email: _emailCtrl.text.trim(),
          );
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile updated successfully!')),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString().replaceFirst('Exception: ', '');
          _saving = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    return Container(
      padding: EdgeInsets.fromLTRB(20, 20, 20, 20 + bottomInset),
      decoration: const BoxDecoration(
        color: A3Colors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Edit Profile & Contact',
                  style: TextStyle(
                    fontFamily: 'Outfit',
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            if (_error != null) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFEBEE),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  _error!,
                  style: const TextStyle(
                    color: A3Colors.danger,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
            const SizedBox(height: 16),
            TextField(
              controller: _nameCtrl,
              decoration: InputDecoration(
                labelText: 'Full Name',
                prefixIcon: const Icon(Icons.person_outline_rounded),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _phoneCtrl,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(
                labelText: 'Mobile Number',
                prefixIcon: const Icon(Icons.phone_android_rounded),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _emailCtrl,
              keyboardType: TextInputType.emailAddress,
              decoration: InputDecoration(
                labelText: 'Email Address',
                prefixIcon: const Icon(Icons.mail_outline_rounded),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: A3Colors.primary,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                onPressed: _saving ? null : _save,
                child: _saving
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : const Text(
                        'Save Changes',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 16,
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

void _showTermsSheet(BuildContext context) {
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: A3Colors.surface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
    ),
    builder: (c) => DraggableScrollableSheet(
      initialChildSize: 0.75,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (_, scrollController) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: Column(
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFE0D7D0),
                borderRadius: BorderRadius.circular(99),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Terms & Conditions',
                  style: TextStyle(
                    fontFamily: 'Outfit',
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => Navigator.pop(c),
                ),
              ],
            ),
            const Divider(height: 16),
            Expanded(
              child: ListView(
                controller: scrollController,
                children: const [
                  Text(
                    'Welcome to Special Delivery. By accessing or using our food delivery platform, you agree to be bound by these Terms and Conditions.',
                    style: TextStyle(
                      color: A3Colors.muted,
                      fontSize: 13.5,
                      height: 1.5,
                    ),
                  ),
                  SizedBox(height: 16),
                  _LegalSection(
                    title: '1. Food Preparation & Freshness',
                    body: 'All dishes are cooked fresh in our kitchen upon order confirmation. Ingredients and portions strictly adhere to hygiene guidelines.',
                  ),
                  _LegalSection(
                    title: '2. Delivery & Timelines',
                    body: 'Delivery times displayed are estimates based on kitchen workload and transit distances. We strive to deliver all orders hot within 25-45 minutes.',
                  ),
                  _LegalSection(
                    title: '3. Pricing & Taxes',
                    body: 'Prices listed on our menu are in Indian Rupees (INR) and are inclusive of all applicable GST taxes. Any applicable delivery charges are shown transparently at checkout.',
                  ),
                  _LegalSection(
                    title: '4. Cancellation & Refunds',
                    body: 'Once kitchen preparation starts, orders cannot be cancelled. In the rare event of damaged or incorrect items, please contact support immediately for a replacement or full refund.',
                  ),
                  _LegalSection(
                    title: '5. Account Responsibility',
                    body: 'You are responsible for maintaining the confidentiality of your mobile login and verifying accurate delivery addresses.',
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

void _showPrivacySheet(BuildContext context) {
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: A3Colors.surface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
    ),
    builder: (c) => DraggableScrollableSheet(
      initialChildSize: 0.75,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (_, scrollController) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: Column(
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFE0D7D0),
                borderRadius: BorderRadius.circular(99),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Privacy Policy',
                  style: TextStyle(
                    fontFamily: 'Outfit',
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => Navigator.pop(c),
                ),
              ],
            ),
            const Divider(height: 16),
            Expanded(
              child: ListView(
                controller: scrollController,
                children: const [
                  Text(
                    'Special Delivery values your trust and is committed to protecting your personal information. This Privacy Policy details how we handle your data.',
                    style: TextStyle(
                      color: A3Colors.muted,
                      fontSize: 13.5,
                      height: 1.5,
                    ),
                  ),
                  SizedBox(height: 16),
                  _LegalSection(
                    title: '1. Information We Collect',
                    body: 'We collect your name, phone number, email address, and delivery locations to process and deliver your meals safely.',
                  ),
                  _LegalSection(
                    title: '2. Location Data',
                    body: 'Location access is used solely to locate your delivery spot on the map and calculate delivery routes. We do not track your location in the background when the app is closed.',
                  ),
                  _LegalSection(
                    title: '3. Data Security',
                    body: 'Your personal data and authorization tokens are securely stored and encrypted in accordance with industry security standards.',
                  ),
                  _LegalSection(
                    title: '4. Third-Party Sharing',
                    body: 'We do not sell, rent, or trade your personal data to any external advertising networks.',
                  ),
                  _LegalSection(
                    title: '5. Your Rights & Account Deletion',
                    body: 'You have full right to edit your personal profile at any time or permanently delete your account and all associated order history directly from the app settings.',
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class _LegalSection extends StatelessWidget {
  const _LegalSection({required this.title, required this.body});
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 15,
              fontFamily: 'Outfit',
              color: A3Colors.ink,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            body,
            style: const TextStyle(
              color: A3Colors.muted,
              fontSize: 13,
              height: 1.45,
            ),
          ),
        ],
      ),
    );
  }
}

/// One contact detail under the profile header; wraps so long emails stay fully readable.
class _ContactLine extends StatelessWidget {
  const _ContactLine({
    required this.icon,
    required this.value,
    required this.placeholder,
  });

  final IconData icon;
  final String? value;
  final String placeholder;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: A3Colors.muted),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            value ?? placeholder,
            softWrap: true,
            style: TextStyle(
              fontSize: 14,
              fontWeight: value == null ? FontWeight.w400 : FontWeight.w600,
              fontStyle: value == null ? FontStyle.italic : FontStyle.normal,
              color: value == null ? A3Colors.muted : A3Colors.ink,
            ),
          ),
        ),
      ],
    );
  }
}

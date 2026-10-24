import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import '../theme/app_theme.dart';

/// Loading / empty / error states shared by every async screen.
class StateView extends StatelessWidget {
  const StateView({
    super.key,
    required this.icon,
    required this.title,
    this.message,
    this.action,
  });
  final IconData icon;
  final String title;
  final String? message;
  final Widget? action;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(A3Spacing.xl),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: A3Colors.primarySoft,
              borderRadius: BorderRadius.circular(18),
            ),
            child: Icon(icon, size: 28, color: A3Colors.primaryStrong),
          ),
          const SizedBox(height: A3Spacing.lg),
          Text(
            title,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          if (message != null) ...[
            const SizedBox(height: A3Spacing.sm),
            Text(
              message!,
              textAlign: TextAlign.center,
              style: const TextStyle(color: A3Colors.muted, height: 1.45),
            ),
          ],
          if (action != null) ...[
            const SizedBox(height: A3Spacing.lg),
            action!,
          ],
        ],
      ),
    ),
  );
}

class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.error, required this.onRetry});
  final Object error;
  final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) => StateView(
    icon: Icons.wifi_off_rounded,
    title: 'We couldn’t load this',
    message: '$error',
    action: OutlinedButton(onPressed: onRetry, child: const Text('Try again')),
  );
}

/// Opens the phone dialer; copies the number when the device can't call.
Future<void> callNumber(BuildContext context, String phone) async {
  if (!await launchUrl(Uri(scheme: 'tel', path: phone))) {
    await Clipboard.setData(ClipboardData(text: phone));
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Number copied — this device can’t place calls.'),
        ),
      );
    }
  }
}

/// Google Maps directions (deep link — docs/ARCHITECTURE.md §3 "Maps"). Uses the exact
/// map pin when known, otherwise the address text.
Future<void> navigateTo(
  BuildContext context,
  String address, {
  double? lat,
  double? lng,
}) async {
  final uri = Uri.https('www.google.com', '/maps/dir/', {
    'api': '1',
    'destination': lat != null && lng != null ? '$lat,$lng' : address,
    'travelmode': 'two-wheeler',
  });
  if (!await launchUrl(uri, mode: LaunchMode.externalApplication) &&
      context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Couldn’t open maps on this device.')),
    );
  }
}

import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// Temporary tab body until the feature lands (docs/ROADMAP.md Phase 7).
class PlaceholderScreen extends StatelessWidget {
  const PlaceholderScreen({super.key, required this.title});
  final String title;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(A3Spacing.xl),
          child: Text(
            '$title is coming in a later phase.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyLarge
                ?.copyWith(color: A3Colors.muted),
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../theme/app_theme.dart';

/// Two-tone page: A3 orange frame with header and white content panel with rounded top corners.
/// Exactly matching mobile-customer aesthetic.
class FramedPage extends StatelessWidget {
  const FramedPage({
    super.key,
    required this.title,
    required this.child,
    this.actions = const [],
    this.bottom,
    this.showBack = true,
    this.onBack,
    this.headerWidget,
    this.headerImage,
    this.headerHeight = 64,
  });

  final String title;
  final Widget child;
  final List<Widget> actions;
  final Widget? bottom;
  final bool showBack;
  final VoidCallback? onBack;
  final Widget? headerWidget;

  /// Optional artwork behind the orange header (it runs under the status bar and
  /// the panel's rounded corners), e.g. the Home rider banner.
  final String? headerImage;
  final double headerHeight;

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: A3Colors.frame,
        body: Stack(
          children: [
            if (headerImage != null)
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                height: MediaQuery.of(context).padding.top + headerHeight + 40,
                child: Image.asset(
                  headerImage!,
                  fit: BoxFit.cover,
                  alignment: Alignment.centerRight,
                  excludeFromSemantics: true,
                ),
              ),
            Column(
              children: [
                SafeArea(
                  bottom: false,
                  child: SizedBox(
                    height: headerHeight,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: A3Spacing.lg,
                      ),
                      child:
                          headerWidget ??
                          Row(
                            children: [
                              if (showBack)
                                SizedBox(
                                  width: 48,
                                  child: Align(
                                    alignment: Alignment.centerLeft,
                                    child: CircleBack(onPressed: onBack),
                                  ),
                                )
                              else
                                const SizedBox(width: 48),
                              Expanded(
                                child: Text(
                                  title,
                                  textAlign: TextAlign.center,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 20,
                                    fontWeight: FontWeight.w700,
                                    fontFamily: 'Outfit',
                                  ),
                                ),
                              ),
                              ConstrainedBox(
                                constraints: const BoxConstraints(minWidth: 48),
                                child: actions.isEmpty
                                    ? const SizedBox(width: 48)
                                    : Row(
                                        mainAxisSize: MainAxisSize.min,
                                        mainAxisAlignment:
                                            MainAxisAlignment.end,
                                        children: actions,
                                      ),
                              ),
                            ],
                          ),
                    ),
                  ),
                ),
                Expanded(
                  child: ClipRRect(
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(32),
                    ),
                    child: Material(
                      color: A3Colors.surface,
                      child: Column(
                        children: [
                          Expanded(child: child),
                          if (bottom != null)
                            SafeArea(
                              top: false,
                              child: Padding(
                                padding: const EdgeInsets.fromLTRB(
                                  A3Spacing.lg,
                                  A3Spacing.sm,
                                  A3Spacing.lg,
                                  A3Spacing.lg,
                                ),
                                child: bottom,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Outlined circular back button on the frame.
class CircleBack extends StatelessWidget {
  const CircleBack({super.key, this.onPressed, this.light = true});
  final VoidCallback? onPressed;
  final bool light;

  @override
  Widget build(BuildContext context) {
    final c = light ? Colors.white : A3Colors.ink;
    return Semantics(
      button: true,
      label: 'Back',
      child: InkResponse(
        onTap:
            onPressed ??
            () => context.canPop() ? context.pop() : context.go('/'),
        radius: 26,
        child: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: c.withValues(alpha: 0.7), width: 1.5),
          ),
          child: Icon(Icons.arrow_back, color: c, size: 20),
        ),
      ),
    );
  }
}

/// Soft rounded action button on white card or header.
class SoftIconButton extends StatelessWidget {
  const SoftIconButton({
    super.key,
    required this.icon,
    required this.onPressed,
    required this.tooltip,
    this.color = A3Colors.ink,
    this.background = A3Colors.card,
  });

  final IconData icon;
  final VoidCallback onPressed;
  final String tooltip;
  final Color color, background;

  @override
  Widget build(BuildContext context) => Tooltip(
    message: tooltip,
    child: Material(
      color: background,
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onPressed,
        child: SizedBox(
          width: 44,
          height: 44,
          child: Icon(icon, color: color, size: 22),
        ),
      ),
    ),
  );
}

/// Pill filter / tab chip.
class PillChip extends StatelessWidget {
  const PillChip({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(right: A3Spacing.sm),
    child: Semantics(
      selected: selected,
      button: true,
      child: Material(
        color: selected ? A3Colors.ink : A3Colors.card,
        borderRadius: BorderRadius.circular(99),
        child: InkWell(
          borderRadius: BorderRadius.circular(99),
          onTap: onTap,
          child: Container(
            constraints: const BoxConstraints(minHeight: 40),
            padding: const EdgeInsets.symmetric(horizontal: 18),
            alignment: Alignment.center,
            child: Text(
              label,
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: selected ? Colors.white : A3Colors.ink,
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

/// Section title.
class SectionTitle extends StatelessWidget {
  const SectionTitle(this.title, {super.key, this.action, this.onAction});
  final String title;
  final String? action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Expanded(
        child: Text(
          title,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            fontFamily: 'Outfit',
          ),
        ),
      ),
      if (action != null)
        TextButton(
          onPressed: onAction,
          style: TextButton.styleFrom(foregroundColor: A3Colors.primaryStrong),
          child: Text(action!),
        ),
    ],
  );
}

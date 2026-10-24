import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/frame.dart';

/// Screen 15 · Break Tracker (Sheet 1)
/// Live stopwatch, break logs, and duty/break duration summary.
class BreakTrackerScreen extends StatefulWidget {
  const BreakTrackerScreen({super.key});

  @override
  State<BreakTrackerScreen> createState() => _BreakTrackerScreenState();
}

class _BreakTrackerScreenState extends State<BreakTrackerScreen> {
  bool _onBreak = true;
  int _seconds = 15 * 60 + 23; // 00:15:23
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_onBreak && mounted) {
        setState(() => _seconds++);
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  String get _formattedTime {
    final h = _seconds ~/ 3600;
    final m = (_seconds % 3600) ~/ 60;
    final s = _seconds % 60;
    return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  void _toggleBreak() {
    setState(() {
      _onBreak = !_onBreak;
      if (!_onBreak) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Break ended. You are now back ON DUTY for orders.'),
          ),
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return FramedPage(
      title: 'Break Tracker',
      showBack: true,
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Current Break Hero Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: A3Colors.surface,
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: A3Colors.line),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x0F000000),
                    blurRadius: 10,
                    offset: Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Current Break',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                          color: A3Colors.ink,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: _onBreak
                              ? const Color(0xFFE8F5E9)
                              : A3Colors.card,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: _onBreak
                                    ? A3Colors.success
                                    : A3Colors.muted,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              _onBreak ? 'On Break' : 'Paused',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: _onBreak
                                    ? A3Colors.success
                                    : A3Colors.muted,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: A3Colors.primarySoft,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.coffee_rounded,
                      size: 36,
                      color: A3Colors.primary,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    _formattedTime,
                    style: const TextStyle(
                      fontFamily: 'Outfit',
                      fontSize: 34,
                      fontWeight: FontWeight.bold,
                      color: A3Colors.ink,
                      letterSpacing: 1,
                    ),
                  ),
                  const SizedBox(height: 18),
                  FilledButton(
                    onPressed: _toggleBreak,
                    style: FilledButton.styleFrom(
                      backgroundColor: _onBreak
                          ? A3Colors.danger
                          : A3Colors.primary,
                      minimumSize: const Size.fromHeight(48),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: Text(
                      _onBreak ? 'End Break' : 'Take a Break',
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Today's Breaks Section
            const Text(
              'Today\'s Breaks',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.bold,
                color: A3Colors.ink,
              ),
            ),
            const SizedBox(height: 12),
            _buildBreakItem('01:15 PM – 01:30 PM', '15 mins'),
            const SizedBox(height: 8),
            _buildBreakItem('11:00 AM – 11:15 AM', '15 mins'),
            const SizedBox(height: 8),
            _buildBreakItem('09:30 AM – 09:45 AM', '15 mins'),
            const SizedBox(height: 24),

            // Duty Totals Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: A3Colors.card,
                borderRadius: BorderRadius.circular(18),
              ),
              child: Column(
                children: [
                  _buildSummaryRow('Online Duration', '6h 45m'),
                  const Divider(height: 20, color: A3Colors.line),
                  _buildSummaryRow('Break Time', '1h 45m'),
                  const Divider(height: 20, color: A3Colors.line),
                  _buildSummaryRow('Total Duty Time', '8h 30m', isBold: true),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBreakItem(String times, String duration) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: A3Colors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: A3Colors.line),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              const Icon(
                Icons.access_time_rounded,
                size: 18,
                color: A3Colors.muted,
              ),
              const SizedBox(width: 10),
              Text(
                times,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: A3Colors.ink,
                ),
              ),
            ],
          ),
          Text(
            duration,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: A3Colors.primaryStrong,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value, {bool isBold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 14,
            color: isBold ? A3Colors.ink : A3Colors.muted,
            fontWeight: isBold ? FontWeight.bold : FontWeight.w500,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 15,
            fontWeight: isBold ? FontWeight.bold : FontWeight.w600,
            color: isBold ? A3Colors.primaryStrong : A3Colors.ink,
          ),
        ),
      ],
    );
  }
}

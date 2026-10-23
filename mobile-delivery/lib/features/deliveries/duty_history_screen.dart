import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/frame.dart';

/// Screen 16 · Attendance / Duty History (Sheet 1)
/// Tabs (Today / Week / Month), hero shift metrics, and timeline of shift events.
class DutyHistoryScreen extends StatefulWidget {
  const DutyHistoryScreen({super.key});

  @override
  State<DutyHistoryScreen> createState() => _DutyHistoryScreenState();
}

class _DutyHistoryScreenState extends State<DutyHistoryScreen> {
  int _selectedTab = 0; // 0: Today, 1: Week, 2: Month

  @override
  Widget build(BuildContext context) {
    return FramedPage(
      title: 'Duty History',
      showBack: true,
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Period Segmented Tabs
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: A3Colors.card,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  for (var i = 0; i < 3; i++)
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _selectedTab = i),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(
                            color: _selectedTab == i ? A3Colors.surface : Colors.transparent,
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: _selectedTab == i
                                ? const [BoxShadow(color: Color(0x14000000), blurRadius: 4, offset: Offset(0, 2))]
                                : null,
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            ['Today', 'Week', 'Month'][i],
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: _selectedTab == i ? FontWeight.bold : FontWeight.w500,
                              color: _selectedTab == i ? A3Colors.ink : A3Colors.muted,
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Hero Duty Card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: A3Colors.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: A3Colors.line),
                boxShadow: const [
                  BoxShadow(color: Color(0x0A000000), blurRadius: 8, offset: Offset(0, 3)),
                ],
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text('8h 30m', style: TextStyle(fontFamily: 'Outfit', fontSize: 26, fontWeight: FontWeight.bold, color: A3Colors.ink)),
                        SizedBox(height: 2),
                        Text('Total Duty Time', style: TextStyle(fontSize: 12, color: A3Colors.muted)),
                      ],
                    ),
                  ),
                  Container(width: 1, height: 44, color: A3Colors.line),
                  const SizedBox(width: 20),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text('12', style: TextStyle(fontFamily: 'Outfit', fontSize: 26, fontWeight: FontWeight.bold, color: A3Colors.primaryStrong)),
                        SizedBox(height: 2),
                        Text('Orders Delivered', style: TextStyle(fontSize: 12, color: A3Colors.muted)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Shift Timeline Section
            const Text(
              'Timeline',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: A3Colors.ink),
            ),
            const SizedBox(height: 14),
            _buildTimelineItem('Went Online', '09:00 AM', Icons.radio_button_checked, A3Colors.success),
            _buildTimelineItem('Went On Break', '11:00 AM', Icons.pause_circle_outline, Colors.orange),
            _buildTimelineItem('Back Online', '11:15 AM', Icons.play_circle_outline, A3Colors.success),
            _buildTimelineItem('Went On Break', '01:15 PM', Icons.pause_circle_outline, Colors.orange),
            _buildTimelineItem('Back Online', '01:30 PM', Icons.play_circle_outline, A3Colors.success),
            _buildTimelineItem('Went Offline', '05:30 PM', Icons.power_settings_new, A3Colors.danger, isLast: true),
            const SizedBox(height: 20),

            // Shift Summary Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: A3Colors.card,
                borderRadius: BorderRadius.circular(18),
              ),
              child: Column(
                children: [
                  _buildStatRow('Online Duration', '6h 45m'),
                  const Divider(height: 18, color: A3Colors.line),
                  _buildStatRow('Break Time', '1h 45m'),
                  const Divider(height: 18, color: A3Colors.line),
                  _buildStatRow('Total Duty Time', '8h 30m', isBold: true),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTimelineItem(String title, String time, IconData icon, Color color, {bool isLast = false}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Icon(icon, size: 20, color: color),
            if (!isLast) Container(width: 2, height: 32, color: A3Colors.line),
          ],
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(top: 1),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: A3Colors.ink)),
                Text(time, style: const TextStyle(fontSize: 13, color: A3Colors.muted)),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStatRow(String label, String value, {bool isBold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(fontSize: 13, color: isBold ? A3Colors.ink : A3Colors.muted, fontWeight: isBold ? FontWeight.bold : FontWeight.normal)),
        Text(value, style: TextStyle(fontSize: 14, fontWeight: isBold ? FontWeight.bold : FontWeight.w600, color: isBold ? A3Colors.primaryStrong : A3Colors.ink)),
      ],
    );
  }
}

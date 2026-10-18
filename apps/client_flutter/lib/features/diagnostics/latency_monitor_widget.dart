import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../session/session_controller.dart';

class LatencyMonitorWidget extends StatelessWidget {
  final SessionStatus status;
  final int latencyMs;
  final bool lipSyncActive;

  const LatencyMonitorWidget({
    super.key,
    required this.status,
    required this.latencyMs,
    required this.lipSyncActive,
  });

  Color _getLatencyColor(int ms) {
    if (ms < 400) return AppTheme.accentGreen;
    if (ms < 900) return AppTheme.accentAmber;
    return AppTheme.accentRed;
  }

  @override
  Widget build(BuildContext context) {
    final latencyColor = _getLatencyColor(latencyMs);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: AppTheme.glassCardDecoration(),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Connection Status Indicator Dot
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: status == SessionStatus.connected
                  ? AppTheme.accentGreen
                  : (status == SessionStatus.connecting
                      ? AppTheme.accentAmber
                      : AppTheme.textMuted),
              boxShadow: [
                if (status == SessionStatus.connected)
                  BoxShadow(
                    color: AppTheme.accentGreen.withOpacity(0.6),
                    blurRadius: 8,
                    spreadRadius: 2,
                  ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(
            status == SessionStatus.connected
                ? 'متصل'
                : (status == SessionStatus.connecting ? 'در حال اتصال...' : 'آماده به کار'),
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
          ),
          const SizedBox(width: 16),
          // Latency Metric
          if (status == SessionStatus.connected) ...[
            Container(width: 1, height: 16, color: AppTheme.cardBorder),
            const SizedBox(width: 16),
            Icon(Icons.speed, size: 14, color: latencyColor),
            const SizedBox(width: 6),
            Text(
              '$latencyMs ms',
              style: TextStyle(
                color: latencyColor,
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(width: 16),
            Container(width: 1, height: 16, color: AppTheme.cardBorder),
            const SizedBox(width: 16),
            Icon(
              lipSyncActive ? Icons.face : Icons.volume_up,
              size: 14,
              color: lipSyncActive ? AppTheme.primaryNeon : AppTheme.textMuted,
            ),
            const SizedBox(width: 6),
            Text(
              lipSyncActive ? 'Simli WebRTC (<300ms)' : 'صوت پیوسته',
              style: TextStyle(
                color: lipSyncActive ? AppTheme.primaryNeon : AppTheme.textSecondary,
                fontSize: 12,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

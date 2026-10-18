import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

class LipSyncAvatarWidget extends StatefulWidget {
  final bool isConnected;
  final bool isSpeaking;
  final int latencyMs;
  final String? webrtcUrl;
  final VoidCallback? onToggleExpand;
  final bool isExpanded;

  const LipSyncAvatarWidget({
    super.key,
    required this.isConnected,
    this.isSpeaking = false,
    this.latencyMs = 280,
    this.webrtcUrl,
    this.onToggleExpand,
    this.isExpanded = false,
  });

  @override
  State<LipSyncAvatarWidget> createState() => _LipSyncAvatarWidgetState();
}

class _LipSyncAvatarWidgetState extends State<LipSyncAvatarWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surfaceDark.withOpacity(0.85),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: widget.isSpeaking
              ? AppTheme.primaryNeon
              : AppTheme.cardBorder,
          width: widget.isSpeaking ? 1.5 : 1.0,
        ),
        boxShadow: widget.isSpeaking
            ? [
                BoxShadow(
                  color: AppTheme.primaryNeon.withOpacity(0.2),
                  blurRadius: 16,
                  spreadRadius: 2,
                ),
              ]
            : [],
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Background Gradient Mesh
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment.center,
                  radius: 0.9,
                  colors: [
                    widget.isConnected
                        ? AppTheme.primaryNeon.withOpacity(0.08)
                        : AppTheme.surfaceLight.withOpacity(0.2),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),

          // Central Avatar Visual
          if (widget.isConnected) ...[
            AnimatedBuilder(
              animation: _pulseController,
              builder: (context, child) {
                final scale = widget.isSpeaking
                    ? 1.0 + (_pulseController.value * 0.05)
                    : 1.0;
                return Transform.scale(
                  scale: scale,
                  child: Container(
                    width: 140,
                    height: 140,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        colors: [
                          AppTheme.primaryNeon.withOpacity(0.2),
                          AppTheme.secondaryNeon.withOpacity(0.15),
                        ],
                      ),
                      border: Border.all(
                        color: widget.isSpeaking
                            ? AppTheme.primaryNeon
                            : AppTheme.secondaryNeon.withOpacity(0.5),
                        width: 2,
                      ),
                    ),
                    child: Center(
                      child: Icon(
                        Icons.record_voice_over_rounded,
                        size: 64,
                        color: widget.isSpeaking
                            ? AppTheme.primaryNeon
                            : AppTheme.textSecondary,
                      ),
                    ),
                  ),
                );
              },
            ),
          ] else ...[
            // Idle State Placeholder
            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.face_retouching_natural_outlined,
                  size: 54,
                  color: AppTheme.textMuted.withOpacity(0.6),
                ),
                const SizedBox(height: 12),
                const Text(
                  'استریم هماهنگ‌سازی لب (Simli WebRTC)',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                const Text(
                  'با شروع نشست، ویدیوی همگام چهره در این بخش پخش می‌شود',
                  style: TextStyle(fontSize: 11, color: AppTheme.textMuted),
                ),
              ],
            ),
          ],

          // Top Status Bar (Telemetry)
          Positioned(
            top: 12,
            left: 12,
            right: 12,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.5),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: AppTheme.cardBorder),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: widget.isConnected
                              ? AppTheme.accentGreen
                              : AppTheme.textMuted,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        widget.isConnected ? 'LIVE • 25 FPS' : 'STANDBY',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: widget.isConnected ? AppTheme.accentGreen : AppTheme.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
                if (widget.isConnected)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.5),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      '${widget.latencyMs}ms WebRTC',
                      style: const TextStyle(fontSize: 10, color: AppTheme.primaryNeon),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

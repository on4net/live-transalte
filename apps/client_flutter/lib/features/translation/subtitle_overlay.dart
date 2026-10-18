import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../session/session_controller.dart';

class SubtitleOverlay extends StatelessWidget {
  final SubtitleModel? subtitle;
  final bool isVisible;

  const SubtitleOverlay({
    super.key,
    required this.subtitle,
    this.isVisible = true,
  });

  @override
  Widget build(BuildContext context) {
    if (!isVisible || subtitle == null || subtitle!.translatedText.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A).withOpacity(0.85),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppTheme.primaryNeon.withOpacity(0.35),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.5),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
          BoxShadow(
            color: AppTheme.primaryNeon.withOpacity(0.12),
            blurRadius: 16,
            spreadRadius: 2,
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Original Source Utterance (Subtle)
          if (subtitle!.sourceText.isNotEmpty)
            Text(
              subtitle!.sourceText,
              style: TextStyle(
                color: AppTheme.textMuted.withOpacity(0.9),
                fontSize: 13,
                fontStyle: FontStyle.italic,
              ),
              textAlign: TextAlign.left,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          const SizedBox(height: 6),
          // Translated Persian Dubbing Text (Prominent & Right-to-Left)
          Directionality(
            textDirection: TextDirection.rtl,
            child: Text(
              subtitle!.translatedText,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.2,
                height: 1.4,
              ),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    );
  }
}

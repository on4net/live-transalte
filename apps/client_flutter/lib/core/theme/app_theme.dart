import 'package:flutter/material.dart';

class AppTheme {
  static const Color background = Color(0xFF0A0E17);
  static const Color surface = Color(0xFF131B2E);
  static const Color surfaceLight = Color(0xFF1E293B);
  static const Color cardBorder = Color(0xFF2E3D56);

  static const Color primaryNeon = Color(0xFF00E5FF);
  static const Color secondaryNeon = Color(0xFF9D4EDD);
  static const Color accentCyan = Color(0xFF06B6D4);
  static const Color accentGreen = Color(0xFF10B981);
  static const Color accentAmber = Color(0xFFF59E0B);
  static const Color accentRed = Color(0xFFEF4444);

  static const Color textPrimary = Color(0xFFF8FAFC);
  static const Color textSecondary = Color(0xFF94A3B8);
  static const Color textMuted = Color(0xFF64748B);

  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: background,
      primaryColor: primaryNeon,
      colorScheme: const ColorScheme.dark(
        primary: primaryNeon,
        secondary: secondaryNeon,
        surface: surface,
        error: accentRed,
      ),
      fontFamily: 'Segoe UI',
      cardTheme: CardTheme(
        color: surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: cardBorder, width: 1),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryNeon,
          foregroundColor: const Color(0xFF050811),
          elevation: 4,
          shadowColor: primaryNeon.withOpacity(0.4),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 15,
          ),
        ),
      ),
      sliderTheme: SliderThemeData(
        activeTrackColor: primaryNeon,
        inactiveTrackColor: surfaceLight,
        thumbColor: primaryNeon,
        overlayColor: primaryNeon.withOpacity(0.2),
        trackHeight: 4,
      ),
    );
  }

  // Reusable Glassmorphism Card Decoration
  static BoxDecoration glassCardDecoration({Color? borderColor}) {
    return BoxDecoration(
      color: surface.withOpacity(0.75),
      borderRadius: BorderRadius.circular(16),
      border: Border.all(
        color: borderColor ?? cardBorder.withOpacity(0.8),
        width: 1,
      ),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withOpacity(0.35),
          blurRadius: 20,
          offset: const Offset(0, 8),
        ),
      ],
    );
  }
}

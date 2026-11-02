import 'package:flutter/material.dart';
import 'app_colors.dart';

@immutable
class AppThemeTokens extends ThemeExtension<AppThemeTokens> {
  const AppThemeTokens({
    required this.primary,
    required this.primaryOnDark,
    required this.secondary,
    required this.background,
    required this.surface,
    required this.surfaceAlt,
    required this.textPrimary,
    required this.textSecondary,
  });

  final Color primary;
  final Color primaryOnDark;
  final Color secondary;
  final Color background;
  final Color surface;
  final Color surfaceAlt;
  final Color textPrimary;
  final Color textSecondary;

  static AppThemeTokens of(BuildContext context) =>
      Theme.of(context).extension<AppThemeTokens>()!;

  @override
  AppThemeTokens copyWith({
    Color? primary,
    Color? primaryOnDark,
    Color? secondary,
    Color? background,
    Color? surface,
    Color? surfaceAlt,
    Color? textPrimary,
    Color? textSecondary,
  }) =>
      AppThemeTokens(
        primary: primary ?? this.primary,
        primaryOnDark: primaryOnDark ?? this.primaryOnDark,
        secondary: secondary ?? this.secondary,
        background: background ?? this.background,
        surface: surface ?? this.surface,
        surfaceAlt: surfaceAlt ?? this.surfaceAlt,
        textPrimary: textPrimary ?? this.textPrimary,
        textSecondary: textSecondary ?? this.textSecondary,
      );

  @override
  AppThemeTokens lerp(ThemeExtension<AppThemeTokens>? other, double t) {
    if (other is! AppThemeTokens) return this;
    return AppThemeTokens(
      primary: Color.lerp(primary, other.primary, t)!,
      primaryOnDark: Color.lerp(primaryOnDark, other.primaryOnDark, t)!,
      secondary: Color.lerp(secondary, other.secondary, t)!,
      background: Color.lerp(background, other.background, t)!,
      surface: Color.lerp(surface, other.surface, t)!,
      surfaceAlt: Color.lerp(surfaceAlt, other.surfaceAlt, t)!,
      textPrimary: Color.lerp(textPrimary, other.textPrimary, t)!,
      textSecondary: Color.lerp(textSecondary, other.textSecondary, t)!,
    );
  }
}

class AppTheme {
  const AppTheme._();

  static ThemeData get dark => _build(Brightness.dark);
  static ThemeData get light => _build(Brightness.light);

  static ThemeData _build(Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    final scheme = ColorScheme(
      brightness: brightness,
      primary: AppColors.primary,
      onPrimary: AppColors.darkText,
      secondary: AppColors.secondary,
      onSecondary: AppColors.darkText,
      error: AppColors.secondary,
      onError: AppColors.darkText,
      surface: isDark ? AppColors.darkSurface : AppColors.lightSurface,
      onSurface: isDark ? AppColors.darkText : AppColors.lightText,
      surfaceContainerHighest:
          isDark ? AppColors.darkSurfaceAlt : AppColors.lightSurfaceAlt,
    );
    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      scaffoldBackgroundColor:
          isDark ? AppColors.darkBackground : AppColors.lightBackground,
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor:
            isDark ? AppColors.darkSurface : AppColors.lightSurface,
        indicatorColor: AppColors.primary.withValues(alpha: 0.18),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: AppColors.transparent,
        selectedItemColor: AppColors.primary,
        unselectedItemColor:
            isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: isDark ? AppColors.darkSurface : AppColors.lightSurface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
      ),
      extensions: [
        AppThemeTokens(
          primary: AppColors.primary,
          primaryOnDark: AppColors.primaryOnDark,
          secondary: AppColors.secondary,
          background:
              isDark ? AppColors.darkBackground : AppColors.lightBackground,
          surface: isDark ? AppColors.darkSurface : AppColors.lightSurface,
          surfaceAlt:
              isDark ? AppColors.darkSurfaceAlt : AppColors.lightSurfaceAlt,
          textPrimary: isDark ? AppColors.darkText : AppColors.lightText,
          textSecondary:
              isDark ? AppColors.darkTextMuted : AppColors.lightTextMuted,
        ),
      ],
    );
  }
}




import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app_config.dart';

class ThemeController extends ChangeNotifier {
  ThemeMode _themeMode = ThemeMode.dark;

  ThemeMode get themeMode => _themeMode;
  bool get isDark => _themeMode == ThemeMode.dark;

  Future<void> load() async {
    final preferences = await SharedPreferences.getInstance();
    final stored = preferences.getString(AppConfig.themePreferenceKey);
    if (stored == 'light') {
      _themeMode = ThemeMode.light;
      notifyListeners();
    }
  }

  Future<void> toggle() async {
    _themeMode = isDark ? ThemeMode.light : ThemeMode.dark;
    notifyListeners();
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(
      AppConfig.themePreferenceKey,
      isDark ? 'dark' : 'light',
    );
  }
}






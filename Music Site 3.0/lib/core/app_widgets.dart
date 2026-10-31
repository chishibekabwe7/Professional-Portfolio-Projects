import 'package:flutter/material.dart';

export '../widgets/app_logo.dart';
export '../widgets/cover_art.dart';
import 'theme_controller.dart';

class ThemeToggle extends StatelessWidget {
  const ThemeToggle({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = ThemeControllerScope.of(context);
    return IconButton(
      tooltip: controller.isDark ? 'Use light theme' : 'Use dark theme',
      icon: Icon(controller.isDark ? Icons.light_mode : Icons.dark_mode),
      onPressed: controller.toggle,
    );
  }
}

class ThemeControllerScope extends InheritedNotifier<ThemeController> {
  const ThemeControllerScope({
    super.key,
    required ThemeController controller,
    required super.child,
  }) : super(notifier: controller);

  static ThemeController of(BuildContext context) {
    final scope =
        context.dependOnInheritedWidgetOfExactType<ThemeControllerScope>();
    assert(scope != null, 'ThemeControllerScope is missing from the widget tree');
    return scope!.notifier!;
  }
}






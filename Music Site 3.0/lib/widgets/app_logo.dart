import 'package:flutter/material.dart';
import 'package:musicplayer/core/app_config.dart';
import 'package:musicplayer/core/app_theme.dart';

class AppLogo extends StatelessWidget {
  const AppLogo({super.key, this.size = 34});

  final double size;

  @override
  Widget build(BuildContext context) {
    final tokens = AppThemeTokens.of(context);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        DecoratedBox(
          decoration: BoxDecoration(
            color: tokens.primary,
            borderRadius: BorderRadius.circular(size * 0.25),
          ),
          child: SizedBox(
            width: size,
            height: size,
            child: Icon(
              Icons.music_note,
              size: size * 0.62,
              color: Theme.of(context).colorScheme.onPrimary,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          AppConfig.appName,
          style: TextStyle(fontSize: size * 0.42, fontWeight: FontWeight.w700),
        ),
      ],
    );
  }
}





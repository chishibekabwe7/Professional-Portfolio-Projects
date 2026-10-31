import 'package:flutter/material.dart';
import 'package:musicplayer/core/app_theme.dart';

class CoverArt extends StatelessWidget {
  const CoverArt({
    super.key,
    required this.image,
    this.size = 64,
    this.width,
    this.height,
    this.borderRadius = 12,
  });

  final String image;
  final double size;
  final double? width;
  final double? height;
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: image.isEmpty
          ? _placeholder(context)
          : image.startsWith('http')
              ? Image.network(
                  image,
                  width: width ?? size,
                  height: height ?? size,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => _placeholder(context),
                )
              : Image.asset(
                  image,
                  width: width ?? size,
                  height: height ?? size,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => _placeholder(context),
                ),
    );
  }

  Widget _placeholder(BuildContext context) {
    final tokens = AppThemeTokens.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [tokens.primary, tokens.secondary],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: SizedBox(
        width: width ?? size,
        height: height ?? size,
        child: Icon(
          Icons.music_note,
          color: Theme.of(context).colorScheme.onPrimary,
          size: size * .4,
        ),
      ),
    );
  }
}




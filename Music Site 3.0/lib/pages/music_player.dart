import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:musicplayer/services/player_service.dart';
import 'package:musicplayer/widgets/cover_art.dart';

class MusicPlayer extends StatelessWidget {
  const MusicPlayer({super.key});

  String _format(Duration value) {
    final minutes = value.inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = value.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<PlayerService>(
      builder: (context, player, child) {
        final track = player.currentTrack;
        if (track == null) {
          return const Scaffold(body: Center(child: Text('Nothing is playing')));
        }
        final duration = player.duration == Duration.zero
            ? Duration(seconds: track.durationSeconds)
            : player.duration;
        final max = duration.inSeconds.toDouble().clamp(1, double.infinity).toDouble();
        final value = player.position.inSeconds.toDouble().clamp(0, max).toDouble();
        return Scaffold(
          extendBodyBehindAppBar: true,
          appBar: AppBar(
            leading: IconButton(
              icon: const Icon(Icons.keyboard_arrow_down, size: 36),
              onPressed: () => Navigator.pop(context),
            ),
          ),
          body: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Theme.of(context).colorScheme.primary.withValues(alpha: .65),
                  Theme.of(context).colorScheme.surface,
                ],
                begin: Alignment.bottomLeft,
                end: Alignment.topRight,
              ),
            ),
            child: SafeArea(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CoverArt(image: track.coverUrl, width: 350, height: 350),
                  const SizedBox(height: 48),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 25),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(track.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                              const SizedBox(height: 3),
                              Text(track.artistName),
                            ],
                          ),
                        ),
                        IconButton(onPressed: player.toggleShuffle, icon: Icon(Icons.shuffle, color: player.shuffle ? Theme.of(context).colorScheme.primary : null)),
                      ],
                    ),
                  ),
                  Slider(
                    min: 0,
                    max: max,
                    value: value,
                    onChanged: (next) => player.seek(Duration(seconds: next.toInt())),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 22),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [Text(_format(player.position)), Text(_format(duration - player.position))],
                    ),
                  ),
                  const SizedBox(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      IconButton(icon: const Icon(Icons.fast_rewind_rounded, size: 58), onPressed: player.previous),
                      IconButton(icon: Icon(player.isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded, size: 70), onPressed: player.isPlaying ? player.pause : player.play),
                      IconButton(icon: const Icon(Icons.fast_forward_rounded, size: 58), onPressed: player.next),
                    ],
                  ),
                  if (player.error != null)
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: Text(player.error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                    ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

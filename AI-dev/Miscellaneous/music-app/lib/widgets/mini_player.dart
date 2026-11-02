import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:musicplayer/services/player_service.dart';
import 'package:musicplayer/widgets/cover_art.dart';

class MiniPlayer extends StatelessWidget {
  const MiniPlayer({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<PlayerService>(
      builder: (context, player, child) {
        final track = player.currentTrack;
        if (track == null) return const SizedBox.shrink();
        return Material(
          color: Theme.of(context).colorScheme.surface,
          child: InkWell(
            onTap: () => Navigator.pushNamed(context, '/player'),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              child: Row(
                children: [
                  CoverArt(image: track.coverUrl, size: 44, borderRadius: 8),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(track.title, maxLines: 1, overflow: TextOverflow.ellipsis),
                        Text(track.artistName, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: player.isPlaying ? 'Pause' : 'Play',
                    onPressed: player.isPlaying ? player.pause : player.play,
                    icon: Icon(player.isPlaying ? Icons.pause : Icons.play_arrow),
                  ),
                  IconButton(tooltip: 'Next', onPressed: player.next, icon: const Icon(Icons.skip_next)),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

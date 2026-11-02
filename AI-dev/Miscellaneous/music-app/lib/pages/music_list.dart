import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:musicplayer/data/music_repository.dart';
import 'package:musicplayer/models/track.dart';
import 'package:musicplayer/services/player_service.dart';
import 'package:musicplayer/widgets/async_view.dart';
import 'package:musicplayer/widgets/cover_art.dart';

class MusicList extends StatelessWidget {
  const MusicList({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Recently Played')),
        body: AsyncView<List<Track>>(
          loader: context.read<MusicRepository>().getTracks,
          isEmpty: (tracks) => tracks.isEmpty,
          builder: (context, tracks) => GridView.builder(
            padding: const EdgeInsets.all(10),
            itemCount: tracks.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, childAspectRatio: .75),
            itemBuilder: (_, index) => InkWell(
              onTap: () => context.read<PlayerService>().playQueue(tracks, startIndex: index),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CoverArt(image: tracks[index].coverUrl, width: double.infinity, height: 180, borderRadius: 10),
                  const SizedBox(height: 8),
                  Text(tracks[index].title, maxLines: 1, overflow: TextOverflow.ellipsis),
                  Text(tracks[index].artistName, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
                ],
              ),
            ),
          ),
        ),
      );
}

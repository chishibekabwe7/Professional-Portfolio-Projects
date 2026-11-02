import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:musicplayer/core/app_widgets.dart';
import 'package:musicplayer/data/music_repository.dart';
import 'package:musicplayer/models/track.dart';
import 'package:musicplayer/services/player_service.dart';
import 'package:musicplayer/widgets/app_logo.dart';
import 'package:musicplayer/widgets/async_view.dart';
import 'package:musicplayer/widgets/cover_art.dart';

class RadioPage extends StatelessWidget {
  const RadioPage({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          toolbarHeight: 100,
          leading: const Padding(padding: EdgeInsets.all(14), child: AppLogo()),
          title: const Text('Radio', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 35)),
          actions: const [ThemeToggle()],
        ),
        body: AsyncView<List<Track>>(
          loader: context.read<MusicRepository>().getTracks,
          isEmpty: (tracks) => tracks.isEmpty,
          builder: (context, tracks) => ListView.builder(
            padding: const EdgeInsets.all(10),
            itemCount: tracks.length,
            itemBuilder: (_, index) => Card(
              clipBehavior: Clip.antiAlias,
              child: InkWell(
                onTap: () => context.read<PlayerService>().playQueue(tracks, startIndex: index),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CoverArt(image: tracks[index].coverUrl, width: double.infinity, height: 220),
                    ListTile(
                      leading: const Icon(Icons.graphic_eq),
                      title: Text('Live session: ${tracks[index].title}'),
                      subtitle: Text(tracks[index].artistName),
                      trailing: const Icon(Icons.play_circle_fill_rounded),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
}

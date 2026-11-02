import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:musicplayer/core/app_widgets.dart';
import 'package:musicplayer/data/music_repository.dart';
import 'package:musicplayer/models/track.dart';
import 'package:musicplayer/services/player_service.dart';
import 'package:musicplayer/widgets/app_logo.dart';
import 'package:musicplayer/widgets/async_view.dart';
import 'package:musicplayer/widgets/cover_art.dart';

class BrowsePage extends StatelessWidget {
  const BrowsePage({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          toolbarHeight: 100,
          leading: const Padding(padding: EdgeInsets.all(14), child: AppLogo()),
          title: const Text('Browse', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 35)),
          actions: const [ThemeToggle()],
        ),
        body: AsyncView<List<Track>>(
          loader: context.read<MusicRepository>().getTracks,
          isEmpty: (tracks) => tracks.isEmpty,
          builder: (context, tracks) => ListView(
            padding: const EdgeInsets.only(bottom: 24),
            children: [
              _heading('We Recommend'),
              _trackRow(context, tracks),
              _heading('Now in Spatial Audio'),
              _trackRow(context, tracks.reversed.toList()),
              _heading('Sing Along'),
              _trackRow(context, tracks),
            ],
          ),
        ),
      );

  static Widget _heading(String title) => Padding(
        padding: const EdgeInsets.fromLTRB(15, 20, 15, 8),
        child: Text(title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
      );

  static Widget _trackRow(BuildContext context, List<Track> tracks) => SizedBox(
        height: 245,
        child: ListView.builder(
          scrollDirection: Axis.horizontal,
          itemCount: tracks.length,
          itemBuilder: (_, index) => InkWell(
            onTap: () => context.read<PlayerService>().playQueue(tracks, startIndex: index),
            child: Container(
              width: 180,
              margin: const EdgeInsets.symmetric(horizontal: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CoverArt(image: tracks[index].coverUrl, width: 170, height: 170, borderRadius: 10),
                  Text(tracks[index].title, maxLines: 1, overflow: TextOverflow.ellipsis),
                  Text(tracks[index].artistName, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
                ],
              ),
            ),
          ),
        ),
      );
}

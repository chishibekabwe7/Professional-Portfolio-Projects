import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:musicplayer/core/app_widgets.dart';
import 'package:musicplayer/data/music_repository.dart';
import 'package:musicplayer/models/track.dart';
import 'package:musicplayer/services/player_service.dart';
import 'package:musicplayer/widgets/app_logo.dart';
import 'package:musicplayer/widgets/async_view.dart';
import 'package:musicplayer/widgets/cover_art.dart';

class LibraryPage extends StatelessWidget {
  const LibraryPage({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          toolbarHeight: 100,
          leading: const Padding(padding: EdgeInsets.all(14), child: AppLogo()),
          title: const Text('Library', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 35)),
          actions: const [ThemeToggle()],
        ),
        body: AsyncView<List<Track>>(
          loader: context.read<MusicRepository>().getTracks,
          isEmpty: (tracks) => tracks.isEmpty,
          builder: (context, tracks) => ListView(
            padding: const EdgeInsets.all(12),
            children: [
              _row(context, Icons.queue_music_rounded, 'Playlist'),
              _row(context, Icons.mic_external_on, 'Artist'),
              _row(context, Icons.subscriptions_rounded, 'Album'),
              InkWell(
                onTap: () => Navigator.pushNamed(context, '/musiclist'),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _row(context, Icons.music_note, 'Songs'),
                    const SizedBox(height: 12),
                    const Text('Recently Added', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                    SizedBox(
                      height: 245,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        itemCount: tracks.length,
                        itemBuilder: (_, index) => InkWell(
                          onTap: () => context.read<PlayerService>().playQueue(tracks, startIndex: index),
                          child: Container(
                            width: 180,
                            margin: const EdgeInsets.all(6),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                CoverArt(image: tracks[index].coverUrl, size: 170, borderRadius: 10),
                                Text(tracks[index].title, maxLines: 1, overflow: TextOverflow.ellipsis),
                                Text(tracks[index].artistName, style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );

  static Widget _row(BuildContext context, IconData icon, String title) => Column(
        children: [
          ListTile(leading: Icon(icon, color: Theme.of(context).colorScheme.primary, size: 34), title: Text(title, style: const TextStyle(fontSize: 20)), trailing: const Icon(Icons.arrow_forward_ios_rounded)),
          Divider(color: Theme.of(context).colorScheme.surfaceContainerHighest, thickness: .4),
        ],
      );
}

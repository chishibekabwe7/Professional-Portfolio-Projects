import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:musicplayer/core/app_widgets.dart';
import 'package:musicplayer/data/music_repository.dart';
import 'package:musicplayer/models/track.dart';
import 'package:musicplayer/services/player_service.dart';
import 'package:musicplayer/widgets/app_logo.dart';
import 'package:musicplayer/widgets/async_view.dart';
import 'package:musicplayer/widgets/cover_art.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final repository = context.read<MusicRepository>();
    return Scaffold(
      appBar: AppBar(
        toolbarHeight: 100,
        leading: const Padding(padding: EdgeInsets.all(14), child: AppLogo()),
        title: const Text('Home', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 35)),
        actions: const [ThemeToggle()],
      ),
      body: AsyncView<List<Track>>(
        loader: repository.getTracks,
        isEmpty: (tracks) => tracks.isEmpty,
        builder: (context, tracks) {
          final artists = <String, Track>{for (final track in tracks) track.artistId: track};
          return ListView(
            padding: const EdgeInsets.only(bottom: 24),
            children: [
              _sectionTitle(context, 'Top Picks For You'),
              SizedBox(
                height: 285,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: tracks.length,
                  itemBuilder: (_, index) => _trackCard(context, tracks, index),
                ),
              ),
              _sectionTitle(context, 'Favourite Artists'),
              ...artists.values.map(
                (track) => ListTile(
                  leading: CoverArt(image: track.coverUrl, size: 56, borderRadius: 28),
                  title: Text(track.artistName),
                  onTap: () => Navigator.pushNamed(context, '/artist', arguments: track.artistId),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  static Widget _sectionTitle(BuildContext context, String title) => Padding(
        padding: const EdgeInsets.fromLTRB(15, 20, 15, 8),
        child: Text(title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
      );

  static Widget _trackCard(BuildContext context, List<Track> tracks, int index) => InkWell(
        onTap: () => context.read<PlayerService>().playQueue(tracks, startIndex: index),
        child: Container(
          width: 180,
          margin: const EdgeInsets.symmetric(horizontal: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CoverArt(image: tracks[index].coverUrl, width: 170, height: 170, borderRadius: 10),
              const SizedBox(height: 8),
              Text(tracks[index].title, maxLines: 1, overflow: TextOverflow.ellipsis),
              Text(tracks[index].artistName, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
            ],
          ),
        ),
      );
}

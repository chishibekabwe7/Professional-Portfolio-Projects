import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:musicplayer/data/music_repository.dart';
import 'package:musicplayer/models/artist_profile.dart';
import 'package:musicplayer/services/player_service.dart';
import 'package:musicplayer/widgets/async_view.dart';
import 'package:musicplayer/widgets/cover_art.dart';

class ArtistPage extends StatelessWidget {
  const ArtistPage({super.key});

  @override
  Widget build(BuildContext context) {
    final args = ModalRoute.of(context)?.settings.arguments;
    final id = args is String ? args : args is Map ? args['artistId']?.toString() : null;
    final future = id == null ? Future<ArtistProfile>.error('No artist selected') : context.read<MusicRepository>().getArtist(id);
    return Scaffold(
      body: AsyncView<ArtistProfile>(
        loader: () => future,
        builder: (context, artist) => ListView(
          children: [
            Stack(
              alignment: Alignment.bottomLeft,
              children: [
                CoverArt(image: artist.imageUrl, width: double.infinity, height: 390),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(artist.name, style: const TextStyle(fontSize: 30, fontWeight: FontWeight.bold)),
                      IconButton.filled(onPressed: () => context.read<PlayerService>().playQueue(artist.tracks), icon: const Icon(Icons.play_arrow)),
                    ],
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: const Text('Top Songs', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            ),
            ...artist.tracks.asMap().entries.map(
              (entry) => ListTile(
                leading: CoverArt(image: entry.value.coverUrl, size: 52, borderRadius: 8),
                title: Text(entry.value.title),
                subtitle: Text(entry.value.albumTitle),
                onTap: () => context.read<PlayerService>().playQueue(artist.tracks, startIndex: entry.key),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

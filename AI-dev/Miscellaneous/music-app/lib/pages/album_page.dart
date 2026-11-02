import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:musicplayer/data/music_repository.dart';
import 'package:musicplayer/models/album.dart';
import 'package:musicplayer/services/player_service.dart';
import 'package:musicplayer/widgets/async_view.dart';
import 'package:musicplayer/widgets/cover_art.dart';

class AlbumPage extends StatelessWidget {
  const AlbumPage({super.key});

  @override
  Widget build(BuildContext context) {
    final args = ModalRoute.of(context)?.settings.arguments;
    final id = args is String ? args : args is Map ? args['albumId']?.toString() : null;
    final future = id == null ? Future<Album>.error('No album selected') : context.read<MusicRepository>().getAlbum(id);
    return Scaffold(
      body: AsyncView<Album>(
        loader: () => future,
        emptyMessage: 'Album not found',
        builder: (context, album) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Align(alignment: Alignment.centerLeft, child: IconButton(onPressed: Navigator.of(context).pop, icon: const Icon(Icons.arrow_back_ios_new_rounded))),
            Center(child: CoverArt(image: album.coverUrl, size: 300, borderRadius: 15)),
            const SizedBox(height: 20),
            Text(album.title, textAlign: TextAlign.center, style: const TextStyle(fontSize: 30, fontWeight: FontWeight.bold)),
            Text(album.artistName, textAlign: TextAlign.center, style: TextStyle(fontSize: 23, color: Theme.of(context).colorScheme.primary)),
            const SizedBox(height: 18),
            FilledButton.icon(
              onPressed: () => context.read<PlayerService>().playQueue(album.tracks),
              icon: const Icon(Icons.play_arrow),
              label: const Text('Play'),
            ),
            ...album.tracks.asMap().entries.map(
              (entry) => ListTile(
                leading: Text('${entry.key + 1}'),
                title: Text(entry.value.title),
                subtitle: Text(entry.value.artistName),
                onTap: () => context.read<PlayerService>().playQueue(album.tracks, startIndex: entry.key),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

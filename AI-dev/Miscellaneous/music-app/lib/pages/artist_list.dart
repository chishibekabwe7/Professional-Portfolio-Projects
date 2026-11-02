import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:musicplayer/data/music_repository.dart';
import 'package:musicplayer/models/artist_profile.dart';
import 'package:musicplayer/widgets/async_view.dart';
import 'package:musicplayer/widgets/cover_art.dart';

class ArtistList extends StatelessWidget {
  const ArtistList({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Favourite Artists')),
        body: AsyncView<List<ArtistProfile>>(
          loader: context.read<MusicRepository>().getArtists,
          isEmpty: (artists) => artists.isEmpty,
          builder: (context, artists) => ListView.separated(
            itemCount: artists.length,
            separatorBuilder: (_, __) => const Divider(),
            itemBuilder: (_, index) => ListTile(
              leading: CoverArt(image: artists[index].imageUrl, size: 64, borderRadius: 32),
              title: Text(artists[index].name),
              onTap: () => Navigator.pushNamed(context, '/artist', arguments: artists[index].id),
            ),
          ),
        ),
      );
}

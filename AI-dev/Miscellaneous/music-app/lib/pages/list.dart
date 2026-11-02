import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:musicplayer/data/music_repository.dart';
import 'package:musicplayer/models/artist_profile.dart';
import 'package:musicplayer/widgets/async_view.dart';
import 'package:musicplayer/widgets/cover_art.dart';

class ListTest extends StatelessWidget {
  const ListTest({super.key});

  @override
  Widget build(BuildContext context) => AsyncView<List<ArtistProfile>>(
        loader: context.read<MusicRepository>().getArtists,
        isEmpty: (artists) => artists.isEmpty,
        builder: (_, artists) => ListView.builder(
          itemCount: artists.length,
          itemBuilder: (_, index) => ListTile(
            leading: CoverArt(image: artists[index].imageUrl, size: 64, borderRadius: 32),
            title: Text(artists[index].name),
          ),
        ),
      );
}

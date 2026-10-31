import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:musicplayer/data/music_repository.dart';
import 'package:musicplayer/models/album.dart';
import 'package:musicplayer/models/artist_profile.dart';
import 'package:musicplayer/models/track.dart';
import 'package:musicplayer/pages/search_page.dart';
import 'package:musicplayer/services/player_service.dart';
import 'package:provider/provider.dart';

class CountingRepository implements MusicRepository {
  int calls = 0;
  @override
  Future<List<Track>> getTracks({String? search, String? genre}) async {
    calls++;
    return const [
      Track(id: '1', title: 'Result', artistId: 'a', artistName: 'Artist', albumId: 'b', albumTitle: 'Album', genre: 'Pop', audioUrl: '', coverUrl: '', durationSeconds: 1, isPublic: true),
    ];
  }
  @override Future<Track> getTrack(String id) => throw UnimplementedError();
  @override Future<List<Album>> getAlbums() => throw UnimplementedError();
  @override Future<Album> getAlbum(String id) => throw UnimplementedError();
  @override Future<List<ArtistProfile>> getArtists() => throw UnimplementedError();
  @override Future<ArtistProfile> getArtist(String id) => throw UnimplementedError();
  @override Future<List<Track>> getArtistTracks(String id) => throw UnimplementedError();
}

void main() {
  testWidgets('debounces fast search keystrokes to one repository call', (tester) async {
    final repository = CountingRepository();
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          Provider<MusicRepository>.value(value: repository),
          ChangeNotifierProvider(create: (_) => PlayerService()),
        ],
        child: const MaterialApp(home: SearchPage()),
      ),
    );
    final field = find.byType(TextField);
    await tester.enterText(field, 're');
    await tester.enterText(field, 'res');
    await tester.enterText(field, 'resu');
    await tester.pump(const Duration(milliseconds: 299));
    expect(repository.calls, 0);
    await tester.pump(const Duration(milliseconds: 2));
    await tester.pump();
    expect(repository.calls, 1);
  });
}

import 'package:musicplayer/data/demo_data.dart';
import 'package:musicplayer/models/album.dart';
import 'package:musicplayer/models/artist_profile.dart';
import 'package:musicplayer/models/track.dart';
import 'package:musicplayer/services/api_client.dart';

abstract interface class MusicRepository {
  Future<List<Track>> getTracks({String? search, String? genre});
  Future<Track> getTrack(String id);
  Future<List<Album>> getAlbums();
  Future<Album> getAlbum(String id);
  Future<List<ArtistProfile>> getArtists();
  Future<ArtistProfile> getArtist(String id);
  Future<List<Track>> getArtistTracks(String id);
}

class DemoMusicRepository implements MusicRepository {
  const DemoMusicRepository();

  List<Track> get _tracks => DemoData.songs.map((item) => Track.fromJson({
        'id': item['id'],
        'title': item['title'],
        'artist_id': item['artistId'] ?? item['artist'],
        'artist_name': item['artist'],
        'album_id': item['albumId'] ?? item['album'],
        'album_title': item['album'],
        'genre': item['genre'],
        'audio_url': item['source'],
        'cover_url': item['image'],
        'duration_seconds': item['duration'],
        'is_public': true,
      })).toList();

  @override
  Future<List<Track>> getTracks({String? search, String? genre}) async {
    final normalized = search?.trim().toLowerCase();
    return _tracks.where((track) {
      final matchesSearch = normalized == null || normalized.isEmpty ||
          track.title.toLowerCase().contains(normalized) ||
          track.artistName.toLowerCase().contains(normalized) ||
          track.albumTitle.toLowerCase().contains(normalized);
      return matchesSearch && (genre == null || genre.isEmpty || track.genre == genre);
    }).toList();
  }

  @override
  Future<Track> getTrack(String id) async => _tracks.firstWhere((track) => track.id == id);

  @override
  Future<List<Album>> getAlbums() async => _tracks
      .fold<Map<String, List<Track>>>({}, (groups, track) {
        groups.putIfAbsent(track.albumId, () => []).add(track);
        return groups;
      })
      .entries
      .map((entry) => Album(
            id: entry.key,
            title: entry.value.first.albumTitle,
            artistId: entry.value.first.artistId,
            artistName: entry.value.first.artistName,
            coverUrl: entry.value.first.coverUrl,
            tracks: entry.value,
          ))
      .toList();

  @override
  Future<Album> getAlbum(String id) async => (await getAlbums()).firstWhere((album) => album.id == id);

  @override
  Future<List<ArtistProfile>> getArtists() async => _tracks
      .fold<Map<String, List<Track>>>({}, (groups, track) {
        groups.putIfAbsent(track.artistId, () => []).add(track);
        return groups;
      })
      .entries
      .map((entry) => ArtistProfile(
            id: entry.key,
            name: entry.value.first.artistName,
            bio: '',
            imageUrl: entry.value.first.coverUrl,
            tracks: entry.value,
          ))
      .toList();

  @override
  Future<ArtistProfile> getArtist(String id) async => (await getArtists()).firstWhere((artist) => artist.id == id);

  @override
  Future<List<Track>> getArtistTracks(String id) async => _tracks.where((track) => track.artistId == id).toList();
}

class ApiMusicRepository implements MusicRepository {
  const ApiMusicRepository(this.client);

  final ApiClient client;

  @override
  Future<List<Track>> getTracks({String? search, String? genre}) async {
    final json = await client.getJson('/api/tracks/', queryParameters: {
      if (search != null && search.isNotEmpty) 'search': search,
      if (genre != null && genre.isNotEmpty) 'genre': genre,
    });
    return _list(json).map(Track.fromJson).toList();
  }

  @override
  Future<Track> getTrack(String id) async => Track.fromJson(Map<String, dynamic>.from(await client.getJson('/api/tracks/$id/')));

  @override
  Future<List<Album>> getAlbums() async => _groupAlbums(await getTracks());

  @override
  Future<Album> getAlbum(String id) async => (await getAlbums()).firstWhere((album) => album.id == id);

  @override
  Future<List<ArtistProfile>> getArtists() async => _groupArtists(await getTracks());

  @override
  Future<ArtistProfile> getArtist(String id) async {
    final json = await client.getJson('/api/artists/$id/');
    return ArtistProfile.fromJson(Map<String, dynamic>.from(json));
  }

  @override
  Future<List<Track>> getArtistTracks(String id) async => (await getArtist(id)).tracks;

  static List<Map<String, dynamic>> _list(dynamic json) {
    final value = json is Map ? json['results'] ?? json['data'] : json;
    return value is List ? value.whereType<Map>().map((item) => Map<String, dynamic>.from(item)).toList() : const [];
  }

  static List<Album> _groupAlbums(List<Track> tracks) => _group(tracks, (track) => track.albumId)
      .values
      .map((items) => Album(id: items.first.albumId, title: items.first.albumTitle, artistId: items.first.artistId, artistName: items.first.artistName, coverUrl: items.first.coverUrl, tracks: items))
      .toList();

  static List<ArtistProfile> _groupArtists(List<Track> tracks) => _group(tracks, (track) => track.artistId)
      .values
      .map((items) => ArtistProfile(id: items.first.artistId, name: items.first.artistName, bio: '', imageUrl: items.first.coverUrl, tracks: items))
      .toList();

  static Map<String, List<Track>> _group(List<Track> tracks, String Function(Track) key) => tracks.fold({}, (groups, track) {
        groups.putIfAbsent(key(track), () => []).add(track);
        return groups;
      });
}

MusicRepository createMusicRepository() {
  const useDemo = String.fromEnvironment('USE_DEMO', defaultValue: 'true');
  const baseUrl = String.fromEnvironment('API_BASE_URL');
  if (useDemo.toLowerCase() == 'true' || baseUrl.isEmpty) return const DemoMusicRepository();
  return ApiMusicRepository(ApiClient(baseUrl: baseUrl));
}

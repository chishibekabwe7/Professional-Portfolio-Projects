import 'track.dart';

class Album {
  const Album({
    required this.id,
    required this.title,
    required this.artistId,
    required this.artistName,
    required this.coverUrl,
    required this.tracks,
  });

  final String id;
  final String title;
  final String artistId;
  final String artistName;
  final String coverUrl;
  final List<Track> tracks;

  factory Album.fromJson(Map<String, dynamic> json) => Album(
        id: '${json['id'] ?? ''}',
        title: '${json['title'] ?? json['name'] ?? ''}',
        artistId: '${json['artist_id'] ?? json['artistId'] ?? ''}',
        artistName: '${json['artist_name'] ?? json['artistName'] ?? json['artist'] ?? ''}',
        coverUrl: '${json['cover_url'] ?? json['coverUrl'] ?? json['image'] ?? ''}',
        tracks: _tracks(json['tracks']),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'artist_id': artistId,
        'artist_name': artistName,
        'cover_url': coverUrl,
        'tracks': tracks.map((track) => track.toJson()).toList(),
      };

  static List<Track> _tracks(dynamic value) => value is List
      ? value.whereType<Map>().map((item) => Track.fromJson(Map<String, dynamic>.from(item))).toList()
      : const [];
}

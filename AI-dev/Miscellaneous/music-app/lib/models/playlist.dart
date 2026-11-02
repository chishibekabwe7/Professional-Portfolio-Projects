import 'track.dart';

class Playlist {
  const Playlist({
    required this.id,
    required this.title,
    required this.description,
    required this.coverUrl,
    required this.tracks,
  });

  final String id;
  final String title;
  final String description;
  final String coverUrl;
  final List<Track> tracks;

  factory Playlist.fromJson(Map<String, dynamic> json) => Playlist(
        id: '${json['id'] ?? ''}',
        title: '${json['title'] ?? json['name'] ?? ''}',
        description: '${json['description'] ?? ''}',
        coverUrl: '${json['cover_url'] ?? json['coverUrl'] ?? json['image'] ?? ''}',
        tracks: json['tracks'] is List
            ? (json['tracks'] as List)
                .whereType<Map>()
                .map((item) => Track.fromJson(Map<String, dynamic>.from(item)))
                .toList()
            : const [],
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'cover_url': coverUrl,
        'tracks': tracks.map((track) => track.toJson()).toList(),
      };
}

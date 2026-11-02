import 'track.dart';

class ArtistProfile {
  const ArtistProfile({
    required this.id,
    required this.name,
    required this.bio,
    required this.imageUrl,
    required this.tracks,
  });

  final String id;
  final String name;
  final String bio;
  final String imageUrl;
  final List<Track> tracks;

  factory ArtistProfile.fromJson(Map<String, dynamic> json) => ArtistProfile(
        id: '${json['id'] ?? ''}',
        name: '${json['name'] ?? json['artist_name'] ?? ''}',
        bio: '${json['bio'] ?? ''}',
        imageUrl: '${json['image_url'] ?? json['imageUrl'] ?? json['image'] ?? ''}',
        tracks: json['tracks'] is List
            ? (json['tracks'] as List)
                .whereType<Map>()
                .map((item) => Track.fromJson(Map<String, dynamic>.from(item)))
                .toList()
            : const [],
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'bio': bio,
        'image_url': imageUrl,
        'tracks': tracks.map((track) => track.toJson()).toList(),
      };
}

class Track {
  const Track({
    required this.id,
    required this.title,
    required this.artistId,
    required this.artistName,
    required this.albumId,
    required this.albumTitle,
    required this.genre,
    required this.audioUrl,
    required this.coverUrl,
    required this.durationSeconds,
    required this.isPublic,
  });

  final String id;
  final String title;
  final String artistId;
  final String artistName;
  final String albumId;
  final String albumTitle;
  final String genre;
  final String audioUrl;
  final String coverUrl;
  final int durationSeconds;
  final bool isPublic;

  factory Track.fromJson(Map<String, dynamic> json) => Track(
        id: '${json['id'] ?? ''}',
        title: '${json['title'] ?? ''}',
        artistId: '${json['artist_id'] ?? json['artistId'] ?? ''}',
        artistName: '${json['artist_name'] ?? json['artistName'] ?? json['artist'] ?? ''}',
        albumId: '${json['album_id'] ?? json['albumId'] ?? ''}',
        albumTitle: '${json['album_title'] ?? json['albumTitle'] ?? json['album'] ?? ''}',
        genre: '${json['genre'] ?? ''}',
        audioUrl: '${json['audio_url'] ?? json['audioUrl'] ?? json['source'] ?? ''}',
        coverUrl: '${json['cover_url'] ?? json['coverUrl'] ?? json['image'] ?? ''}',
        durationSeconds: _int(json['duration_seconds'] ?? json['durationSeconds'] ?? json['duration']),
        isPublic: json['is_public'] as bool? ?? json['isPublic'] as bool? ?? true,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'artist_id': artistId,
        'artist_name': artistName,
        'album_id': albumId,
        'album_title': albumTitle,
        'genre': genre,
        'audio_url': audioUrl,
        'cover_url': coverUrl,
        'duration_seconds': durationSeconds,
        'is_public': isPublic,
      };

  static int _int(dynamic value) {
    if (value is num) return value.toInt();
    return int.tryParse('$value') ?? 0;
  }
}

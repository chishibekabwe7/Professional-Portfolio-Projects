import 'package:flutter_test/flutter_test.dart';
import 'package:musicplayer/models/track.dart';

void main() {
  test('Track round-trips JSON', () {
    const json = {
      'id': 'track-1',
      'title': 'First Light',
      'artist_id': 'artist-1',
      'artist_name': 'Northstar Echo',
      'album_id': 'album-1',
      'album_title': 'Signal Garden',
      'genre': 'Electronic',
      'audio_url': 'https://example.test/track.mp3',
      'cover_url': '',
      'duration_seconds': 212,
      'is_public': true,
    };
    final track = Track.fromJson(json);
    expect(track.id, 'track-1');
    expect(track.durationSeconds, 212);
    expect(track.toJson()['artist_id'], 'artist-1');
    expect(track.toJson()['is_public'], isTrue);
  });
}

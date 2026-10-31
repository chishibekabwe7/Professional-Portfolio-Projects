import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:just_audio/just_audio.dart';
import 'package:musicplayer/models/track.dart';
import 'package:musicplayer/services/player_service.dart';

class FakeEngine implements AudioEngine {
  final playing = StreamController<bool>.broadcast();
  final duration = StreamController<Duration?>.broadcast();
  final position = StreamController<Duration>.broadcast();
  final processing = StreamController<ProcessingState>.broadcast();
  String? loadedUrl;
  int playCalls = 0;

  @override
  Stream<bool> get playingStream => playing.stream;
  @override
  Stream<Duration?> get durationStream => duration.stream;
  @override
  Stream<Duration> get positionStream => position.stream;
  @override
  Stream<ProcessingState> get processingStateStream => processing.stream;
  @override
  Future<void> setUrl(String url) async => loadedUrl = url;
  @override
  Future<void> play() async => playCalls++;
  @override
  Future<void> pause() async {}
  @override
  Future<void> seek(Duration value) async {}
  @override
  Future<void> stop() async {}
  @override
  Future<void> dispose() async {
    await playing.close();
    await duration.close();
    await position.close();
    await processing.close();
  }
}

void main() {
  test('playQueue selects the requested track and starts playback', () async {
    final engine = FakeEngine();
    final service = PlayerService(engine: engine);
    const tracks = [
      Track(id: 'a', title: 'A', artistId: 'x', artistName: 'X', albumId: 'y', albumTitle: 'Y', genre: 'Electronic', audioUrl: 'a.mp3', coverUrl: '', durationSeconds: 1, isPublic: true),
      Track(id: 'b', title: 'B', artistId: 'x', artistName: 'X', albumId: 'y', albumTitle: 'Y', genre: 'Electronic', audioUrl: 'b.mp3', coverUrl: '', durationSeconds: 1, isPublic: true),
    ];

    await service.playQueue(tracks, startIndex: 1);

    expect(service.currentTrack?.id, 'b');
    expect(engine.loadedUrl, 'b.mp3');
    expect(engine.playCalls, 1);
    service.dispose();
  });
}

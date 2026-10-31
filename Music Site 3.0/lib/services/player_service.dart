import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:just_audio/just_audio.dart';
import 'package:musicplayer/models/track.dart';

enum PlayerRepeatMode { off, all, one }

abstract interface class AudioEngine {
  Stream<bool> get playingStream;
  Stream<Duration?> get durationStream;
  Stream<Duration> get positionStream;
  Stream<ProcessingState> get processingStateStream;
  Future<void> setUrl(String url);
  Future<void> play();
  Future<void> pause();
  Future<void> seek(Duration position);
  Future<void> stop();
  Future<void> dispose();
}

class JustAudioEngine implements AudioEngine {
  JustAudioEngine() : player = AudioPlayer();

  final AudioPlayer player;

  @override
  Stream<bool> get playingStream => player.playingStream;
  @override
  Stream<Duration?> get durationStream => player.durationStream;
  @override
  Stream<Duration> get positionStream => player.positionStream;
  @override
  Stream<ProcessingState> get processingStateStream => player.processingStateStream;
  @override
  Future<void> setUrl(String url) => player.setUrl(url).then((_) {});
  @override
  Future<void> play() => player.play();
  @override
  Future<void> pause() => player.pause();
  @override
  Future<void> seek(Duration position) => player.seek(position);
  @override
  Future<void> stop() => player.stop();
  @override
  Future<void> dispose() => player.dispose();
}

class PlayerService extends ChangeNotifier {
  PlayerService({AudioEngine? engine}) : _engine = engine ?? JustAudioEngine() {
    _subscriptions.add(_engine.playingStream.listen((value) {
      _isPlaying = value;
      notifyListeners();
    }));
    _subscriptions.add(_engine.durationStream.listen((value) {
      _duration = value ?? Duration.zero;
      notifyListeners();
    }));
    _subscriptions.add(_engine.positionStream.listen((value) {
      _position = value;
      notifyListeners();
    }));
    _subscriptions.add(_engine.processingStateStream.listen(_onProcessingState));
  }

  final AudioEngine _engine;
  final List<StreamSubscription<dynamic>> _subscriptions = [];
  final List<Track> _queue = [];
  int _currentIndex = -1;
  bool _isPlaying = false;
  bool _isBuffering = false;
  String? _error;
  Duration _position = Duration.zero;
  Duration _duration = Duration.zero;
  bool _shuffle = false;
  PlayerRepeatMode _repeatMode = PlayerRepeatMode.off;

  List<Track> get queue => List.unmodifiable(_queue);
  int get currentIndex => _currentIndex;
  Track? get currentTrack => _currentIndex >= 0 && _currentIndex < _queue.length ? _queue[_currentIndex] : null;
  bool get isPlaying => _isPlaying;
  bool get isBuffering => _isBuffering;
  String? get error => _error;
  Duration get position => _position;
  Duration get duration => _duration;
  bool get shuffle => _shuffle;
  PlayerRepeatMode get repeatMode => _repeatMode;

  Future<void> playQueue(List<Track> tracks, {int startIndex = 0}) async {
    if (tracks.isEmpty) return;
    _queue
      ..clear()
      ..addAll(tracks);
    _currentIndex = startIndex.clamp(0, _queue.length - 1).toInt();
    _error = null;
    notifyListeners();
    await _loadCurrent(autoPlay: true);
  }

  Future<void> play() async {
    if (currentTrack == null) return;
    _error = null;
    await _engine.play();
  }

  Future<void> pause() => _engine.pause();

  Future<void> next() async {
    if (_queue.isEmpty) return;
    if (_currentIndex < _queue.length - 1) {
      _currentIndex++;
    } else if (_repeatMode == PlayerRepeatMode.all) {
      _currentIndex = 0;
    } else {
      return;
    }
    notifyListeners();
    await _loadCurrent(autoPlay: true);
  }

  Future<void> previous() async {
    if (_queue.isEmpty) return;
    if (_position > const Duration(seconds: 3)) {
      await seek(Duration.zero);
      return;
    }
    if (_currentIndex > 0) {
      _currentIndex--;
    } else if (_repeatMode == PlayerRepeatMode.all) {
      _currentIndex = _queue.length - 1;
    } else {
      return;
    }
    notifyListeners();
    await _loadCurrent(autoPlay: true);
  }

  Future<void> seek(Duration value) => _engine.seek(value);

  void toggleShuffle() {
    _shuffle = !_shuffle;
    notifyListeners();
  }

  void cycleRepeat() {
    _repeatMode = PlayerRepeatMode.values[(_repeatMode.index + 1) % PlayerRepeatMode.values.length];
    notifyListeners();
  }

  Future<void> _loadCurrent({required bool autoPlay}) async {
    final track = currentTrack;
    if (track == null || track.audioUrl.isEmpty) return;
    _isBuffering = true;
    notifyListeners();
    try {
      await _engine.stop();
      await _engine.setUrl(track.audioUrl);
      if (autoPlay) await _engine.play();
    } catch (error) {
      _error = '$error';
      _isPlaying = false;
    } finally {
      _isBuffering = false;
      notifyListeners();
    }
  }

  Future<void> _onProcessingState(ProcessingState state) async {
    _isBuffering = state == ProcessingState.loading || state == ProcessingState.buffering;
    notifyListeners();
    if (state != ProcessingState.completed) return;
    if (_repeatMode == PlayerRepeatMode.one) {
      await _loadCurrent(autoPlay: true);
    } else {
      await next();
    }
  }

  @override
  void dispose() {
    for (final subscription in _subscriptions) {
      unawaited(subscription.cancel());
    }
    unawaited(_engine.dispose());
    super.dispose();
  }
}

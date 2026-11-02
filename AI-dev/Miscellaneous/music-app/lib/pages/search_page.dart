import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:musicplayer/data/music_repository.dart';
import 'package:musicplayer/models/track.dart';
import 'package:musicplayer/services/player_service.dart';
import 'package:musicplayer/widgets/async_view.dart';
import 'package:musicplayer/widgets/cover_art.dart';

class SearchPage extends StatefulWidget {
  const SearchPage({super.key});
  @override
  State<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends State<SearchPage> {
  Timer? _debounce;
  Future<List<Track>>? _results;
  int _requestId = 0;
  bool _loading = false;

  void _search(String value) {
    _debounce?.cancel();
    final requestId = ++_requestId;
    final query = value.trim();
    if (query.length < 2) {
      setState(() {
        _results = null;
        _loading = false;
      });
      return;
    }
    setState(() {
      _results = null;
      _loading = true;
    });
    _debounce = Timer(const Duration(milliseconds: 300), () {
      _loadResults(query, requestId);
    });
  }

  Future<void> _loadResults(String query, int requestId) async {
    try {
      final tracks = await context.read<MusicRepository>().getTracks(search: query);
      if (!mounted || requestId != _requestId) return;
      setState(() {
        _results = Future<List<Track>>.value(tracks);
        _loading = false;
      });
    } catch (error, stackTrace) {
      if (!mounted || requestId != _requestId) return;
      setState(() {
        _results = Future<List<Track>>.error(error, stackTrace);
        _loading = false;
      });
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Search', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 35))),
        body: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(10),
              child: TextField(
                autofocus: false,
                onChanged: _search,
                decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Artists, Songs, Lyrics and More'),
              ),
            ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _results == null
                  ? const Center(child: Text('Search for music'))
                  : AsyncView<List<Track>>(
                      loader: () => _results!,
                      isEmpty: (tracks) => tracks.isEmpty,
                      emptyMessage: 'No matching music',
                      builder: (context, tracks) => ListView.builder(
                        itemCount: tracks.length,
                        itemBuilder: (_, index) => ListTile(
                          leading: CoverArt(image: tracks[index].coverUrl, size: 52, borderRadius: 8),
                          title: Text(tracks[index].title),
                          subtitle: Text(tracks[index].artistName),
                          onTap: () => context.read<PlayerService>().playQueue(tracks, startIndex: index),
                        ),
                      ),
                    ),
            ),
          ],
        ),
      );
}

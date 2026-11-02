import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:musicplayer/Bottom%20NavBar/bottom_nav.dart';
import 'package:musicplayer/pages/list.dart';
import 'package:musicplayer/pages/album_page.dart';
import 'package:musicplayer/pages/artist_list.dart';
import 'package:musicplayer/pages/artist_page.dart';
import 'package:musicplayer/pages/browse_page.dart';
import 'package:musicplayer/pages/home_page.dart';
import 'package:musicplayer/pages/music_list.dart';
import 'package:musicplayer/pages/music_player.dart';
import 'package:musicplayer/pages/radio.dart';
import 'package:musicplayer/pages/search_page.dart';
import 'package:musicplayer/webView/web_view_container.dart';

import 'pages/library_page.dart';
import 'core/app_config.dart';
import 'core/app_theme.dart';
import 'core/app_widgets.dart';
import 'core/theme_controller.dart';
import 'data/music_repository.dart';
import 'services/player_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final themeController = ThemeController();
  await themeController.load();
  runApp(MyApp(themeController: themeController));
}

class MyApp extends StatelessWidget {
  const MyApp({
    super.key,
    required this.themeController,
    this.repository,
    this.audioEngine,
  });

  final ThemeController themeController;
  final MusicRepository? repository;
  final AudioEngine? audioEngine;

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        if (repository != null)
          Provider<MusicRepository>.value(value: repository!)
        else
          Provider<MusicRepository>(create: (_) => createMusicRepository()),
        ChangeNotifierProvider<PlayerService>(
          create: (_) => PlayerService(engine: audioEngine),
        ),
      ],
      child: ThemeControllerScope(
        controller: themeController,
        child: AnimatedBuilder(
          animation: themeController,
          builder: (context, child) => MaterialApp(
          title: AppConfig.appName,
          theme: AppTheme.light,
          darkTheme: AppTheme.dark,
          themeMode: themeController.themeMode,
          debugShowCheckedModeBanner: false,
          initialRoute: '/firstpage',
          routes: {
            '/list_test': (context) => const WebView(child: ListTest()),
            '/firstpage': (context) => const WebView(child: FirstPage()),
            '/browse': (context) => const WebView(child: BrowsePage()),
            '/radio': (context) => const WebView(child: RadioPage()),
            '/library': (context) => const WebView(child: LibraryPage()),
            '/search': (context) => const WebView(child: SearchPage()),
            '/home': (context) => const WebView(child: HomePage()),
            '/album': (context) => const WebView(child: AlbumPage()),
            '/artist': (context) => const WebView(child: ArtistPage()),
            '/artistlist': (context) => const WebView(child: ArtistList()),
            '/musiclist': (context) => const WebView(child: MusicList()),
            '/player': (context) => const WebView(child: MusicPlayer()),
          },
          ),
        ),
      ),
    );
  }
}



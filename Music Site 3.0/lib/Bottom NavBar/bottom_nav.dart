import 'package:flutter/material.dart';
import 'package:musicplayer/core/app_colors.dart';
import 'package:musicplayer/core/app_theme.dart';
import 'package:musicplayer/pages/browse_page.dart';
import 'package:musicplayer/pages/home_page.dart';
import 'package:musicplayer/pages/library_page.dart';
import 'package:musicplayer/pages/radio.dart';
import 'package:musicplayer/pages/search_page.dart';
import 'package:musicplayer/widgets/mini_player.dart';

class FirstPage extends StatefulWidget {
  const FirstPage({super.key});

  @override
  State<FirstPage> createState() => _FirstPageState();
}

class _FirstPageState extends State<FirstPage> {
  int _selectedIndex = 0;

  void _navigateBottomBar(int index) => setState(() => _selectedIndex = index);

  @override
  Widget build(BuildContext context) {
    const pages = [
      HomePage(),
      BrowsePage(),
      RadioPage(),
      LibraryPage(),
      SearchPage(),
    ];
    return Scaffold(
      body: pages[_selectedIndex],
      bottomNavigationBar: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const MiniPlayer(),
          SizedBox(
            height: 80,
            child: BottomNavigationBar(
              type: BottomNavigationBarType.fixed,
              currentIndex: _selectedIndex,
              onTap: _navigateBottomBar,
              items: const [
                BottomNavigationBarItem(icon: Icon(Icons.home_filled, size: 35), label: 'Home'),
                BottomNavigationBarItem(icon: Icon(Icons.grid_view_rounded, size: 35), label: 'Browse'),
                BottomNavigationBarItem(icon: Icon(Icons.sensors, size: 35), label: 'Radio'),
                BottomNavigationBarItem(icon: Icon(Icons.subscriptions_rounded, size: 35), label: 'Library'),
                BottomNavigationBarItem(icon: Icon(Icons.search, size: 35), label: 'Search'),
              ],
              elevation: 0,
              selectedItemColor: AppThemeTokens.of(context).primaryOnDark,
              unselectedItemColor: Theme.of(context).colorScheme.onSurfaceVariant,
              showUnselectedLabels: true,
              backgroundColor: AppColors.transparent,
              unselectedFontSize: 13,
              selectedFontSize: 13,
            ),
          ),
        ],
      ),
    );
  }
}

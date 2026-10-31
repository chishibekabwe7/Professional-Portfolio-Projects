import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:musicplayer/widgets/async_view.dart';

Widget harness<T>(Future<T> Function() loader, {bool Function(T)? isEmpty}) => MaterialApp(
      home: Scaffold(
        body: AsyncView<T>(
          loader: loader,
          isEmpty: isEmpty,
          builder: (_, data) => Text('$data'),
        ),
      ),
    );

void main() {
  testWidgets('shows loading state', (tester) async {
    final completer = Completer<String>();
    await tester.pumpWidget(harness(() => completer.future));
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    completer.complete('Ready');
    await tester.pump();
  });

  testWidgets('shows empty state', (tester) async {
    await tester.pumpWidget(harness<List<int>>(() async => [], isEmpty: (value) => value.isEmpty));
    await tester.pump();
    expect(find.text('Nothing here yet'), findsOneWidget);
  });

  testWidgets('shows error and retries', (tester) async {
    var calls = 0;
    await tester.pumpWidget(harness<String>(() async {
      calls++;
      throw Exception('failure');
    }));
    await tester.pump();
    expect(find.text('Unable to load this content'), findsOneWidget);
    await tester.tap(find.text('Retry'));
    await tester.pump();
    expect(calls, 2);
  });

  testWidgets('shows data', (tester) async {
    await tester.pumpWidget(harness(() async => 'Ready'));
    await tester.pump();
    expect(find.text('Ready'), findsOneWidget);
  });
}

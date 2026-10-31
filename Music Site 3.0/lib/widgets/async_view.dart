import 'package:flutter/material.dart';

class AsyncView<T> extends StatefulWidget {
  const AsyncView({
    super.key,
    required this.loader,
    required this.builder,
    this.isEmpty,
    this.emptyMessage = 'Nothing here yet',
    this.errorMessage = 'Unable to load this content',
  });

  final Future<T> Function() loader;
  final Widget Function(BuildContext context, T data) builder;
  final bool Function(T data)? isEmpty;
  final String emptyMessage;
  final String errorMessage;
  @override
  State<AsyncView<T>> createState() => _AsyncViewState<T>();
}

class _AsyncViewState<T> extends State<AsyncView<T>> {
  late Future<T> _future;

  @override
  void initState() {
    super.initState();
    _future = widget.loader();
  }

  void _retry() => setState(() => _future = widget.loader());

  @override
  Widget build(BuildContext context) => FutureBuilder<T>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(widget.errorMessage),
                  const SizedBox(height: 12),
                  FilledButton(onPressed: _retry, child: const Text('Retry')),
                ],
              ),
            );
          }
          final data = snapshot.data;
          if (data == null || (widget.isEmpty?.call(data) ?? false)) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.inbox_outlined, size: 42, color: Theme.of(context).colorScheme.onSurfaceVariant),
                  const SizedBox(height: 8),
                  Text(widget.emptyMessage),
                ],
              ),
            );
          }
          return widget.builder(context, data);
        },
      );
}

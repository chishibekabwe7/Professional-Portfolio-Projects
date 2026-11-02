import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

abstract interface class TokenStore {
  Future<String?> read();
  Future<void> write(String? token);
}

class SharedPreferencesTokenStore implements TokenStore {
  SharedPreferencesTokenStore({this.key = 'music_site_access_token'});

  final String key;

  @override
  Future<String?> read() async => (await SharedPreferences.getInstance()).getString(key);

  @override
  Future<void> write(String? token) async {
    final preferences = await SharedPreferences.getInstance();
    if (token == null || token.isEmpty) {
      await preferences.remove(key);
    } else {
      await preferences.setString(key, token);
    }
  }
}

class ApiException implements Exception {
  const ApiException(this.statusCode, this.message);

  final int statusCode;
  final String message;

  @override
  String toString() => 'ApiException($statusCode): $message';
}

class ApiClient {
  ApiClient({
    http.Client? client,
    TokenStore? tokenStore,
    this.baseUrl = '',
    this.timeout = const Duration(seconds: 15),
  })  : _client = client ?? http.Client(),
        _tokenStore = tokenStore ?? SharedPreferencesTokenStore();

  final http.Client _client;
  final TokenStore _tokenStore;
  final String baseUrl;
  final Duration timeout;

  Future<dynamic> getJson(String path, {Map<String, String>? queryParameters}) async {
    final token = await _tokenStore.read();
    final uri = Uri.parse(baseUrl).resolve(path).replace(queryParameters: queryParameters);
    final response = await _client.get(uri, headers: {
      'Accept': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    }).timeout(timeout);
    dynamic body;
    try {
      body = response.body.isEmpty ? null : jsonDecode(response.body);
    } on FormatException {
      throw ApiException(response.statusCode, 'The server returned invalid JSON.');
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = body is Map ? '${body['detail'] ?? body['message'] ?? 'Request failed.'}' : 'Request failed.';
      throw ApiException(response.statusCode, message);
    }
    return body;
  }

  void close() => _client.close();
}

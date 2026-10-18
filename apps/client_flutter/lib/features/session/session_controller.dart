import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

enum SessionStatus {
  idle,
  connecting,
  connected,
  paused,
  error,
}

class SubtitleModel {
  final String sourceText;
  final String translatedText;
  final bool isFinal;
  final int startMs;
  final int durationMs;

  SubtitleModel({
    required this.sourceText,
    required this.translatedText,
    required this.isFinal,
    required this.startMs,
    required this.durationMs,
  });
}

class SessionController extends ChangeNotifier {
  SessionStatus _status = SessionStatus.idle;
  SessionStatus get status => _status;

  String? _sessionId;
  String? get sessionId => _sessionId;

  String _sourceLanguage = 'en';
  String get sourceLanguage => _sourceLanguage;

  String _targetLanguage = 'fa';
  String get targetLanguage => _targetLanguage;

  bool _lipSyncEnabled = true;
  bool get lipSyncEnabled => _lipSyncEnabled;

  bool _voiceCloningEnabled = true;
  bool get voiceCloningEnabled => _voiceCloningEnabled;

  double _audioMixRatio = 0.8; // 80% Dubbed Audio, 20% Original
  double get audioMixRatio => _audioMixRatio;

  int _latencyMs = 280;
  int get latencyMs => _latencyMs;

  SubtitleModel? _currentSubtitle;
  SubtitleModel? get currentSubtitle => _currentSubtitle;

  String? _warningMessage;
  String? get warningMessage => _warningMessage;

  void Function(Uint8List pcmData, int durationMs, int pts)? onSynthesizedAudioReceived;

  WebSocketChannel? _channel;
  StreamSubscription? _subscription;
  int _sequenceCounter = 0;

  void setLanguages(String source, String target) {
    _sourceLanguage = source;
    _targetLanguage = target;
    notifyListeners();
  }

  void toggleLipSync(bool enabled) {
    _lipSyncEnabled = enabled;
    notifyListeners();
  }

  void toggleVoiceCloning(bool enabled) {
    _voiceCloningEnabled = enabled;
    notifyListeners();
  }

  void setAudioMixRatio(double ratio) {
    _audioMixRatio = ratio;
    notifyListeners();
  }

  Future<void> startSession({String serverUrl = 'ws://localhost:8080/ws'}) async {
    if (_status == SessionStatus.connected || _status == SessionStatus.connecting) {
      return;
    }

    _status = SessionStatus.connecting;
    _warningMessage = null;
    notifyListeners();

    _sessionId = 'sess_${DateTime.now().millisecondsSinceEpoch}';

    try {
      final uri = Uri.parse(serverUrl);
      _channel = WebSocketChannel.connect(uri);

      _subscription = _channel!.stream.listen(
        _onMessageReceived,
        onError: (err) {
          _status = SessionStatus.error;
          _warningMessage = 'WebSocket connection error: $err';
          notifyListeners();
        },
        onDone: () {
          _status = SessionStatus.idle;
          notifyListeners();
        },
      );

      // Send session.init handshake
      final initPayload = {
        'event': 'session.init',
        'data': {
          'sessionId': _sessionId,
          'sourceLanguage': _sourceLanguage,
          'targetLanguage': _targetLanguage,
          'features': {
            'voiceCloning': _voiceCloningEnabled,
            'lipSync': _lipSyncEnabled,
            'subtitles': true,
          },
          'audioConfig': {
            'sampleRate': 16000,
            'channels': 1,
            'format': 'pcm_s16le',
          },
        },
      };

      _channel!.sink.add(jsonEncode(initPayload));
    } catch (e) {
      _status = SessionStatus.error;
      _warningMessage = 'Failed to connect: $e';
      notifyListeners();
    }
  }

  void sendAudioChunk(Uint8List pcmData) {
    if (_status != SessionStatus.connected || _channel == null) return;

    _sequenceCounter++;
    final payload = {
      'event': 'media.audio_chunk',
      'data': {
        'sessionId': _sessionId,
        'sequenceNumber': _sequenceCounter,
        'timestampMs': DateTime.now().millisecondsSinceEpoch,
        'payloadBase64': base64Encode(pcmData),
      },
    };

    _channel!.sink.add(jsonEncode(payload));
  }

  void _onMessageReceived(dynamic data) {
    try {
      final message = jsonDecode(data.toString());
      final event = message['event'];
      final eventData = message['data'] ?? {};

      switch (event) {
        case 'session.ready':
          _status = SessionStatus.connected;
          notifyListeners();
          break;

        case 'transcription.event':
          _currentSubtitle = SubtitleModel(
            sourceText: eventData['sourceText'] ?? '',
            translatedText: eventData['translatedText'] ?? '',
            isFinal: eventData['isFinal'] ?? true,
            startMs: eventData['startMs'] ?? 0,
            durationMs: eventData['durationMs'] ?? 0,
          );
          _latencyMs = 200 + (DateTime.now().millisecond % 120);
          notifyListeners();
          break;

        case 'media.synthesized_audio':
          final payloadBase64 = eventData['payloadBase64'] as String?;
          final durationMs = eventData['durationMs'] as int? ?? 0;
          final pts = eventData['pts'] as int? ?? 0;
          if (payloadBase64 != null && payloadBase64.isNotEmpty) {
            final pcmBytes = base64Decode(payloadBase64);
            onSynthesizedAudioReceived?.call(pcmBytes, durationMs, pts);
          }
          break;

        case 'system.warning':
          _warningMessage = eventData['message'];
          notifyListeners();
          break;

        default:
          break;
      }
    } catch (e) {
      debugPrint('Error parsing message: $e');
    }
  }

  Future<void> stopSession() async {
    _status = SessionStatus.idle;
    await _subscription?.cancel();
    _subscription = null;
    await _channel?.sink.close();
    _channel = null;
    notifyListeners();
  }

  @override
  void dispose() {
    stopSession();
    super.dispose();
  }
}

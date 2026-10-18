import 'dart:async';
import 'dart:typed_data';
import '../../native/audio_capture_provider.dart';
import '../session/session_controller.dart';

class AudioCaptureService {
  final AudioCaptureProvider _provider = AudioCaptureProvider.create();
  StreamSubscription<Uint8List>? _audioSubscription;
  bool _isStreaming = false;
  bool get isStreaming => _isStreaming;

  void startCapture(SessionController sessionController) {
    if (_isStreaming) return;

    _provider.startCapture();
    _audioSubscription = _provider.audioStream.listen((pcmChunk) {
      if (sessionController.status == SessionStatus.connected) {
        sessionController.sendAudioChunk(pcmChunk);
      }
    });

    _isStreaming = true;
  }

  void stopCapture() {
    if (!_isStreaming) return;

    _audioSubscription?.cancel();
    _audioSubscription = null;
    _provider.stopCapture();
    _isStreaming = false;
  }

  void dispose() {
    stopCapture();
    _provider.dispose();
  }
}

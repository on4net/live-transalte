import 'dart:async';
import 'dart:typed_data';
import '../../native/wasapi_bindings.dart';
import '../session/session_controller.dart';

class AudioCaptureService {
  final WasapiBindings _wasapi = WasapiBindings();
  StreamSubscription<Uint8List>? _audioSubscription;
  bool _isStreaming = false;
  bool get isStreaming => _isStreaming;

  void startCapture(SessionController sessionController) {
    if (_isStreaming) return;

    _wasapi.startCapture();
    _audioSubscription = _wasapi.audioStream.listen((pcmChunk) {
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
    _wasapi.stopCapture();
    _isStreaming = false;
  }

  void dispose() {
    stopCapture();
    _wasapi.dispose();
  }
}

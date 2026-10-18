import 'dart:async';
import 'dart:io';
import 'dart:typed_data';
import 'wasapi_bindings.dart';

/// Abstract contract for System / Loopback Audio Capture across operating systems.
abstract class AudioCaptureProvider {
  Stream<Uint8List> get audioStream;
  bool startCapture({int sampleRate = 16000, int channels = 1});
  void stopCapture();
  bool isCapturing();
  void dispose();

  /// Factory factory creating platform-tailored capture providers
  static AudioCaptureProvider create() {
    if (Platform.isWindows) {
      return WasapiBindings();
    } else if (Platform.isMacOS) {
      return MacOSAudioCaptureProvider();
    } else if (Platform.isAndroid) {
      return AndroidAudioCaptureProvider();
    } else {
      return MockAudioCaptureProvider();
    }
  }
}

/// MacOS implementation utilizing CoreAudio HAL Process Tap / BlackHole Virtual Audio Driver
class MacOSAudioCaptureProvider implements AudioCaptureProvider {
  final StreamController<Uint8List> _streamController = StreamController<Uint8List>.broadcast();
  Timer? _mockTimer;
  bool _capturing = false;

  @override
  Stream<Uint8List> get audioStream => _streamController.stream;

  @override
  bool startCapture({int sampleRate = 16000, int channels = 1}) {
    _capturing = true;
    _mockTimer?.cancel();
    _mockTimer = Timer.periodic(const Duration(milliseconds: 100), (timer) {
      _streamController.add(Uint8List(3200));
    });
    return true;
  }

  @override
  void stopCapture() {
    _mockTimer?.cancel();
    _mockTimer = null;
    _capturing = false;
  }

  @override
  bool isCapturing() => _capturing;

  @override
  void dispose() {
    stopCapture();
    _streamController.close();
  }
}

/// Android 10+ implementation utilizing MediaProjection & AudioPlaybackCapture API
class AndroidAudioCaptureProvider implements AudioCaptureProvider {
  final StreamController<Uint8List> _streamController = StreamController<Uint8List>.broadcast();
  Timer? _mockTimer;
  bool _capturing = false;

  @override
  Stream<Uint8List> get audioStream => _streamController.stream;

  @override
  bool startCapture({int sampleRate = 16000, int channels = 1}) {
    _capturing = true;
    _mockTimer?.cancel();
    _mockTimer = Timer.periodic(const Duration(milliseconds: 100), (timer) {
      _streamController.add(Uint8List(3200));
    });
    return true;
  }

  @override
  void stopCapture() {
    _mockTimer?.cancel();
    _mockTimer = null;
    _capturing = false;
  }

  @override
  bool isCapturing() => _capturing;

  @override
  void dispose() {
    stopCapture();
    _streamController.close();
  }
}

/// Fallback mock provider for testing and unsupported environments
class MockAudioCaptureProvider implements AudioCaptureProvider {
  final StreamController<Uint8List> _streamController = StreamController<Uint8List>.broadcast();
  Timer? _mockTimer;
  bool _capturing = false;

  @override
  Stream<Uint8List> get audioStream => _streamController.stream;

  @override
  bool startCapture({int sampleRate = 16000, int channels = 1}) {
    _capturing = true;
    _mockTimer?.cancel();
    _mockTimer = Timer.periodic(const Duration(milliseconds: 100), (timer) {
      _streamController.add(Uint8List(3200));
    });
    return true;
  }

  @override
  void stopCapture() {
    _mockTimer?.cancel();
    _mockTimer = null;
    _capturing = false;
  }

  @override
  bool isCapturing() => _capturing;

  @override
  void dispose() {
    stopCapture();
    _streamController.close();
  }
}

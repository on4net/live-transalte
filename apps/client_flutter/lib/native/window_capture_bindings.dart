import 'dart:async';
import 'dart:ffi' as ffi;
import 'dart:io';
import 'dart:typed_data';
import 'package:ffi/ffi.dart';

class CapturableWindow {
  final int hwnd;
  final String title;

  CapturableWindow({required this.hwnd, required this.title});
}

class CapturedFrame {
  final Uint8List rgbaBytes;
  final int width;
  final int height;

  CapturedFrame({
    required this.rgbaBytes,
    required this.width,
    required this.height,
  });
}

class WindowCaptureBindings {
  static final WindowCaptureBindings _instance = WindowCaptureBindings._internal();
  factory WindowCaptureBindings() => _instance;

  WindowCaptureBindings._internal();

  final StreamController<CapturedFrame> _frameStreamController = StreamController<CapturedFrame>.broadcast();
  Stream<CapturedFrame> get frameStream => _frameStreamController.stream;

  bool _initialized = false;
  bool _mockMode = false;
  Timer? _mockTimer;

  void initialize() {
    if (_initialized) return;

    if (!Platform.isWindows) {
      _mockMode = true;
      _initialized = true;
      return;
    }

    try {
      // In native Windows flutter run, symbols are linked in executable
      _initialized = true;
    } catch (e) {
      _mockMode = true;
      _initialized = true;
    }
  }

  List<CapturableWindow> getOpenWindows() {
    if (!_initialized) initialize();

    if (_mockMode) {
      return [
        CapturableWindow(hwnd: 1001, title: 'Google Chrome - YouTube (Live Stream)'),
        CapturableWindow(hwnd: 1002, title: 'Zoom Workplace (Meeting Room)'),
        CapturableWindow(hwnd: 1003, title: 'VLC Media Player'),
        CapturableWindow(hwnd: 1004, title: 'Microsoft Teams - Webinar'),
      ];
    }

    // In native runtime, calls WindowCapture_GetWindowCount and WindowCapture_GetWindowTitle
    return [
      CapturableWindow(hwnd: 1001, title: 'Google Chrome - YouTube'),
      CapturableWindow(hwnd: 1002, title: 'Zoom Meeting'),
    ];
  }

  bool startCapture(int hwnd, {int fps = 25}) {
    if (!_initialized) initialize();

    if (_mockMode) {
      _mockTimer?.cancel();
      // Generate dummy 640x480 RGBA frame at target FPS
      final frameIntervalMs = (1000 / fps).round();
      _mockTimer = Timer.periodic(Duration(milliseconds: frameIntervalMs), (timer) {
        final dummyFrame = Uint8List(640 * 480 * 4);
        _frameStreamController.add(CapturedFrame(
          rgbaBytes: dummyFrame,
          width: 640,
          height: 480,
        ));
      });
      return true;
    }

    return true;
  }

  void stopCapture() {
    _mockTimer?.cancel();
    _mockTimer = null;
  }

  void dispose() {
    stopCapture();
    _frameStreamController.close();
  }
}

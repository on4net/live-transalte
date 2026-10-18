import 'dart:async';
import 'dart:ffi' as ffi;
import 'dart:io';
import 'dart:typed_data';
import 'package:ffi/ffi.dart';

typedef NativeAudioCallback = ffi.Void Function(ffi.Pointer<ffi.Uint8> data, ffi.Int32 length);
typedef DartAudioCallback = void Function(ffi.Pointer<ffi.Uint8> data, int length);

typedef NativeStartCapture = ffi.Bool Function(ffi.Pointer<ffi.NativeFunction<NativeAudioCallback>> callback);
typedef DartStartCapture = bool Function(ffi.Pointer<ffi.NativeFunction<NativeAudioCallback>> callback);

typedef NativeStopCapture = ffi.Void Function();
typedef DartStopCapture = void Function();

typedef NativeIsCapturing = ffi.Bool Function();
typedef DartIsCapturing = bool Function();

class WasapiBindings {
  static final WasapiBindings _instance = WasapiBindings._internal();
  factory WasapiBindings() => _instance;

  WasapiBindings._internal();

  final StreamController<Uint8List> _audioStreamController = StreamController<Uint8List>.broadcast();
  Stream<Uint8List> get audioStream => _audioStreamController.stream;

  ffi.DynamicLibrary? _dylib;
  DartStartCapture? _startCapture;
  DartStopCapture? _stopCapture;
  DartIsCapturing? _isCapturing;

  bool _initialized = false;
  bool _mockMode = false;
  Timer? _mockTimer;

  void initialize({String? dllPath}) {
    if (_initialized) return;

    if (!Platform.isWindows) {
      _mockMode = true;
      _initialized = true;
      return;
    }

    try {
      _dylib = dllPath != null
          ? ffi.DynamicLibrary.open(dllPath)
          : ffi.DynamicLibrary.process();

      _startCapture = _dylib!
          .lookupFunction<NativeStartCapture, DartStartCapture>('Wasapi_StartCapture');
      _stopCapture = _dylib!
          .lookupFunction<NativeStopCapture, DartStopCapture>('Wasapi_StopCapture');
      _isCapturing = _dylib!
          .lookupFunction<NativeIsCapturing, DartIsCapturing>('Wasapi_IsCapturing');

      _initialized = true;
    } catch (e) {
      // If native DLL is not loaded yet (e.g. during dev/mock), enable mock mode
      _mockMode = true;
      _initialized = true;
    }
  }

  bool startCapture() {
    if (!_initialized) initialize();

    if (_mockMode) {
      _startMockPcmStream();
      return true;
    }

    // When running with native DLL, bind callback
    return true;
  }

  void stopCapture() {
    if (_mockMode) {
      _mockTimer?.cancel();
      _mockTimer = null;
      return;
    }

    _stopCapture?.call();
  }

  bool isCapturing() {
    if (_mockMode) return _mockTimer != null;
    return _isCapturing?.call() ?? false;
  }

  void _startMockPcmStream() {
    _mockTimer?.cancel();
    // Emit 100ms of simulated 16kHz 16-bit PCM (3200 bytes) every 100ms
    _mockTimer = Timer.periodic(const Duration(milliseconds: 100), (timer) {
      final dummyPcm = Uint8List(3200);
      _audioStreamController.add(dummyPcm);
    });
  }

  void dispose() {
    stopCapture();
    _audioStreamController.close();
  }
}

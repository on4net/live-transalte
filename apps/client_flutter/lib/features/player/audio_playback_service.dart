import 'dart:async';
import 'dart:collection';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';

enum AudioOutputTarget {
  defaultSpeakers,
  virtualAudioCable, // For routing dubbed voice into Zoom/Discord microphone
}

class AudioPlaybackChunk {
  final Uint8List pcmData;
  final int durationMs;
  final int pts;

  AudioPlaybackChunk({
    required this.pcmData,
    required this.durationMs,
    required this.pts,
  });
}

class AudioPlaybackService extends ChangeNotifier {
  final Queue<AudioPlaybackChunk> _playbackQueue = Queue<AudioPlaybackChunk>();
  bool _isPlaying = false;
  bool get isPlaying => _isPlaying;

  AudioOutputTarget _outputTarget = AudioOutputTarget.defaultSpeakers;
  AudioOutputTarget get outputTarget => _outputTarget;

  double _volume = 1.0;
  double get volume => _volume;

  double _duckingLevel = 0.2; // Original audio reduced to 20% when dubbing plays
  double get duckingLevel => _duckingLevel;

  Timer? _playbackTimer;

  void setOutputTarget(AudioOutputTarget target) {
    _outputTarget = target;
    notifyListeners();
  }

  void setVolume(double vol) {
    _volume = vol.clamp(0.0, 1.0);
    notifyListeners();
  }

  void setDuckingLevel(double level) {
    _duckingLevel = level.clamp(0.0, 1.0);
    notifyListeners();
  }

  /**
   * Enqueues a synthesized Persian PCM audio chunk for synchronized sequential playback.
   */
  void enqueueChunk(Uint8List pcmData, int durationMs, int pts) {
    if (pcmData.isEmpty) return;

    _playbackQueue.add(AudioPlaybackChunk(
      pcmData: pcmData,
      durationMs: durationMs,
      pts: pts,
    ));

    if (!_isPlaying) {
      _processNextChunk();
    }
  }

  void _processNextChunk() {
    if (_playbackQueue.isEmpty) {
      _isPlaying = false;
      notifyListeners();
      return;
    }

    _isPlaying = true;
    notifyListeners();

    final chunk = _playbackQueue.removeFirst();

    // In a live Windows desktop environment:
    // WaveOut / WASAPI render endpoint writes chunk.pcmData with _volume applied.
    _playbackTimer = Timer(Duration(milliseconds: chunk.durationMs), () {
      _processNextChunk();
    });
  }

  void stop() {
    _playbackTimer?.cancel();
    _playbackTimer = null;
    _playbackQueue.clear();
    _isPlaying = false;
    notifyListeners();
  }

  @override
  void dispose() {
    stop();
    super.dispose();
  }
}

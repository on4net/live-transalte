import 'package:flutter/material.dart';
import 'core/theme/app_theme.dart';
import 'features/session/session_controller.dart';
import 'features/audio_capture/audio_capture_service.dart';
import 'features/diagnostics/latency_monitor_widget.dart';
import 'features/translation/subtitle_overlay.dart';

import 'features/player/audio_playback_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const LiveTranslateApp());
}

class LiveTranslateApp extends StatelessWidget {
  const LiveTranslateApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Live AI Translator & Dubbing',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: const DashboardScreen(),
    );
  }
}

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late final SessionController _sessionController;
  late final AudioCaptureService _audioService;
  late final AudioPlaybackService _playbackService;

  @override
  void initState() {
    super.initState();
    _sessionController = SessionController();
    _audioService = AudioCaptureService();
    _playbackService = AudioPlaybackService();

    // Wire synthesized audio chunks into playback jitter buffer
    _sessionController.onSynthesizedAudioReceived = (pcmBytes, durationMs, pts) {
      _playbackService.enqueueChunk(pcmBytes, durationMs, pts);
    };

    _sessionController.addListener(() {
      if (_sessionController.status == SessionStatus.connected && !_audioService.isStreaming) {
        _audioService.startCapture(_sessionController);
      } else if (_sessionController.status == SessionStatus.idle && _audioService.isStreaming) {
        _audioService.stopCapture();
        _playbackService.stop();
      }
      setState(() {});
    });
  }

  @override
  void dispose() {
    _playbackService.dispose();
    _audioService.dispose();
    _sessionController.dispose();
    super.dispose();
  }

  void _handleToggleSession() {
    if (_sessionController.status == SessionStatus.connected) {
      _sessionController.stopSession();
    } else {
      _sessionController.startSession();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isConnected = _sessionController.status == SessionStatus.connected;
    final isConnecting = _sessionController.status == SessionStatus.connecting;

    return Scaffold(
      body: Stack(
        children: [
          // Background Gradient Mesh
          Positioned.fill(
            child: Container(
              decoration: const BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment(0.8, -0.6),
                  radius: 1.2,
                  colors: [
                    Color(0x1A00E5FF),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),

          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Top Navigation & Telemetry Bar
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppTheme.primaryNeon.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.translate, color: AppTheme.primaryNeon, size: 22),
                          ),
                          const SizedBox(width: 12),
                          const Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Live AI Translator',
                                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                              ),
                              Text(
                                'Windows Desktop • WASAPI Loopback',
                                style: TextStyle(fontSize: 11, color: AppTheme.textMuted),
                              ),
                            ],
                          ),
                        ],
                      ),
                      LatencyMonitorWidget(
                        status: _sessionController.status,
                        latencyMs: _sessionController.latencyMs,
                        lipSyncActive: _sessionController.lipSyncEnabled && isConnected,
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // Warning Banner (if any)
                  if (_sessionController.warningMessage != null) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: AppTheme.accentAmber.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.accentAmber.withOpacity(0.4)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.warning_amber_rounded, color: AppTheme.accentAmber, size: 18),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              _sessionController.warningMessage!,
                              style: const TextStyle(color: AppTheme.accentAmber, fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Main Controls Card
                  Expanded(
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Left Settings Column
                        Expanded(
                          flex: 3,
                          child: Container(
                            padding: const EdgeInsets.all(24),
                            decoration: AppTheme.glassCardDecoration(),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'تنظیمات ترجمه و دوبله زنده',
                                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 20),

                                // Language Selector
                                Row(
                                  children: [
                                    Expanded(
                                      child: _buildSelectorCard('زبان مبدأ', 'English (US)', Icons.mic),
                                    ),
                                    const Padding(
                                      padding: EdgeInsets.symmetric(horizontal: 12.0),
                                      child: Icon(Icons.arrow_forward_rounded, color: AppTheme.primaryNeon),
                                    ),
                                    Expanded(
                                      child: _buildSelectorCard('زبان مقصد', 'فارسی (Persian)', Icons.record_voice_over),
                                    ),
                                  ],
                                ),

                                const SizedBox(height: 24),

                                // Feature Switches
                                _buildToggleRow(
                                  title: 'شبیه‌سازی صدای گوینده (Voice Cloning)',
                                  subtitle: 'تولید صدای فارسی با مشخصات لحن و جنس صدای اصلی',
                                  value: _sessionController.voiceCloningEnabled,
                                  onChanged: _sessionController.toggleVoiceCloning,
                                ),
                                const Divider(color: AppTheme.cardBorder, height: 28),
                                _buildToggleRow(
                                  title: 'هماهنگ‌سازی لب (Simli WebRTC Lip-Sync)',
                                  subtitle: 'انطباق بلادرنگ حرکات دهان با تاخیر زیر ۳۰۰ میلی‌ثانیه',
                                  value: _sessionController.lipSyncEnabled,
                                  onChanged: _sessionController.toggleLipSync,
                                ),

                                const SizedBox(height: 24),

                                // Audio Mixer Slider
                                const Text(
                                  'توازن صدای دوبله و صدای اصلی (Audio Ducking)',
                                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    const Text('صدای اصلی', style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                                    Expanded(
                                      child: Slider(
                                        value: _sessionController.audioMixRatio,
                                        onChanged: _sessionController.setAudioMixRatio,
                                      ),
                                    ),
                                    const Text('دوبله فارسی', style: TextStyle(fontSize: 11, color: AppTheme.primaryNeon)),
                                  ],
                                ),

                                const SizedBox(height: 20),

                                // Output Device Routing Selector
                                const Text(
                                  'مسیریابی خروجی صدا',
                                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    Expanded(
                                      child: InkWell(
                                        onTap: () {
                                          setState(() {
                                            _playbackService.setOutputTarget(AudioOutputTarget.defaultSpeakers);
                                          });
                                        },
                                        borderRadius: BorderRadius.circular(10),
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                          decoration: BoxDecoration(
                                            color: _playbackService.outputTarget == AudioOutputTarget.defaultSpeakers
                                                ? AppTheme.primaryNeon.withOpacity(0.15)
                                                : AppTheme.surfaceLight.withOpacity(0.4),
                                            borderRadius: BorderRadius.circular(10),
                                            border: Border.all(
                                              color: _playbackService.outputTarget == AudioOutputTarget.defaultSpeakers
                                                  ? AppTheme.primaryNeon
                                                  : AppTheme.cardBorder,
                                            ),
                                          ),
                                          child: const Row(
                                            mainAxisAlignment: MainAxisAlignment.center,
                                            children: [
                                              Icon(Icons.headphones, size: 16, color: AppTheme.primaryNeon),
                                              SizedBox(width: 8),
                                              Text('اسپیکر ویندوز', style: TextStyle(fontSize: 12)),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: InkWell(
                                        onTap: () {
                                          setState(() {
                                            _playbackService.setOutputTarget(AudioOutputTarget.virtualAudioCable);
                                          });
                                        },
                                        borderRadius: BorderRadius.circular(10),
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                          decoration: BoxDecoration(
                                            color: _playbackService.outputTarget == AudioOutputTarget.virtualAudioCable
                                                ? AppTheme.secondaryNeon.withOpacity(0.2)
                                                : AppTheme.surfaceLight.withOpacity(0.4),
                                            borderRadius: BorderRadius.circular(10),
                                            border: Border.all(
                                              color: _playbackService.outputTarget == AudioOutputTarget.virtualAudioCable
                                                  ? AppTheme.secondaryNeon
                                                  : AppTheme.cardBorder,
                                            ),
                                          ),
                                          child: const Row(
                                            mainAxisAlignment: MainAxisAlignment.center,
                                            children: [
                                              Icon(Icons.cable, size: 16, color: AppTheme.secondaryNeon),
                                              SizedBox(width: 8),
                                              Text('کارت صدای مجازی (زوم)', style: TextStyle(fontSize: 12)),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),

                        const SizedBox(width: 20),

                        // Right Action Card
                        Expanded(
                          flex: 2,
                          child: Container(
                            padding: const EdgeInsets.all(24),
                            decoration: AppTheme.glassCardDecoration(),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Icon(
                                  isConnected ? Icons.hearing : Icons.mic_none,
                                  size: 64,
                                  color: isConnected ? AppTheme.accentGreen : AppTheme.primaryNeon,
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  isConnected ? 'در حال دریافت صدای سیستم...' : 'آماده شروع نشست',
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  isConnected
                                      ? 'تمام صداهای خروجی ویندوز (یوتیوب، جلسات و مدیا) با WASAPI ضبط و دوبله می‌شوند.'
                                      : 'برای شروع ترجمه زنده روی دکمه زیر کلیک کنید.',
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                                ),
                                const SizedBox(height: 32),
                                ElevatedButton.icon(
                                  onPressed: isConnecting ? null : _handleToggleSession,
                                  icon: Icon(isConnected ? Icons.stop : Icons.play_arrow),
                                  label: Text(
                                    isConnected
                                        ? 'توقف دوبله زنده'
                                        : (isConnecting ? 'در حال برقراری ارتباط...' : 'شروع مترجم زنده'),
                                  ),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: isConnected ? AppTheme.accentRed : AppTheme.primaryNeon,
                                    foregroundColor: isConnected ? Colors.white : Colors.black,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Floating Subtitle Overlay
                  SubtitleOverlay(
                    subtitle: _sessionController.currentSubtitle,
                    isVisible: isConnected,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSelectorCard(String label, String value, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.surfaceLight.withOpacity(0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.cardBorder),
      ),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppTheme.primaryNeon),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontSize: 10, color: AppTheme.textMuted)),
              Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildToggleRow({
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
              const SizedBox(height: 2),
              Text(subtitle, style: const TextStyle(fontSize: 11, color: AppTheme.textMuted)),
            ],
          ),
        ),
        Switch(
          value: value,
          onChanged: onChanged,
          activeColor: AppTheme.primaryNeon,
        ),
      ],
    );
  }
}

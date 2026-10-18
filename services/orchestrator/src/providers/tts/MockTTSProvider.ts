import { TTSProvider, SynthesizedAudioChunk } from '../types.js';

export class MockTTSProvider implements TTSProvider {
  public name = 'mock-tts';

  async extractVoiceProfile(sessionId: string, referenceAudio: Buffer): Promise<string> {
    return `voice_profile_${sessionId}_${referenceAudio.length}`;
  }

  async synthesize(
    _text: string,
    _voiceProfileId: string | null,
    _targetLang: string
  ): Promise<SynthesizedAudioChunk> {
    // Generate 6000 bytes of silence / dummy PCM 16kHz mono (approx 187ms of audio)
    const dummyPcm = Buffer.alloc(6000);

    return {
      sessionId: 'mock_session',
      data: dummyPcm,
      durationMs: 187,
      pts: Date.now(),
    };
  }
}

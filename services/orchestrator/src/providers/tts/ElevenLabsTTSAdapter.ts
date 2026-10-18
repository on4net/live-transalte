import { TTSProvider, SynthesizedAudioChunk } from '../types.js';

export interface ElevenLabsConfig {
  apiKey?: string;
  defaultVoiceId?: string; // default multilingual voice ID
  modelId?: string; // defaults to 'eleven_multilingual_v2'
}

export class ElevenLabsTTSAdapter implements TTSProvider {
  public name = 'elevenlabs';
  private apiKey: string;
  private defaultVoiceId: string;
  private modelId: string;

  constructor(config?: ElevenLabsConfig) {
    this.apiKey = config?.apiKey || process.env.ELEVENLABS_API_KEY || '';
    // Standard high-quality multilingual voice (e.g. Rachel / multilingual base)
    this.defaultVoiceId =
      config?.defaultVoiceId || process.env.ELEVENLABS_DEFAULT_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
    this.modelId = config?.modelId || 'eleven_multilingual_v2';

    if (!this.apiKey) {
      console.warn(
        '[ElevenLabsTTSAdapter] ELEVENLABS_API_KEY is not set. TTS will run in fallback mock mode.'
      );
    }
  }

  /**
   * Registers a zero-shot voice clone profile from a clean voice sample.
   */
  async extractVoiceProfile(sessionId: string, referenceAudio: Buffer): Promise<string> {
    if (!this.apiKey || !referenceAudio || referenceAudio.length === 0) {
      return `profile_${sessionId}_default`;
    }

    try {
      const formData = new FormData();
      formData.append('name', `Clone_${sessionId.substring(0, 8)}`);
      formData.append('description', 'Temporary voice clone for live session');

      const blob = new Blob([new Uint8Array(referenceAudio)], { type: 'audio/wav' });
      formData.append('files', blob, 'sample.wav');

      const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        console.warn(`[ElevenLabsTTSAdapter] Voice clone failed (${response.status}), using default voice.`);
        return this.defaultVoiceId;
      }

      const data: any = await response.json();
      return data.voice_id || this.defaultVoiceId;
    } catch (err) {
      console.warn('[ElevenLabsTTSAdapter] Voice clone error, using default voice:', err);
      return this.defaultVoiceId;
    }
  }

  /**
   * Synthesizes Persian text to raw 16kHz PCM audio.
   */
  async synthesize(
    text: string,
    voiceProfileId: string | null,
    _targetLang: string
  ): Promise<SynthesizedAudioChunk> {
    const pts = Date.now();

    if (!text || text.trim() === '') {
      return {
        sessionId: 'empty',
        data: Buffer.alloc(0),
        durationMs: 0,
        pts,
      };
    }

    // Fallback mode if no API key is set
    if (!this.apiKey) {
      // Estimate ~200ms per word for dummy PCM
      const wordCount = text.split(/\s+/).length;
      const durationMs = Math.max(300, wordCount * 180);
      const dummyPcm = Buffer.alloc(durationMs * 32);

      return {
        sessionId: 'simulated_tts',
        data: dummyPcm,
        durationMs,
        pts,
      };
    }

    const voiceId = voiceProfileId || this.defaultVoiceId;
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=pcm_16000`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: this.modelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API returned HTTP ${response.status}: ${await response.text()}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const pcmData = Buffer.from(arrayBuffer);
      const durationMs = Math.round(pcmData.length / 32);

      return {
        sessionId: voiceId,
        data: pcmData,
        durationMs,
        pts,
      };
    } catch (error) {
      console.error('[ElevenLabsTTSAdapter] Synthesis error:', error);
      throw error;
    }
  }
}

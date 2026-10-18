import { STTProvider, AudioChunk, TranscriptionResult } from '../types.js';

export interface DeepgramConfig {
  apiKey?: string;
  model?: string; // defaults to 'nova-2'
  language?: string; // defaults to 'en'
}

export class DeepgramSTTAdapter implements STTProvider {
  public name = 'deepgram';
  private apiKey: string;
  private model: string;
  private language: string;

  constructor(config?: DeepgramConfig) {
    this.apiKey = config?.apiKey || process.env.DEEPGRAM_API_KEY || '';
    this.model = config?.model || 'nova-2';
    this.language = config?.language || 'en';

    if (!this.apiKey) {
      console.warn(
        '[DeepgramSTTAdapter] DEEPGRAM_API_KEY is not set. STT will run in fallback mock mode.'
      );
    }
  }

  async processAudioChunk(chunk: AudioChunk): Promise<TranscriptionResult | null> {
    if (!chunk.data || chunk.data.length === 0) {
      return null;
    }

    // Fallback mode if no API key is set
    if (!this.apiKey) {
      return {
        text: 'This is a simulated transcript from speech chunk.',
        isFinal: true,
        startMs: chunk.timestampMs,
        durationMs: Math.round(chunk.data.length / 32),
      };
    }

    try {
      const url = new URL('https://api.deepgram.com/v1/listen');
      url.searchParams.set('model', this.model);
      url.searchParams.set('language', this.language);
      url.searchParams.set('smart_format', 'true');
      url.searchParams.set('punctuate', 'true');
      url.searchParams.set('encoding', 'linear16');
      url.searchParams.set('sample_rate', '16000');
      url.searchParams.set('channels', '1');

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          Authorization: `Token ${this.apiKey}`,
          'Content-Type': 'audio/raw',
        },
        body: chunk.data,
      });

      if (!response.ok) {
        throw new Error(`Deepgram API returned HTTP ${response.status}: ${await response.text()}`);
      }

      const result: any = await response.json();
      const transcript =
        result?.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() || '';

      if (!transcript) {
        return null;
      }

      const words = result?.results?.channels?.[0]?.alternatives?.[0]?.words?.map((w: any) => ({
        word: w.word,
        startMs: Math.round(w.start * 1000),
        endMs: Math.round(w.end * 1000),
      }));

      const durationMs = Math.round(
        (result?.metadata?.duration || chunk.data.length / 32000) * 1000
      );

      return {
        text: transcript,
        isFinal: true,
        startMs: chunk.timestampMs,
        durationMs,
        words,
      };
    } catch (error) {
      console.error('[DeepgramSTTAdapter] Transcription error:', error);
      throw error;
    }
  }

  async reset(_sessionId: string): Promise<void> {
    // Stateless per-chunk / buffer processing
  }
}

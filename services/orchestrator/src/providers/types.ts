export interface AudioChunk {
  sessionId: string;
  sequenceNumber: number;
  timestampMs: number;
  data: Buffer;
}

export interface TranscriptionResult {
  text: string;
  isFinal: boolean;
  startMs: number;
  durationMs: number;
  words?: Array<{ word: string; startMs: number; endMs: number }>;
}

export interface TranslationResult {
  sourceText: string;
  translatedText: string;
  isFinal: boolean;
  estimatedDurationMs?: number;
}

export interface SynthesizedAudioChunk {
  sessionId: string;
  data: Buffer; // PCM 16kHz Mono 16-bit
  durationMs: number;
  pts: number;
}

/**
 * Speech-to-Text Provider Interface
 */
export interface STTProvider {
  name: string;
  processAudioChunk(chunk: AudioChunk): Promise<TranscriptionResult | null>;
  reset(sessionId: string): Promise<void>;
}

/**
 * Real-time Translation Provider Interface (e.g. Gemini 2.0 Flash)
 */
export interface TranslationProvider {
  name: string;
  translate(
    text: string,
    sourceLang: string,
    targetLang: string,
    context?: { originalDurationMs?: number }
  ): Promise<TranslationResult>;
  translateStream?(
    textStream: AsyncIterable<string>,
    sourceLang: string,
    targetLang: string,
    onChunk: (translatedChunk: string) => void
  ): Promise<TranslationResult>;
}

/**
 * Text-to-Speech & Voice Cloning Provider Interface
 */
export interface TTSProvider {
  name: string;
  extractVoiceProfile(sessionId: string, referenceAudio: Buffer): Promise<string>;
  synthesize(
    text: string,
    voiceProfileId: string | null,
    targetLang: string
  ): Promise<SynthesizedAudioChunk>;
}

/**
 * Ultra-Low-Latency Lip-Sync Provider Interface (e.g. Simli WebRTC / Fal.ai / Mock)
 */
export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface LipSyncSession {
  sessionId: string;
  webrtcUrl?: string;
  iceServers?: IceServer[];
  streamAudioChunk(pcmChunk: Buffer): Promise<void>;
  close(): Promise<void>;
}

export interface LipSyncProvider {
  name: string;
  initializeSession(
    sessionId: string,
    faceReference?: string,
    options?: { handleSilence?: boolean }
  ): Promise<LipSyncSession>;
  checkHealth?(): Promise<{ status: 'healthy' | 'degraded' | 'down'; latencyMs: number }>;
}

export interface SessionConfig {
  sessionId: string;
  sourceLanguage: string;
  targetLanguage: string;
  features: {
    voiceCloning: boolean;
    lipSync: boolean;
    subtitles: boolean;
  };
  audioConfig: {
    sampleRate: number; // e.g. 16000
    channels: number;   // e.g. 1 (mono)
    format: string;     // e.g. "pcm_s16le"
  };
  lipSyncConfig?: {
    provider?: 'simli' | 'fal' | 'mock';
    faceId?: string;
    model?: string;
  };
}

export interface TranscriptionEvent {
  sourceText: string;
  translatedText: string;
  isFinal: boolean;
  startMs: number;
  durationMs: number;
}

export interface SystemWarningEvent {
  code: string;
  message: string;
  action: string;
}

export interface AudioChunkPayload {
  sessionId: string;
  sequenceNumber: number;
  timestampMs: number;
  payload: Buffer;
}

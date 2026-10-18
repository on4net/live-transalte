import { STTProvider, TranslationProvider, TTSProvider, LipSyncProvider } from './types.js';
import { MockSTTProvider } from './stt/MockSTTProvider.js';
import { DeepgramSTTAdapter } from './stt/DeepgramSTTAdapter.js';
import { MockTTSProvider } from './tts/MockTTSProvider.js';
import { ElevenLabsTTSAdapter } from './tts/ElevenLabsTTSAdapter.js';
import { GeminiTranslationAdapter } from './translation/GeminiTranslationAdapter.js';
import { SimliLipSyncAdapter } from './lipsync/SimliLipSyncAdapter.js';
import { MockLipSyncAdapter } from './lipsync/MockLipSyncAdapter.js';

export * from './types.js';
export * from './stt/MockSTTProvider.js';
export * from './stt/DeepgramSTTAdapter.js';
export * from './tts/MockTTSProvider.js';
export * from './tts/ElevenLabsTTSAdapter.js';
export * from './translation/GeminiTranslationAdapter.js';
export * from './lipsync/SimliLipSyncAdapter.js';
export * from './lipsync/MockLipSyncAdapter.js';

export interface ProviderBundle {
  stt: STTProvider;
  translation: TranslationProvider;
  tts: TTSProvider;
  lipSync: LipSyncProvider;
}

export function createProviderBundle(options?: {
  sttType?: 'deepgram' | 'mock';
  translationType?: 'gemini' | 'mock';
  ttsType?: 'elevenlabs' | 'mock';
  lipSyncType?: 'simli' | 'mock';
}): ProviderBundle {
  const sttType = options?.sttType || (process.env.STT_PROVIDER as 'deepgram' | 'mock') || 'deepgram';
  const translationType = options?.translationType || (process.env.TRANSLATION_PROVIDER as 'gemini' | 'mock') || 'gemini';
  const ttsType = options?.ttsType || (process.env.TTS_PROVIDER as 'elevenlabs' | 'mock') || 'elevenlabs';
  const lipSyncType = options?.lipSyncType || (process.env.LIPSYNC_PROVIDER as 'simli' | 'mock') || 'simli';

  const stt = sttType === 'deepgram'
    ? new DeepgramSTTAdapter()
    : new MockSTTProvider();

  const translation = translationType === 'gemini'
    ? new GeminiTranslationAdapter()
    : new GeminiTranslationAdapter(); // gracefully falls back to mock if key missing

  const tts = ttsType === 'elevenlabs'
    ? new ElevenLabsTTSAdapter()
    : new MockTTSProvider();

  const lipSync = lipSyncType === 'simli' && process.env.SIMLI_API_KEY
    ? new SimliLipSyncAdapter()
    : new MockLipSyncAdapter();

  return {
    stt,
    translation,
    tts,
    lipSync,
  };
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { SimliLipSyncAdapter } from '../providers/lipsync/SimliLipSyncAdapter.js';
import { MockLipSyncAdapter } from '../providers/lipsync/MockLipSyncAdapter.js';
import { GeminiTranslationAdapter } from '../providers/translation/GeminiTranslationAdapter.js';
import { DeepgramSTTAdapter } from '../providers/stt/DeepgramSTTAdapter.js';
import { ElevenLabsTTSAdapter } from '../providers/tts/ElevenLabsTTSAdapter.js';
import { createProviderBundle } from '../providers/index.js';

test('MockLipSyncAdapter - initializes session and records streamed chunks', async () => {
  const adapter = new MockLipSyncAdapter();
  assert.equal(adapter.name, 'mock-lipsync');

  const session = await adapter.initializeSession('sess_123');
  assert.equal(session.sessionId, 'sess_123');
  assert.match(session.webrtcUrl || '', /mock:\/\/webrtc-stream\/sess_123/);

  const dummyChunk = Buffer.alloc(6000);
  await session.streamAudioChunk(dummyChunk);
  await session.streamAudioChunk(dummyChunk);

  const mockSession = session as any;
  assert.equal(mockSession.streamedChunksCount, 2);
  assert.equal(mockSession.totalBytesStreamed, 12000);

  const health = await adapter.checkHealth();
  assert.equal(health.status, 'healthy');
});

test('SimliLipSyncAdapter - initializes WebRTC session with parameters', async () => {
  const adapter = new SimliLipSyncAdapter({
    apiKey: 'test_key',
    faceId: 'avatar_custom_01',
  });
  assert.equal(adapter.name, 'simli');

  const session = await adapter.initializeSession('sess_456');
  assert.equal(session.sessionId, 'sess_456');
  assert.ok(session.webrtcUrl?.includes('api.simli.ai'));
  assert.ok(session.webrtcUrl?.includes('avatar_custom_01'));

  const pcmChunk = Buffer.alloc(6000);
  await assert.doesNotReject(async () => {
    await session.streamAudioChunk(pcmChunk);
    await session.close();
  });
});

test('GeminiTranslationAdapter - fallback mode when API key is missing', async () => {
  const adapter = new GeminiTranslationAdapter({ apiKey: '' });
  assert.equal(adapter.name, 'gemini');

  const result = await adapter.translate('Hello world', 'en', 'fa');
  assert.equal(result.sourceText, 'Hello world');
  assert.ok(result.translatedText.includes('Hello world'));
  assert.equal(result.isFinal, true);
});

test('DeepgramSTTAdapter - fallback mode when API key is missing', async () => {
  const adapter = new DeepgramSTTAdapter({ apiKey: '' });
  assert.equal(adapter.name, 'deepgram');

  const dummyAudio = Buffer.alloc(3200); // 100ms
  const result = await adapter.processAudioChunk({
    sessionId: 'sess_stt',
    sequenceNumber: 1,
    timestampMs: 1000,
    data: dummyAudio,
  });

  assert.ok(result !== null);
  assert.ok(result.text.length > 0);
  assert.equal(result.startMs, 1000);
});

test('ElevenLabsTTSAdapter - fallback mode when API key is missing', async () => {
  const adapter = new ElevenLabsTTSAdapter({ apiKey: '' });
  assert.equal(adapter.name, 'elevenlabs');

  const result = await adapter.synthesize('سلام دنیا', null, 'fa');
  assert.ok(result.data.length > 0);
  assert.ok(result.durationMs > 0);
});

test('createProviderBundle - loads appropriate providers based on config', () => {
  const bundle = createProviderBundle({
    sttType: 'deepgram',
    ttsType: 'elevenlabs',
    lipSyncType: 'mock',
  });
  assert.equal(bundle.stt.name, 'deepgram');
  assert.equal(bundle.tts.name, 'elevenlabs');
  assert.equal(bundle.lipSync.name, 'mock-lipsync');
  assert.equal(bundle.translation.name, 'gemini');
});


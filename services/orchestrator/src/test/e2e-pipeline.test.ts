import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { server } from '../index.js';

let port: number;
let wsUrl: string;

before(async () => {
  // Start server on an ephemeral port
  await server.listen({ port: 0, host: '127.0.0.1' });
  port = (server.server.address() as any).port;
  wsUrl = `ws://127.0.0.1:${port}/ws`;
});

after(async () => {
  await server.close();
});

test('1. Diagnostics & Health Endpoint Verification', async () => {
  const res = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(res.status, 200);

  const data = (await res.json()) as any;
  assert.equal(data.status, 'ok');
  assert.ok(data.timestamp);
  assert.ok(data.providers);
  assert.equal(typeof data.providers.stt, 'string');
  assert.equal(typeof data.providers.translation, 'string');
  assert.equal(typeof data.providers.tts, 'string');
  assert.equal(typeof data.providers.lipSync, 'string');
  assert.equal(data.providers.lipSyncHealth.status, 'healthy');
});

test('2. Standard Voice Pipeline (VAD -> STT -> Persian Translation -> TTS -> SOLA -> LipSync)', async () => {
  const ws = new WebSocket(wsUrl);

  await new Promise<void>((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });

  const receivedEvents: string[] = [];
  let transcriptionReceived = false;
  let synthesizedAudioReceived = false;

  const messagePromise = new Promise<void>((resolve) => {
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      receivedEvents.push(msg.event);

      if (msg.event === 'transcription.event') {
        transcriptionReceived = true;
        assert.ok(msg.data.sourceText.length > 0);
        assert.ok(msg.data.translatedText.length > 0);
      }

      if (msg.event === 'media.synthesized_audio') {
        synthesizedAudioReceived = true;
        assert.ok(msg.data.durationMs > 0);
        assert.ok(msg.data.payloadBase64.length > 0);
      }

      if (transcriptionReceived && synthesizedAudioReceived) {
        resolve();
      }
    });
  });

  // 1. Send session.init
  ws.send(
    JSON.stringify({
      event: 'session.init',
      data: {
        sessionId: 'e2e_standard_session',
        sourceLanguage: 'en',
        targetLanguage: 'fa',
        features: {
          voiceCloning: true,
          lipSync: true,
          subtitles: true,
        },
        audioConfig: {
          sampleRate: 16000,
          channels: 1,
          format: 'pcm_s16le',
        },
      },
    })
  );

  await new Promise((r) => setTimeout(r, 60));

  // 2. Stream 600ms speech (400Hz tone)
  const sampleRate = 16000;
  const chunkSamples = 1600; // 100ms
  const speechBuffer = Buffer.alloc(chunkSamples * 2);
  for (let i = 0; i < chunkSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * 400 * t) * 0.4;
    speechBuffer.writeInt16LE(Math.round(sample * 32767), i * 2);
  }

  for (let seq = 1; seq <= 6; seq++) {
    ws.send(
      JSON.stringify({
        event: 'media.audio_chunk',
        data: {
          sequenceNumber: seq,
          timestampMs: 1000 + seq * 100,
          payloadBase64: speechBuffer.toString('base64'),
        },
      })
    );
    await new Promise((r) => setTimeout(r, 15));
  }

  // 3. Stream 400ms silence (flushes VAD utterance)
  const silenceBuffer = Buffer.alloc(chunkSamples * 2);
  for (let seq = 7; seq <= 10; seq++) {
    ws.send(
      JSON.stringify({
        event: 'media.audio_chunk',
        data: {
          sequenceNumber: seq,
          timestampMs: 1000 + seq * 100,
          payloadBase64: silenceBuffer.toString('base64'),
        },
      })
    );
    await new Promise((r) => setTimeout(r, 15));
  }

  await Promise.race([
    messagePromise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout in standard pipeline')), 3500)),
  ]);

  assert.ok(receivedEvents.includes('session.ready'));
  assert.ok(transcriptionReceived);
  assert.ok(synthesizedAudioReceived);

  ws.close();
});

test('3. VAD Silence Rejection (Pure Silence Emits Zero Translation/Audio)', async () => {
  const ws = new WebSocket(wsUrl);

  await new Promise<void>((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });

  let eventsCount = 0;
  let unwantedEventReceived = false;

  ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.event === 'transcription.event' || msg.event === 'media.synthesized_audio') {
      unwantedEventReceived = true;
    }
    eventsCount++;
  });

  // Init session
  ws.send(
    JSON.stringify({
      event: 'session.init',
      data: {
        sessionId: 'e2e_silence_session',
        sourceLanguage: 'en',
        targetLanguage: 'fa',
      },
    })
  );

  await new Promise((r) => setTimeout(r, 60));

  // Send 1.2 seconds of pure silence (12 chunks)
  const silenceBuffer = Buffer.alloc(3200);
  for (let seq = 1; seq <= 12; seq++) {
    ws.send(
      JSON.stringify({
        event: 'media.audio_chunk',
        data: {
          sequenceNumber: seq,
          timestampMs: Date.now(),
          payloadBase64: silenceBuffer.toString('base64'),
        },
      })
    );
    await new Promise((r) => setTimeout(r, 10));
  }

  // Wait 400ms to ensure nothing is emitted
  await new Promise((r) => setTimeout(r, 400));

  assert.equal(unwantedEventReceived, false, 'Pure silence should never trigger downstream AI inference');

  ws.close();
});

test('4. Multi-client Isolation (Simultaneous Users Do Not Interfere)', async () => {
  const wsClientA = new WebSocket(wsUrl);
  const wsClientB = new WebSocket(wsUrl);

  await Promise.all([
    new Promise<void>((res) => wsClientA.on('open', res)),
    new Promise<void>((res) => wsClientB.on('open', res)),
  ]);

  let clientAReceivedAudio = false;
  let clientBReceivedAudio = false;

  const clientAPromise = new Promise<void>((resolve) => {
    wsClientA.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.event === 'media.synthesized_audio') {
        clientAReceivedAudio = true;
        assert.equal(msg.data.sessionId, 'user_session_A');
        resolve();
      }
    });
  });

  wsClientB.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.event === 'media.synthesized_audio') {
      clientBReceivedAudio = true;
    }
  });

  // Init Client A and Client B
  wsClientA.send(
    JSON.stringify({
      event: 'session.init',
      data: { sessionId: 'user_session_A', sourceLanguage: 'en', targetLanguage: 'fa' },
    })
  );

  wsClientB.send(
    JSON.stringify({
      event: 'session.init',
      data: { sessionId: 'user_session_B', sourceLanguage: 'en', targetLanguage: 'fa' },
    })
  );

  await new Promise((r) => setTimeout(r, 60));

  // Client A sends speech, Client B sends silence
  const sampleRate = 16000;
  const chunkSamples = 1600;
  const speechChunk = Buffer.alloc(chunkSamples * 2);
  for (let i = 0; i < chunkSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * 400 * t) * 0.4;
    speechChunk.writeInt16LE(Math.round(sample * 32767), i * 2);
  }
  const silenceChunk = Buffer.alloc(chunkSamples * 2);

  // Send 6 speech chunks for A, 6 silence for B
  for (let seq = 1; seq <= 6; seq++) {
    wsClientA.send(
      JSON.stringify({
        event: 'media.audio_chunk',
        data: { sequenceNumber: seq, timestampMs: 1000 + seq * 100, payloadBase64: speechChunk.toString('base64') },
      })
    );
    wsClientB.send(
      JSON.stringify({
        event: 'media.audio_chunk',
        data: { sequenceNumber: seq, timestampMs: 1000 + seq * 100, payloadBase64: silenceChunk.toString('base64') },
      })
    );
    await new Promise((r) => setTimeout(r, 15));
  }

  // Followed by silence flush on A (4 chunks = 400ms silence > 350ms threshold)
  for (let seq = 7; seq <= 10; seq++) {
    wsClientA.send(
      JSON.stringify({
        event: 'media.audio_chunk',
        data: { sequenceNumber: seq, timestampMs: 1000 + seq * 100, payloadBase64: silenceChunk.toString('base64') },
      })
    );
    await new Promise((r) => setTimeout(r, 15));
  }

  // Wait for Client A processing
  await Promise.race([
    clientAPromise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for Client A audio')), 3500)),
  ]);

  assert.equal(clientAReceivedAudio, true, 'Client A should receive its synthesized Persian audio');
  assert.equal(clientBReceivedAudio, false, 'Client B should not receive any audio from Client A');

  wsClientA.close();
  wsClientB.close();
});

test('5. Continuous Speech with Forced Utterance Cut (>1800ms threshold)', async () => {
  const ws = new WebSocket(wsUrl);

  await new Promise<void>((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });

  let forcedCutAudioReceived = false;

  ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.event === 'media.synthesized_audio') {
      forcedCutAudioReceived = true;
    }
  });

  ws.send(
    JSON.stringify({
      event: 'session.init',
      data: {
        sessionId: 'e2e_forced_cut_session',
        sourceLanguage: 'en',
        targetLanguage: 'fa',
      },
    })
  );

  await new Promise((r) => setTimeout(r, 60));

  // Stream 20 consecutive speech chunks (2000ms continuous voice with ZERO silence)
  const sampleRate = 16000;
  const chunkSamples = 1600;
  const speechBuffer = Buffer.alloc(chunkSamples * 2);
  for (let i = 0; i < chunkSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * 400 * t) * 0.4;
    speechBuffer.writeInt16LE(Math.round(sample * 32767), i * 2);
  }

  for (let seq = 1; seq <= 20; seq++) {
    ws.send(
      JSON.stringify({
        event: 'media.audio_chunk',
        data: {
          sequenceNumber: seq,
          timestampMs: 1000 + seq * 100,
          payloadBase64: speechBuffer.toString('base64'),
        },
      })
    );
    await new Promise((r) => setTimeout(r, 10));
  }

  // Wait for forced cut trigger
  await new Promise((r) => setTimeout(r, 600));

  assert.equal(forcedCutAudioReceived, true, 'Forced cut must trigger without waiting indefinitely for silence');

  ws.close();
});

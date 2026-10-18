import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { server } from '../index.js';

test('End-to-End WebSocket Pipeline Simulation', async () => {
  // Start server on an ephemeral port for testing
  const address = await server.listen({ port: 0, host: '127.0.0.1' });
  const port = (server.server.address() as any).port;

  // 0. Verify /health diagnostic endpoint returns 200 OK and provider status
  const healthRes = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(healthRes.status, 200);
  const healthJson = (await healthRes.json()) as any;
  assert.equal(healthJson.status, 'ok');
  assert.ok(healthJson.providers);
  assert.equal(typeof healthJson.providers.stt, 'string');
  assert.equal(typeof healthJson.providers.lipSync, 'string');

  const wsUrl = `ws://127.0.0.1:${port}/ws`;

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
        sessionId: 'e2e_test_session',
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

  // Wait a moment for session.ready
  await new Promise((r) => setTimeout(r, 50));

  // 2. Stream simulated voice chunks (400Hz speech tone, 100ms each)
  const sampleRate = 16000;
  const chunkSamples = 1600; // 100ms
  const chunkBuffer = Buffer.alloc(chunkSamples * 2);
  for (let i = 0; i < chunkSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * 400 * t) * 0.4;
    chunkBuffer.writeInt16LE(Math.round(sample * 32767), i * 2);
  }

  // Send 6 chunks of active speech (600ms speech)
  for (let seq = 1; seq <= 6; seq++) {
    ws.send(
      JSON.stringify({
        event: 'media.audio_chunk',
        data: {
          sequenceNumber: seq,
          timestampMs: 1000 + seq * 100,
          payloadBase64: chunkBuffer.toString('base64'),
        },
      })
    );
    await new Promise((r) => setTimeout(r, 20));
  }

  // Send 4 chunks of silence (400ms silence -> triggers VAD flush)
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
    await new Promise((r) => setTimeout(r, 20));
  }

  // Await pipeline response
  await Promise.race([
    messagePromise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for E2E events')), 3000)),
  ]);

  assert.ok(receivedEvents.includes('session.ready'));
  assert.ok(transcriptionReceived);
  assert.ok(synthesizedAudioReceived);

  ws.close();
  await server.close();
});

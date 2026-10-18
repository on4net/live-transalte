import test from 'node:test';
import assert from 'node:assert/strict';
import { VoiceActivityDetector } from '../audio/vad.js';
import { AudioChunkAssembler } from '../audio/chunk-assembler.js';

/**
 * Helper to generate synthetic 16-bit PCM mono audio buffers.
 */
function createAudioChunk(durationMs: number, frequencyHz: number, amplitude: number): Buffer {
  const sampleRate = 16000;
  const sampleCount = Math.floor((durationMs / 1000) * sampleRate);
  const buffer = Buffer.alloc(sampleCount * 2);

  for (let i = 0; i < sampleCount; i++) {
    const t = i / sampleRate;
    const sampleVal = frequencyHz > 0
      ? Math.sin(2 * Math.PI * frequencyHz * t) * amplitude
      : 0;
    const int16 = Math.max(-32768, Math.min(32767, Math.round(sampleVal * 32767)));
    buffer.writeInt16LE(int16, i * 2);
  }

  return buffer;
}

test('VoiceActivityDetector - detects silence vs speech tone', () => {
  const vad = new VoiceActivityDetector({ energyThreshold: 0.02 });

  // 1. Pure silence
  const silenceBuffer = createAudioChunk(100, 0, 0);
  const silenceResult = vad.process(silenceBuffer);
  assert.equal(silenceResult.isSpeech, false);
  assert.equal(silenceResult.rms, 0);

  // 2. Audible speech-range tone (350 Hz, 40% volume)
  const speechBuffer = createAudioChunk(100, 350, 0.4);
  const speechResult = vad.process(speechBuffer);
  assert.equal(speechResult.isSpeech, true);
  assert.ok(speechResult.rms > 0.05);
});

test('AudioChunkAssembler - filters continuous silence without emitting chunks', () => {
  const assembler = new AudioChunkAssembler({ minUtteranceMs: 200, silenceThresholdMs: 300 });
  const silenceChunk = createAudioChunk(100, 0, 0);

  for (let i = 0; i < 10; i++) {
    const result = assembler.processChunk('sess_1', silenceChunk, i * 100);
    assert.equal(result, null);
  }
});

test('AudioChunkAssembler - accumulates speech and flushes after silence threshold', () => {
  const assembler = new AudioChunkAssembler({
    minUtteranceMs: 200,
    silenceThresholdMs: 300,
    energyThreshold: 0.02,
  });

  const speechChunk = createAudioChunk(100, 400, 0.4);
  const silenceChunk = createAudioChunk(100, 0, 0);

  // 1. Feed 400ms of speech
  assert.equal(assembler.processChunk('sess_1', speechChunk, 1000), null);
  assert.equal(assembler.processChunk('sess_1', speechChunk, 1100), null);
  assert.equal(assembler.processChunk('sess_1', speechChunk, 1200), null);
  assert.equal(assembler.processChunk('sess_1', speechChunk, 1300), null);

  // 2. Feed silence (100ms, 200ms -> not yet flushed)
  assert.equal(assembler.processChunk('sess_1', silenceChunk, 1400), null);
  assert.equal(assembler.processChunk('sess_1', silenceChunk, 1500), null);

  // 3. Feed 3rd silence chunk (300ms silence reached -> flush!)
  const flushed = assembler.processChunk('sess_1', silenceChunk, 1600);
  assert.ok(flushed !== null);
  assert.equal(flushed.sessionId, 'sess_1');
  assert.ok(flushed.durationMs >= 400);
  assert.equal(flushed.isForcedCut, false);
});

test('AudioChunkAssembler - triggers forced cut when exceeding maxUtteranceMs', () => {
  const assembler = new AudioChunkAssembler({
    maxUtteranceMs: 500,
    energyThreshold: 0.02,
  });

  const speechChunk = createAudioChunk(100, 400, 0.4);

  assert.equal(assembler.processChunk('sess_2', speechChunk, 100), null);
  assert.equal(assembler.processChunk('sess_2', speechChunk, 200), null);
  assert.equal(assembler.processChunk('sess_2', speechChunk, 300), null);
  assert.equal(assembler.processChunk('sess_2', speechChunk, 400), null);
  assert.equal(assembler.processChunk('sess_2', speechChunk, 500), null);

  // Exceeding 500ms -> forced cut!
  const cutResult = assembler.processChunk('sess_2', speechChunk, 600);
  assert.ok(cutResult !== null);
  assert.equal(cutResult.isForcedCut, true);
  assert.ok(cutResult.durationMs >= 500);
});

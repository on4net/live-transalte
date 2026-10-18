import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioTimeStretcher } from '../audio/time-stretcher.js';

function createAudioBuffer(durationMs: number): Buffer {
  const sampleRate = 16000;
  const sampleCount = Math.floor((durationMs / 1000) * sampleRate);
  const buffer = Buffer.alloc(sampleCount * 2);

  for (let i = 0; i < sampleCount; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * 400 * t) * 0.5;
    buffer.writeInt16LE(Math.round(sample * 32767), i * 2);
  }

  return buffer;
}

test('AudioTimeStretcher - speeds up audio to match shorter target duration', () => {
  const stretcher = new AudioTimeStretcher();
  const inputBuffer = createAudioBuffer(1000); // 1000ms

  // Target: 850ms (faster speech)
  const adjusted = stretcher.matchDuration(inputBuffer, 850);
  const outputDurationMs = Math.round(adjusted.length / 32);

  assert.ok(outputDurationMs < 1000);
  assert.ok(Math.abs(outputDurationMs - 850) < 60);
});

test('AudioTimeStretcher - slows down audio to match longer target duration', () => {
  const stretcher = new AudioTimeStretcher();
  const inputBuffer = createAudioBuffer(800); // 800ms

  // Target: 950ms (slower speech)
  const adjusted = stretcher.matchDuration(inputBuffer, 950);
  const outputDurationMs = Math.round(adjusted.length / 32);

  assert.ok(outputDurationMs > 800);
  assert.ok(Math.abs(outputDurationMs - 950) < 60);
});

test('AudioTimeStretcher - clamps speed ratio within allowed bounds', () => {
  const stretcher = new AudioTimeStretcher({ minRatio: 0.8, maxRatio: 1.25 });
  const inputBuffer = createAudioBuffer(1000);

  // Target extreme speedup (400ms -> ratio 2.5, clamped to 1.25)
  const extremeSpeedup = stretcher.matchDuration(inputBuffer, 400);
  const durationMs = Math.round(extremeSpeedup.length / 32);

  // Clamped to ~800ms (1000 / 1.25)
  assert.ok(durationMs >= 750 && durationMs <= 850);
});

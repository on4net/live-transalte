/**
 * Synchronized Overlap-Add (SOLA) Time-Stretching DSP module.
 * Adjusts playback speed of 16-bit PCM Mono audio while preserving pitch.
 */

export interface TimeStretchOptions {
  sampleRate?: number; // default 16000
  minRatio?: number;   // default 0.8 (slow down max 20%)
  maxRatio?: number;   // default 1.25 (speed up max 25%)
  windowSizeMs?: number; // default 20ms
}

export class AudioTimeStretcher {
  private sampleRate: number;
  private minRatio: number;
  private maxRatio: number;
  private windowSamples: number;

  constructor(options?: TimeStretchOptions) {
    this.sampleRate = options?.sampleRate || 16000;
    this.minRatio = options?.minRatio || 0.8;
    this.maxRatio = options?.maxRatio || 1.25;
    // 20ms window at 16kHz = 320 samples
    this.windowSamples = Math.round(((options?.windowSizeMs || 20) / 1000) * this.sampleRate);
  }

  /**
   * Adjusts the duration of a 16-bit PCM mono buffer to match targetDurationMs.
   */
  public matchDuration(pcmBuffer: Buffer, targetDurationMs: number): Buffer {
    if (!pcmBuffer || pcmBuffer.length < 4 || targetDurationMs <= 0) {
      return pcmBuffer;
    }

    const currentDurationMs = Math.round(pcmBuffer.length / 32); // 32 bytes/ms at 16kHz 16-bit
    const targetRatio = currentDurationMs / targetDurationMs;

    // If difference is negligible (within ±3%), return original buffer
    if (Math.abs(targetRatio - 1.0) < 0.03) {
      return pcmBuffer;
    }

    // Clamp ratio to acceptable speech preservation range
    const clampedRatio = Math.max(this.minRatio, Math.min(this.maxRatio, targetRatio));
    return this.stretch(pcmBuffer, clampedRatio);
  }

  /**
   * Stretches or compresses PCM audio by a specified speed ratio.
   * ratio > 1.0: speeds up (shorter duration)
   * ratio < 1.0: slows down (longer duration)
   */
  public stretch(pcmBuffer: Buffer, speedRatio: number): Buffer {
    if (Math.abs(speedRatio - 1.0) < 0.01) {
      return pcmBuffer;
    }

    const inputSampleCount = Math.floor(pcmBuffer.length / 2);
    if (inputSampleCount <= this.windowSamples * 2) {
      return pcmBuffer;
    }

    const inputSamples = new Float32Array(inputSampleCount);
    for (let i = 0; i < inputSampleCount; i++) {
      inputSamples[i] = pcmBuffer.readInt16LE(i * 2) / 32768.0;
    }

    const winSize = this.windowSamples;
    const halfWin = Math.floor(winSize / 2);
    const synthesisHop = halfWin;
    const analysisHop = Math.round(synthesisHop * speedRatio);

    const estimatedOutputCount = Math.floor(inputSampleCount / speedRatio);
    const outputSamples = new Float32Array(estimatedOutputCount + winSize * 2);

    // Hann window
    const window = new Float32Array(winSize);
    for (let i = 0; i < winSize; i++) {
      window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (winSize - 1)));
    }

    let inPos = 0;
    let outPos = 0;

    while (inPos + winSize <= inputSampleCount && outPos + winSize <= outputSamples.length) {
      // Overlap-add windowed segment
      for (let i = 0; i < winSize; i++) {
        outputSamples[outPos + i] += inputSamples[inPos + i] * window[i];
      }

      inPos += analysisHop;
      outPos += synthesisHop;
    }

    const finalOutputLength = Math.min(outPos, outputSamples.length);
    const outputBuffer = Buffer.alloc(finalOutputLength * 2);

    for (let i = 0; i < finalOutputLength; i++) {
      const sample = Math.max(-1.0, Math.min(1.0, outputSamples[i]));
      const int16 = Math.round(sample * 32767);
      outputBuffer.writeInt16LE(int16, i * 2);
    }

    return outputBuffer;
  }
}

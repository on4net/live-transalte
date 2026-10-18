export interface VADOptions {
  sampleRate?: number; // default 16000
  frameSizeMs?: number; // default 20ms (320 samples / 640 bytes)
  energyThreshold?: number; // RMS threshold for speech detection (default 0.015)
  adaptiveNoiseFloor?: boolean; // automatically adapt to background noise
}

export interface VADResult {
  isSpeech: boolean;
  rms: number;
  energy: number;
  zcr: number; // Zero Crossing Rate
}

export class VoiceActivityDetector {
  private sampleRate: number;
  private energyThreshold: number;
  private noiseFloor: number;
  private adaptive: boolean;

  constructor(options?: VADOptions) {
    this.sampleRate = options?.sampleRate || 16000;
    this.energyThreshold = options?.energyThreshold || 0.015;
    this.noiseFloor = 0.005;
    this.adaptive = options?.adaptiveNoiseFloor !== false;
  }

  /**
   * Analyzes a 16-bit PCM mono buffer and returns speech activity metrics.
   */
  public process(pcmBuffer: Buffer): VADResult {
    const sampleCount = Math.floor(pcmBuffer.length / 2);
    if (sampleCount === 0) {
      return { isSpeech: false, rms: 0, energy: 0, zcr: 0 };
    }

    let sumSquares = 0;
    let zeroCrossings = 0;
    let prevSample = 0;

    for (let i = 0; i < sampleCount; i++) {
      // Read signed 16-bit integer and normalize to [-1.0, 1.0]
      const sample = pcmBuffer.readInt16LE(i * 2) / 32768.0;
      sumSquares += sample * sample;

      if (i > 0 && ((sample >= 0 && prevSample < 0) || (sample < 0 && prevSample >= 0))) {
        zeroCrossings++;
      }
      prevSample = sample;
    }

    const meanSquare = sumSquares / sampleCount;
    const rms = Math.sqrt(meanSquare);
    const zcr = zeroCrossings / sampleCount;

    // Adaptively adjust noise floor during quiet periods
    if (this.adaptive && rms < this.noiseFloor * 1.5) {
      this.noiseFloor = this.noiseFloor * 0.95 + rms * 0.05;
    }

    const dynamicThreshold = Math.max(this.energyThreshold, this.noiseFloor * 2.5);
    // Speech is detected if RMS exceeds dynamic threshold and ZCR is within typical speech frequency range
    const isSpeech = rms > dynamicThreshold && zcr > 0.02 && zcr < 0.65;

    return {
      isSpeech,
      rms,
      energy: meanSquare,
      zcr,
    };
  }

  public reset(): void {
    this.noiseFloor = 0.005;
  }
}

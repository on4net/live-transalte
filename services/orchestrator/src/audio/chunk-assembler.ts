import { VoiceActivityDetector, VADOptions } from './vad.js';

export interface ChunkAssemblerOptions extends VADOptions {
  minUtteranceMs?: number; // Minimum speech length to trigger STT (e.g. 200ms)
  maxUtteranceMs?: number; // Maximum length before forcing a chunk cut (e.g. 1800ms)
  silenceThresholdMs?: number; // Silence duration to consider speech ended (e.g. 350ms)
  preRollMs?: number; // Audio to keep before speech start (e.g. 100ms)
}

export interface AssembledChunk {
  sessionId: string;
  startMs: number;
  durationMs: number;
  data: Buffer;
  isForcedCut: boolean;
}

export class AudioChunkAssembler {
  private vad: VoiceActivityDetector;
  private minUtteranceMs: number;
  private maxUtteranceMs: number;
  private silenceThresholdMs: number;
  private preRollMs: number;

  private isSpeaking = false;
  private speechStartTimestamp = 0;
  private lastSpeechTimestamp = 0;
  private accumulatedBuffers: Buffer[] = [];
  private preRollBuffers: Array<{ data: Buffer; timestampMs: number }> = [];

  constructor(options?: ChunkAssemblerOptions) {
    this.vad = new VoiceActivityDetector(options);
    this.minUtteranceMs = options?.minUtteranceMs || 200;
    this.maxUtteranceMs = options?.maxUtteranceMs || 1800;
    this.silenceThresholdMs = options?.silenceThresholdMs || 350;
    this.preRollMs = options?.preRollMs || 100;
  }

  /**
   * Processes an incoming raw PCM audio chunk.
   * Returns an AssembledChunk if a complete utterance or forced cut has occurred, null otherwise.
   */
  public processChunk(
    sessionId: string,
    pcmChunk: Buffer,
    timestampMs: number
  ): AssembledChunk | null {
    if (!pcmChunk || pcmChunk.length === 0) return null;

    // Estimate chunk duration in ms (16kHz 16-bit mono = 32000 bytes/sec = 32 bytes/ms)
    const chunkDurationMs = Math.round(pcmChunk.length / 32);
    const vadResult = this.vad.process(pcmChunk);

    if (vadResult.isSpeech) {
      if (!this.isSpeaking) {
        // Speech just started!
        this.isSpeaking = true;
        this.speechStartTimestamp = this.preRollBuffers.length > 0
          ? this.preRollBuffers[0].timestampMs
          : timestampMs;

        // Prepend pre-roll buffers to preserve initial syllable
        this.accumulatedBuffers = this.preRollBuffers.map((b) => b.data);
        this.preRollBuffers = [];
      }

      this.accumulatedBuffers.push(pcmChunk);
      this.lastSpeechTimestamp = timestampMs;

      // Check if max utterance duration exceeded (force cut)
      const currentDurationMs = timestampMs - this.speechStartTimestamp;
      if (currentDurationMs >= this.maxUtteranceMs) {
        return this.flush(sessionId, true);
      }
    } else {
      // Current frame is silence
      if (this.isSpeaking) {
        this.accumulatedBuffers.push(pcmChunk);
        const silenceDurationMs = timestampMs - this.lastSpeechTimestamp;

        if (silenceDurationMs >= this.silenceThresholdMs) {
          // Natural speech pause reached
          return this.flush(sessionId, false);
        }
      } else {
        // Maintain sliding pre-roll buffer during silence
        this.preRollBuffers.push({ data: pcmChunk, timestampMs });

        // Keep only up to preRollMs of audio
        let totalPreRollMs = this.preRollBuffers.length * chunkDurationMs;
        while (totalPreRollMs > this.preRollMs && this.preRollBuffers.length > 1) {
          this.preRollBuffers.shift();
          totalPreRollMs -= chunkDurationMs;
        }
      }
    }

    return null;
  }

  private flush(sessionId: string, isForcedCut: boolean): AssembledChunk | null {
    if (this.accumulatedBuffers.length === 0) {
      this.reset();
      return null;
    }

    const mergedBuffer = Buffer.concat(this.accumulatedBuffers);
    const totalDurationMs = Math.round(mergedBuffer.length / 32);

    const startMs = this.speechStartTimestamp;
    this.reset();

    if (totalDurationMs < this.minUtteranceMs) {
      // Too short to be meaningful speech, discard
      return null;
    }

    return {
      sessionId,
      startMs,
      durationMs: totalDurationMs,
      data: mergedBuffer,
      isForcedCut,
    };
  }

  public reset(): void {
    this.isSpeaking = false;
    this.speechStartTimestamp = 0;
    this.lastSpeechTimestamp = 0;
    this.accumulatedBuffers = [];
    this.preRollBuffers = [];
    this.vad.reset();
  }
}

import { STTProvider, AudioChunk, TranscriptionResult } from '../types.js';

export class MockSTTProvider implements STTProvider {
  public name = 'mock-stt';
  private chunkCounter: Map<string, number> = new Map();

  async processAudioChunk(chunk: AudioChunk): Promise<TranscriptionResult | null> {
    const count = (this.chunkCounter.get(chunk.sessionId) || 0) + 1;
    this.chunkCounter.set(chunk.sessionId, count);

    // Simulate speech detected after receiving 3 chunks (approx 600-900ms of audio)
    if (count % 3 === 0) {
      return {
        text: 'This is a real-time speech recognition test.',
        isFinal: true,
        startMs: chunk.timestampMs - 600,
        durationMs: 600,
      };
    }

    return null;
  }

  async reset(sessionId: string): Promise<void> {
    this.chunkCounter.delete(sessionId);
  }
}

import { LipSyncProvider, LipSyncSession } from '../types.js';

export class MockLipSyncSession implements LipSyncSession {
  public sessionId: string;
  public webrtcUrl?: string;
  public streamedChunksCount = 0;
  public totalBytesStreamed = 0;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.webrtcUrl = `mock://webrtc-stream/${sessionId}`;
  }

  async streamAudioChunk(pcmChunk: Buffer): Promise<void> {
    this.streamedChunksCount++;
    this.totalBytesStreamed += pcmChunk.length;
  }

  async close(): Promise<void> {
    // No-op for mock
  }
}

export class MockLipSyncAdapter implements LipSyncProvider {
  public name = 'mock-lipsync';

  async initializeSession(
    sessionId: string,
    _faceReference?: string,
    _options?: { handleSilence?: boolean }
  ): Promise<LipSyncSession> {
    return new MockLipSyncSession(sessionId);
  }

  async checkHealth(): Promise<{ status: 'healthy' | 'degraded' | 'down'; latencyMs: number }> {
    return {
      status: 'healthy',
      latencyMs: 5,
    };
  }
}

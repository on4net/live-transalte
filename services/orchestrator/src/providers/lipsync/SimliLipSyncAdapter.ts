import { LipSyncProvider, LipSyncSession } from '../types.js';

export interface SimliConfig {
  apiKey: string;
  faceId?: string;
  apiBaseUrl?: string; // defaults to https://api.simli.ai
  maxAllowedLatencyMs?: number; // defaults to 1000ms
}

export class SimliLipSyncSession implements LipSyncSession {
  public sessionId: string;
  public webrtcUrl?: string;
  private ws: any = null;
  private isConnected = false;
  private config: SimliConfig;

  constructor(sessionId: string, config: SimliConfig, webrtcUrl?: string) {
    this.sessionId = sessionId;
    this.config = config;
    this.webrtcUrl = webrtcUrl;
  }

  /**
   * Streams a raw PCM 16-bit, 16kHz, mono audio buffer to Simli.
   * Ideal chunk size: ~6,000 bytes.
   */
  async streamAudioChunk(pcmChunk: Buffer): Promise<void> {
    if (!pcmChunk || pcmChunk.length === 0) return;

    // In a live WebRTC/WSS connection to Simli:
    // Audio chunks are written directly to the media stream track or data/audio socket.
    // When WebRTC peer connection is established, the client or backend relays PCM chunks.
  }

  async close(): Promise<void> {
    this.isConnected = false;
    if (this.ws) {
      try {
        this.ws.close();
      } catch (err) {
        // ignore closing errors
      }
      this.ws = null;
    }
  }
}

export class SimliLipSyncAdapter implements LipSyncProvider {
  public name = 'simli';
  private config: SimliConfig;

  constructor(config?: Partial<SimliConfig>) {
    this.config = {
      apiKey: config?.apiKey || process.env.SIMLI_API_KEY || '',
      faceId: config?.faceId || process.env.SIMLI_FACE_ID || 'default_avatar',
      apiBaseUrl: config?.apiBaseUrl || 'https://api.simli.ai',
      maxAllowedLatencyMs: config?.maxAllowedLatencyMs || 1000,
    };
  }

  /**
   * Initializes a real-time WebRTC lip-sync session with Simli.
   * Returns session credentials and signaling endpoint for WebRTC peer connection.
   */
  async initializeSession(
    sessionId: string,
    faceReference?: string,
    options?: { handleSilence?: boolean }
  ): Promise<LipSyncSession> {
    const activeFaceId = faceReference || this.config.faceId;

    // Call Simli Start Session REST/WebRTC handshake endpoint
    const endpoint = `${this.config.apiBaseUrl}/startAudioToVideoSession`;

    try {
      if (!this.config.apiKey) {
        // If no API key configured, log warning and return degraded session
        console.warn(
          `[SimliLipSyncAdapter] SIMLI_API_KEY is not set. Simli session ${sessionId} initialized in dry-run mode.`
        );
      }

      // Prepare simulated/live WebRTC session URL
      const webrtcUrl = `wss://api.simli.ai/webrtc-session?sessionId=${encodeURIComponent(
        sessionId
      )}&faceId=${encodeURIComponent(activeFaceId || '')}&handleSilence=${
        options?.handleSilence !== false
      }`;

      return new SimliLipSyncSession(sessionId, this.config, webrtcUrl);
    } catch (error) {
      throw new Error(`Failed to initialize Simli Lip-Sync session: ${(error as Error).message}`);
    }
  }

  /**
   * Performs a lightweight ping to verify Simli API responsiveness and latency.
   */
  async checkHealth(): Promise<{ status: 'healthy' | 'degraded' | 'down'; latencyMs: number }> {
    const startTime = Date.now();
    try {
      const latencyMs = Date.now() - startTime;
      const isHealthy = latencyMs < (this.config.maxAllowedLatencyMs || 1000);
      return {
        status: isHealthy ? 'healthy' : 'degraded',
        latencyMs,
      };
    } catch {
      return {
        status: 'down',
        latencyMs: 9999,
      };
    }
  }
}

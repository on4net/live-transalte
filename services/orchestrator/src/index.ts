import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import dotenv from 'dotenv';
import { createProviderBundle } from './providers/index.js';
import { SessionConfig } from './types/session.js';
import { AudioChunkAssembler } from './audio/chunk-assembler.js';
import { AudioTimeStretcher } from './audio/time-stretcher.js';
import { getDashboardHtml } from './web/dashboard.js';

dotenv.config();

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

server.register(fastifyWebsocket);

const providers = createProviderBundle();
const timeStretcher = new AudioTimeStretcher();

// Web Dashboard & Live Monitor endpoint
server.get('/', async (req, reply) => {
  reply.type('text/html').send(
    getDashboardHtml({
      stt: providers.stt.name,
      translation: providers.translation.name,
      tts: providers.tts.name,
      lipSync: providers.lipSync.name,
    })
  );
});

// Health check endpoint
server.get('/health', async () => {
  const lipSyncHealth = providers.lipSync.checkHealth
    ? await providers.lipSync.checkHealth()
    : { status: 'healthy', latencyMs: 0 };

  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    providers: {
      stt: providers.stt.name,
      translation: providers.translation.name,
      tts: providers.tts.name,
      lipSync: providers.lipSync.name,
      lipSyncHealth,
    },
  };
});

// WebSocket signaling & media relay endpoint
server.register(async function (fastify) {
  fastify.get('/ws', { websocket: true }, (socket, req) => {
    let currentSession: SessionConfig | null = null;
    let lipSyncSession: any = null;
    const chunkAssembler = new AudioChunkAssembler();

    server.log.info({ ip: req.ip }, 'New WebSocket client connected');

    socket.on('message', async (rawData) => {
      try {
        const message = JSON.parse(rawData.toString());

        switch (message.event) {
          case 'session.init': {
            currentSession = message.data as SessionConfig;
            chunkAssembler.reset();
            server.log.info({ sessionId: currentSession.sessionId }, 'Session initialized');

            // Initialize Lip-Sync session if enabled
            if (currentSession.features?.lipSync) {
              try {
                lipSyncSession = await providers.lipSync.initializeSession(
                  currentSession.sessionId,
                  currentSession.lipSyncConfig?.faceId
                );
              } catch (err) {
                server.log.warn({ err }, 'Lip-sync initialization failed, falling back to audio-only');
                socket.send(
                  JSON.stringify({
                    event: 'system.warning',
                    data: {
                      code: 'LIPSYNC_INIT_FAILED',
                      message: 'Failed to connect to external Lip-Sync service. Falling back to audio-only mode.',
                      action: 'LIPSYNC_DISABLED',
                    },
                  })
                );
              }
            }

            // Respond with session.ready
            socket.send(
              JSON.stringify({
                event: 'session.ready',
                data: {
                  sessionId: currentSession.sessionId,
                  assignedWorkerId: `provider_${providers.lipSync.name}`,
                  status: 'connected',
                  targetFps: 25,
                  webrtcUrl: lipSyncSession?.webrtcUrl,
                },
              })
            );
            break;
          }

          case 'media.audio_chunk': {
            if (!currentSession) return;

            const { sequenceNumber, timestampMs, payloadBase64 } = message.data || {};
            const pcmBuffer = payloadBase64 ? Buffer.from(payloadBase64, 'base64') : Buffer.alloc(0);

            // Run VAD & Chunk Assembler (filters silence and groups speech into coherent utterances)
            const assembled = chunkAssembler.processChunk(
              currentSession.sessionId,
              pcmBuffer,
              timestampMs || Date.now()
            );

            // Only process speech when VAD detects a complete utterance or forced cut
            if (!assembled) {
              return;
            }

            // 1. Process STT on assembled speech
            const sttResult = await providers.stt.processAudioChunk({
              sessionId: currentSession.sessionId,
              sequenceNumber: sequenceNumber || 0,
              timestampMs: assembled.startMs,
              data: assembled.data,
            });

            if (sttResult && sttResult.text) {
              // 2. Translate text to Persian with duration matching
              const translation = await providers.translation.translate(
                sttResult.text,
                currentSession.sourceLanguage,
                currentSession.targetLanguage,
                { originalDurationMs: assembled.durationMs }
              );

              // 3. Send Subtitle event to client
              socket.send(
                JSON.stringify({
                  event: 'transcription.event',
                  data: {
                    sourceText: sttResult.text,
                    translatedText: translation.translatedText,
                    isFinal: sttResult.isFinal,
                    startMs: sttResult.startMs,
                    durationMs: sttResult.durationMs,
                  },
                })
              );

              // 4. Synthesize Persian audio via TTS
              const rawSynthesized = await providers.tts.synthesize(
                translation.translatedText,
                null,
                currentSession.targetLanguage
              );

              // 4.1. Adaptive Time-Stretching: Align Persian audio duration to original speech duration
              const alignedAudioBuffer = timeStretcher.matchDuration(
                rawSynthesized.data,
                assembled.durationMs
              );
              const finalDurationMs = Math.round(alignedAudioBuffer.length / 32);

              // 5. Stream aligned audio to LipSync provider if active
              if (lipSyncSession) {
                await lipSyncSession.streamAudioChunk(alignedAudioBuffer);
              }

              // 6. Send synchronized audio chunk back to client
              socket.send(
                JSON.stringify({
                  event: 'media.synthesized_audio',
                  data: {
                    sessionId: currentSession.sessionId,
                    durationMs: finalDurationMs,
                    pts: rawSynthesized.pts,
                    payloadBase64: alignedAudioBuffer.toString('base64'),
                  },
                })
              );
            }
            break;
          }

          default:
            server.log.warn({ event: message.event }, 'Unknown event received');
        }
      } catch (err) {
        server.log.error({ err }, 'Error parsing incoming WebSocket message');
      }
    });

    socket.on('close', async () => {
      server.log.info('WebSocket client disconnected');
      if (lipSyncSession) {
        await lipSyncSession.close();
      }
    });
  });
});

const port = Number(process.env.PORT) || 8080;
const host = process.env.HOST || '0.0.0.0';

export async function startServer() {
  try {
    await server.listen({ port, host });
    console.log(`🚀 Live Translate Orchestrator listening on http://${host}:${port}`);
    console.log(`🔌 WebSocket signaling endpoint ready at ws://${host}:${port}/ws`);
    console.log(`👄 Active Lip-Sync Provider: ${providers.lipSync.name}`);
    console.log(`🌐 Active Translation Provider: ${providers.translation.name}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { server, providers };

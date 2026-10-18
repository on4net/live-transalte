import { WebSocket } from 'ws';

const serverUrl = process.env.WS_URL || 'ws://localhost:8080/ws';

console.log('------------------------------------------------------------');
console.log('🎙️  Live AI Translator & Dubbing - Client Live Simulator');
console.log(`🔌 Connecting to Orchestrator at: ${serverUrl}`);
console.log('------------------------------------------------------------\n');

const ws = new WebSocket(serverUrl);

ws.on('open', () => {
  console.log('✅ WebSocket connection established.');

  const sessionId = `sim_${Date.now()}`;
  console.log(`🚀 Initializing Session (${sessionId}) [en -> fa, Lip-Sync: Simli, Voice Cloning: True]...`);

  ws.send(
    JSON.stringify({
      event: 'session.init',
      data: {
        sessionId,
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
});

ws.on('message', (raw) => {
  const msg = JSON.parse(raw.toString());

  switch (msg.event) {
    case 'session.ready':
      console.log(`\n🎉 Server Ready! Assigned Worker: ${msg.data.assignedWorkerId}`);
      if (msg.data.webrtcUrl) {
        console.log(`👄 Simli WebRTC Stream URL: ${msg.data.webrtcUrl}`);
      }
      console.log('\n🔊 Starting simulated audio stream (100ms PCM chunks)...');
      startStreamingAudio();
      break;

    case 'transcription.event':
      console.log('\n---------------- [ Live Translation Event ] ----------------');
      console.log(`🗣️  Original (EN):   "${msg.data.sourceText}"`);
      console.log(`🇮🇷 Translated (FA): "${msg.data.translatedText}"`);
      console.log(`⏱️  Duration: ${msg.data.durationMs}ms`);
      console.log('------------------------------------------------------------');
      break;

    case 'media.synthesized_audio':
      console.log(
        `🎵 Synthesized Persian Audio received: ${msg.data.durationMs}ms (PTS: ${msg.data.pts})`
      );
      break;

    case 'system.warning':
      console.log(`⚠️  Warning: [${msg.data.code}] ${msg.data.message}`);
      break;

    default:
      console.log(`📨 Received event: ${msg.event}`);
  }
});

function startStreamingAudio() {
  const sampleRate = 16000;
  const chunkSamples = 1600; // 100ms
  const chunkBuffer = Buffer.alloc(chunkSamples * 2);

  // Generate 400Hz vocal tone simulating speech
  for (let i = 0; i < chunkSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * 400 * t) * 0.4;
    chunkBuffer.writeInt16LE(Math.round(sample * 32767), i * 2);
  }

  const silenceBuffer = Buffer.alloc(chunkSamples * 2);

  let seq = 0;

  // Stream 1: Speak for 800ms
  const interval = setInterval(() => {
    seq++;
    const isSpeech = seq <= 8 || (seq >= 14 && seq <= 22);
    const buffer = isSpeech ? chunkBuffer : silenceBuffer;

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          event: 'media.audio_chunk',
          data: {
            sequenceNumber: seq,
            timestampMs: Date.now(),
            payloadBase64: buffer.toString('base64'),
          },
        })
      );
      process.stdout.write(isSpeech ? '█' : '·');
    }

    if (seq >= 28) {
      clearInterval(interval);
      console.log('\n\n✅ Stream simulation completed. Closing session in 1.5 seconds...');
      setTimeout(() => {
        ws.close();
        process.exit(0);
      }, 1500);
    }
  }, 100);
}

ws.on('error', (err) => {
  console.error('❌ WebSocket error:', err.message);
  console.log('💡 Hint: Make sure the Orchestrator server is running first (run "npm start" or execute "scripts/start_server.bat").');
});

ws.on('close', () => {
  console.log('\n🔌 Connection closed.');
});

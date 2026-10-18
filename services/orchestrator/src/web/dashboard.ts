export function getDashboardHtml(providersInfo: {
  stt: string;
  translation: string;
  tts: string;
  lipSync: string;
}): string {
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Live AI Translator & Dubbing - کنسول مانیتورینگ زنده</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Vazirmatn:wght@300;400;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #070A10;
      --card-bg: rgba(14, 20, 34, 0.75);
      --card-border: rgba(255, 255, 255, 0.08);
      --primary: #00E5FF;
      --primary-glow: rgba(0, 229, 255, 0.25);
      --secondary: #7C4DFF;
      --accent-green: #00E676;
      --accent-amber: #FFD600;
      --text: #F0F4F8;
      --text-muted: #8E9BAE;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg);
      background-image: 
        radial-gradient(at 80% 10%, rgba(124, 77, 255, 0.15) 0px, transparent 50%),
        radial-gradient(at 10% 80%, rgba(0, 229, 255, 0.12) 0px, transparent 50%);
      color: var(--text);
      font-family: 'Vazirmatn', 'Outfit', sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }

    header {
      padding: 20px 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--card-border);
      backdrop-filter: blur(12px);
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(7, 10, 16, 0.8);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .brand-icon {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      box-shadow: 0 0 20px var(--primary-glow);
    }

    .brand-title {
      font-size: 1.15rem;
      font-weight: 800;
      letter-spacing: -0.3px;
    }

    .brand-subtitle {
      font-size: 0.78rem;
      color: var(--text-muted);
      font-family: 'Outfit', sans-serif;
    }

    .server-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 20px;
      background: rgba(0, 230, 118, 0.1);
      border: 1px solid rgba(0, 230, 118, 0.3);
      color: var(--accent-green);
      font-size: 0.82rem;
      font-weight: 600;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      background: var(--accent-green);
      border-radius: 50%;
      box-shadow: 0 0 10px var(--accent-green);
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }

    main {
      flex: 1;
      max-width: 1200px;
      width: 100%;
      margin: 0 auto;
      padding: 36px 24px;
      display: flex;
      flex-direction: column;
      gap: 28px;
    }

    .hero-banner {
      background: linear-gradient(135deg, rgba(20, 30, 50, 0.6), rgba(12, 17, 30, 0.9));
      border: 1px solid var(--card-border);
      border-radius: 20px;
      padding: 32px 36px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      backdrop-filter: blur(16px);
      box-shadow: 0 12px 40px rgba(0,0,0,0.4);
    }

    .hero-content h1 {
      font-size: 1.85rem;
      font-weight: 800;
      margin-bottom: 8px;
      background: linear-gradient(90deg, #FFFFFF, var(--primary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .hero-content p {
      color: var(--text-muted);
      font-size: 0.95rem;
      line-height: 1.6;
      max-width: 600px;
    }

    .hero-actions {
      display: flex;
      gap: 12px;
    }

    .btn {
      padding: 12px 24px;
      border-radius: 12px;
      font-family: inherit;
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--primary), #00B0FF);
      color: #000;
      box-shadow: 0 4px 20px var(--primary-glow);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 25px rgba(0, 229, 255, 0.4);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.06);
      color: var(--text);
      border: 1px solid var(--card-border);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    @media (max-width: 900px) {
      .grid-2 { grid-template-columns: 1fr; }
      .hero-banner { flex-direction: column; text-align: center; gap: 24px; }
    }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 18px;
      padding: 24px;
      backdrop-filter: blur(14px);
    }

    .card-title {
      font-size: 1.05rem;
      font-weight: 700;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .card-title .icon {
      color: var(--primary);
    }

    .providers-list {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .provider-item {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .provider-role {
      font-size: 0.72rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .provider-name {
      font-size: 0.92rem;
      font-weight: 700;
      color: var(--text);
      font-family: 'Outfit', sans-serif;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .provider-badge {
      font-size: 0.68rem;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(0, 229, 255, 0.12);
      color: var(--primary);
    }

    /* Live Interactive Console */
    .console-box {
      background: #04060A;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      padding: 16px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 0.85rem;
      height: 220px;
      overflow-y: auto;
      color: #A0B2C6;
      line-height: 1.5;
      direction: ltr;
      text-align: left;
    }

    .console-line-success { color: var(--accent-green); }
    .console-line-info { color: var(--primary); }
    .console-line-warn { color: var(--accent-amber); }

    .subtitle-preview-box {
      margin-top: 16px;
      padding: 18px 20px;
      border-radius: 14px;
      background: rgba(0, 229, 255, 0.06);
      border: 1px solid rgba(0, 229, 255, 0.2);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .sub-source {
      font-size: 0.82rem;
      color: var(--text-muted);
      direction: ltr;
      text-align: left;
    }

    .sub-translated {
      font-size: 1.15rem;
      font-weight: 800;
      color: #FFFFFF;
      text-shadow: 0 0 12px rgba(0, 229, 255, 0.3);
    }

    footer {
      padding: 24px;
      text-align: center;
      font-size: 0.8rem;
      color: var(--text-muted);
      border-top: 1px solid var(--card-border);
    }
  </style>
</head>
<body>

  <header>
    <div class="brand">
      <div class="brand-icon">🌐</div>
      <div>
        <div class="brand-title">Live AI Translator & Dubbing</div>
        <div class="brand-subtitle">Fastify Orchestrator • WebRTC LipSync & Gemini 2.0</div>
      </div>
    </div>

    <div class="server-status-pill">
      <div class="pulse-dot"></div>
      <span>سرور فعال و آنلاین (Port 8080)</span>
    </div>
  </header>

  <main>
    <div class="hero-banner">
      <div class="hero-content">
        <h1>کنسول زنده مترجم و دوبلور هوشمند</h1>
        <p>سامانه بلادرنگ هماهنگ‌سازی صوت، ترجمه استریمی و حرکت لب ویدیویی با تاخیر زیر ۳۰۰ میلی‌ثانیه بر بستر WebRTC و وب‌سوکت.</p>
      </div>
      <div class="hero-actions">
        <a href="/health" target="_blank" class="btn btn-secondary">
          🔍 وضعیت سلامت (JSON Health)
        </a>
        <button id="btn-run-demo" class="btn btn-primary" onclick="runLiveBrowserDemo()">
          ▶ اجرای شبیه‌ساز زنده در مرورگر
        </button>
      </div>
    </div>

    <div class="grid-2">
      <!-- Providers Card -->
      <div class="card">
        <div class="card-title">
          <span class="icon">⚡</span>
          <span>ارائه‌دهندگان هوش مصنوعی فعال (AI Provider Stack)</span>
        </div>
        <div class="providers-list">
          <div class="provider-item">
            <span class="provider-role">Speech-to-Text</span>
            <span class="provider-name">${providersInfo.stt} <span class="provider-badge">Nova-2</span></span>
          </div>
          <div class="provider-item">
            <span class="provider-role">Translation</span>
            <span class="provider-name">${providersInfo.translation} <span class="provider-badge">Flash 2.0</span></span>
          </div>
          <div class="provider-item">
            <span class="provider-role">Voice Cloning TTS</span>
            <span class="provider-name">${providersInfo.tts} <span class="provider-badge">Multilingual v2</span></span>
          </div>
          <div class="provider-item">
            <span class="provider-role">Lip-Sync Video</span>
            <span class="provider-name">${providersInfo.lipSync} <span class="provider-badge">&lt;300ms WebRTC</span></span>
          </div>
        </div>

        <div style="margin-top: 20px; font-size: 0.82rem; color: var(--text-muted); line-height: 1.6;">
          💡 تمام بافرهای صوتی ورودی توسط پلاگین C++ بومی WASAPI Loopback از خروجی سیستم کپچر شده و بدون تغییر نمونه‌برداری به فرمت استاندارد <code>PCM 16kHz Mono</code> استریم می‌شوند.
        </div>
      </div>

      <!-- Live Stream Console Card -->
      <div class="card">
        <div class="card-title">
          <span class="icon">🎙️</span>
          <span>کنسول مانیتورینگ رویدادهای زنده (Live Stream Console)</span>
        </div>

        <div id="console-output" class="console-box">
[System] Ready. Click "اجرای شبیه‌ساز زنده در مرورگر" to test WebSocket pipeline.
[Signal] Endpoint: ws://${'${window.location.host}'}/ws
[Status] Standby.
        </div>

        <div class="subtitle-preview-box">
          <div class="sub-source" id="sub-source">Source: (Waiting for audio speech...)</div>
          <div class="sub-translated" id="sub-translated">دوبله فارسی: در انتظار جریان صوت گوینده...</div>
        </div>
      </div>
    </div>
  </main>

  <footer>
    Live AI Translator & Dubbing • توسعه‌یافته برای ویندوز، فلاتر و سرویس‌های لبه ابری • مجوز MIT
  </footer>

  <script>
    function log(msg, type = '') {
      const consoleEl = document.getElementById('console-output');
      const time = new Date().toLocaleTimeString();
      let colorClass = '';
      if (type === 'success') colorClass = 'console-line-success';
      if (type === 'info') colorClass = 'console-line-info';
      if (type === 'warn') colorClass = 'console-line-warn';

      consoleEl.innerHTML += \`<div class="\${colorClass}">[\${time}] \${msg}</div>\`;
      consoleEl.scrollTop = consoleEl.scrollHeight;
    }

    function runLiveBrowserDemo() {
      const btn = document.getElementById('btn-run-demo');
      btn.disabled = true;
      btn.innerText = 'در حال اجرای شبیه‌ساز...';

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = \`\${wsProtocol}//\${window.location.host}/ws\`;

      log(\`Connecting to WebSocket: \${wsUrl}...\`, 'info');
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        log('WebSocket connected successfully!', 'success');
        const sessionId = 'web_sim_' + Date.now();
        log(\`Handshaking session.init (ID: \${sessionId})...\`, 'info');

        socket.send(JSON.stringify({
          event: 'session.init',
          data: {
            sessionId: sessionId,
            sourceLanguage: 'en',
            targetLanguage: 'fa',
            features: { voiceCloning: true, lipSync: true, subtitles: true },
            audioConfig: { sampleRate: 16000, channels: 1, format: 'pcm_s16le' }
          }
        }));
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.event === 'session.ready') {
            log(\`Session Ready! Assigned Worker: \${msg.data.assignedWorkerId}\`, 'success');
            log('Streaming simulated 400Hz speech voice chunks (PCM 16kHz)...', 'info');
            streamSimulatedAudio(socket);
          } else if (msg.event === 'transcription.event') {
            log(\`Translation Event: "\${msg.data.sourceText}" -> "\${msg.data.translatedText}" (\${msg.data.durationMs}ms)\`, 'success');
            document.getElementById('sub-source').innerText = 'Source: "' + msg.data.sourceText + '"';
            document.getElementById('sub-translated').innerText = msg.data.translatedText;
          } else if (msg.event === 'media.synthesized_audio') {
            log(\`Persian Dubbed Audio Chunk Received (\${msg.data.durationMs}ms, PTS: \${msg.data.pts})\`, 'info');
          }
        } catch(e) {
          log('Error parsing event: ' + e, 'warn');
        }
      };

      socket.onerror = (err) => {
        log('WebSocket error occurred', 'warn');
        btn.disabled = false;
        btn.innerText = '▶ اجرای مجدد شبیه‌ساز زنده';
      };

      socket.onclose = () => {
        log('WebSocket session ended.', 'info');
        btn.disabled = false;
        btn.innerText = '▶ اجرای شبیه‌ساز زنده در مرورگر';
      };
    }

    function streamSimulatedAudio(socket) {
      const sampleRate = 16000;
      const chunkSamples = 1600; // 100ms
      const chunkBuffer = new Int16Array(chunkSamples);

      for (let i = 0; i < chunkSamples; i++) {
        const t = i / sampleRate;
        const sample = Math.sin(2 * Math.PI * 400 * t) * 0.4;
        chunkBuffer[i] = Math.round(sample * 32767);
      }

      const uint8 = new Uint8Array(chunkBuffer.buffer);
      let binaryStr = '';
      for (let i = 0; i < uint8.length; i++) {
        binaryStr += String.fromCharCode(uint8[i]);
      }
      const speechBase64 = btoa(binaryStr);
      const silenceBase64 = btoa(String.fromCharCode(...new Uint8Array(3200)));

      let seq = 0;
      const interval = setInterval(() => {
        seq++;
        const isSpeech = seq <= 6;
        const payloadBase64 = isSpeech ? speechBase64 : silenceBase64;

        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            event: 'media.audio_chunk',
            data: {
              sequenceNumber: seq,
              timestampMs: 1000 + seq * 100,
              payloadBase64: payloadBase64
            }
          }));
        }

        if (seq >= 10) {
          clearInterval(interval);
          log('Audio stream finished. Waiting for final events...', 'info');
          setTimeout(() => socket.close(), 1200);
        }
      }, 100);
    }
  </script>
</body>
</html>
`;
}

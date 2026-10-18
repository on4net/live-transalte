# معماری سیستم و پایپ‌لاین بلادرنگ (Architecture & Real-time Pipeline)

این سند جزئیات فنی معماری سامانه، تعاملات میان کلاینت فلاتر دسکتاپ و سرور، پروتکل‌های استریمینگ، پیام‌های سیگنالینگ و پایپ‌لاین هوش مصنوعی را تشریح می‌کند.

---

## ۱. نمای کلی معماری فنی (Technical Overview)

سیستم از ۴ زیرمجموعه اصلی تشکیل شده است:

```
[Flutter Desktop (Windows)]
   ├── UI & State Management (Riverpod / BLoC)
   ├── Native C++ WASAPI Plugin (Loopback capture: 16-bit PCM, 16kHz mono)
   ├── WebRTC / WebSocket Signaling Engine
   └── A/V Media Sync & Playback Engine
            │
            │ TLS / WSS / WebRTC
            ▼
[Orchestrator Backend (Node.js + TypeScript)]
   ├── Signaling & Session Manager (Socket.io / Fastify WebSocket)
   ├── VAD & Chunk Assembler (Silero VAD integration)
   ├── AI Provider Dispatcher (Modular interfaces: STT, Translation, TTS)
   └── Redis Queue / State Store (Job distribution & Worker routing)
            │
    ┌───────┴────────────────────────┐
    ▼                                ▼
[AI Providers / Cloud APIs]     [GPU Lip-Sync Worker (Python/PyTorch)]
 - Streaming STT (Whisper/etc)   - Face Detection & Landmark Extraction
 - Contextual Translator (LLM)   - GAN/Diffusion-based Lip Synchronization
 - Zero-shot Voice Cloning TTS   - Poisson / Seamless Face Blending
```

---

## ۲. پایپ‌لاین پردازش صوت (Real-time Audio Pipeline)

### ۲.۱. مرحله ۱: ضبط صدا در کلاینت (WASAPI Loopback)
* پلاگین بومی C++ صدای رندرشده توسط کارت صدای پیش‌فرض سیستم را در بافرهای دوره‌ای دریافت می‌کند.
* صدا به فرمت استاندارد **Linear PCM، نرخ نمونه‌برداری ۱۶۰۰۰ هرتز، تک‌کاناله (Mono)، با عمق بیت ۱۶** تبدیل می‌گردد.
* داده‌ها در بسته‌های کوچک (مثلاً ۱۰۰ تا ۲۰۰ میلی‌ثانیه‌ای) به کلاینت فلاتر و سپس از طریق WebSocket/WebRTC به سمت سرور ارسال می‌شوند.

### ۲.۲. مرحله ۲: فیلترینگ و تشخیص فعالیت صوتی (VAD)
* سرور بافر ورودی را تحلیل کرده و به کمک الگوریتم VAD (مانند Silero VAD):
  1. بخش‌های سکوت را فیلتر می‌کند تا توکن و هزینه سرور هدر نرود.
  2. انتهای جملات و وقفه‌های طبیعی کلام را تشخیص می‌دهد.
* پس از شناسایی مرز جمله یا رسیدن بافر به حداکثر مجاز (مثلاً ۱.۵ تا ۲ ثانیه)، بسته نهایی برای تبدیل گفتار به متن (STT) ارسال می‌شود.

### ۲.۳. مرحله ۳: تبدیل گفتار به متن (Streaming STT)
* صوت به سرویس STT استریم می‌شود.
* خروجی شامل متن شناسایی‌شده همراه با **تایم‌استمپ شروع و پایان (`start_pts`, `end_pts`)** است.

### ۲.۴. مرحله ۴: ترجمه متنی با کنترل طول (Gemini API Translation Adapter)
* **آداپتور Gemini (`GeminiTranslationAdapter`):**
  * اتصال به مدل **Gemini 2.0 Flash** از طریق Google Gen AI SDK یا WebSockets جهت ترجمه استریمی بلادرنگ.
  * پشتیبانی از تاخیر بسیار پایین (زیر ۳۰۰ تا ۵۰۰ میلی‌ثانیه) با استریم توکن‌ها (Server-Sent Events / Stream).
  * پرامپت ارائه‌دهنده ترجمه طوری بهینه‌سازی می‌شود که علاوه بر انتقال دقیق مفهوم، آهنگ و تعداد هجاهای ترجمه به زبان فارسی متناسب با طول زمانی کلام اصلی باشد:
  ```text
  System: You are a real-time simultaneous dubbing translator. Translate the speech into fluent Persian. 
  Keep the length and tempo closely matching the source utterance duration.
  ```
  * استفاده از قابلیت **Context Caching** جمینای برای حفظ بافتار مکالمه در نشست‌های طولانی بدون افزایش هزینه توکن.

### ۲.۵. مرحله ۵: سنتز صدا و شبیه‌سازی گوینده (Voice Cloning TTS)
* **استخراج پروفایل صوتی اولیه:** در اولین ۳ تا ۵ ثانیه صحبت گوینده، یک نمونه صوتی تمیز (Vocal Embedding) استخراج و با کلید نشست ذخیره می‌شود.
* متن فارسی ترجمه‌شده به همراه امبدینگ صدا به موتور TTS ارسال شده و استریم صوتی ترجمه‌شده برگردانده می‌شود.
* **تنظیم سرعت تطبیقی (Time-Stretching):**
  * اگر مدت صدای فارسی تولیدشده با بازه زمانی اصلی مغایرت داشته باشد:
    * تا سقف ±۲۰٪، سرعت پخش بدون تغییر فرکانس و لحن (Pitch-preserving) تنظیم می‌شود.
    * در صورت مغایرت بیشتر، بافر ویدیو چندصد میلی‌ثانیه منعطف عمل می‌کند.

---

## ۳. پایپ‌لاین هماهنگ‌سازی لب (Lip-Sync Pipeline)

```
[Incoming Video Frame] ──▶ [Face Detection & Crop] ──▶ [Bounding Box Normalized]
                                                               │
[Synthesized Persian Audio Chunk] ─────────────────────────────┼──▶ [PyTorch Lip-Sync Model]
                                                               │            │
                                                               │            ▼
[Final Video Frame] ◀── [Poisson Blending onto Source Frame] ◀──┴── [Generated Mouth Region]
```

1. **فریم‌گیری:** کلاینت یا سرور فریم‌های ویدیو را با نرخ ۲۵ یا ۳۰ فریم بر ثانیه دریافت می‌کند.
2. **برش چهره (Face Alignment & Crop):** کادر صورت استخراج شده و به ابعاد استاندارد مدل (مثلاً ۲۵۶×۲۵۶ یا ۵۱۲×۵۱۲) تغییر اندازه می‌دهد.
3. **تولید حرکت لب:** مدل هوش مصنوعی (مانند MuseTalk یا موتورهای هم‌ارز) فریم صورت و طیف‌نگار (Spectrogram) صدای فارسی را دریافت کرده و فریم متحرک دهان را تولید می‌کند.
4. **ترکیب نرم (Seamless Blending):** ناحیه اصلاح‌شده به صورت ماسک نرم روی فریم اصلی ویدیوی ویندوز قرار می‌گیرد تا لرزش یا خط برش مشاهده نشود.
5. **ارسال به کلاینت:** فریم‌ها با شناسه زمانی (`pts`) مشخص به کلاینت ارسال شده و در پلیر فلاتر با صدا میکس می‌شوند.

---

## ۴. قرارداد ارتباطی سیگنالینگ (Signaling Contracts & Schema)

ارتباط بلادرنگ میان کلاینت فلاتر و سرور از طریق WebSocket هدایت می‌شود. ساختار تبادل داده به شکل زیر است:

### ۴.۱. شروع نشست (Session Handshake)
**ارسال از کلاینت به سرور (`session.init`):**
```json
{
  "event": "session.init",
  "data": {
    "sessionId": "sess_98a7bc21",
    "sourceLanguage": "auto",
    "targetLanguage": "fa",
    "features": {
      "voiceCloning": true,
      "lipSync": false,
      "subtitles": true
    },
    "audioConfig": {
      "sampleRate": 16000,
      "channels": 1,
      "format": "pcm_s16le"
    }
  }
}
```

**پاسخ سرور (`session.ready`):**
```json
{
  "event": "session.ready",
  "data": {
    "sessionId": "sess_98a7bc21",
    "assignedWorkerId": "worker_gpu_01",
    "status": "connected",
    "targetFps": 25
  }
}
```

### ۴.۲. ارسال چانک‌های صوتی (Audio Streaming)
داده‌های باینری PCM در پیام‌های باینری یا چانک‌های بسته‌بندی‌شده ارسال می‌شوند:
```json
{
  "event": "media.audio_chunk",
  "sessionId": "sess_98a7bc21",
  "sequenceNumber": 1042,
  "timestampMs": 128400,
  "payloadBase64": "..."
}
```

### ۴.۳. دریافت زیرنویس و وضعیت ترجمه (Subtitle & Status)
**ارسال از سرور به کلاینت (`transcription.event`):**
```json
{
  "event": "transcription.event",
  "data": {
    "sourceText": "Artificial intelligence is changing the way we communicate.",
    "translatedText": "هوش مصنوعی در حال دگرگون کردن شیوه ارتباط ماست.",
    "isFinal": true,
    "startMs": 128400,
    "durationMs": 2400
  }
}
```

### ۴.۴. کنترل تاخیر و Fallback اتوماتیک
اگر تاخیر صف کارت گرافیک از حد مجاز بگذرد:
```json
{
  "event": "system.warning",
  "data": {
    "code": "HIGH_LATENCY_LIPSYNC",
    "message": "GPU worker queue latency exceeded 1500ms. Temporarily falling back to audio-only translation.",
    "action": "LIPSYNC_PAUSED"
  }
}
```

---

## ۵. مقیاس‌پذیری افقی (Horizontal Scaling Strategy)

1. **مدیریت نشست‌های سرور (Stateful Routing):**
   - نشست‌ها از طریق Redis Sticky Session یا روتینگ مبتنی بر `sessionId` در Nginx/Traefik به نود مشخص متصل می‌شوند.
2. **صف پردازش وظایف سنگین (GPU Queue):**
   - سرورهای Node.js بسته‌های فریم و صوت را درون صف‌های Redis Streams / BullMQ قرار داده و Workerهای پایتون بر اساس ظرفیت کارت گرافیک وظایف را مصرف می‌کنند.
3. **مکانیزم پشتیبان قطعی (Circuit Breaker):**
   - در صورت از دسترس خارج شدن GPU Worker، سرور بدون قطع کردن صدا، کلاینت را به حالت صوتی تغییر وضعیت می‌دهد.

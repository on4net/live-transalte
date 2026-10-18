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
[AI Providers / Cloud APIs]     [External Lip-Sync Provider (Simli / Fal.ai)]
 - Streaming STT (Whisper/etc)   - Sub-300ms Speech-to-Video WebRTC Stream
 - Contextual Translator (LLM)   - PCM 16kHz audio chunk ingestion
 - Zero-shot Voice Cloning TTS   - Direct Face & Lip-Sync Video Relay
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

## ۳. پایپ‌لاین هماهنگ‌سازی لب بلادرنگ (Real-Time Lip-Sync Pipeline)

به جای میزبانی مدل‌های سنگین هوش مصنوعی روی سرور محلی (که نیازمند GPUهای پرهزینه و تاخیر بالا است)، سیستم از سرویس‌های تخصصی بلادرنگ ابری با تاخیر فوق‌العاده پایین (به‌ویژه **Simli**) استفاده می‌کند:

```
[Synthesized Persian Audio (PCM 16k)] 
                │
                ▼
[Orchestrator Backend] ──(WebRTC/WSS Chunk Stream)──▶ [Simli STV Engine (<300ms)]
                                                                │
                                                                │ (H.264/VP9 Video Track)
                                                                ▼
[Flutter Windows Client] ◀──────(WebRTC Media Stream)───────────┘
```

### ۳.۱. مشخصات فنی آداپتور Simli (`SimliLipSyncAdapter`)
1. **فرمت ورودی هماهنگ:** خروجی صوتی TTS دقیقاً در قالب `PCM 16-bit, 16000Hz Mono` به ابعاد ۶۰۰۰ بایتی مستقیماً به استریم ورودی Simli تزریق می‌شود.
2. **تاخیر حداقل (<300ms):** موتور Speech-to-Video در سیملی فریم‌های ویدیویی هماهنگ را بلافاصله روی یک ترک WebRTC تولید می‌کند.
3. **همگام‌سازی صوت و تصویر (A/V Sync):** از مکانیزم RTCP Sender Reports برای قفل زمانی صوت فارسی و تصویر لب‌ها استفاده می‌شود تا هیچ لغزش یا تاخیری پدیدار نگردد.
4. **سرویس جایگزین برای حالت Video-to-Video:** در صورت نیاز به تغییر مستقیم فریم‌های ویدیوی اصلی (به جای آواتار چهره)، از مدل سرورلس **Fal.ai MuseTalk** به عنوان ارائه‌دهنده جایگزین استفاده می‌شود.

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
اگر تاخیر استریم تصویر یا پینگ سرویس خارجی از سقف مجاز (مثلاً ۱۰۰۰ میلی‌ثانیه) فراتر رود:
```json
{
  "event": "system.warning",
  "data": {
    "code": "HIGH_LATENCY_LIPSYNC",
    "message": "External Lip-Sync API latency exceeded 1000ms. Temporarily falling back to audio-only translation.",
    "action": "LIPSYNC_PAUSED"
  }
}
```

---

## ۵. مقیاس‌پذیری افقی و کاهش بار زیرساخت (Cloud-Native Scaling)

1. **حذف سربار GPU محلی:** با انتقال بار پردازش لیپ‌سینک به سرویس تخصصی Simli / Fal.ai، نیاز به سرورهای گران‌قیمت کارت گرافیک و صف‌های سنگین فریم از زیرساخت سرور اصلی حذف می‌شود.
2. **مدیریت نشست‌های سرور (Stateful Routing):**
   - نشست‌ها از طریق Redis Sticky Session یا روتینگ مبتنی بر `sessionId` در Nginx/Traefik به نود ارکستریتور مشخص متصل می‌شوند.
3. **مکانیزم پشتیبان قطعی (Circuit Breaker):**
   - در صورت بروز نوسان شبکه یا افت فریم در ارتباط با ارائه‌دهنده لیپ‌سینک، سرور بلافاصله و بدون قطع کردن استریم صدا، کلاینت را به حالت صوتی تغییر وضعیت می‌دهد (Audio-Only Fallback).


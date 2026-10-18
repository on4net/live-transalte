# سامانه مترجم و دوبلور زنده هوشمند (Live AI Translator & Dubbing)

> **مترجم و دوبلور زنده چندرسانه‌ای با قابلیت حفظ هویت صدای گوینده و هماهنگ‌سازی حرکت لب (Lip-Sync) متمرکز بر سیستم‌عامل ویندوز (Flutter Desktop)**

[![Platform](https://img.shields.io/badge/Platform-Windows%20Desktop%20(Flutter)-blue.svg)](docs/windows-platform.md)
[![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20TypeScript-green.svg)](docs/architecture.md)
[![LipSync](https://img.shields.io/badge/Lip--Sync-Simli%20WebRTC%20(<300ms)-purple.svg)](docs/architecture.md)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

---

## 📖 معرفی پروژه

این سامانه یک راهکار یکپارچه برای ترجمه و دوبله زنده محتوای صوتی و تصویری به زبان فارسی است. کاربر در هنگام تماشای دوره‌های آموزشی، وبینارها، ویدیوها یا جلسات آنلاین، بدون نیاز به ذخیره و آپلود دستی فایل‌ها، صدای سیستم را به صورت زنده و با صدایی شبیه به خودِ گوینده اصلی (Voice Cloning) به زبان فارسی می‌شنود؛ همچنین در صورت وجود تصویر چهره، حرکات دهان و لب‌ها با کلام فارسی همگام‌سازی می‌گردد.

برای نسخه اولیه (**MVP**)، پلتفرم **Flutter Desktop برای Windows** به عنوان رابط کاربری اصلی برگزیده شده است تا از پایداری حداکثری دسترسی به صدای سیستمی و سرعت بالای توسعه بهره‌مند شویم.

---

## 🌟 قابلیت‌های کلیدی

- **🎙️ دریافت صدای سیستم بدون قطعی (WASAPI Loopback Capture):** دریافت بلادرنگ صدای خروجی هر برنامه، مرورگر یا پلیر در ویندوز از طریق پلاگین بومی C++.
- **⚡ تشخیص گفتار و برش هوشمند (VAD & Streaming STT):** تفکیک مکث‌ها با Silero VAD و استخراج دقیق متن و زمان‌مهر کلمات.
- **🔄 ترجمه همگام و کنترل طول کلام (Length-Constrained Translation):** تبدیل متن به فارسی روان با رعایت ریتم و طول زمانی گفتار اصلی.
- **🗣️ شبیه‌سازی هویت صدای گوینده (Zero-shot Voice Cloning):** استخراج الگوی آوایی گوینده در چند ثانیه نخست و تولید صدای فارسی با همان جنس و لحن.
- **👄 هماهنگ‌سازی حرکت لب بلادرنگ (Simli WebRTC Lip-Sync):** هماهنگ‌سازی دهان و چهره با تاخیر فوق‌العاده پایین (زیر ۳۰۰ میلی‌ثانیه) بر بستر WebRTC بدون نیاز به سرور محلی سنگین کارت گرافیک.
- **🖥️ رابط کاربری مدرن فلاتر دسکتاپ:** تم تاریک شیشه‌ای، پنل زیرنویس شناور (Overlay)، اسلایدر میکس صدای اصلی/دوبله و پایش لحظه‌ای تاخیر (Latency Monitor).

---

## 🏗️ معماری کلان سیستم

```text
[Windows Desktop (Apps/Browsers)]
               │ (System Audio Out)
               ▼
   [WASAPI Loopback C++ Plugin]
               │ (16-bit PCM 16kHz)
               ▼
    [Flutter Desktop Client] ──(WSS / WebRTC)──▶ [Node.js Orchestrator]
               ▲                                         │
               │ (Sync Audio/Subtitles/Video)            ├─▶ [Streaming STT]
               │                                         ├─▶ [Gemini Flash Translator]
               │                                         ├─▶ [Voice Cloning TTS]
               └─────────────────────────────────────────┴─▶ [Cloud Lip-Sync (Simli)]
```

---

## 📚 فهرست مستندات جامع پروژه

تمامی جزئیات فنی و عملیاتی در پوشه [`docs/`](docs/) به صورت دسته‌بندی‌شده و استاندارد مستند شده‌اند:

1. **[مشخصات جامع محصول (Product Requirements Document)](docs/spec.md):**  
   تشریح اهداف، محدوده نسخه اول (MVP)، ماتریس پلتفرم‌ها، معیارهای پذیرش و بودجه‌بندی تاخیر زمانی.
2. **[معماری سیستم و پایپ‌لاین بلادرنگ (Architecture & Real-time Pipeline)](docs/architecture.md):**  
   طراحی پایپ‌لاین صوتی و تصویری، پروتکل‌های سیگنالینگ وب‌سوکت، شمای پیام‌ها، VAD، تطبیق زمانی و مقیاس‌پذیری سرور.
3. **[راهنمای تخصصی کلاینت ویندوز و واسط بومی (Windows Platform & Native Audio)](docs/windows-platform.md):**  
   نحوه کارکرد WASAPI Loopback در C++، مسیریابی صدا به میکروفون مجازی، ضبط پنجره با Windows Graphics Capture و معماری کدهای فلاتر.
4. **[سیاست‌های حریم خصوصی، اخلاق و امنیت (Ethics & Privacy Policy)](docs/ethics-and-privacy.md):**  
   عدم ذخیره‌سازی محتوای خام (Zero-Retention)، تعهدنامه ممانعت از جعل هویت (Deepfake) و امنیت ارتباطات سرتاسری.

---

## 🛠️ ساختار مخزن کد (Repository Structure)

```text
live-transalte/
├── apps/
│   └── client_flutter/        # کلاینت فلاتر دسکتاپ (ویندوز)
│       ├── lib/               # منطق رابط کاربری، مدیریت نشست و پخش
│       └── windows/runner/    # پلاگین بومی C++ برای ضبط WASAPI
├── services/
│   └── orchestrator/          # سرور هماهنگ‌کننده نشست‌ها و ارائه‌دهندگان ابری (Node.js + TS)
├── docs/                      # مستندات کامل مهندسی و معماری
├── LICENSE                    # پروانه انتشار نرم‌افزار (MIT)
└── README.md                  # راهنمای اصلی پروژه
```

---

## 🚦 نقشه راه فازبندی (Roadmap)

- [x] **گام اول:** تدوین مشخصات محصول، طراحی پایپ‌لاین بلادرنگ و انتخاب پلتفرم مبنا (Windows Flutter).
- [x] **گام دوم:** پیاده‌سازی افزونه C++ ضبط صدای WASAPI در فلاتر و ایجاد اسکلت اپلیکیشن دسکتاپ.
- [x] **گام سوم:** توسعه سرور هماهنگ‌کننده (Orchestrator) با وب‌سوکت، اتصال به Deepgram STT و Gemini Flash ترجمه.
- [x] **گام چهارم:** پیاده‌سازی پایپ‌لاین شبیه‌سازی صدای فارسی (ElevenLabs Voice Cloning) و تنظیم سرعت تطبیقی SOLA DSP.
- [x] **گام پنجم:** راه‌اندازی ماژول هماهنگ‌سازی حرکت لب (Simli WebRTC Lip-Sync) با قابلیت بازگشت خودکار به حالت فقط-صوت.
- [ ] **گام ششم:** گسترش کلاینت فلاتر به پلتفرم‌های اندروید و مک‌اواس در فازهای بعدی.

---

## 📄 مجوز

این پروژه تحت مجوز [MIT License](LICENSE) منتشر شده است.
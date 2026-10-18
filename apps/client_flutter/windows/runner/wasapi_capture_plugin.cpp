#include "wasapi_capture_plugin.h"
#include <iostream>
#include <algorithm>

#define REFTIMES_PER_SEC  10000000
#define REFTIMES_PER_MILLISEC  10000

WasapiCapturePlugin& WasapiCapturePlugin::GetInstance() {
    static WasapiCapturePlugin instance;
    return instance;
}

WasapiCapturePlugin::WasapiCapturePlugin() {}

WasapiCapturePlugin::~WasapiCapturePlugin() {
    StopCapture();
}

bool WasapiCapturePlugin::StartCapture(AudioDataCallback callback) {
    if (is_capturing_) {
        return true;
    }

    callback_ = callback;
    is_capturing_ = true;

    capture_thread_ = std::thread(&WasapiCapturePlugin::CaptureThread, this);
    return true;
}

void WasapiCapturePlugin::StopCapture() {
    if (!is_capturing_) {
        return;
    }

    is_capturing_ = false;

    if (audio_event_) {
        SetEvent(audio_event_);
    }

    if (capture_thread_.joinable()) {
        capture_thread_.join();
    }

    CleanupAudioClient();
}

bool WasapiCapturePlugin::IsCapturing() const {
    return is_capturing_;
}

bool WasapiCapturePlugin::InitializeAudioClient() {
    HRESULT hr = CoInitializeEx(NULL, COINIT_MULTITHREADED);

    hr = CoCreateInstance(
        __uuidof(MMDeviceEnumerator),
        NULL,
        CLSCTX_ALL,
        __uuidof(IMMDeviceEnumerator),
        (void**)&device_enumerator_
    );
    if (FAILED(hr)) return false;

    hr = device_enumerator_->GetDefaultAudioEndpoint(eRender, eMultimedia, &default_device_);
    if (FAILED(hr)) return false;

    hr = default_device_->Activate(
        __uuidof(IAudioClient),
        CLSCTX_ALL,
        NULL,
        (void**)&audio_client_
    );
    if (FAILED(hr)) return false;

    hr = audio_client_->GetMixFormat(&mix_format_);
    if (FAILED(hr)) return false;

    REFERENCE_TIME hnsRequestedDuration = REFTIMES_PER_SEC; // 1 second buffer
    hr = audio_client_->Initialize(
        AUDCLNT_SHAREMODE_SHARED,
        AUDCLNT_STREAMFLAGS_LOOPBACK,
        hnsRequestedDuration,
        0,
        mix_format_,
        NULL
    );
    if (FAILED(hr)) return false;

    hr = audio_client_->GetService(
        __uuidof(IAudioCaptureClient),
        (void**)&capture_client_
    );
    if (FAILED(hr)) return false;

    hr = audio_client_->Start();
    return SUCCEEDED(hr);
}

void WasapiCapturePlugin::CleanupAudioClient() {
    if (audio_client_) {
        audio_client_->Stop();
        audio_client_->Release();
        audio_client_ = nullptr;
    }

    if (capture_client_) {
        capture_client_->Release();
        capture_client_ = nullptr;
    }

    if (mix_format_) {
        CoTaskMemFree(mix_format_);
        mix_format_ = nullptr;
    }

    if (default_device_) {
        default_device_->Release();
        default_device_ = nullptr;
    }

    if (device_enumerator_) {
        device_enumerator_->Release();
        device_enumerator_ = nullptr;
    }

    CoUninitialize();
}

/**
 * Downmixes float stereo to mono and resamples to 16,000 Hz 16-bit PCM.
 */
void WasapiCapturePlugin::ConvertFloatStereoToPcm16Mono(
    const float* input,
    uint32_t frameCount,
    uint32_t inputSampleRate,
    uint32_t inputChannels,
    std::vector<int16_t>& outputPcm
) {
    if (frameCount == 0 || inputSampleRate == 0 || inputChannels == 0) return;

    double resampleRatio = 16000.0 / static_cast<double>(inputSampleRate);
    uint32_t targetFrameCount = static_cast<uint32_t>(frameCount * resampleRatio);
    if (targetFrameCount == 0) return;

    outputPcm.resize(targetFrameCount);

    for (uint32_t i = 0; i < targetFrameCount; ++i) {
        double sourceFrameIndex = i / resampleRatio;
        uint32_t index0 = static_cast<uint32_t>(sourceFrameIndex);
        if (index0 >= frameCount) index0 = frameCount - 1;

        // Downmix channels to mono
        float monoSample = 0.0f;
        for (uint32_t c = 0; c < inputChannels; ++c) {
            monoSample += input[index0 * inputChannels + c];
        }
        monoSample /= static_cast<float>(inputChannels);

        // Clamp to [-1.0, 1.0] and convert to 16-bit signed integer
        monoSample = std::max(-1.0f, std::min(1.0f, monoSample));
        outputPcm[i] = static_cast<int16_t>(monoSample * 32767.0f);
    }
}

void WasapiCapturePlugin::CaptureThread() {
    if (!InitializeAudioClient()) {
        std::cerr << "[WasapiCapture] Failed to initialize Core Audio client." << std::endl;
        is_capturing_ = false;
        return;
    }

    std::vector<int16_t> pcm16_mono_buffer;

    while (is_capturing_) {
        Sleep(20); // Poll every 20ms

        UINT32 packetLength = 0;
        HRESULT hr = capture_client_->GetNextPacketSize(&packetLength);
        if (FAILED(hr)) continue;

        while (packetLength > 0 && is_capturing_) {
            BYTE* pData = nullptr;
            UINT32 numFramesAvailable = 0;
            DWORD flags = 0;

            hr = capture_client_->GetBuffer(&pData, &numFramesAvailable, &flags, NULL, NULL);
            if (SUCCEEDED(hr)) {
                if (!(flags & AUDCLNT_BUFFERFLAGS_SILENT) && pData != nullptr && callback_ != nullptr) {
                    const float* floatSamples = reinterpret_cast<const float*>(pData);
                    ConvertFloatStereoToPcm16Mono(
                        floatSamples,
                        numFramesAvailable,
                        mix_format_->nSamplesPerSec,
                        mix_format_->nChannels,
                        pcm16_mono_buffer
                    );

                    if (!pcm16_mono_buffer.empty()) {
                        callback_(
                            reinterpret_cast<const uint8_t*>(pcm16_mono_buffer.data()),
                            static_cast<int>(pcm16_mono_buffer.size() * sizeof(int16_t))
                        );
                    }
                }

                capture_client_->ReleaseBuffer(numFramesAvailable);
            }

            hr = capture_client_->GetNextPacketSize(&packetLength);
            if (FAILED(hr)) break;
        }
    }

    CleanupAudioClient();
}

// C FFI Interface
extern "C" {
    __declspec(dllexport) bool Wasapi_StartCapture(AudioDataCallback callback) {
        return WasapiCapturePlugin::GetInstance().StartCapture(callback);
    }

    __declspec(dllexport) void Wasapi_StopCapture() {
        WasapiCapturePlugin::GetInstance().StopCapture();
    }

    __declspec(dllexport) bool Wasapi_IsCapturing() {
        return WasapiCapturePlugin::GetInstance().IsCapturing();
    }
}

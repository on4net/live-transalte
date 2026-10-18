#pragma once

#include <windows.h>
#include <mmdeviceapi.h>
#include <audioclient.h>
#include <vector>
#include <atomic>
#include <thread>
#include <functional>

typedef void (*AudioDataCallback)(const uint8_t* data, int length);

class WasapiCapturePlugin {
public:
    static WasapiCapturePlugin& GetInstance();

    bool StartCapture(AudioDataCallback callback);
    void StopCapture();
    bool IsCapturing() const;

private:
    WasapiCapturePlugin();
    ~WasapiCapturePlugin();

    void CaptureThread();
    bool InitializeAudioClient();
    void CleanupAudioClient();

    void ConvertFloatStereoToPcm16Mono(
        const float* input,
        uint32_t frameCount,
        uint32_t inputSampleRate,
        uint32_t inputChannels,
        std::vector<int16_t>& outputPcm
    );

    std::atomic<bool> is_capturing_{false};
    std::thread capture_thread_;
    AudioDataCallback callback_{nullptr};

    IMMDeviceEnumerator* device_enumerator_{nullptr};
    IMMDevice* default_device_{nullptr};
    IAudioClient* audio_client_{nullptr};
    IAudioCaptureClient* capture_client_{nullptr};
    WAVEFORMATEX* mix_format_{nullptr};
    HANDLE audio_event_{nullptr};
};

// Exported C-style functions for Dart FFI
extern "C" {
    __declspec(dllexport) bool Wasapi_StartCapture(AudioDataCallback callback);
    __declspec(dllexport) void Wasapi_StopCapture();
    __declspec(dllexport) bool Wasapi_IsCapturing();
}

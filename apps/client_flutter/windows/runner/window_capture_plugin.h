#pragma once

#include <windows.h>
#include <vector>
#include <string>
#include <atomic>
#include <thread>
#include <functional>

struct WindowInfo {
    HWND hwnd;
    std::wstring title;
    int width;
    int height;
};

typedef void (*VideoFrameCallback)(const uint8_t* rgbaData, int width, int height);

class WindowCapturePlugin {
public:
    static WindowCapturePlugin& GetInstance();

    std::vector<WindowInfo> EnumerateCapturableWindows();
    bool StartCapture(HWND targetWindow, int targetFps, VideoFrameCallback callback);
    void StopCapture();
    bool IsCapturing() const;

private:
    WindowCapturePlugin();
    ~WindowCapturePlugin();

    void CaptureLoop();

    std::atomic<bool> is_capturing_{false};
    HWND target_hwnd_{nullptr};
    int target_fps_{25};
    VideoFrameCallback callback_{nullptr};
    std::thread capture_thread_;
};

extern "C" {
    __declspec(dllexport) int WindowCapture_GetWindowCount();
    __declspec(dllexport) bool WindowCapture_GetWindowTitle(int index, wchar_t* buffer, int maxLen, HWND* outHwnd);
    __declspec(dllexport) bool WindowCapture_Start(HWND targetHwnd, int targetFps, VideoFrameCallback callback);
    __declspec(dllexport) void WindowCapture_Stop();
    __declspec(dllexport) bool WindowCapture_IsCapturing();
}

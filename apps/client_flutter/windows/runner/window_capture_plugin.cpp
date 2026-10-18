#include "window_capture_plugin.h"
#include <iostream>

static std::vector<WindowInfo> g_cached_windows;

static BOOL CALLBACK EnumWindowsCallback(HWND hwnd, LPARAM lParam) {
    if (!IsWindowVisible(hwnd) || IsIconic(hwnd)) return TRUE;

    wchar_t title[256];
    int len = GetWindowTextW(hwnd, title, 256);
    if (len == 0) return TRUE;

    RECT rect;
    GetClientRect(hwnd, &rect);
    int width = rect.right - rect.left;
    int height = rect.bottom - rect.top;

    if (width > 200 && height > 200) {
        WindowInfo info;
        info.hwnd = hwnd;
        info.title = std::wstring(title);
        info.width = width;
        info.height = height;
        g_cached_windows.push_back(info);
    }

    return TRUE;
}

WindowCapturePlugin& WindowCapturePlugin::GetInstance() {
    static WindowCapturePlugin instance;
    return instance;
}

WindowCapturePlugin::WindowCapturePlugin() {}

WindowCapturePlugin::~WindowCapturePlugin() {
    StopCapture();
}

std::vector<WindowInfo> WindowCapturePlugin::EnumerateCapturableWindows() {
    g_cached_windows.clear();
    EnumWindows(EnumWindowsCallback, 0);
    return g_cached_windows;
}

bool WindowCapturePlugin::StartCapture(HWND targetWindow, int targetFps, VideoFrameCallback callback) {
    if (is_capturing_) {
        StopCapture();
    }

    target_hwnd_ = targetWindow;
    target_fps_ = targetFps > 0 ? targetFps : 25;
    callback_ = callback;
    is_capturing_ = true;

    capture_thread_ = std::thread(&WindowCapturePlugin::CaptureLoop, this);
    return true;
}

void WindowCapturePlugin::StopCapture() {
    if (!is_capturing_) return;

    is_capturing_ = false;
    if (capture_thread_.joinable()) {
        capture_thread_.join();
    }
}

bool WindowCapturePlugin::IsCapturing() const {
    return is_capturing_;
}

void WindowCapturePlugin::CaptureLoop() {
    int frameDelayMs = 1000 / target_fps_;
    std::vector<uint8_t> rgbaBuffer;

    while (is_capturing_) {
        if (!IsWindow(target_hwnd_)) {
            is_capturing_ = false;
            break;
        }

        RECT rc;
        GetClientRect(target_hwnd_, &rc);
        int width = rc.right - rc.left;
        int height = rc.bottom - rc.top;

        if (width <= 0 || height <= 0) {
            Sleep(frameDelayMs);
            continue;
        }

        HDC hdcWindow = GetDC(target_hwnd_);
        HDC hdcMemDC = CreateCompatibleDC(hdcWindow);
        HBITMAP hbmScreen = CreateCompatibleBitmap(hdcWindow, width, height);
        SelectObject(hdcMemDC, hbmScreen);

        // Capture window content
        BOOL bSuccess = PrintWindow(target_hwnd_, hdcMemDC, 2); // PW_RENDERFULLCONTENT = 2
        if (!bSuccess) {
            BitBlt(hdcMemDC, 0, 0, width, height, hdcWindow, 0, 0, SRCCOPY);
        }

        BITMAPINFOHEADER bi;
        bi.biSize = sizeof(BITMAPINFOHEADER);
        bi.biWidth = width;
        bi.biHeight = -height; // Top-down
        bi.biPlanes = 1;
        bi.biBitCount = 32;
        bi.biCompression = BI_RGB;
        bi.biSizeImage = 0;
        bi.biXPelsPerMeter = 0;
        bi.biYPelsPerMeter = 0;
        bi.biClrUsed = 0;
        bi.biClrImportant = 0;

        int bufferSize = width * height * 4;
        rgbaBuffer.resize(bufferSize);

        GetDIBits(hdcMemDC, hbmScreen, 0, height, rgbaBuffer.data(), (BITMAPINFO*)&bi, DIB_RGB_COLORS);

        // Convert BGRA to RGBA
        for (int i = 0; i < bufferSize; i += 4) {
            uint8_t b = rgbaBuffer[i];
            uint8_t r = rgbaBuffer[i + 2];
            rgbaBuffer[i] = r;
            rgbaBuffer[i + 2] = b;
        }

        if (callback_) {
            callback_(rgbaBuffer.data(), width, height);
        }

        DeleteObject(hbmScreen);
        DeleteDC(hdcMemDC);
        ReleaseDC(target_hwnd_, hdcWindow);

        Sleep(frameDelayMs);
    }
}

// C FFI Interface
extern "C" {
    __declspec(dllexport) int WindowCapture_GetWindowCount() {
        return static_cast<int>(WindowCapturePlugin::GetInstance().EnumerateCapturableWindows().size());
    }

    __declspec(dllexport) bool WindowCapture_GetWindowTitle(int index, wchar_t* buffer, int maxLen, HWND* outHwnd) {
        if (index < 0 || index >= static_cast<int>(g_cached_windows.size())) return false;
        const auto& win = g_cached_windows[index];
        wcsncpy_s(buffer, maxLen, win.title.c_str(), _TRUNCATE);
        if (outHwnd) *outHwnd = win.hwnd;
        return true;
    }

    __declspec(dllexport) bool WindowCapture_Start(HWND targetHwnd, int targetFps, VideoFrameCallback callback) {
        return WindowCapturePlugin::GetInstance().StartCapture(targetHwnd, targetFps, callback);
    }

    __declspec(dllexport) void WindowCapture_Stop() {
        WindowCapturePlugin::GetInstance().StopCapture();
    }

    __declspec(dllexport) bool WindowCapture_IsCapturing() {
        return WindowCapturePlugin::GetInstance().IsCapturing();
    }
}

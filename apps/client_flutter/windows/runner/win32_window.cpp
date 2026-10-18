#include "win32_window.h"

#include <dwmapi.h>
#include <iostream>

namespace {
constexpr const wchar_t kWindowClassName[] = L"FLUTTER_RUNNER_WIN32_WINDOW";
}

Win32Window::Win32Window() {}

Win32Window::~Win32Window() {
  Destroy();
}

bool Win32Window::Create(const std::wstring& title, const Point& origin, const Size& size) {
  Destroy();

  HINSTANCE instance = GetModuleHandle(nullptr);
  WNDCLASS window_class{};
  window_class.hCursor = LoadCursor(nullptr, IDC_ARROW);
  window_class.lpszClassName = kWindowClassName;
  window_class.style = CS_HREDRAW | CS_VREDRAW;
  window_class.cbClsExtra = 0;
  window_class.cbWndExtra = 0;
  window_class.hInstance = instance;
  window_class.hIcon = LoadIcon(instance, MAKEINTRESOURCE(101));
  window_class.lpfnWndProc = WndProc;

  RegisterClass(&window_class);

  RECT window_rect = {
      static_cast<LONG>(origin.x),
      static_cast<LONG>(origin.y),
      static_cast<LONG>(origin.x + size.width),
      static_cast<LONG>(origin.y + size.height)
  };
  AdjustWindowRect(&window_rect, WS_OVERLAPPEDWINDOW, FALSE);

  window_handle_ = CreateWindow(
      kWindowClassName, title.c_str(),
      WS_OVERLAPPEDWINDOW,
      window_rect.left, window_rect.top,
      window_rect.right - window_rect.left,
      window_rect.bottom - window_rect.top,
      nullptr, nullptr, instance, this);

  if (!window_handle_) {
    return false;
  }

  return true;
}

bool Win32Window::Show() {
  if (!window_handle_) return false;
  ShowWindow(window_handle_, SW_SHOWNORMAL);
  UpdateWindow(window_handle_);
  return true;
}

void Win32Window::Destroy() {
  if (window_handle_) {
    DestroyWindow(window_handle_);
    window_handle_ = nullptr;
  }
}

HWND Win32Window::GetHandle() const {
  return window_handle_;
}

void Win32Window::SetQuitOnClose(bool quit_on_close) {
  quit_on_close_ = quit_on_close;
}

LRESULT CALLBACK Win32Window::WndProc(HWND window, UINT message, WPARAM wparam, LPARAM lparam) {
  if (message == WM_NCCREATE) {
    auto cs = reinterpret_cast<CREATESTRUCT*>(lparam);
    SetWindowLongPtr(window, GWLP_USERDATA, reinterpret_cast<LONG_PTR>(cs->lpCreateParams));
  } else if (Win32Window* that = reinterpret_cast<Win32Window*>(GetWindowLongPtr(window, GWLP_USERDATA))) {
    return that->MessageHandler(window, message, wparam, lparam);
  }
  return DefWindowProc(window, message, wparam, lparam);
}

LRESULT Win32Window::MessageHandler(HWND window, UINT message, WPARAM wparam, LPARAM lparam) {
  switch (message) {
    case WM_DESTROY:
      window_handle_ = nullptr;
      if (quit_on_close_) {
        PostQuitMessage(0);
      }
      return 0;
  }
  return DefWindowProc(window, message, wparam, lparam);
}

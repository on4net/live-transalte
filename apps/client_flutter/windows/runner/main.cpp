#include <windows.h>
#include "flutter_window.h"
#include "utils.h"

int APIENTRY wWinMain(_In_ HINSTANCE instance, _In_opt_ HINSTANCE prev,
                      _In_ wchar_t *command_line, _In_ int show_command) {
  // Attach developer console if launched with arguments
  ::CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED);

  FlutterWindow window;
  Win32Window::Point origin(100, 100);
  Win32Window::Size size(1280, 720);
  if (!window.Create(L"Live AI Translator & Dubbing", origin, size)) {
    return EXIT_FAILURE;
  }
  window.SetQuitOnClose(true);

  ::MSG msg;
  while (::GetMessage(&msg, nullptr, 0, 0)) {
    ::TranslateMessage(&msg);
    ::DispatchMessage(&msg);
  }

  ::CoUninitialize();
  return EXIT_SUCCESS;
}

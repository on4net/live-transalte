#include "flutter_window.h"

FlutterWindow::FlutterWindow() {}

FlutterWindow::~FlutterWindow() {}

bool FlutterWindow::OnCreate() {
  return true;
}

void FlutterWindow::OnDestroy() {}

LRESULT FlutterWindow::MessageHandler(HWND hwnd, UINT message, WPARAM wparam, LPARAM lparam) {
  return Win32Window::MessageHandler(hwnd, message, wparam, lparam);
}

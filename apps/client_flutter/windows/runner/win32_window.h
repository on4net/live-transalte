#ifndef RUNNER_WIN32_WINDOW_H_
#define RUNNER_WIN32_WINDOW_H_

#include <windows.h>
#include <functional>
#include <memory>
#include <string>

class Win32Window {
 public:
  struct Size {
    unsigned int width;
    unsigned int height;
    Size(unsigned int width, unsigned int height) : width(width), height(height) {}
  };

  struct Point {
    unsigned int x;
    unsigned int y;
    Point(unsigned int x, unsigned int y) : x(x), y(y) {}
  };

  Win32Window();
  virtual ~Win32Window();

  bool Create(const std::wstring& title, const Point& origin, const Size& size);
  bool Show();
  void Destroy();
  HWND GetHandle() const;
  void SetQuitOnClose(bool quit_on_close);

 protected:
  virtual LRESULT MessageHandler(HWND window, UINT message, WPARAM wparam, LPARAM lparam);

 private:
  friend class WindowClassRegistrar;

  static LRESULT CALLBACK WndProc(HWND window, UINT message, WPARAM wparam, LPARAM lparam);

  HWND window_handle_ = nullptr;
  bool quit_on_close_ = false;
};

#endif  // RUNNER_WIN32_WINDOW_H_

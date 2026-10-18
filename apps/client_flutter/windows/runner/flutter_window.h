#ifndef RUNNER_FLUTTER_WINDOW_H_
#define RUNNER_FLUTTER_WINDOW_H_

#include "win32_window.h"

class FlutterWindow : public Win32Window {
 public:
  explicit FlutterWindow();
  virtual ~FlutterWindow();

 protected:
  bool OnCreate() override;
  void OnDestroy() override;
  LRESULT MessageHandler(HWND window, UINT message, WPARAM wparam, LPARAM lparam) override;

 private:
  virtual bool OnCreate() { return true; }
  virtual void OnDestroy() {}
};

#endif  // RUNNER_FLUTTER_WINDOW_H_

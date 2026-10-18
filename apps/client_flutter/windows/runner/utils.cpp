#include "utils.h"

#include <windows.h>
#include <iostream>

void CreateAndAttachConsole() {
  if (::AllocConsole()) {
    FILE* unused;
    if (freopen_s(&unused, "CONOUT$", "w", stdout)) {
      _dup2(_fileno(stdout), 1);
    }
    if (freopen_s(&unused, "CONOUT$", "w", stderr)) {
      _dup2(_fileno(stderr), 2);
    }
    std::ios::sync_with_stdio();
    ::SetConsoleOutputCP(CP_UTF8);
  }
}

std::wstring Utf16FromUtf8(const std::string& string) {
  if (string.empty()) return std::wstring();
  int size_needed = ::MultiByteToWideChar(CP_UTF8, 0, string.data(), (int)string.size(), NULL, 0);
  std::wstring result(size_needed, 0);
  ::MultiByteToWideChar(CP_UTF8, 0, string.data(), (int)string.size(), &result[0], size_needed);
  return result;
}

std::string Utf8FromUtf16(const std::wstring& string) {
  if (string.empty()) return std::string();
  int size_needed = ::WideCharToMultiByte(CP_UTF8, 0, string.data(), (int)string.size(), NULL, 0, NULL, NULL);
  std::string result(size_needed, 0);
  ::WideCharToMultiByte(CP_UTF8, 0, string.data(), (int)string.size(), &result[0], size_needed, NULL, NULL);
  return result;
}

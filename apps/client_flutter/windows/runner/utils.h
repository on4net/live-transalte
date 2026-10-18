#ifndef RUNNER_UTILS_H_
#define RUNNER_UTILS_H_

#include <string>
#include <vector>

// Creates a console for output during development
void CreateAndAttachConsole();

// Converts a UTF-8 string to a wide string
std::wstring Utf16FromUtf8(const std::string& string);

// Converts a wide string to a UTF-8 string
std::string Utf8FromUtf16(const std::wstring& string);

#endif  // RUNNER_UTILS_H_

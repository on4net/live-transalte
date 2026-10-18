cmake_minimum_required(VERSION 3.14)
project(runner LANGUAGES CXX)

# Target executable
add_executable(${BINARY_NAME} WIN32
  "flutter_window.cpp"
  "main.cpp"
  "utils.cpp"
  "win32_window.cpp"
  "wasapi_capture_plugin.cpp"
  "window_capture_plugin.cpp"
  "Runner.rc"
)

# Apply standard C++20 compiler flags
target_compile_features(${BINARY_NAME} PRIVATE cxx_std_20)

target_include_directories(${BINARY_NAME} PRIVATE
  "${CMAKE_CURRENT_SOURCE_DIR}"
)

# Link essential Windows multimedia and desktop APIs
target_link_libraries(${BINARY_NAME} PRIVATE
  ole32
  avrt
  dwmapi
  mfplat
  mfuuid
)

# Export plugins symbols for Dart FFI
set_target_properties(${BINARY_NAME} PROPERTIES
  WINDOWS_EXPORT_ALL_SYMBOLS ON
)

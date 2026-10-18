cmake_minimum_required(VERSION 3.14)
project(client_flutter LANGUAGES CXX)

set(BINARY_NAME "client_flutter")

cmake_policy(SET CMP0079 NEW)

# Standard Flutter Windows setup
add_subdirectory(runner)

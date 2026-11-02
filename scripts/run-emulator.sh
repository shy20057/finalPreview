#!/usr/bin/env bash
# Starts an Android emulator once. Closing it ends this script.
#
# Usage: bash scripts/run-emulator.sh [avd-name]
set -u

SDK="/e/a-developNew/android-sdk"
AVD="${1:-fp_x86}"

exec "$SDK/emulator/emulator.exe" -avd "$AVD" \
  -no-boot-anim -no-audio -gpu host \
  -netdelay none -netspeed full

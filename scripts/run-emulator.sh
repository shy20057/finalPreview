#!/usr/bin/env bash
# Keeps an Android emulator running.
#
# The emulator occasionally exits on its own (the SDK tools restart the adb
# server underneath it, which the emulator treats as a fatal disconnect).
# This wrapper simply restarts it so the device stays available for testing.
#
# Usage: bash scripts/run-emulator.sh [avd-name]
set -u

SDK="/e/a-developNew/android-sdk"
AVD="${1:-fp_x86}"

while true; do
  "$SDK/emulator/emulator.exe" -avd "$AVD" \
    -no-boot-anim -no-audio -gpu swiftshader_indirect \
    -no-snapshot-load -netdelay none -netspeed full
  echo "[emulator] '$AVD' exited (code $?), restarting in 5s..."
  sleep 5
done

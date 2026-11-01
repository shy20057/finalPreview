#!/usr/bin/env bash
# Installs the Android SDK (cmdline-tools, platform-tools, emulator, system image)
# and creates an AVD. Idempotent: re-running skips completed steps.
set -u

SDK_ROOT="${SDK_ROOT:-E:/a-developNew/android-sdk}"
TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
SYS_IMG="system-images;android-34;google_apis;x86_64"
AVD_NAME="${AVD_NAME:-fp_test}"
LOG="$SDK_ROOT/setup.log"

mkdir -p "$SDK_ROOT"
exec > >(tee -a "$LOG") 2>&1
echo "=== Android SDK setup $(date) ==="

# --- 1. commandline-tools -------------------------------------------------
if [ ! -x "$SDK_ROOT/cmdline-tools/latest/bin/sdkmanager.bat" ]; then
  echo "[1/5] downloading commandline-tools ..."
  ZIP="$SDK_ROOT/cmdline-tools.zip"
  curl -fL --retry 3 --retry-delay 5 -o "$ZIP" "$TOOLS_URL" || { echo "FAIL download"; exit 1; }
  echo "[1/5] extracting ..."
  rm -rf "$SDK_ROOT/cmdline-tools/latest" "$SDK_ROOT/cmdline-tools/_tmp"
  powershell -NoProfile -Command "Expand-Archive -Force -Path '$ZIP' -DestinationPath '$SDK_ROOT/cmdline-tools/_tmp'" || { echo "FAIL extract"; exit 1; }
  mv "$SDK_ROOT/cmdline-tools/_tmp/cmdline-tools" "$SDK_ROOT/cmdline-tools/latest"
  rm -rf "$SDK_ROOT/cmdline-tools/_tmp" "$ZIP"
else
  echo "[1/5] commandline-tools already present"
fi

export ANDROID_HOME="$SDK_ROOT"
export ANDROID_SDK_ROOT="$SDK_ROOT"
SDKMANAGER="$SDK_ROOT/cmdline-tools/latest/bin/sdkmanager.bat"

# --- 2. licenses ----------------------------------------------------------
echo "[2/5] accepting licenses ..."
yes | "$SDKMANAGER" --sdk_root="$SDK_ROOT" --licenses > /dev/null 2>&1
echo "    licenses done"

# --- 3. packages ----------------------------------------------------------
echo "[3/5] installing packages ..."
"$SDKMANAGER" --sdk_root="$SDK_ROOT" \
  "platform-tools" "emulator" "platforms;android-34" "build-tools;34.0.0" "$SYS_IMG" \
  || { echo "FAIL sdkmanager"; exit 1; }

# --- 4. AVD ---------------------------------------------------------------
echo "[4/5] creating AVD '$AVD_NAME' ..."
echo "no" | "$SDK_ROOT/cmdline-tools/latest/bin/avdmanager.bat" create avd \
  -n "$AVD_NAME" -k "$SYS_IMG" --device "pixel_5" --force || { echo "FAIL avdmanager"; exit 1; }

# --- 5. verify ------------------------------------------------------------
echo "[5/5] verifying ..."
"$SDK_ROOT/platform-tools/adb.exe" version | head -2
"$SDK_ROOT/emulator/emulator.exe" -list-avds
echo "=== SDK setup DONE $(date) ==="

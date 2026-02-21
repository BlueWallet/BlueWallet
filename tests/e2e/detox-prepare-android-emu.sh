#!/bin/bash
# Creates the Pixel_API_29_AOSP AVD matching the CI e2e.yml configuration.
# On macOS arm64 the arch is arm64-v8a; on Linux x86_64 is used.

set -euo pipefail

SDK="${ANDROID_HOME:-$ANDROID_SDK_ROOT}"
if [ -z "$SDK" ]; then
  echo "Error: ANDROID_HOME or ANDROID_SDK_ROOT must be set" >&2
  exit 1
fi

# Prefer cmdline-tools/latest, fall back to tools/bin
if [ -x "$SDK/cmdline-tools/latest/bin/sdkmanager" ]; then
  SDKMANAGER="$SDK/cmdline-tools/latest/bin/sdkmanager"
  AVDMANAGER="$SDK/cmdline-tools/latest/bin/avdmanager"
elif [ -x "$SDK/tools/bin/sdkmanager" ]; then
  SDKMANAGER="$SDK/tools/bin/sdkmanager"
  AVDMANAGER="$SDK/tools/bin/avdmanager"
else
  echo "Error: sdkmanager not found in SDK" >&2
  exit 1
fi

# Detect arch
ARCH="x86_64"
if [ "$(uname -m)" = "arm64" ] || [ "$(uname -m)" = "aarch64" ]; then
  ARCH="arm64-v8a"
fi

# Read API level from CI workflow to stay in sync
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
E2E_YML="$SCRIPT_DIR/../../.github/workflows/e2e.yml"
API_LEVEL=$(grep 'api-level:' "$E2E_YML" | head -1 | awk '{print $2}')
if [ -z "$API_LEVEL" ]; then
  echo "Error: could not parse api-level from e2e.yml" >&2
  exit 1
fi

PACKAGE="system-images;android-${API_LEVEL};default;${ARCH}"
AVD_NAME="Pixel_API_29_AOSP"

echo "Installing system image: $PACKAGE"
yes | "$SDKMANAGER" --install "$PACKAGE" || true
echo yes | "$SDKMANAGER" --licenses > /dev/null 2>&1 || true

echo "Creating AVD: $AVD_NAME"
echo no | "$AVDMANAGER" create avd -n "$AVD_NAME" -k "$PACKAGE" -f

# Match CI settings: enable-hw-keyboard: true
AVD_CONFIG="$HOME/.android/avd/${AVD_NAME}.avd/config.ini"
if [ -f "$AVD_CONFIG" ]; then
  # Enable hardware keyboard (matches CI enable-hw-keyboard: true)
  sed -i.bak 's/^hw.keyboard=no/hw.keyboard=yes/' "$AVD_CONFIG" && rm -f "${AVD_CONFIG}.bak"
  echo "Updated hw.keyboard=yes in $AVD_CONFIG"
fi

echo "Done. Launch with:"
echo "  \$ANDROID_HOME/emulator/emulator -avd $AVD_NAME -no-snapshot -noaudio -no-boot-anim -camera-back none -camera-front none -partition-size 2047 -gpu host"

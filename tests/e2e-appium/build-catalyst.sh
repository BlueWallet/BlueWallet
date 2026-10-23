#!/bin/bash
# Isolated Release E2E app with real Keychain access and Apple signing.
set -euo pipefail
cd "$(dirname "$0")/../.."
DERIVED_DATA="$PWD/ios/build/catalyst-e2e"
APP_PATH="$DERIVED_DATA/Build/Products/Release-maccatalyst/BlueWallet.app"
trap 'rm -rf ios/BlueWalletE2E.xcodeproj ios/BlueWalletE2E.xcworkspace' EXIT
ruby tests/e2e-appium/prepare-project.rb
# Remove stale extensions when switching from an earlier build configuration.
rm -rf "$APP_PATH/Contents/PlugIns"
# An interrupted codesign can leave executable scratch files. They must not
# become sealed resources when the next build signs this disposable app.
if [[ -d "$APP_PATH" ]]; then
  find "$APP_PATH" -type f -name '*.cstemp' -delete
fi
# Bundle through Xcode before its signing phase, including the normal Hermes
# compilation. This avoids modifying and re-signing an already sealed app.
unset SKIP_BUNDLING
export BUNDLE_CONFIG="$PWD/tests/e2e-appium/metro.config.js"
set -- \
  -workspace ios/BlueWalletE2E.xcworkspace -scheme BlueWalletE2E \
  -configuration Release -destination 'generic/platform=macOS,variant=Mac Catalyst' \
  -derivedDataPath "$DERIVED_DATA" ARCHS="$(uname -m)" ONLY_ACTIVE_ARCH=YES
if [[ -z "${CATALYST_PROVISIONING_PROFILE:-}" ]]; then
  set -- "$@" -allowProvisioningUpdates -allowProvisioningDeviceRegistration
fi
if [[ "${CI:-}" == 'true' ]]; then
  # Raw compiler commands overflow GitHub's live-log limit before tests begin.
  # Keep warnings and errors, and leave local build output unchanged.
  set -- "$@" -quiet
fi
xcodebuild "$@" build

codesign --verify --deep --strict "$APP_PATH"
/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$APP_PATH/Contents/Info.plist"
echo "Mac Catalyst E2E app (real Keychain): $APP_PATH"

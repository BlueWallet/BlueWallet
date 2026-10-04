#!/bin/bash
# Builds an unsigned Release Mac Catalyst app (JS bundled, no Metro needed) and ad-hoc signs it,
# so it can be launched by the Appium mac2 smoke tests locally and on CI without any signing secrets.
# Requires `pod install` to have been run (it generates ios/build/generated codegen sources).
set -euo pipefail

cd "$(dirname "$0")/../.."

DERIVED_DATA="ios/build/catalyst-e2e"
APP_PATH="$DERIVED_DATA/Build/Products/Release-maccatalyst/BlueWallet.app"

xcodebuild \
  -workspace ios/BlueWallet.xcworkspace \
  -scheme BlueWallet \
  -configuration Release \
  -destination 'generic/platform=macOS,variant=Mac Catalyst' \
  -derivedDataPath "$DERIVED_DATA" \
  ARCHS=arm64 ONLY_ACTIVE_ARCH=YES \
  CODE_SIGN_IDENTITY=- CODE_SIGNING_REQUIRED=NO CODE_SIGNING_ALLOWED=NO \
  build

# ad-hoc sign so macOS does not treat the app as damaged
codesign --deep --force --sign - "$APP_PATH"

echo "Mac Catalyst app: $APP_PATH"

#!/bin/bash
# Isolated Release E2E app with real Keychain access and Apple signing.
set -euo pipefail
cd "$(dirname "$0")/../.."
DERIVED_DATA="$PWD/ios/build/catalyst-e2e"
APP_PATH="$DERIVED_DATA/Build/Products/Release-maccatalyst/BlueWallet.app"
trap 'rm -rf ios/BlueWalletE2E.xcodeproj ios/BlueWalletE2E.xcworkspace' EXIT
ruby tests/e2e-appium/prepare-project.rb
# React Native 0.88's prebuilt Catalyst slices ship macOS frameworks without symlinks: Versions/Current
# is a copy and the binary, resources, privacy manifest and strings bundle also sit in the root.
# codesign rejects that ("unsealed contents present in the root directory of an embedded framework").
# Rebuild the standard versioned layout; the unsigned release workflow never notices the problem.
# The Release build swaps the Debug slices pod install left for freshly extracted Release ones, so
# do that swap first; the build phases then see Release already in place and keep the fixed layout.
# A restored Pods cache can carry a Release marker next to freshly fetched Debug slices, so drop the markers.
rm -f ios/Pods/React-Core-prebuilt/.last_build_configuration ios/Pods/ReactNativeDependencies/.last_build_configuration
rn_version=$(node -p "require('react-native/package.json').version")
(cd ios/Pods && node ../../node_modules/react-native/scripts/replace-rncore-version.js -c Release -r "$rn_version" -p "$PWD")
(cd ios/Pods && node ../../node_modules/react-native/third-party-podspecs/replace_dependencies_version.js -c Release -r "$rn_version" -p "$PWD")
while IFS= read -r framework; do
  [[ -d "$framework/Versions/A" && ! -L "$framework/Versions/Current" ]] || continue
  name=$(basename "$framework" .framework)
  rm -rf "$framework/Versions/Current"
  ln -s A "$framework/Versions/Current"
  mkdir -p "$framework/Versions/A/Resources"
  for entry in "$framework"/*; do
    item=$(basename "$entry")
    case "$item" in
      Versions) ;;
      "$name" | Resources) rm -rf "$entry" ;;
      Headers | Modules)
        if [[ -e "$framework/Versions/A/$item" ]]; then rm -rf "$entry"; else mv "$entry" "$framework/Versions/A/"; fi
        ;;
      *) mv "$entry" "$framework/Versions/A/Resources/" ;;
    esac
  done
  for item in "$name" Resources Headers Modules; do
    [[ -e "$framework/Versions/A/$item" ]] && ln -s "Versions/Current/$item" "$framework/$item"
  done
  echo "Normalized framework layout: $framework"
done < <(find ios/Pods -type d -path '*-maccatalyst/*.framework' -prune 2>/dev/null)
# Remove stale extensions when switching from an earlier build configuration.
rm -rf "$APP_PATH/Contents/PlugIns"
# Embedding rsyncs without deleting, so files from an earlier framework layout would stay unsealed.
rm -rf "$APP_PATH/Contents/Frameworks"
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

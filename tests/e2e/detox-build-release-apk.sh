#!/usr/bin/env bash
# script thats used to build & sign release APK in preparation for Detox e2e testing.
# Usage: USE_FASTLANE=1 ./tests/e2e/detox-build-release-apk.sh or ./tests/e2e/detox-build-release-apk.sh --fastlane

set -euo pipefail

# ensure patched node_modules before building
npm run patches

# Work around react-native-capture-protection codegen naming mismatch on RN 0.83.
CAPTURE_PROTECTION_PACKAGE_JSON="node_modules/react-native-capture-protection/package.json"
if [[ -f "$CAPTURE_PROTECTION_PACKAGE_JSON" ]]; then
	node - "$CAPTURE_PROTECTION_PACKAGE_JSON" <<'NODE'
const fs = require('fs');
const path = process.argv[2];
const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
if (pkg?.codegenConfig?.name === 'CaptureProtectionSpec') {
  pkg.codegenConfig.name = 'CaptureProtection';
  fs.writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log('Patched react-native-capture-protection codegenConfig.name -> CaptureProtection');
}
NODE
fi

# Remove stale generated codegen outputs to avoid mixed incremental outputs.
rm -rf node_modules/react-native-capture-protection/android/build/generated/source/codegen
rm -rf android/app/build/generated/autolinking
# Work around incompatible generated file from react-native-camera-kit-no-google on RN 0.83.
rm -f node_modules/react-native-camera-kit-no-google/android/build/generated/source/codegen/jni/react/renderer/components/NativeCameraKitSpec/NativeCameraKitSpecJSI-generated.cpp

USE_FASTLANE=${USE_FASTLANE:-0}
if [[ "${1:-}" == "--fastlane" ]]; then
	USE_FASTLANE=1
fi

# deleting old artifacts (portable across GNU/BSD find/xargs)
find android -name '*.apk' -print0 | xargs -0 rm -f || true

# creating fresh keystore for consistent signing between app and test APKs
rm -f detox.keystore
keytool -genkeypair -v -keystore detox.keystore -alias detox -keyalg RSA -keysize 2048 -validity 10000 -storepass 123456 -keypass 123456 -dname 'cn=Unknown, ou=Unknown, o=Unknown, c=Unknown'

if [[ "$USE_FASTLANE" == "1" ]]; then
	# Build signed release APK via Fastlane; assume env provides keystore inputs when needed
	bundle exec fastlane android build_release_apk
	# Build androidTest APK for Detox
	(cd android && ./gradlew assembleAndroidTest -DtestBuildType=release)
	# Pick the newest release APK produced by Fastlane
	RELEASE_APK=$(find android/app/build/outputs/apk/release -name "*.apk" -print0 | xargs -0 ls -t | head -n 1)
	TEST_APK=android/app/build/outputs/apk/androidTest/release/app-release-androidTest.apk
else
	# Build release and androidTest APKs using Gradle (x86_64 by default for emulator speed).
	# Override with E2E_ANDROID_ARCHS when building for real devices.
	GRADLE_ARCH_ARGS=()
	ARCHITECTURES=${E2E_ANDROID_ARCHS:-x86_64}
	GRADLE_ARCH_ARGS+=("-PreactNativeArchitectures=${ARCHITECTURES}")
	(cd android && ./gradlew assembleRelease assembleReleaseAndroidTest -DtestBuildType=release "${GRADLE_ARCH_ARGS[@]}")
	RELEASE_APK=./android/app/build/outputs/apk/release/app-release.apk
	TEST_APK=./android/app/build/outputs/apk/androidTest/release/app-release-androidTest.apk
fi

# signing both APKs with the same keystore so they can be installed together (pick latest available apksigner)
ANDROID_SDK_ROOT=${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}
if [[ -z "$ANDROID_SDK_ROOT" ]]; then
	echo "ANDROID_HOME or ANDROID_SDK_ROOT must be set" >&2
	exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
	echo "python3 is required to locate apksigner" >&2
	exit 1
fi

APKSIGNER_BIN=$(python3 - "$ANDROID_SDK_ROOT" <<'PY'
import pathlib
import sys

sdk_root = pathlib.Path(sys.argv[1])
build_tools = sdk_root / "build-tools"

def version_key(path: pathlib.Path):
	# split version components so 34.0.0 < 35.0.0 < 36.0.0
	parts = []
	for part in path.parent.name.split('.'):
		parts.append(int(part) if part.isdigit() else part)
	return parts

candidates = sorted(build_tools.glob('*/apksigner'), key=version_key)
if not candidates:
	raise SystemExit(f"apksigner not found under {build_tools}")

print(candidates[-1])
PY
)

if [[ ! -x "$APKSIGNER_BIN" ]]; then
	echo "apksigner not found or not executable at $APKSIGNER_BIN" >&2
	exit 1
fi

"$APKSIGNER_BIN" sign --ks detox.keystore --ks-pass=pass:123456 "$RELEASE_APK"
"$APKSIGNER_BIN" sign --ks detox.keystore --ks-pass=pass:123456 "$TEST_APK"

#!/usr/bin/env bash
# script thats used to build & sign release APK in preparation for Detox e2e testing.
# Usage: USE_FASTLANE=1 ./tests/e2e/detox-build-release-apk.sh or ./tests/e2e/detox-build-release-apk.sh --fastlane

set -euo pipefail

# ensure patched node_modules before building
npm run patches

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
	# Build release and androidTest APKs using Gradle (x86_64 only for GitHub Actions emulator)
	(cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release -PreactNativeArchitectures=x86_64)
	mv ./android/app/build/outputs/apk/release/app-release-unsigned.apk ./android/app/build/outputs/apk/release/app-release.apk
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

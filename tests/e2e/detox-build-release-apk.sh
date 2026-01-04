# script thats used to build & sign release APK in preparation for Detox e2e testing.
# Usage: USE_FASTLANE=1 ./tests/e2e/detox-build-release-apk.sh or ./tests/e2e/detox-build-release-apk.sh --fastlane

set -euo pipefail

USE_FASTLANE=${USE_FASTLANE:-0}
if [[ "${1:-}" == "--fastlane" ]]; then
	USE_FASTLANE=1
fi

# deleting old artifacts
find android | grep '\.apk' --color=never | xargs -l rm || true

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

# signing both APKs with the same keystore so they can be installed together
echo wheres waldo?
find "$ANDROID_HOME" | grep apksigner | grep -v jar
$ANDROID_HOME/build-tools/36.0.0/apksigner sign --ks detox.keystore --ks-pass=pass:123456 "$RELEASE_APK"
$ANDROID_HOME/build-tools/36.0.0/apksigner sign --ks detox.keystore --ks-pass=pass:123456 "$TEST_APK"

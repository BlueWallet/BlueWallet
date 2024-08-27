#!/bin/bash

# assumes 1 env variable: KEYSTORE_FILE_HEX for release builds
# expects an optional parameter to specify the build type: "release" or "reproducible"
# if no parameter is provided, defaults to "release"

BUILD_TYPE=${1:-release}

if [ "$BUILD_TYPE" == "release" ]; then
    # Convert the release keystore from hex
    echo $KEYSTORE_FILE_HEX > bluewallet-release-key.keystore.hex
    xxd -plain -revert bluewallet-release-key.keystore.hex > ./android/bluewallet-release-key.keystore
    rm bluewallet-release-key.keystore.hex

    APK_PATH="./android/app/build/outputs/apk/release/BlueWallet-${VERSION_NAME}($BUILD_NUMBER).apk"
    BUILD_COMMAND="./gradlew assembleRelease"
    SIGN_COMMAND="$APKSIGNER_PATH sign --ks ./bluewallet-release-key.keystore --ks-pass=pass:$KEYSTORE_PASSWORD \"$APK_PATH\""

elif [ "$BUILD_TYPE" == "reproducible" ]; then
    APK_PATH="./android/app/build/outputs/apk/reproducible/BlueWallet-Reproducible-${VERSION_NAME}($BUILD_NUMBER).apk"
    BUILD_COMMAND="./gradlew assembleReproducible"
    SIGN_COMMAND="$APKSIGNER_PATH sign --ks ./reproducible.keystore --ks-pass=pass:BWReproducibleBuild --key-pass=pass:reproducible \"$APK_PATH\""

else
    echo "Invalid build type specified. Use 'release' or 'reproducible'."
    exit 1
fi

cd android

# Use the BUILD_NUMBER environment variable set in the GitHub Actions workflow
sed -i'.original' "s/versionCode 1/versionCode $BUILD_NUMBER/g" app/build.gradle

# Extract versionName from build.gradle
VERSION_NAME=$(grep versionName app/build.gradle | awk '{print $2}' | tr -d '"')

# Find apksigner tool
echo "Locating apksigner..."
APKSIGNER_PATH=$(find $ANDROID_HOME -type f -name apksigner | grep -v jar | head -n 1)
echo "Using apksigner at: $APKSIGNER_PATH"

# Build the APK
echo "Building $BUILD_TYPE APK..."
$BUILD_COMMAND

# Rename the APK file to include the dynamic version and build number with parentheses
mv ./app/build/outputs/apk/$BUILD_TYPE/app-$BUILD_TYPE-unsigned.apk "$APK_PATH"

# Sign the APK
echo "Signing $BUILD_TYPE APK..."
$APKSIGNER_PATH sign --ks ./reproducible.keystore --ks-pass=pass:$KEYSTORE_PASSWORD "$APK_PATH"

echo "APK signing complete."
echo "$BUILD_TYPE APK: $APK_PATH"
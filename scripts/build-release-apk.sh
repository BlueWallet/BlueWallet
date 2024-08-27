#!/bin/bash

# assumes 1 env variable: KEYSTORE_FILE_HEX for release builds
# expects an optional parameter to specify the build type: "release" or "reproducible"
# if no parameter is provided, defaults to "release"

BUILD_TYPE="${1:-release}"

if [ "$BUILD_TYPE" == "release" ]; then
    # Convert the release keystore from hex
    echo "$KEYSTORE_FILE_HEX" > bluewallet-release-key.keystore.hex
    xxd -plain -revert bluewallet-release-key.keystore.hex > ./android/bluewallet-release-key.keystore
    rm bluewallet-release-key.keystore.hex

    APK_PATH="./android/app/build/outputs/apk/release/BlueWallet-${VERSION_NAME}(${BUILD_NUMBER}).apk"
    BUILD_COMMAND="./gradlew assembleRelease"
    SIGN_COMMAND="$APKSIGNER_PATH sign --ks ./bluewallet-release-key.keystore --ks-pass=pass:$KEYSTORE_PASSWORD \"$APK_PATH\""

elif [ "$BUILD_TYPE" == "reproducible" ]; then
    APK_OUTPUT_DIR="./app/build/outputs/apk/reproducible"
    FINAL_APK_DIR="./android/app/build/outputs/apk/reproducible"
    APK_FILENAME="app-$BUILD_TYPE.apk"  # Adjusted filename
    APK_PATH="$APK_OUTPUT_DIR/$APK_FILENAME"
    FINAL_APK_PATH="$FINAL_APK_DIR/BlueWallet-Reproducible-${VERSION_NAME}(${BUILD_NUMBER}).apk"
    BUILD_COMMAND="./gradlew assembleReproducible"
    SIGN_COMMAND="$APKSIGNER_PATH sign --ks \"$FINAL_APK_PATH\" --ks-pass=pass:BWReproducibleBuild --key-pass=pass:reproducible"

    # Ensure the final APK directory exists
    mkdir -p "$FINAL_APK_DIR"

else
    echo "Invalid build type specified. Use 'release' or 'reproducible'."
    exit 1
fi

cd android

# Extract versionName and versionCode (BUILD_NUMBER) from build.gradle
VERSION_NAME=$(grep versionName app/build.gradle | awk '{print $2}' | tr -d '"')
BUILD_NUMBER=$(grep versionCode app/build.gradle | awk '{print $2}')

# Find apksigner tool
echo "Locating apksigner..."
APKSIGNER_PATH=$(find "$ANDROID_HOME" -type f -name apksigner | grep -v jar | head -n 1)
echo "Using apksigner at: $APKSIGNER_PATH"

# Build the APK
echo "Building $BUILD_TYPE APK..."
$BUILD_COMMAND

# List the contents of the directory where the APK is expected to be
echo "Listing contents of $APK_OUTPUT_DIR:"
ls -la "$APK_OUTPUT_DIR"

# Verify that the APK was created before renaming
if [ -f "$APK_PATH" ]; then
    mv "$APK_PATH" "$FINAL_APK_PATH"
else
    echo "Error: APK not found at $APK_PATH"
    ls -Rla "$APK_OUTPUT_DIR"
    exit 1
fi

# Sign the APK
echo "Signing $BUILD_TYPE APK..."
"$APKSIGNER_PATH" sign --ks "$FINAL_APK_PATH" --ks-pass=pass:BWReproducibleBuild --key-pass=pass:reproducible "$FINAL_APK_PATH"

if [ $? -eq 0 ]; then
    echo "APK signing complete."
    echo "$BUILD_TYPE APK: $FINAL_APK_PATH"
else
    echo "Error: APK signing failed."
    exit 1
fi
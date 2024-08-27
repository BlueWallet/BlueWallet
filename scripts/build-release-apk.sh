#!/bin/bash

# expects an optional parameter to specify the build type: "release" or "reproducible"
# if no parameter is provided, defaults to "release"
# For release builds, the BUILD_NUMBER should be passed as an environment variable.
# For reproducible builds, the BUILD_NUMBER is extracted from the build.gradle file.

BUILD_TYPE="${1:-release}"
echo "BUILD_TYPE: $BUILD_TYPE"

cd android

# Extract versionName from build.gradle
VERSION_NAME=$(grep versionName app/build.gradle | awk '{print $2}' | tr -d '"')
echo "VERSION_NAME: $VERSION_NAME"

if [ "$BUILD_TYPE" == "release" ]; then
    # Ensure that the BUILD_NUMBER is provided as an environment variable
    if [ -z "$BUILD_NUMBER" ]; then
        echo "Error: BUILD_NUMBER is required for release builds."
        exit 1
    fi
    echo "BUILD_NUMBER (from env): $BUILD_NUMBER"

    # Convert the release keystore from hex
    echo "$KEYSTORE_FILE_HEX" > bluewallet-release-key.keystore.hex
    xxd -plain -revert bluewallet-release-key.keystore.hex > ./android/bluewallet-release-key.keystore
    rm bluewallet-release-key.keystore.hex
    echo "Keystore converted and saved."

    APK_OUTPUT_DIR="./android/app/build/outputs/apk/release"
    FINAL_APK_PATH="$APK_OUTPUT_DIR/BlueWallet-${VERSION_NAME}(${BUILD_NUMBER}).apk"
    echo "APK_OUTPUT_DIR: $APK_OUTPUT_DIR"
    echo "FINAL_APK_PATH: $FINAL_APK_PATH"

    BUILD_COMMAND="./gradlew assembleRelease"
    echo "BUILD_COMMAND: $BUILD_COMMAND"

    SIGN_COMMAND="$APKSIGNER_PATH sign --ks ./bluewallet-release-key.keystore --ks-pass=pass:$KEYSTORE_PASSWORD \"$FINAL_APK_PATH\""
    echo "SIGN_COMMAND: $SIGN_COMMAND"

elif [ "$BUILD_TYPE" == "reproducible" ]; then
    # Extract versionCode (BUILD_NUMBER) from build.gradle
    BUILD_NUMBER=$(grep versionCode app/build.gradle | awk '{print $2}')
    echo "BUILD_NUMBER (from build.gradle): $BUILD_NUMBER"

    APK_OUTPUT_DIR="./app/build/outputs/apk/reproducible"
    FINAL_APK_DIR="./android/app/build/outputs/apk/reproducible"
    APK_FILENAME="app-$BUILD_TYPE.apk"  # Adjusted filename
    FINAL_APK_PATH="$FINAL_APK_DIR/BlueWallet-Reproducible-${VERSION_NAME}(${BUILD_NUMBER}).apk"
    echo "APK_OUTPUT_DIR: $APK_OUTPUT_DIR"
    echo "FINAL_APK_DIR: $FINAL_APK_DIR"
    echo "FINAL_APK_PATH: $FINAL_APK_PATH"

    BUILD_COMMAND="./gradlew assembleReproducible"
    echo "BUILD_COMMAND: $BUILD_COMMAND"

    SIGN_COMMAND="$APKSIGNER_PATH sign --ks \"$FINAL_APK_PATH\" --ks-pass=pass:BWReproducibleBuild --key-pass=pass:reproducible"
    echo "SIGN_COMMAND: $SIGN_COMMAND"

    # Ensure the final APK directory exists
    mkdir -p "$FINAL_APK_DIR"
    echo "Ensured FINAL_APK_DIR exists: $FINAL_APK_DIR"

else
    echo "Invalid build type specified. Use 'release' or 'reproducible'."
    exit 1
fi

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
if [ -f "$APK_OUTPUT_DIR/$APK_FILENAME" ]; then
    mv "$APK_OUTPUT_DIR/$APK_FILENAME" "$FINAL_APK_PATH"
    echo "APK moved to FINAL_APK_PATH: $FINAL_APK_PATH"
else
    echo "Error: APK not found at $APK_OUTPUT_DIR/$APK_FILENAME"
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
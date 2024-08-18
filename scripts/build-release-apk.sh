#!/bin/bash

# assumes 2 env variables: KEYSTORE_FILE_HEX & KEYSTORE_PASSWORD

# PS. to turn file to hex and back:
#     $ xxd -plain test.txt > test.hex
#     $ xxd -plain -revert test.hex test2.txt

echo $KEYSTORE_FILE_HEX > bluewallet-release-key.keystore.hex
xxd -plain -revert bluewallet-release-key.keystore.hex > ./android/bluewallet-release-key.keystore
rm bluewallet-release-key.keystore.hex

cd android
# Use the BUILD_NUMBER environment variable set in the GitHub Actions workflow
sed -i'.original' "s/versionCode 1/versionCode $BUILD_NUMBER/g" app/build.gradle

# Extract versionName from build.gradle
VERSION_NAME=$(grep versionName app/build.gradle | awk '{print $2}' | tr -d '"')

# Build and rename based on the input parameter (apk or aab)
if [ "$1" == "apk" ]; then
  ./gradlew assembleRelease
  OUTPUT_DIR="./app/build/outputs/apk/release"
  OUTPUT_FILE="app-release-unsigned.apk"
  SIGNED_OUTPUT_FILE="BlueWallet-${VERSION_NAME}($BUILD_NUMBER).apk"
  # Sign the APK
  $ANDROID_HOME/build-tools/34.0.0/apksigner sign --ks ./bluewallet-release-key.keystore --ks-pass=pass:$KEYSTORE_PASSWORD "$OUTPUT_DIR/$SIGNED_OUTPUT_FILE"
elif [ "$1" == "aab" ]; then
  ./gradlew bundleRelease
  OUTPUT_DIR="./app/build/outputs/bundle/release"
  OUTPUT_FILE="app-release.aab"
  SIGNED_OUTPUT_FILE="BlueWallet-${VERSION_NAME}($BUILD_NUMBER).aab"
fi

# Rename the output file to include the dynamic version and build number with parentheses
mv "$OUTPUT_DIR/$OUTPUT_FILE" "$OUTPUT_DIR/$SIGNED_OUTPUT_FILE"
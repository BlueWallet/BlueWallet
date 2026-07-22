#!/usr/bin/env bash
set -euo pipefail

umask 022

npm config set fetch-timeout 600000
npm config set fetch-retries 5
npm config set fetch-retry-mintimeout 20000
npm config set fetch-retry-maxtimeout 120000

npm ci --omit=dev

cd android
./gradlew --no-daemon --no-build-cache assembleRelease

APK_UNSIGNED="app/build/outputs/apk/release/app-release-unsigned.apk"
APK_SIGNED="/tmp/app-release-signed.apk"
KEYSTORE="/tmp/keystore.jks"

if [ -n "${KEYSTORE_FILE_HEX:-}" ] && [ -n "${KEYSTORE_PASSWORD:-}" ]; then
  printf "%s" "$KEYSTORE_FILE_HEX" | xxd -r -p > "$KEYSTORE"

  apksigner sign \
    --ks "$KEYSTORE" \
    --ks-pass env:KEYSTORE_PASSWORD \
    --key-pass env:KEYSTORE_PASSWORD \
    --deterministic-dsa-signing \
    --out "$APK_SIGNED" \
    "$APK_UNSIGNED"
else
  keytool -genkeypair \
    -keystore "$KEYSTORE" \
    -storepass password \
    -keypass password \
    -alias temp-key \
    -keyalg RSA \
    -keysize 2048 \
    -validity 1 \
    -dname "CN=Temporary,O=Build,C=US"

  apksigner sign \
    --ks "$KEYSTORE" \
    --ks-key-alias temp-key \
    --ks-pass pass:password \
    --key-pass pass:password \
    --deterministic-dsa-signing \
    --out "$APK_SIGNED" \
    "$APK_UNSIGNED"
fi

apksigner verify --verbose "$APK_SIGNED"

cp "$APK_SIGNED" /build/Bluewallet-latest.apk
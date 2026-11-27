#!/bin/bash
# Builds and signs a release APK outside Fastlane (the CI path is
# `bundle exec fastlane android build_release_apk`).
#
# Needs KEYSTORE_FILE_HEX (the keystore as hex: `xxd -plain release.keystore`),
# KEYSTORE_PASSWORD and BUILD_NUMBER.
#
# The keystore is decoded into a private temporary directory, never into the
# project tree, and removed on every exit path, also on failure or Ctrl-C.
# apksigner reads the password from the environment, so it never appears in
# the process list or in the log (H15).
set -euo pipefail

: "${KEYSTORE_FILE_HEX:?KEYSTORE_FILE_HEX is required}"
: "${KEYSTORE_PASSWORD:?KEYSTORE_PASSWORD is required}"
: "${BUILD_NUMBER:?BUILD_NUMBER is required}"
export KEYSTORE_PASSWORD

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SECRETS_DIR="$(mktemp -d "${TMPDIR:-/tmp}/neurai-release-keystore.XXXXXX")"
chmod 700 "$SECRETS_DIR"
GRADLE_FILE="$ROOT/android/app/build.gradle"
GRADLE_BACKUP="$SECRETS_DIR/build.gradle.orig"
cleanup() {
  # Restore the versionCode edit and drop the key material, whatever happened.
  if [ -f "$GRADLE_BACKUP" ]; then cp "$GRADLE_BACKUP" "$GRADLE_FILE"; fi
  rm -rf "$SECRETS_DIR"
}
trap cleanup EXIT INT TERM

KEYSTORE="$SECRETS_DIR/release.keystore"
(umask 077 && printf '%s' "$KEYSTORE_FILE_HEX" | tr -d '[:space:]' | xxd -plain -revert > "$KEYSTORE")
if [ ! -s "$KEYSTORE" ]; then
  echo "KEYSTORE_FILE_HEX did not decode to a keystore" >&2
  exit 1
fi

cp "$GRADLE_FILE" "$GRADLE_BACKUP"
sed -i.original "s/versionCode [0-9]*/versionCode $BUILD_NUMBER/" "$GRADLE_FILE" && rm -f "$GRADLE_FILE.original"
VERSION_NAME=$(grep versionName "$GRADLE_FILE" | awk '{print $2}' | tr -d '"')

(cd "$ROOT/android" && ./gradlew assembleRelease)

APK_DIR="$ROOT/android/app/build/outputs/apk/release"
UNSIGNED="$APK_DIR/app-release-unsigned.apk"
[ -f "$UNSIGNED" ] || UNSIGNED="$APK_DIR/app-release.apk"
OUTPUT="$APK_DIR/NeuraiWallet-${VERSION_NAME}(${BUILD_NUMBER}).apk"
mv "$UNSIGNED" "$OUTPUT"

APKSIGNER=$(ls -1 "$ANDROID_HOME"/build-tools/*/apksigner | sort -V | tail -n 1)
"$APKSIGNER" sign --ks "$KEYSTORE" --ks-pass env:KEYSTORE_PASSWORD "$OUTPUT"
"$APKSIGNER" verify --print-certs "$OUTPUT" | grep -i "SHA-256"
echo "Signed: $OUTPUT"

#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="android-build-env"
OUT="$(pwd)/build"
BUILD_ID=$(date +%s)

log() {
  printf "\n[%s] %s\n" "$(date +'%H:%M:%S')" "$*" >&2
}

mkdir -p "$OUT"

log "Building Docker image..."

docker build -f Dockerfile -t "$IMAGE_NAME" ..

log "Running build inside container..."

docker run --rm \
  -v "$OUT":/build \
  "$IMAGE_NAME" \
  bash -c "
    set -e

    npm config set fetch-timeout 600000 \
    && npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm ci --omit=dev --yes --verbose


    cd android
    ./gradlew assembleRelease

    APK_UNSIGNED=app/build/outputs/apk/release/app-release-unsigned.apk
    APK_SIGNED=/tmp/app-release-signed.apk
    KEYSTORE=/tmp/temp-keystore.jks

    # Generate temporary keystore
    keytool -genkeypair \
      -keystore \$KEYSTORE \
      -storepass password \
      -keypass password \
      -alias temp-key \
      -keyalg RSA \
      -keysize 2048 \
      -validity 1 \
      -dname \"CN=Temporary,O=Build,C=US\"

    apksigner sign \
      --ks \$KEYSTORE \
      --ks-key-alias temp-key \
      --ks-pass pass:password \
      --key-pass pass:password \
      --deterministic-dsa-signing \
      --out \$APK_SIGNED \
      \$APK_UNSIGNED

    apksigner verify --verbose \$APK_SIGNED

    cp \$APK_SIGNED /build/Bluewallet-$BUILD_ID.apk
  "

log "Signed APK saved in $OUT"
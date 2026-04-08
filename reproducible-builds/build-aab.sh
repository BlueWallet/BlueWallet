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

    npm ci --omit=dev --yes --verbose
    cd android
    ./gradlew bundleRelease

    AAB_PATH=app/build/outputs/bundle/release/app-release.aab


    cp \$AAB_PATH /build/app-release-$BUILD_ID.aab
  "

log "App bundle saved in $OUT"
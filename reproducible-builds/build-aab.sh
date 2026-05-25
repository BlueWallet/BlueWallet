#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="android-build-env"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT="$REPO_ROOT/reproducible-builds/build"

log() {
  printf "\n[%s] %s\n" "$(date +'%H:%M:%S')" "$*" >&2
}

rm -rf "$OUT"
mkdir -p "$OUT"
chmod 775 "$OUT"

log "Building Docker image..."

docker build --platform linux/amd64 -f "$SCRIPT_DIR/Dockerfile" -t "$IMAGE_NAME" "$REPO_ROOT"

log "Running build inside container..."

docker run --platform linux/amd64 --rm \
  -v "$OUT":/build \
  "$IMAGE_NAME" \
  bash -c "
    set -e

    umask 022

    npm config set fetch-timeout 600000 \
    && npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm ci --verbose

    cd android
    ./gradlew --no-daemon --no-build-cache bundleRelease

   
    cp app/build/outputs/bundle/release/app-release.aab /build/Bluewallet-latest.aab
  "

log "App bundle saved in $OUT"
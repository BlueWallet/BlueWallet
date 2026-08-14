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
  -e KEYSTORE_FILE_HEX \
  -e KEYSTORE_PASSWORD \
  -v "$OUT":/build \
  "$IMAGE_NAME" \
  bash /app/inside-docker.sh

log "Signed APK saved in $OUT"
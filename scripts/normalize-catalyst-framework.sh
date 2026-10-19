#!/bin/bash
set -euo pipefail

# Some prebuilt React Native archives dereference versioned framework symlinks.
# Repair only the embedded copy, before CocoaPods strips and signs its binary.
framework="$1"
if [[ "${EFFECTIVE_PLATFORM_NAME:-}" != "-maccatalyst" || ! -d "$framework/Versions/A" ]]; then
  exit 0
fi

if [[ ! -L "$framework/Versions/Current" ]]; then
  rm -rf "$framework/Versions/Current"
  ln -s A "$framework/Versions/Current"
fi

for entry in "$framework/Versions/A/"*; do
  name="$(basename "$entry")"
  [[ "$name" == "_CodeSignature" ]] && continue
  if [[ ! -L "$framework/$name" ]]; then
    rm -rf "$framework/$name"
    ln -s "Versions/Current/$name" "$framework/$name"
  fi
done

# ReactNativeDependencies ships privacy bundles at the framework root. macOS
# requires resources inside the versioned Resources directory for signing.
for bundle in "$framework/"*.bundle; do
  [[ -d "$bundle" ]] || continue
  name="$(basename "$bundle")"
  mkdir -p "$framework/Versions/A/Resources"
  rm -rf "$framework/Versions/A/Resources/$name"
  mv "$bundle" "$framework/Versions/A/Resources/$name"
done

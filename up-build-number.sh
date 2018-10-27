#!/usr/bin/env bash
./release-notes.sh
./release-notes.sh > fastlane/metadata/en-US/release_notes.txt
echo
nodejs up-build-number.js
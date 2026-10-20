#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/../.."
test_directory=$(mktemp -d "${TMPDIR:-/tmp}/bw-vault-localization.XXXXXX")
trap 'rm -rf "$test_directory"' EXIT
test_app="$test_directory/VaultLocalizationTests.app"
mkdir -p "$test_app/Contents/MacOS" "$test_app/Contents/Resources"
cat > "$test_app/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleIdentifier</key><string>io.bluewallet.localization-tests</string>
<key>CFBundleExecutable</key><string>VaultLocalizationTests</string>
<key>CFBundleDevelopmentRegion</key><string>en_US</string>
</dict></plist>
PLIST
xcrun xcstringstool compile ios/QuickLookShared/VaultPreview.xcstrings --output-directory "$test_app/Contents/Resources"
xcrun swiftc ios/QuickLookShared/MultisigCoordination.swift tests/native/VaultLocalizationTests.swift -o "$test_app/Contents/MacOS/VaultLocalizationTests"
"$test_app/Contents/MacOS/VaultLocalizationTests" -AppleLanguages '(en-US)' -AppleLocale en_US
"$test_app/Contents/MacOS/VaultLocalizationTests" -AppleLanguages '(es)' -AppleLocale es_ES --spanish
"$test_app/Contents/MacOS/VaultLocalizationTests" -AppleLanguages '(es-419)' -AppleLocale es_MX --latin-american
# An untranslated language falls back to the English development localization.
"$test_app/Contents/MacOS/VaultLocalizationTests" -AppleLanguages '(fr)' -AppleLocale en_US

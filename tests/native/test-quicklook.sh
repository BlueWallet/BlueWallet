#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/../.."
test_directory=$(mktemp -d "${TMPDIR:-/tmp}/bw-quicklook.XXXXXX")
trap 'rm -rf "$test_directory"' EXIT
xcrun swiftc ios/QuickLookShared/MultisigCoordination.swift tests/native/MultisigCoordinationTests.swift -o "$test_directory/vault-tests"
"$test_directory/vault-tests"
xcrun swiftc ios/QuickLookShared/MultisigCoordination.swift ios/QuickLookShared/QuickLookDocument.swift tests/native/QuickLookDocumentTests.swift -o "$test_directory/document-tests"
"$test_directory/document-tests"
bash tests/native/test-vault-localization.sh

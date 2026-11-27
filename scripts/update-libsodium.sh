#!/usr/bin/env bash
#
# Replaces the libsodium subset in android/walletcrypto with the same files
# from an official, signed libsodium release.
#
#   scripts/update-libsodium.sh 1.0.23
#
# 1. Downloads the release tarball and its minisign signature from
#    download.libsodium.org and checks the signature with libsodium's published
#    key (and that it signs that very file name).
# 2. Copies the files the current copy has (SHA256SUMS lists them), plus the
#    licence, into a staging folder.
# 3. Builds that copy for this computer and checks it against the `nw2:`
#    vectors the app's tests pin (tests/unit/fixtures/nw2-libsodium-vectors.json):
#    the same keys and sealed buckets, so stores already written still open.
# 4. Only then replaces the copy, regenerates SHA256SUMS and README.md, and runs
#    the checksum check and the encryption tests.
#
# Nothing is committed. Needs curl, tar, node (24+) and a C compiler (cc).
# If a new release needs a file the subset does not have, step 3 fails and the
# copy is left as it was: add the file to CMakeLists.txt and to SHA256SUMS by
# hand, then run the script again.
set -euo pipefail

VERSION="${1:-}"
if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "usage: $0 <libsodium version, e.g. 1.0.23>" >&2
  exit 2
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CPP="$ROOT/android/walletcrypto/src/main/cpp"
DEST="$CPP/libsodium"
FIXTURE="$ROOT/tests/unit/fixtures/nw2-libsodium-vectors.json"
HELPERS="$ROOT/scripts/libsodium"
# libsodium's minisign key, as published at https://doc.libsodium.org/installation
PUBLIC_KEY='RWQf6LRCGA9i53mlYecO4IzT51TGPpvWucNSCh1CBM0QTaLn73Y7GFO3'
TARBALL="libsodium-$VERSION.tar.gz"
URL="https://download.libsodium.org/libsodium/releases/$TARBALL"

for tool in curl tar node cc; do
  command -v "$tool" >/dev/null || { echo "this script needs $tool" >&2; exit 2; }
done

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "==> Downloading $TARBALL"
curl -sSfL -o "$WORK/$TARBALL" "$URL"
curl -sSfL -o "$WORK/$TARBALL.minisig" "$URL.minisig"

echo "==> Checking the signature"
node "$HELPERS/minisign-verify.mjs" "$PUBLIC_KEY" "$WORK/$TARBALL" "$WORK/$TARBALL.minisig" "$TARBALL"
TARBALL_SHA256="$(node -e "console.log(require('crypto').createHash('sha256').update(require('fs').readFileSync(process.argv[1])).digest('hex'))" "$WORK/$TARBALL")"

echo "==> Extracting"
mkdir "$WORK/release"
tar -xzf "$WORK/$TARBALL" -C "$WORK/release"
RELEASE="$WORK/release/libsodium-$VERSION"
SRC="$RELEASE/src/libsodium"
[[ -d "$SRC" ]] || { echo "unexpected tarball layout: no libsodium-$VERSION/src/libsodium" >&2; exit 1; }

echo "==> Copying the subset into a staging folder"
STAGE="$WORK/stage"
mkdir "$STAGE"
missing=0
while read -r _hash file; do
  [[ -n "$file" ]] || continue
  if [[ -f "$SRC/$file" ]]; then
    mkdir -p "$STAGE/$(dirname "$file")"
    cp "$SRC/$file" "$STAGE/$file"
  else
    echo "   not in $VERSION: $file" >&2
    missing=1
  fi
done < "$DEST/SHA256SUMS"
[[ "$missing" == 0 ]] || { echo "the release lacks files the subset uses: nothing was changed" >&2; exit 1; }
cp "$RELEASE/LICENSE" "$STAGE/LICENSE"

echo "==> Building the staged copy for this computer"
SOURCES=()
while read -r source; do SOURCES+=("$STAGE/$source"); done < <(grep -o 'SODIUM}/[^ )]*\.c' "$CPP/CMakeLists.txt" | sed 's#^SODIUM}/##')
if ! cc -O2 -DCONFIGURED=1 -DNATIVE_LITTLE_ENDIAN=1 -D_GNU_SOURCE=1 -DSODIUM_STATIC=1 \
  -I"$STAGE/include" -I"$STAGE/include/sodium" "$HELPERS/vectors.c" "${SOURCES[@]}" -o "$WORK/vectors" 2> "$WORK/build.log"; then
  cat "$WORK/build.log" >&2
  echo "the staged copy does not build (a new file may be needed): nothing was changed" >&2
  exit 1
fi

echo "==> Checking the app's nw2 vectors"
node "$HELPERS/check-vectors.mjs" "$WORK/vectors" "$FIXTURE"

echo "==> Replacing android/walletcrypto/src/main/cpp/libsodium"
node "$ROOT/scripts/check-libsodium.mjs" --write "$STAGE" >/dev/null
{
  cat <<README
# libsodium $VERSION (subset)

Only what the wallet store needs: argon2id (\`crypto_pwhash_argon2id\`) and
XChaCha20-Poly1305 (\`crypto_aead_xchacha20poly1305_ietf_*\`), with the code
they call (BLAKE2b, ChaCha20, HChaCha20, Poly1305, constant-time compare,
\`sodium_memzero\`, base64 codecs, CPU feature detection). Every file is
unmodified and keeps its path under \`src/libsodium/\` of the release;
\`LICENSE\` is the release's ISC licence. Nothing else of libsodium is compiled.

Do not edit these files: \`npm run lint\` checks them against \`SHA256SUMS\`.

## Updating

\`\`\`sh
scripts/update-libsodium.sh <version>
\`\`\`

It downloads the release, checks its signature, copies these same files,
checks them against the app's \`nw2:\` vectors and only then replaces this
folder. Rebuild the app afterwards (remove \`android/walletcrypto/.cxx\`).

## Where it comes from

- Release tarball: \`$URL\`
- SHA-256 of the tarball: \`$TARBALL_SHA256\`
- Its minisign signature (\`.minisig\` next to it) verifies with libsodium's
  published key \`$PUBLIC_KEY\`
  (https://doc.libsodium.org/installation).

To check this copy by hand, extract the tarball and run, from its \`src/libsodium/\`:

\`\`\`sh
sha256sum -c path/to/android/walletcrypto/src/main/cpp/libsodium/SHA256SUMS
\`\`\`

## Build notes

- \`../CMakeLists.txt\` compiles these files with \`CONFIGURED\`, \`NATIVE_LITTLE_ENDIAN\`
  and \`HAVE_SYS_AUXV_H\` (every Android ABI is little-endian; the auxiliary
  vector tells NEON on 32-bit ARM). No x86 SIMD flag is set, so x86 builds
  (emulators) use the reference code; arm64 uses the NEON Argon2 code.
- \`randombytes_buf\` and \`sodium_misuse\`, which the full library provides,
  come from \`../wallet_sodium.c\`. \`sodium_init\` is not used: the JNI load
  hook picks the implementations instead.

## Files

README
  sed 's/^[0-9a-f]*  /- `/; s/$/`/' "$STAGE/SHA256SUMS"
} > "$STAGE/README.md"

rm -rf "$DEST"
mv "$STAGE" "$DEST"

echo "==> Checking the new copy"
node "$ROOT/scripts/check-libsodium.mjs"
(cd "$ROOT" && npx jest tests/unit/encryption.test.ts --silent)

echo
echo "libsodium $VERSION is in place. Review the change (git diff --stat android/walletcrypto),"
echo "then rebuild the app: rm -rf android/walletcrypto/.cxx android/app/.cxx and build again."

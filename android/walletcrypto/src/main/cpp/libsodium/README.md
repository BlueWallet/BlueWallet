# libsodium 1.0.22 (subset)

Only what the wallet store needs: argon2id (`crypto_pwhash_argon2id`) and
XChaCha20-Poly1305 (`crypto_aead_xchacha20poly1305_ietf_*`), with the code
they call (BLAKE2b, ChaCha20, HChaCha20, Poly1305, constant-time compare,
`sodium_memzero`, base64 codecs, CPU feature detection). Every file is
unmodified and keeps its path under `src/libsodium/` of the release;
`LICENSE` is the release's ISC licence. Nothing else of libsodium is compiled.

Do not edit these files: `npm run lint` checks them against `SHA256SUMS`.

## Updating

```sh
scripts/update-libsodium.sh <version>
```

It downloads the release, checks its signature, copies these same files,
checks them against the app's `nw2:` vectors and only then replaces this
folder. Rebuild the app afterwards (remove `android/walletcrypto/.cxx`).

## Where it comes from

- Release tarball: `https://download.libsodium.org/libsodium/releases/libsodium-1.0.22.tar.gz`
- SHA-256 of the tarball: `adbdd8f16149e81ac6078a03aca6fc03b592b89ef7b5ed83841c086191be3349`
- Its minisign signature (`.minisig` next to it) verifies with libsodium's
  published key `RWQf6LRCGA9i53mlYecO4IzT51TGPpvWucNSCh1CBM0QTaLn73Y7GFO3`
  (https://doc.libsodium.org/installation).

To check this copy by hand, extract the tarball and run, from its `src/libsodium/`:

```sh
sha256sum -c path/to/android/walletcrypto/src/main/cpp/libsodium/SHA256SUMS
```

## Build notes

- `../CMakeLists.txt` compiles these files with `CONFIGURED`, `NATIVE_LITTLE_ENDIAN`
  and `HAVE_SYS_AUXV_H` (every Android ABI is little-endian; the auxiliary
  vector tells NEON on 32-bit ARM). No x86 SIMD flag is set, so x86 builds
  (emulators) use the reference code; arm64 uses the NEON Argon2 code.
- `randombytes_buf` and `sodium_misuse`, which the full library provides,
  come from `../wallet_sodium.c`. `sodium_init` is not used: the JNI load
  hook picks the implementations instead.

## Files

- `crypto_aead/xchacha20poly1305/aead_xchacha20poly1305.c`
- `crypto_core/hchacha20/core_hchacha20.c`
- `crypto_generichash/blake2b/ref/blake2.h`
- `crypto_generichash/blake2b/ref/blake2b-compress-ref.c`
- `crypto_generichash/blake2b/ref/blake2b-ref.c`
- `crypto_generichash/blake2b/ref/generichash_blake2b.c`
- `crypto_onetimeauth/poly1305/donna/poly1305_donna.c`
- `crypto_onetimeauth/poly1305/donna/poly1305_donna.h`
- `crypto_onetimeauth/poly1305/donna/poly1305_donna32.h`
- `crypto_onetimeauth/poly1305/onetimeauth_poly1305.c`
- `crypto_onetimeauth/poly1305/onetimeauth_poly1305.h`
- `crypto_pwhash/argon2/argon2-core.c`
- `crypto_pwhash/argon2/argon2-core.h`
- `crypto_pwhash/argon2/argon2-encoding.c`
- `crypto_pwhash/argon2/argon2-encoding.h`
- `crypto_pwhash/argon2/argon2-fill-block-neon.c`
- `crypto_pwhash/argon2/argon2-fill-block-ref.c`
- `crypto_pwhash/argon2/argon2.c`
- `crypto_pwhash/argon2/argon2.h`
- `crypto_pwhash/argon2/blake2b-long.c`
- `crypto_pwhash/argon2/blake2b-long.h`
- `crypto_pwhash/argon2/blamka-round-neon.h`
- `crypto_pwhash/argon2/blamka-round-ref.h`
- `crypto_pwhash/argon2/pwhash_argon2id.c`
- `crypto_stream/chacha20/ref/chacha20_ref.c`
- `crypto_stream/chacha20/ref/chacha20_ref.h`
- `crypto_stream/chacha20/stream_chacha20.c`
- `crypto_stream/chacha20/stream_chacha20.h`
- `crypto_verify/verify.c`
- `include/sodium/core.h`
- `include/sodium/crypto_aead_chacha20poly1305.h`
- `include/sodium/crypto_aead_xchacha20poly1305.h`
- `include/sodium/crypto_core_hchacha20.h`
- `include/sodium/crypto_generichash_blake2b.h`
- `include/sodium/crypto_onetimeauth_poly1305.h`
- `include/sodium/crypto_pwhash_argon2id.h`
- `include/sodium/crypto_stream_chacha20.h`
- `include/sodium/crypto_verify_16.h`
- `include/sodium/crypto_verify_32.h`
- `include/sodium/crypto_verify_64.h`
- `include/sodium/export.h`
- `include/sodium/private/chacha20_ietf_ext.h`
- `include/sodium/private/common.h`
- `include/sodium/private/implementations.h`
- `include/sodium/randombytes.h`
- `include/sodium/runtime.h`
- `include/sodium/utils.h`
- `sodium/codecs.c`
- `sodium/runtime.c`
- `sodium/utils.c`

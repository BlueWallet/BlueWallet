cmake_minimum_required(VERSION 3.22.1)
project(walletsodium C)

# The libsodium subset (libsodium/README.md) and the JNI glue, as one small library.
set(SODIUM ${CMAKE_CURRENT_SOURCE_DIR}/libsodium)

add_library(walletsodium SHARED
  wallet_sodium.c
  ${SODIUM}/crypto_aead/xchacha20poly1305/aead_xchacha20poly1305.c
  ${SODIUM}/crypto_core/hchacha20/core_hchacha20.c
  ${SODIUM}/crypto_generichash/blake2b/ref/blake2b-compress-ref.c
  ${SODIUM}/crypto_generichash/blake2b/ref/blake2b-ref.c
  ${SODIUM}/crypto_generichash/blake2b/ref/generichash_blake2b.c
  ${SODIUM}/crypto_onetimeauth/poly1305/donna/poly1305_donna.c
  ${SODIUM}/crypto_onetimeauth/poly1305/onetimeauth_poly1305.c
  ${SODIUM}/crypto_pwhash/argon2/argon2-core.c
  ${SODIUM}/crypto_pwhash/argon2/argon2-encoding.c
  ${SODIUM}/crypto_pwhash/argon2/argon2-fill-block-neon.c
  ${SODIUM}/crypto_pwhash/argon2/argon2-fill-block-ref.c
  ${SODIUM}/crypto_pwhash/argon2/argon2.c
  ${SODIUM}/crypto_pwhash/argon2/blake2b-long.c
  ${SODIUM}/crypto_pwhash/argon2/pwhash_argon2id.c
  ${SODIUM}/crypto_stream/chacha20/ref/chacha20_ref.c
  ${SODIUM}/crypto_stream/chacha20/stream_chacha20.c
  ${SODIUM}/crypto_verify/verify.c
  ${SODIUM}/sodium/codecs.c
  ${SODIUM}/sodium/runtime.c
  ${SODIUM}/sodium/utils.c
)

target_include_directories(walletsodium PRIVATE ${SODIUM}/include ${SODIUM}/include/sodium)
# What libsodium's configure would find on Android: little-endian on every ABI, getauxval for CPU features.
# SODIUM_STATIC keeps libsodium's own symbols out of the library's exports.
target_compile_definitions(walletsodium PRIVATE CONFIGURED=1 NATIVE_LITTLE_ENDIAN=1 HAVE_SYS_AUXV_H=1 _GNU_SOURCE=1 SODIUM_STATIC=1)
target_compile_options(walletsodium PRIVATE -O3 -fvisibility=hidden -Wno-unused-function)
# Only the JNI functions are exported; 16 KB pages for Android 15+ devices.
target_link_options(walletsodium PRIVATE -Wl,--gc-sections -Wl,-z,max-page-size=16384)

/*
 * Host build of the vendored libsodium subset, for scripts/update-libsodium.sh:
 * derives a key and seals a plaintext the way the `nw2:` format does.
 *
 *   vectors <password> <salt hex> <nonce hex> <t> <m KiB> <aad> <plaintext>
 *   prints  key=<hex> and ct=<hex>
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "sodium/crypto_aead_xchacha20poly1305.h"
#include "sodium/crypto_pwhash_argon2id.h"

#if defined(__APPLE__) || defined(__FreeBSD__) || defined(__OpenBSD__)
void randombytes_buf(void *const buf, const size_t size) { arc4random_buf(buf, size); }
#else
#include <sys/random.h>
void randombytes_buf(void *const buf, const size_t size) {
    if (getrandom(buf, size, 0) != (ssize_t) size) abort();
}
#endif
void sodium_misuse(void) { abort(); }

static int unhex(const char *hex, unsigned char *out, size_t len) {
    if (strlen(hex) != len * 2) return -1;
    for (size_t i = 0; i < len; i++) {
        if (sscanf(hex + 2 * i, "%2hhx", &out[i]) != 1) return -1;
    }
    return 0;
}

static void print_hex(const char *label, const unsigned char *bytes, size_t len) {
    printf("%s=", label);
    for (size_t i = 0; i < len; i++) printf("%02x", bytes[i]);
    printf("\n");
}

int main(int argc, char **argv) {
    if (argc != 8) {
        fprintf(stderr, "usage: vectors <password> <salt hex> <nonce hex> <t> <m KiB> <aad> <plaintext>\n");
        return 2;
    }
    unsigned char salt[crypto_pwhash_argon2id_SALTBYTES], nonce[crypto_aead_xchacha20poly1305_ietf_NPUBBYTES], key[32];
    if (unhex(argv[2], salt, sizeof salt) || unhex(argv[3], nonce, sizeof nonce)) return 2;
    if (crypto_pwhash_argon2id(key, sizeof key, argv[1], strlen(argv[1]), salt, strtoull(argv[4], NULL, 10),
                               (size_t) strtoull(argv[5], NULL, 10) * 1024, crypto_pwhash_argon2id_ALG_ARGON2ID13) != 0) {
        return 3;
    }
    print_hex("key", key, sizeof key);
    size_t mlen = strlen(argv[7]);
    unsigned char *c = malloc(mlen + crypto_aead_xchacha20poly1305_ietf_ABYTES);
    unsigned long long clen = 0;
    if (c == NULL || crypto_aead_xchacha20poly1305_ietf_encrypt(c, &clen, (const unsigned char *) argv[7], mlen, (const unsigned char *) argv[6],
                                                                strlen(argv[6]), NULL, nonce, key) != 0) {
        return 3;
    }
    print_hex("ct", c, (size_t) clen);
    free(c);
    return 0;
}

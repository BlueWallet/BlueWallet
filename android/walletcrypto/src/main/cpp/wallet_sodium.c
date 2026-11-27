/*
 * JNI entry points for the wallet store's encryption (format `nw2:`, see
 * blue_modules/encryption.ts): argon2id to derive the key from the app
 * password, and XChaCha20-Poly1305 to seal each bucket. Both are libsodium's
 * own functions (libsodium/, unmodified); this file only moves bytes between
 * Java arrays and them, and wipes its copies of secrets.
 */
#include <jni.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

#include "sodium/crypto_aead_xchacha20poly1305.h"
#include "sodium/crypto_pwhash_argon2id.h"
#include "sodium/private/implementations.h"
#include "sodium/runtime.h"
#include "sodium/utils.h"

/* The two symbols of the full library that the compiled subset calls. */
void randombytes_buf(void *const buf, const size_t size) { arc4random_buf(buf, size); }
void sodium_misuse(void) { abort(); }

/* What sodium_init would do for these primitives: pick the fastest code for this CPU. */
JNIEXPORT jint JNI_OnLoad(JavaVM *vm, void *reserved) {
    (void) vm;
    (void) reserved;
    _sodium_runtime_get_cpu_features();
    _crypto_generichash_blake2b_pick_best_implementation();
    _crypto_onetimeauth_poly1305_pick_best_implementation();
    _crypto_pwhash_argon2_pick_best_implementation();
    _crypto_stream_chacha20_pick_best_implementation();
    return JNI_VERSION_1_6;
}

/* A copy of a Java array; `len` is 0 and `bytes` NULL for an empty or null one. */
typedef struct {
    unsigned char *bytes;
    size_t len;
    int ok;
} buffer;

static buffer copy_in(JNIEnv *env, jbyteArray array) {
    buffer b = {NULL, 0, 1};
    if (array == NULL) return b;
    jsize len = (*env)->GetArrayLength(env, array);
    if (len == 0) return b;
    b.bytes = malloc((size_t) len);
    if (b.bytes == NULL) {
        b.ok = 0;
        return b;
    }
    (*env)->GetByteArrayRegion(env, array, 0, len, (jbyte *) b.bytes);
    b.len = (size_t) len;
    return b;
}

static void release(buffer *b) {
    if (b->bytes != NULL) {
        sodium_memzero(b->bytes, b->len);
        free(b->bytes);
    }
    b->bytes = NULL;
    b->len = 0;
}

static jbyteArray copy_out(JNIEnv *env, const unsigned char *bytes, size_t len) {
    if (len > INT32_MAX) return NULL;
    jbyteArray out = (*env)->NewByteArray(env, (jsize) len);
    if (out != NULL && len > 0) (*env)->SetByteArrayRegion(env, out, 0, (jsize) len, (const jbyte *) bytes);
    return out;
}

/* argon2id v1.3, one lane. Null when the parameters are out of libsodium's range or memory runs out. */
JNIEXPORT jbyteArray JNICALL Java_org_neurai_walletcrypto_WalletSodium_argon2id(JNIEnv *env, jclass cls, jbyteArray password,
                                                                                jbyteArray salt, jlong opsLimit, jlong memLimitBytes,
                                                                                jint outLength) {
    (void) cls;
    if (outLength < (jint) crypto_pwhash_argon2id_BYTES_MIN || outLength > 64) return NULL;
    if (opsLimit < (jlong) crypto_pwhash_argon2id_OPSLIMIT_MIN || memLimitBytes < (jlong) crypto_pwhash_argon2id_MEMLIMIT_MIN) return NULL;
    if ((unsigned long long) memLimitBytes > (unsigned long long) SIZE_MAX) return NULL;

    buffer pw = copy_in(env, password);
    buffer s = copy_in(env, salt);
    jbyteArray result = NULL;
    unsigned char key[64];
    if (pw.ok && s.ok && s.len == crypto_pwhash_argon2id_SALTBYTES &&
        crypto_pwhash_argon2id(key, (unsigned long long) outLength, (const char *) (pw.bytes != NULL ? pw.bytes : (unsigned char *) ""),
                               (unsigned long long) pw.len, s.bytes, (unsigned long long) opsLimit, (size_t) memLimitBytes,
                               crypto_pwhash_argon2id_ALG_ARGON2ID13) == 0) {
        result = copy_out(env, key, (size_t) outLength);
    }
    sodium_memzero(key, sizeof key);
    release(&pw);
    release(&s);
    return result;
}

/* XChaCha20-Poly1305 (IETF): ciphertext followed by the 16-byte tag. Null on a bad key or nonce size. */
JNIEXPORT jbyteArray JNICALL Java_org_neurai_walletcrypto_WalletSodium_seal(JNIEnv *env, jclass cls, jbyteArray key, jbyteArray nonce,
                                                                            jbyteArray plaintext, jbyteArray aad) {
    (void) cls;
    buffer k = copy_in(env, key);
    buffer n = copy_in(env, nonce);
    buffer m = copy_in(env, plaintext);
    buffer ad = copy_in(env, aad);
    jbyteArray result = NULL;
    unsigned char *c = NULL;
    if (k.ok && n.ok && m.ok && ad.ok && k.len == crypto_aead_xchacha20poly1305_ietf_KEYBYTES &&
        n.len == crypto_aead_xchacha20poly1305_ietf_NPUBBYTES && m.len <= crypto_aead_xchacha20poly1305_ietf_MESSAGEBYTES_MAX) {
        c = malloc(m.len + crypto_aead_xchacha20poly1305_ietf_ABYTES);
        unsigned long long clen = 0;
        if (c != NULL && crypto_aead_xchacha20poly1305_ietf_encrypt(c, &clen, m.bytes, (unsigned long long) m.len, ad.bytes,
                                                                     (unsigned long long) ad.len, NULL, n.bytes, k.bytes) == 0) {
            result = copy_out(env, c, (size_t) clen);
        }
        free(c);
    }
    release(&k);
    release(&n);
    release(&m);
    release(&ad);
    return result;
}

/* The plaintext, or null when the tag does not verify (wrong key, altered header, ciphertext or tag). */
JNIEXPORT jbyteArray JNICALL Java_org_neurai_walletcrypto_WalletSodium_open(JNIEnv *env, jclass cls, jbyteArray key, jbyteArray nonce,
                                                                            jbyteArray ciphertext, jbyteArray aad) {
    (void) cls;
    buffer k = copy_in(env, key);
    buffer n = copy_in(env, nonce);
    buffer c = copy_in(env, ciphertext);
    buffer ad = copy_in(env, aad);
    jbyteArray result = NULL;
    if (k.ok && n.ok && c.ok && ad.ok && k.len == crypto_aead_xchacha20poly1305_ietf_KEYBYTES &&
        n.len == crypto_aead_xchacha20poly1305_ietf_NPUBBYTES && c.len >= crypto_aead_xchacha20poly1305_ietf_ABYTES) {
        size_t mcap = c.len - crypto_aead_xchacha20poly1305_ietf_ABYTES;
        unsigned char *m = malloc(mcap > 0 ? mcap : 1);
        unsigned long long mlen = 0;
        if (m != NULL && crypto_aead_xchacha20poly1305_ietf_decrypt(m, &mlen, NULL, c.bytes, (unsigned long long) c.len, ad.bytes,
                                                                     (unsigned long long) ad.len, n.bytes, k.bytes) == 0) {
            result = copy_out(env, m, (size_t) mlen);
        }
        if (m != NULL) {
            sodium_memzero(m, mcap);
            free(m);
        }
    }
    release(&k);
    release(&n);
    release(&c);
    release(&ad);
    return result;
}

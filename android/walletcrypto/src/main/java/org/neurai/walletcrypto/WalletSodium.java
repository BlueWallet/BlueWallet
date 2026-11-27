package org.neurai.walletcrypto;

/**
 * libsodium's argon2id and XChaCha20-Poly1305, as the wallet store uses them
 * (format {@code nw2:}, blue_modules/encryption.ts). Each call copies its
 * inputs into native memory and wipes the copies before returning.
 */
public final class WalletSodium {
    static {
        System.loadLibrary("walletsodium");
    }

    private WalletSodium() {}

    /**
     * {@code crypto_pwhash_argon2id} (v1.3, one lane).
     *
     * @return {@code outLength} bytes, or null when the parameters are out of
     *     range (the salt must be 16 bytes) or the memory cannot be allocated.
     */
    public static native byte[] argon2id(byte[] password, byte[] salt, long opsLimit, long memLimitBytes, int outLength);

    /**
     * {@code crypto_aead_xchacha20poly1305_ietf_encrypt}: ciphertext followed by its 16-byte tag.
     *
     * @return null when the key is not 32 bytes or the nonce not 24.
     */
    public static native byte[] seal(byte[] key, byte[] nonce, byte[] plaintext, byte[] aad);

    /**
     * {@code crypto_aead_xchacha20poly1305_ietf_decrypt}.
     *
     * @return the plaintext, or null when the tag does not verify.
     */
    public static native byte[] open(byte[] key, byte[] nonce, byte[] ciphertext, byte[] aad);
}

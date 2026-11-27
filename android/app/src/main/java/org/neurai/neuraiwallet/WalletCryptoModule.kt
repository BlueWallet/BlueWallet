package org.neurai.neuraiwallet

import android.util.Base64
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import org.neurai.walletcrypto.WalletSodium

/**
 * The wallet store's key derivation and bucket sealing (codegen/NativeWalletCrypto.ts),
 * on libsodium (the walletcrypto module). The JS side decides the format; this
 * only converts encodings and wipes the byte arrays it made from secrets.
 */
@ReactModule(name = WalletCryptoModule.NAME)
class WalletCryptoModule(reactContext: ReactApplicationContext) : NativeWalletCryptoSpec(reactContext) {

    companion object {
        const val NAME = "WalletCrypto"
        private const val BASE64URL = Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING
        private const val KEY_BYTES = 32
    }

    private fun decode(value: String): ByteArray = Base64.decode(value, BASE64URL)

    private fun encode(bytes: ByteArray): String = Base64.encodeToString(bytes, BASE64URL)

    override fun deriveKey(password: String, salt: String, opsLimit: Double, memLimitKiB: Double): String {
        val passwordBytes = decode(password)
        try {
            val key = WalletSodium.argon2id(passwordBytes, decode(salt), opsLimit.toLong(), memLimitKiB.toLong() * 1024, KEY_BYTES)
                ?: throw IllegalStateException("argon2id failed (parameters or memory)")
            try {
                return encode(key)
            } finally {
                key.fill(0)
            }
        } finally {
            passwordBytes.fill(0)
        }
    }

    override fun seal(key: String, nonce: String, plaintext: String, aad: String): String {
        val keyBytes = decode(key)
        val message = plaintext.toByteArray(Charsets.UTF_8)
        try {
            val sealed = WalletSodium.seal(keyBytes, decode(nonce), message, aad.toByteArray(Charsets.UTF_8))
                ?: throw IllegalArgumentException("bad key or nonce size")
            return encode(sealed)
        } finally {
            keyBytes.fill(0)
            message.fill(0)
        }
    }

    override fun open(key: String, nonce: String, ciphertext: String, aad: String): String? {
        val keyBytes = decode(key)
        try {
            // A body that is not base64url cannot be ours: the same answer as a failed tag.
            val sealed = try {
                decode(ciphertext)
            } catch (e: IllegalArgumentException) {
                return null
            }
            val message = WalletSodium.open(keyBytes, decode(nonce), sealed, aad.toByteArray(Charsets.UTF_8)) ?: return null
            try {
                return String(message, Charsets.UTF_8)
            } finally {
                message.fill(0)
            }
        } finally {
            keyBytes.fill(0)
        }
    }
}

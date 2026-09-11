package io.bluewallet.bluewallet

import java.security.PrivateKey
import javax.crypto.Cipher
import javax.crypto.spec.SecretKeySpec

/** Decrypts the hybrid RSA/AES format used by react-native-secure-key-store before v2. */
internal object LegacySecureStorageCrypto {
    private const val RSA_ALGORITHM = "RSA/ECB/PKCS1Padding"
    private const val AES_ALGORITHM = "AES/ECB/PKCS5Padding"

    fun decrypt(privateKey: PrivateKey, encryptedKey: ByteArray, encryptedData: ByteArray): String {
        val rsaCipher = Cipher.getInstance(RSA_ALGORITHM).apply {
            init(Cipher.DECRYPT_MODE, privateKey)
        }
        val aesKey = SecretKeySpec(rsaCipher.doFinal(encryptedKey), "AES")
        val aesCipher = Cipher.getInstance(AES_ALGORITHM).apply {
            init(Cipher.DECRYPT_MODE, aesKey)
        }
        return aesCipher.doFinal(encryptedData).toString(Charsets.UTF_8)
    }
}

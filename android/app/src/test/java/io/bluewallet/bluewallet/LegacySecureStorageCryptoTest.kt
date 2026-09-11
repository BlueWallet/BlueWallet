package io.bluewallet.bluewallet

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test
import java.security.KeyPairGenerator
import javax.crypto.Cipher
import javax.crypto.KeyGenerator

class LegacySecureStorageCryptoTest {
    @Test
    fun decryptsReactNativeSecureKeyStoreHybridFormat() {
        val value = "legacy wallet data 🔐"
        val keyPair = KeyPairGenerator.getInstance("RSA").apply { initialize(2048) }.generateKeyPair()
        val aesKey = KeyGenerator.getInstance("AES").apply { init(256) }.generateKey()
        val encryptedKey = Cipher.getInstance("RSA/ECB/PKCS1Padding").run {
            init(Cipher.ENCRYPT_MODE, keyPair.public)
            doFinal(aesKey.encoded)
        }
        val encryptedData = Cipher.getInstance("AES/ECB/PKCS5Padding").run {
            init(Cipher.ENCRYPT_MODE, aesKey)
            doFinal(value.toByteArray(Charsets.UTF_8))
        }

        assertEquals(value, LegacySecureStorageCrypto.decrypt(keyPair.private, encryptedKey, encryptedData))
    }

    @Test
    fun rejectsIncompleteLegacyCiphertext() {
        val keyPair = KeyPairGenerator.getInstance("RSA").apply { initialize(2048) }.generateKeyPair()
        val aesKey = KeyGenerator.getInstance("AES").apply { init(256) }.generateKey()
        val encryptedKey = Cipher.getInstance("RSA/ECB/PKCS1Padding").run {
            init(Cipher.ENCRYPT_MODE, keyPair.public)
            doFinal(aesKey.encoded)
        }
        val encryptedData = Cipher.getInstance("AES/ECB/PKCS5Padding").run {
            init(Cipher.ENCRYPT_MODE, aesKey)
            doFinal("wallet data".toByteArray(Charsets.UTF_8))
        }

        assertThrows(Exception::class.java) {
            LegacySecureStorageCrypto.decrypt(keyPair.private, encryptedKey, encryptedData.copyOf(encryptedData.size - 1))
        }
    }
}

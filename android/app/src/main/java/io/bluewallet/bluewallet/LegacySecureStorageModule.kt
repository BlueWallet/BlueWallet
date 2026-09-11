package io.bluewallet.bluewallet

import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule
import java.security.KeyStore
import java.security.PrivateKey

@Suppress("DEPRECATION")
@ReactModule(name = LegacySecureStorageModule.NAME)
class LegacySecureStorageModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "LegacySecureStorage"
        private const val PREFERENCES_NAME = "secret_shared_prefs"
        private const val LEGACY_KEY_FILE_PREFIX = "SKS_KEY_FILE"
        private const val LEGACY_DATA_FILE_PREFIX = "SKS_DATA_FILE"
        private val LEGACY_KEYSTORE_PROVIDERS = arrayOf("AndroidKeyStore", "AndroidKeyStoreBCWorkaround", "AndroidOpenSSL")
    }

    override fun getName(): String = NAME

    private fun preferences(): SharedPreferences = EncryptedSharedPreferences.create(
        PREFERENCES_NAME,
        MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC),
        reactApplicationContext,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    private fun legacyFile(prefix: String, key: String) = reactApplicationContext.getFileStreamPath(prefix + key)

    private fun hasLegacyFileValue(key: String): Boolean =
        legacyFile(LEGACY_KEY_FILE_PREFIX, key).isFile || legacyFile(LEGACY_DATA_FILE_PREFIX, key).isFile

    private fun legacyKeyStore(): KeyStore {
        var lastError: Exception? = null
        for (provider in LEGACY_KEYSTORE_PROVIDERS) {
            try {
                return KeyStore.getInstance(provider).apply { load(null) }
            } catch (error: Exception) {
                lastError = error
            }
        }
        throw IllegalStateException("No legacy Android KeyStore provider is available", lastError)
    }

    private fun getLegacyFileValue(key: String): String? {
        val encryptedKeyFile = legacyFile(LEGACY_KEY_FILE_PREFIX, key)
        val encryptedDataFile = legacyFile(LEGACY_DATA_FILE_PREFIX, key)
        if (!encryptedKeyFile.exists() && !encryptedDataFile.exists()) return null
        if (!encryptedKeyFile.isFile || !encryptedDataFile.isFile) {
            throw IllegalStateException("Legacy secure storage is incomplete for key: $key")
        }

        val privateKey = legacyKeyStore().getKey(key, null) as? PrivateKey
            ?: throw IllegalStateException("Legacy Android KeyStore key is missing for key: $key")
        return LegacySecureStorageCrypto.decrypt(
            privateKey,
            encryptedKeyFile.readBytes(),
            encryptedDataFile.readBytes(),
        )
    }

    private fun removeLegacyFileValue(key: String) {
        val files = arrayOf(legacyFile(LEGACY_KEY_FILE_PREFIX, key), legacyFile(LEGACY_DATA_FILE_PREFIX, key))
        val hadLegacyFiles = files.any { it.exists() }
        for (file in files) {
            if (file.exists() && !reactApplicationContext.deleteFile(file.name) && file.exists()) {
                throw IllegalStateException("Unable to delete legacy secure-storage file: ${file.name}")
            }
        }
        if (hadLegacyFiles) {
            val keyStore = legacyKeyStore()
            if (keyStore.containsAlias(key)) keyStore.deleteEntry(key)
        }
    }

    private fun recordCleanupFailure(current: Exception?, error: Exception): Exception {
        current?.addSuppressed(error)
        return current ?: error
    }

    @ReactMethod
    fun get(key: String, promise: Promise) {
        try {
            val value = try {
                preferences().getString(key, null)
            } catch (error: Exception) {
                if (!hasLegacyFileValue(key)) throw error
                null
            }
            promise.resolve(value ?: getLegacyFileValue(key))
        } catch (error: Exception) {
            promise.reject("LEGACY_SECURE_STORAGE_READ", error)
        }
    }

    @ReactMethod
    fun contains(key: String, promise: Promise) {
        try {
            val containsEncryptedPreference = try {
                preferences().contains(key)
            } catch (error: Exception) {
                if (!hasLegacyFileValue(key)) throw error
                false
            }
            promise.resolve(containsEncryptedPreference || hasLegacyFileValue(key))
        } catch (error: Exception) {
            promise.reject("LEGACY_SECURE_STORAGE_CONTAINS", error)
        }
    }

    @ReactMethod
    fun remove(key: String, promise: Promise) {
        try {
            var cleanupFailure: Exception? = null
            try {
                if (!preferences().edit().remove(key).commit()) {
                    throw IllegalStateException("EncryptedSharedPreferences did not commit removal for key: $key")
                }
            } catch (error: Exception) {
                cleanupFailure = recordCleanupFailure(cleanupFailure, error)
            }
            try {
                removeLegacyFileValue(key)
            } catch (error: Exception) {
                cleanupFailure = recordCleanupFailure(cleanupFailure, error)
            }
            cleanupFailure?.let { throw it }
            promise.resolve(null)
        } catch (error: Exception) {
            promise.reject("LEGACY_SECURE_STORAGE_REMOVE", error)
        }
    }

    @ReactMethod
    fun clear(promise: Promise) {
        try {
            val legacyKeys = reactApplicationContext.fileList().mapNotNull { filename ->
                when {
                    filename.startsWith(LEGACY_KEY_FILE_PREFIX) -> filename.removePrefix(LEGACY_KEY_FILE_PREFIX)
                    filename.startsWith(LEGACY_DATA_FILE_PREFIX) -> filename.removePrefix(LEGACY_DATA_FILE_PREFIX)
                    else -> null
                }
            }.toSet()
            var cleanupFailure: Exception? = null
            try {
                if (!preferences().edit().clear().commit()) {
                    throw IllegalStateException("EncryptedSharedPreferences did not commit clear")
                }
            } catch (error: Exception) {
                cleanupFailure = recordCleanupFailure(cleanupFailure, error)
            }
            for (key in legacyKeys) {
                try {
                    removeLegacyFileValue(key)
                } catch (error: Exception) {
                    cleanupFailure = recordCleanupFailure(cleanupFailure, error)
                }
            }
            cleanupFailure?.let { throw it }
            promise.resolve(null)
        } catch (error: Exception) {
            promise.reject("LEGACY_SECURE_STORAGE_CLEAR", error)
        }
    }
}

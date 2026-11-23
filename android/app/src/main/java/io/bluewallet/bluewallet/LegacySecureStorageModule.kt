package io.bluewallet.bluewallet

import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule

/** Read-only compatibility bridge for data written by react-native-secure-key-store. */
@Suppress("DEPRECATION")
@ReactModule(name = LegacySecureStorageModule.NAME)
class LegacySecureStorageModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    companion object {
        const val NAME = "LegacySecureStorage"
        private const val PREFERENCES_NAME = "secret_shared_prefs"
    }

    override fun getName(): String = NAME

    private fun preferences(): SharedPreferences = EncryptedSharedPreferences.create(
        PREFERENCES_NAME,
        MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC),
        reactApplicationContext,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    @ReactMethod
    fun get(key: String, promise: Promise) {
        try {
            promise.resolve(preferences().getString(key, null))
        } catch (error: Exception) {
            promise.reject("LEGACY_SECURE_STORAGE_READ", error)
        }
    }

    @ReactMethod
    fun remove(key: String, promise: Promise) {
        try {
            if (!preferences().edit().remove(key).commit()) {
                throw IllegalStateException("Legacy secure-storage removal was not committed")
            }
            promise.resolve(null)
        } catch (error: Exception) {
            promise.reject("LEGACY_SECURE_STORAGE_REMOVE", error)
        }
    }
}

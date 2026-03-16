package io.bluewallet.bluewallet

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import java.util.UUID

class SettingsModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val sharedPref: SharedPreferences = reactContext.getSharedPreferences(
        "group.io.bluewallet.bluewallet",
        Context.MODE_PRIVATE
    )
    
    companion object {
        private const val TAG = "SettingsModule"
        private const val DEVICE_UID_KEY = "deviceUID"
        private const val DEVICE_UID_COPY_KEY = "deviceUIDCopy"
        private const val CLEAR_FILES_ON_LAUNCH_KEY = "clearFilesOnLaunch"
        private const val DO_NOT_TRACK_KEY = "donottrack"
    }

    override fun getName(): String {
        return "SettingsModule"
    }

    /**
     * Initialize device UID if not exists
     * Uses the same Android ID as react-native-device-info's getUniqueId()
     */
    @ReactMethod
    fun initializeDeviceUID(promise: Promise) {
        try {
            val isDoNotTrackEnabled = sharedPref.getString(DO_NOT_TRACK_KEY, "0") == "1"
            
            if (isDoNotTrackEnabled) {
                // Set deviceUIDCopy to "Disabled" if Do Not Track is enabled
                val currentCopy = sharedPref.getString(DEVICE_UID_COPY_KEY, "")
                if (currentCopy != "Disabled") {
                    sharedPref.edit()
                        .putString(DEVICE_UID_COPY_KEY, "Disabled")
                        .apply()
                    Log.d(TAG, "Do Not Track enabled - set deviceUIDCopy to 'Disabled'")
                }
                promise.resolve("Disabled")
                return
            }
            
            // Get the Android ID (same as react-native-device-info's getUniqueId())
            val deviceUID = try {
                android.provider.Settings.Secure.getString(
                    reactApplicationContext.contentResolver,
                    android.provider.Settings.Secure.ANDROID_ID
                ) ?: "unknown"
            } catch (e: Exception) {
                Log.e(TAG, "Error getting Android ID", e)
                "unknown"
            }
            
            // Store in deviceUID for consistency
            sharedPref.edit()
                .putString(DEVICE_UID_KEY, deviceUID)
                .apply()
            
            // Copy deviceUID to deviceUIDCopy (for Settings.bundle compatibility)
            val currentCopy = sharedPref.getString(DEVICE_UID_COPY_KEY, "")
            if (deviceUID != currentCopy) {
                sharedPref.edit()
                    .putString(DEVICE_UID_COPY_KEY, deviceUID)
                    .apply()
                Log.d(TAG, "Synced deviceUID to deviceUIDCopy: $deviceUID")
            }
            
            promise.resolve(deviceUID)
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing deviceUID", e)
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Get the device UID
     */
    @ReactMethod
    fun getDeviceUID(promise: Promise) {
        try {
            val isDoNotTrackEnabled = sharedPref.getString(DO_NOT_TRACK_KEY, "0") == "1"
            
            if (isDoNotTrackEnabled) {
                promise.resolve("Disabled")
                return
            }
            
            val deviceUID = sharedPref.getString(DEVICE_UID_KEY, null)
            promise.resolve(deviceUID)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting deviceUID", e)
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Get the device UID copy (for Settings display)
     */
    @ReactMethod
    fun getDeviceUIDCopy(promise: Promise) {
        try {
            val deviceUIDCopy = sharedPref.getString(DEVICE_UID_COPY_KEY, "")
            promise.resolve(deviceUIDCopy)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting deviceUIDCopy", e)
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Set the clearFilesOnLaunch preference
     */
    @ReactMethod
    fun setClearFilesOnLaunch(value: Boolean, promise: Promise) {
        try {
            sharedPref.edit()
                .putBoolean(CLEAR_FILES_ON_LAUNCH_KEY, value)
                .apply()
            Log.d(TAG, "Set clearFilesOnLaunch to: $value")
            promise.resolve(value)
        } catch (e: Exception) {
            Log.e(TAG, "Error setting clearFilesOnLaunch", e)
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Get the clearFilesOnLaunch preference
     */
    @ReactMethod
    fun getClearFilesOnLaunch(promise: Promise) {
        try {
            val value = sharedPref.getBoolean(CLEAR_FILES_ON_LAUNCH_KEY, false)
            promise.resolve(value)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting clearFilesOnLaunch", e)
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Set Do Not Track setting
     */
    @ReactMethod
    fun setDoNotTrack(enabled: Boolean, promise: Promise) {
        try {
            val value = if (enabled) "1" else "0"
            sharedPref.edit()
                .putString(DO_NOT_TRACK_KEY, value)
                .apply()
            
            Log.d(TAG, "Set donottrack to: $value")
            
            // Update deviceUIDCopy based on Do Not Track setting
            if (enabled) {
                sharedPref.edit()
                    .putString(DEVICE_UID_COPY_KEY, "Disabled")
                    .apply()
                Log.d(TAG, "Do Not Track enabled - set deviceUIDCopy to 'Disabled'")
            } else {
                // Re-initialize device UID
                initializeDeviceUID(promise)
                return
            }
            
            promise.resolve(enabled)
        } catch (e: Exception) {
            Log.e(TAG, "Error setting donottrack", e)
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Get Do Not Track setting
     */
    @ReactMethod
    fun getDoNotTrack(promise: Promise) {
        try {
            val value = sharedPref.getString(DO_NOT_TRACK_KEY, "0")
            val enabled = value == "1"
            promise.resolve(enabled)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting donottrack", e)
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Open the settings activity from JavaScript
     */
    @ReactMethod
    fun openSettings(promise: Promise) {
        try {
            val intent = android.content.Intent(reactApplicationContext, SettingsActivity::class.java)
            intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error opening settings", e)
            promise.reject("ERROR", e.message)
        }
    }
}

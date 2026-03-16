package io.bluewallet.bluewallet

import android.app.Application
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.SharedPreferences
import android.util.Log
import com.bugsnag.android.Bugsnag
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader
import com.facebook.react.modules.i18nmanager.I18nUtil
import io.bluewallet.bluewallet.components.segmentedcontrol.CustomSegmentedControlPackage

class MainApplication : Application(), ReactApplication {

    private lateinit var sharedPref: SharedPreferences
    private val themeChangeReceiver = ThemeChangeReceiver()
    private val preferenceChangeListener = SharedPreferences.OnSharedPreferenceChangeListener { prefs, key ->
        if (key == "preferredCurrency") {
            prefs.edit().remove("previous_price").apply()
            
            // Update BitcoinPrice widgets
            WidgetUpdateWorker.scheduleWork(this)
            
            // Immediately refresh Market widgets
            MarketWidget.refreshAllWidgetsImmediately(this)
        } else if (key == "force_dark_mode") {
            // Theme setting changed, update all widgets
            ThemeHelper.updateAllWidgets(this)
        } else if (key == "donottrack") {
            // Handle Do Not Track changes similar to iOS
            val isEnabled = prefs.getString("donottrack", "0") == "1"
            Log.d("MainApplication", "Do Not Track changed to: $isEnabled")
            
            if (isEnabled) {
                // Set deviceUIDCopy to "Disabled"
                prefs.edit()
                    .putString("deviceUIDCopy", "Disabled")
                    .apply()
                Log.d("MainApplication", "Do Not Track enabled - set deviceUIDCopy to 'Disabled'")
            } else {
                // Re-initialize device UID
                initializeDeviceUID()
            }
        } else if (key == "deviceUID") {
            // When deviceUID changes, update deviceUIDCopy
            val isDoNotTrackEnabled = prefs.getString("donottrack", "0") == "1"
            if (!isDoNotTrackEnabled) {
                val deviceUID = prefs.getString("deviceUID", null)
                if (deviceUID != null) {
                    prefs.edit()
                        .putString("deviceUIDCopy", deviceUID)
                        .apply()
                    Log.d("MainApplication", "deviceUID changed, synced to deviceUIDCopy: $deviceUID")
                }
            }
        }
    }

    override val reactNativeHost: ReactNativeHost =
        object : DefaultReactNativeHost(this) {
            override fun getPackages(): List<ReactPackage> =
                PackageList(this).packages.apply {
                    // Packages that cannot be autolinked yet can be added manually here, for example:
                    // add(MyReactNativePackage())
                    add(CustomSegmentedControlPackage())
                    add(SettingsPackage())
                }

            override fun getJSMainModuleName(): String = "index"

            override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

            override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
            override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
        }

    override val reactHost: ReactHost
        get() = getDefaultReactHost(applicationContext, reactNativeHost)

    override fun onCreate() {
        super.onCreate()
        sharedPref = getSharedPreferences("group.io.bluewallet.bluewallet", Context.MODE_PRIVATE)
        
        // Handle clearFilesOnLaunch before registering listeners
        clearFilesIfNeeded()
        
        sharedPref.registerOnSharedPreferenceChangeListener(preferenceChangeListener)
        
        // Register the theme change receiver
        registerReceiver(themeChangeReceiver, IntentFilter(Intent.ACTION_CONFIGURATION_CHANGED))
        
        val sharedI18nUtilInstance = I18nUtil.getInstance()
        sharedI18nUtilInstance.allowRTL(applicationContext, true)
        SoLoader.init(this, OpenSourceMergedSoMapping)
        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
            // If you opted-in for the New Architecture, we load the native entry point for this app.
            load()
        }

        initializeDeviceUID()
        initializeBugsnag()
    }

    override fun onTerminate() {
        super.onTerminate()
        sharedPref.unregisterOnSharedPreferenceChangeListener(preferenceChangeListener)
        
        // Unregister the theme change receiver
        try {
            unregisterReceiver(themeChangeReceiver)
        } catch (e: Exception) {
            Log.e("MainApplication", "Error unregistering theme receiver", e)
        }
    }

    private fun initializeBugsnag() {
        val isDoNotTrackEnabled = sharedPref.getString("donottrack", "0")
        if (isDoNotTrackEnabled != "1") {
            Bugsnag.start(this)
        }
    }

    /**
     * Initialize device UID similar to iOS implementation
     * Uses the same Android ID as react-native-device-info's getUniqueId()
     */
    private fun initializeDeviceUID() {
        val isDoNotTrackEnabled = sharedPref.getString("donottrack", "0") == "1"
        
        if (isDoNotTrackEnabled) {
            val currentCopy = sharedPref.getString("deviceUIDCopy", "")
            if (currentCopy != "Disabled") {
                sharedPref.edit()
                    .putString("deviceUIDCopy", "Disabled")
                    .apply()
                Log.d("MainApplication", "Do Not Track enabled - set deviceUIDCopy to 'Disabled'")
            }
            return
        }
        
        // Get the Android ID (same as react-native-device-info's getUniqueId())
        val deviceUID = try {
            android.provider.Settings.Secure.getString(
                contentResolver,
                android.provider.Settings.Secure.ANDROID_ID
            ) ?: "unknown"
        } catch (e: Exception) {
            Log.e("MainApplication", "Error getting Android ID", e)
            "unknown"
        }
        
        // Store in deviceUID for consistency
        sharedPref.edit()
            .putString("deviceUID", deviceUID)
            .apply()
        
        // Copy deviceUID to deviceUIDCopy (for Settings compatibility)
        val currentCopy = sharedPref.getString("deviceUIDCopy", "")
        if (deviceUID != currentCopy) {
            sharedPref.edit()
                .putString("deviceUIDCopy", deviceUID)
                .apply()
            Log.d("MainApplication", "Synced deviceUID to deviceUIDCopy: $deviceUID")
        }
    }

    /**
     * Clear files if clearFilesOnLaunch is enabled
     * Similar to iOS implementation
     */
    private fun clearFilesIfNeeded() {
        val shouldClear = sharedPref.getBoolean("clearFilesOnLaunch", false)
        
        if (shouldClear) {
            try {
                // Clear cache directory
                cacheDir?.let { clearDirectory(it) }
                
                // Clear files directory
                filesDir?.let { clearDirectory(it) }
                
                // Clear external cache directory
                externalCacheDir?.let { clearDirectory(it) }
                
                // Reset the flag and set a flag to show alert
                sharedPref.edit()
                    .putBoolean("clearFilesOnLaunch", false)
                    .putBoolean("shouldShowCacheClearedAlert", true)
                    .apply()
                
                Log.d("MainApplication", "Cache and files cleared on launch")
            } catch (e: Exception) {
                Log.e("MainApplication", "Error clearing files", e)
            }
        }
    }

    /**
     * Recursively clear all files in a directory
     */
    private fun clearDirectory(dir: java.io.File) {
        if (!dir.exists()) return
        
        dir.listFiles()?.forEach { file ->
            if (file.isDirectory) {
                clearDirectory(file)
            }
            try {
                file.delete()
                Log.d("MainApplication", "Deleted: ${file.absolutePath}")
            } catch (e: Exception) {
                Log.e("MainApplication", "Error deleting file: ${file.absolutePath}", e)
            }
        }
    }
}
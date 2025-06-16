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
        }
    }

    override val reactNativeHost: ReactNativeHost =
        object : DefaultReactNativeHost(this) {
            override fun getPackages(): List<ReactPackage> =
                PackageList(this).packages.apply {
                    // Packages that cannot be autolinked yet can be added manually here, for example:
                    // add(MyReactNativePackage())
                    add(CustomSegmentedControlPackage())
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
}
package io.bluewallet.bluewallet

import android.app.Application
import android.content.Context
import com.bugsnag.android.Bugsnag
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader
import com.facebook.react.modules.i18nmanager.I18nUtil

class MainApplication : Application(), ReactApplication {

    override val reactNativeHost: ReactNativeHost =
        object : DefaultReactNativeHost(this) {
            override fun getPackages(): List<ReactPackage> =
                PackageList(this).packages.apply {
                    // Packages that cannot be autolinked yet can be added manually here, for example:
                    // add(MyReactNativePackage())
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
        val sharedI18nUtilInstance = I18nUtil.getInstance()
        sharedI18nUtilInstance.allowRTL(applicationContext, true)
        SoLoader.init(this, /* native exopackage */ false)

        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
            // If you opted-in for the New Architecture, we load the native entry point for this app.
            load()
        }

        val sharedPref = applicationContext.getSharedPreferences("group.io.bluewallet.bluewallet", Context.MODE_PRIVATE)

        // Retrieve the "donottrack" value. Default to "0" if not found.
        val isDoNotTrackEnabled = sharedPref.getString("donottrack", "0")

        // Check if do not track is not enabled and initialize Bugsnag if so
        if (isDoNotTrackEnabled != "1") {
            // Initialize Bugsnag or your error tracking here
            Bugsnag.start(this)
        }
    }
}
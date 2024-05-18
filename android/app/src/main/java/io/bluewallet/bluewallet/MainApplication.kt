package io.bluewallet.bluewallet

import android.app.Application
import android.content.Context
import android.content.SharedPreferences
import com.bugsnag.android.Bugsnag
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactInstanceManager
import com.facebook.react.ReactNativeHost
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader
import com.facebook.react.modules.i18nmanager.I18nUtil

class MainApplication : Application(), ReactApplication {

    private val mReactNativeHost = object : DefaultReactNativeHost(this) {
        override fun getUseDeveloperSupport(): Boolean {
            return BuildConfig.DEBUG
        }

        override fun getPackages(): List<ReactPackage> {
            val packages = PackageList(this).packages
            // Packages that cannot be autolinked yet can be added manually here, for example:
            // packages.add(MyReactNativePackage())
            return packages
        }

        override fun getJSMainModuleName(): String {
            return "index"
        }

        override fun isNewArchEnabled(): Boolean {
            return BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        }

        override fun isHermesEnabled(): Boolean {
            return BuildConfig.IS_HERMES_ENABLED
        }
    }

    override fun getReactNativeHost(): ReactNativeHost {
        return mReactNativeHost
    }

    override fun onCreate() {
        super.onCreate()
        val sharedI18nUtilInstance = I18nUtil.getInstance()
        sharedI18nUtilInstance.allowRTL(applicationContext, true)
        SoLoader.init(this, /* native exopackage */ false)
        
        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
            // If you opted-in for the New Architecture, we load the native entry point for this app.
            DefaultNewArchitectureEntryPoint.load()
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
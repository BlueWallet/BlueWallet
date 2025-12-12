package io.bluewallet.bluewallet

import android.content.Context
import android.content.pm.ActivityInfo
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.appcompat.app.AlertDialog
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.swmansion.rnscreens.fragment.restoration.RNScreensFragmentFactory

class MainActivity : ReactActivity() {

    /**
     * Returns the name of the main component registered from JavaScript.
     * This is used to schedule rendering of the component.
     */
    override fun getMainComponentName(): String {
        return "BlueWallet"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        // react-native-screens override
        supportFragmentManager.fragmentFactory = RNScreensFragmentFactory()
        super.onCreate(null)
        if (resources.getBoolean(R.bool.portrait_only)) {
            requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        }
    }

    override fun onResume() {
        super.onResume()
        Log.d("MainActivity", "MainActivity resumed. Confirming single instance is active.")
        
        // Check if we should show cache cleared alert
        checkAndShowCacheClearedAlert()
    }
    
    private fun checkAndShowCacheClearedAlert() {
        val sharedPref = getSharedPreferences("group.io.bluewallet.bluewallet", Context.MODE_PRIVATE)
        val shouldShowAlert = sharedPref.getBoolean("shouldShowCacheClearedAlert", false)
        
        if (shouldShowAlert) {
            // Reset the flag
            sharedPref.edit()
                .putBoolean("shouldShowCacheClearedAlert", false)
                .apply()
            
            // Show alert after a short delay to ensure UI is ready
            Handler(Looper.getMainLooper()).postDelayed({
                AlertDialog.Builder(this)
                    .setTitle(R.string.cache_cleared_title)
                    .setMessage(R.string.cache_cleared_message)
                    .setPositiveButton(android.R.string.ok, null)
                    .show()
            }, 500)
        }
    }

    /**
     * Returns the instance of the [ReactActivityDelegate]. Here we use a util class [DefaultReactActivityDelegate]
     * which allows you to easily enable Fabric and Concurrent React (aka React 18) with two boolean flags.
     */

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}

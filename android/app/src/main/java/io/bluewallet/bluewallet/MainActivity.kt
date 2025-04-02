package io.bluewallet.bluewallet

import android.content.pm.ActivityInfo
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.util.DisplayMetrics
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled

class MainActivity : ReactActivity() {

    /**
     * Returns the name of the main component registered from JavaScript.
     * This is used to schedule rendering of the component.
     */
    override fun getMainComponentName(): String {
        return "BlueWallet"
    }

    // Constants matching those in LargeScreenProvider.tsx
    private val DRAWER_WIDTH = 320
    private val MIN_CONTENT_WIDTH = 375
    private val REQUIRED_WIDTH = DRAWER_WIDTH + MIN_CONTENT_WIDTH
    private val MIN_CONTENT_HEIGHT_LANDSCAPE = 400

    private fun isLargeScreen(): Boolean {
        val metrics = DisplayMetrics()
        
        // Use different API based on Android version
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // Modern API (Android 11+)
            val windowMetrics = windowManager.currentWindowMetrics
            val bounds = windowMetrics.bounds
            
            // Convert pixels to DP
            val density = resources.displayMetrics.density
            val width = bounds.width() / density
            val height = bounds.height() / density
            
            // Continue with the same logic as before
            val isTablet = (resources.configuration.screenLayout and Configuration.SCREENLAYOUT_SIZE_MASK) >= 
                    Configuration.SCREENLAYOUT_SIZE_LARGE
                    
            val isLandscape = width > height
            val largerDimension = Math.max(width, height)
            val smallerDimension = Math.min(width, height)
            
            val isLargeLandscapePhone = 
                isLandscape && 
                largerDimension >= 900 &&
                smallerDimension >= 400
                
            val hasAdequateWidth = largerDimension >= REQUIRED_WIDTH
            val hasAdequateHeight = smallerDimension >= MIN_CONTENT_HEIGHT_LANDSCAPE
            
            // Log for debugging
            android.util.Log.d("BlueWallet", 
                "Screen metrics (R+): ${width}x${height}, " +
                "isTablet=$isTablet, isLandscape=$isLandscape, " + 
                "largerDim=$largerDimension, smallerDim=$smallerDimension, " +
                "adequateWidth=$hasAdequateWidth, adequateHeight=$hasAdequateHeight, " +
                "isLargeLandscapePhone=$isLargeLandscapePhone"
            )
            
            return (hasAdequateWidth && hasAdequateHeight) || isLargeLandscapePhone || isTablet
        } else {
            // Legacy API (pre-Android 11)
            @Suppress("DEPRECATION")
            windowManager.defaultDisplay.getMetrics(metrics)
            
            val width = metrics.widthPixels / metrics.density
            val height = metrics.heightPixels / metrics.density
            
            // The rest of your existing logic
            val isTablet = (resources.configuration.screenLayout and Configuration.SCREENLAYOUT_SIZE_MASK) >= 
                    Configuration.SCREENLAYOUT_SIZE_LARGE
                    
            val isLandscape = width > height
            val largerDimension = Math.max(width, height)
            val smallerDimension = Math.min(width, height)
            
            val isLargeLandscapePhone = 
                isLandscape && 
                largerDimension >= 900 &&
                smallerDimension >= 400
                
            val hasAdequateWidth = largerDimension >= REQUIRED_WIDTH
            val hasAdequateHeight = smallerDimension >= MIN_CONTENT_HEIGHT_LANDSCAPE
            
            // Log for debugging
            android.util.Log.d("BlueWallet", 
                "Screen metrics (Legacy): ${width}x${height}, " +
                "isTablet=$isTablet, isLandscape=$isLandscape, " + 
                "largerDim=$largerDimension, smallerDim=$smallerDimension, " +
                "adequateWidth=$hasAdequateWidth, adequateHeight=$hasAdequateHeight, " +
                "isLargeLandscapePhone=$isLargeLandscapePhone"
            )
            
            return (hasAdequateWidth && hasAdequateHeight) || isLargeLandscapePhone || isTablet
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(null)
        updateOrientation()
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        updateOrientation()
    }
    
    private fun updateOrientation() {
        if (isLargeScreen()) {
            android.util.Log.d("BlueWallet", "Setting orientation: UNSPECIFIED (all orientations allowed)")
            requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
        } else {
            android.util.Log.d("BlueWallet", "Setting orientation: PORTRAIT only")
            requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        }
    }

    /**
     * Returns the instance of the [ReactActivityDelegate]. Here we use a util class [DefaultReactActivityDelegate]
     * which allows you to easily enable Fabric and Concurrent React (aka React 18) with two boolean flags.
     */

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}

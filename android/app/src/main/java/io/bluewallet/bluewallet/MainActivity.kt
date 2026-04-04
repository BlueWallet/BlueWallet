package io.bluewallet.bluewallet

import android.app.assist.AssistContent
import android.content.Context
import android.content.Intent
import android.content.pm.ActivityInfo
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.appcompat.app.AlertDialog
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.swmansion.rnscreens.fragment.restoration.RNScreensFragmentFactory
import org.json.JSONObject

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
        handleContinuityIntent(intent)
        if (resources.getBoolean(R.bool.portrait_only)) {
            requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleContinuityIntent(intent)
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
     * Provide the current user-activity context to the Android system.
     * This is the Android equivalent of Apple's Continuity / NSUserActivity.
     * Google Assistant and cross-device features can use this to let the
     * user continue what they were doing on another device.
     */
    override fun onProvideAssistContent(outContent: AssistContent) {
        super.onProvideAssistContent(outContent)

        val continuityUri = ReactNativeContinuityModule.currentWebUri
        continuityUri?.let { uri ->
            val parsedUri = Uri.parse(uri)
            outContent.webUri = parsedUri
            outContent.intent = Intent(Intent.ACTION_VIEW, parsedUri).apply {
                setPackage(packageName)
            }
        }

        val structured = JSONObject()
        ReactNativeContinuityModule.currentStructuredData?.let { data ->
            data.keys().forEach { key ->
                structured.put(key, data.opt(key))
            }
        }
        ReactNativeContinuityModule.currentActivityType?.let { structured.put("activityType", it) }
        ReactNativeContinuityModule.currentActivityTitle?.let { structured.put("title", it) }
        if (continuityUri != null) {
            structured.put("webpageURL", continuityUri)
        }
        if (structured.length() > 0) {
            outContent.structuredData = structured.toString()
        }
    }

    /**
     * Returns the instance of the [ReactActivityDelegate]. Here we use a util class [DefaultReactActivityDelegate]
     * which allows you to easily enable Fabric and Concurrent React (aka React 18) with two boolean flags.
     */

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

    private fun handleContinuityIntent(intent: Intent?) {
        val payload = intentToContinuityActivity(intent) ?: return
        val reactContext = (application as? MainApplication)
            ?.reactNativeHost
            ?.reactInstanceManager
            ?.currentReactContext

        EventEmitterModule.persistAndEmitUserActivity(applicationContext, payload, reactContext)
    }

    private fun intentToContinuityActivity(intent: Intent?): JSONObject? {
        if (intent?.action != Intent.ACTION_VIEW) return null
        val uri = intent.data ?: return null

        if (!uri.scheme.equals("bluewallet", ignoreCase = true)) return null

        val route = (uri.host ?: uri.pathSegments.firstOrNull())?.lowercase() ?: return null
        val activityType = ContinuityActivityRegistry.activityTypeForRoute(route) ?: return null

        val userInfo = JSONObject()

        // Parse path segments into userInfo based on route type
        val pathSegments = uri.pathSegments
        when (route) {
            "receiveonchain", "isitmyaddress" -> {
                pathSegments.getOrNull(0)?.takeIf { it.isNotEmpty() }
                    ?.let { userInfo.put("address", Uri.decode(it)) }
            }
            "xpub" -> {
                pathSegments.getOrNull(0)?.takeIf { it.isNotEmpty() }
                    ?.let { userInfo.put("walletID", Uri.decode(it)) }
                pathSegments.getOrNull(1)?.takeIf { it.isNotEmpty() }
                    ?.let { userInfo.put("xpub", Uri.decode(it)) }
            }
            "signverify" -> {
                pathSegments.getOrNull(0)?.takeIf { it.isNotEmpty() }
                    ?.let { userInfo.put("walletID", Uri.decode(it)) }
                pathSegments.getOrNull(1)?.takeIf { it.isNotEmpty() }
                    ?.let { userInfo.put("address", Uri.decode(it)) }
            }
            "sendonchain" -> {
                pathSegments.getOrNull(0)?.takeIf { it.isNotEmpty() }
                    ?.let { userInfo.put("walletID", Uri.decode(it)) }
            }
        }

        // Parse query parameters (may override or supplement path-derived values)
        for (name in uri.queryParameterNames) {
            userInfo.put(name, uri.getQueryParameter(name))
        }

        return JSONObject().apply {
            put("activityType", activityType)
            put("userInfo", userInfo)
            put("webpageURL", uri.toString())
        }
    }
}

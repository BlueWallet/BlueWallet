package io.bluewallet.bluewallet

import android.os.Build
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import org.json.JSONObject

/**
 * Android equivalent of iOS Continuity / NSUserActivity.
 *
 * Uses Android's AssistContent API to advertise the current user activity
 * to the system (Google Assistant, etc.) so that it can be continued on
 * another device signed into the same Google account.
 *
 * The module stores the "current" activity data and makes it available to
 * MainActivity via the companion-object accessor so that
 * Activity.onProvideAssistContent can return the right content.
 */
class ReactNativeContinuityModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "ReactNativeContinuity"

        // The currently-active assist data, read by MainActivity.onProvideAssistContent
        @Volatile
        var currentWebUri: String? = null
            private set

        @Volatile
        var currentStructuredData: JSONObject? = null
            private set

        @Volatile
        var currentActivityType: String? = null
            private set
    }

    // Map of activityId → stored state so we can invalidate the right one
    private data class ContinuityEntry(
        val type: String,
        val title: String?,
        val webUri: String?,
        val structuredData: JSONObject?,
    )

    private val activities = mutableMapOf<Int, ContinuityEntry>()

    override fun getName(): String = "ReactNativeContinuity"

    /**
     * Start advertising an activity.  Mirrors the iOS API:
     *   becomeCurrent(activityId, type, title, userInfo, url)
     */
    @ReactMethod
    fun becomeCurrent(activityId: Int, type: String, title: String?, userInfo: ReadableMap?, url: String?) {
        val structured = userInfo?.let { readableMapToJson(it) }

        val entry = ContinuityEntry(
            type = type,
            title = title,
            webUri = if (!url.isNullOrBlank()) url else null,
            structuredData = structured,
        )
        activities[activityId] = entry

        // Promote to the "current" fields that MainActivity reads
        currentActivityType = type
        currentWebUri = entry.webUri
        currentStructuredData = entry.structuredData

        Log.d(TAG, "becomeCurrent id=$activityId type=$type")
    }

    /**
     * Stop advertising an activity.
     */
    @ReactMethod
    fun invalidate(activityId: Int) {
        val removed = activities.remove(activityId)
        if (removed != null) {
            Log.d(TAG, "invalidate id=$activityId")
        }

        // If we just removed the activity that was "current", clear the shared state
        // or promote the most-recent remaining entry.
        if (activities.isEmpty()) {
            currentActivityType = null
            currentWebUri = null
            currentStructuredData = null
        } else {
            // Promote the highest-ID entry (most recent)
            val latest = activities.maxByOrNull { it.key }!!.value
            currentActivityType = latest.type
            currentWebUri = latest.webUri
            currentStructuredData = latest.structuredData
        }
    }

    // ---- helpers ----

    /**
     * Returns whether the AssistContent API (Android's equivalent of Continuity)
     * is available on this device and the user has the assistant enabled.
     * Requires API 23+ and an active assist component in Settings.
     */
    @ReactMethod
    fun isSupported(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            promise.resolve(false)
            return
        }
        try {
            val assistComponent = android.provider.Settings.Secure.getString(
                reactApplicationContext.contentResolver,
                "assistant"
            )
            promise.resolve(!assistComponent.isNullOrBlank())
        } catch (e: Exception) {
            // If we can't read the setting, fall back to OS version check
            promise.resolve(true)
        }
    }

    private fun readableMapToJson(map: ReadableMap): JSONObject {
        val json = JSONObject()
        val iter = map.keySetIterator()
        while (iter.hasNextKey()) {
            val key = iter.nextKey()
            when (map.getType(key)) {
                com.facebook.react.bridge.ReadableType.Boolean -> json.put(key, map.getBoolean(key))
                com.facebook.react.bridge.ReadableType.Number -> json.put(key, map.getDouble(key))
                com.facebook.react.bridge.ReadableType.String -> json.put(key, map.getString(key))
                else -> { /* skip nested maps/arrays for now */ }
            }
        }
        return json
    }
}

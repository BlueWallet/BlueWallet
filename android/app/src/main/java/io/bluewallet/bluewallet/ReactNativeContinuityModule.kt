package io.bluewallet.bluewallet

import android.os.Build
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import org.json.JSONObject

class ReactNativeContinuityModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "ReactNativeContinuity"

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

    private data class ContinuityEntry(
        val type: String,
        val title: String?,
        val webUri: String?,
        val structuredData: JSONObject?,
    )

    private val activities = mutableMapOf<Int, ContinuityEntry>()

    override fun getName(): String = "ReactNativeContinuity"

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

        currentActivityType = type
        currentWebUri = entry.webUri
        currentStructuredData = entry.structuredData

        Log.d(TAG, "becomeCurrent id=$activityId type=$type")
    }

    @ReactMethod
    fun invalidate(activityId: Int) {
        val removed = activities.remove(activityId)
        if (removed != null) {
            Log.d(TAG, "invalidate id=$activityId")
        }

        if (activities.isEmpty()) {
            currentActivityType = null
            currentWebUri = null
            currentStructuredData = null
        } else {
            val latest = activities.maxByOrNull { it.key }!!.value
            currentActivityType = latest.type
            currentWebUri = latest.webUri
            currentStructuredData = latest.structuredData
        }
    }

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
                else -> {}
            }
        }
        return json
    }
}

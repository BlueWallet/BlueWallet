package io.bluewallet.bluewallet

import android.os.Build
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule
import org.json.JSONArray
import org.json.JSONObject

@ReactModule(name = ReactNativeContinuityModule.NAME)
class ReactNativeContinuityModule(reactContext: ReactApplicationContext) : NativeReactNativeContinuitySpec(reactContext) {

    companion object {
        const val NAME = "ReactNativeContinuity"
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

        @Volatile
        var currentActivityTitle: String? = null
            private set
    }

    private data class ContinuityEntry(
        val type: String,
        val title: String?,
        val webUri: String?,
        val structuredData: JSONObject?,
    )

    private val activities = mutableMapOf<Int, ContinuityEntry>()

    override fun getName(): String = NAME

    @ReactMethod
    override fun becomeCurrent(activityId: Double, type: String, title: String?, userInfo: ReadableMap?, url: String?) {
        val id = activityId.toInt()
        val structured = userInfo?.let { readableMapToJson(it) }

        val entry = ContinuityEntry(
            type = type,
            title = title,
            webUri = if (!url.isNullOrBlank()) url else null,
            structuredData = structured,
        )
        activities[id] = entry

        currentActivityType = type
        currentActivityTitle = title
        currentWebUri = entry.webUri
        currentStructuredData = entry.structuredData

        Log.d(TAG, "becomeCurrent id=$id type=$type")
    }

    @ReactMethod
    override fun invalidate(activityId: Double) {
        val id = activityId.toInt()
        val removed = activities.remove(id)
        if (removed != null) {
            Log.d(TAG, "invalidate id=$id")
        }

        if (activities.isEmpty()) {
            currentActivityType = null
            currentActivityTitle = null
            currentWebUri = null
            currentStructuredData = null
        } else {
            val latest = activities.maxByOrNull { it.key }!!.value
            currentActivityType = latest.type
            currentActivityTitle = latest.title
            currentWebUri = latest.webUri
            currentStructuredData = latest.structuredData
        }
    }

    @ReactMethod
    override fun isSupported(promise: Promise) {
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
                com.facebook.react.bridge.ReadableType.Null -> json.put(key, JSONObject.NULL)
                com.facebook.react.bridge.ReadableType.Boolean -> json.put(key, map.getBoolean(key))
                com.facebook.react.bridge.ReadableType.Number -> json.put(key, map.getDouble(key))
                com.facebook.react.bridge.ReadableType.String -> json.put(key, map.getString(key))
                com.facebook.react.bridge.ReadableType.Map -> map.getMap(key)?.let { json.put(key, readableMapToJson(it)) }
                com.facebook.react.bridge.ReadableType.Array -> map.getArray(key)?.let { json.put(key, readableArrayToJson(it)) }
            }
        }
        return json
    }

    private fun readableArrayToJson(array: ReadableArray): JSONArray {
        val jsonArray = JSONArray()
        for (i in 0 until array.size()) {
            when (array.getType(i)) {
                com.facebook.react.bridge.ReadableType.Null -> jsonArray.put(JSONObject.NULL)
                com.facebook.react.bridge.ReadableType.Boolean -> jsonArray.put(array.getBoolean(i))
                com.facebook.react.bridge.ReadableType.Number -> jsonArray.put(array.getDouble(i))
                com.facebook.react.bridge.ReadableType.String -> jsonArray.put(array.getString(i))
                com.facebook.react.bridge.ReadableType.Map -> array.getMap(i)?.let { jsonArray.put(readableMapToJson(it)) }
                com.facebook.react.bridge.ReadableType.Array -> array.getArray(i)?.let { jsonArray.put(readableArrayToJson(it)) }
            }
        }
        return jsonArray
    }
}

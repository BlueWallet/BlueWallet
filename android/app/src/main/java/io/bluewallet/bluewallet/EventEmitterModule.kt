package io.bluewallet.bluewallet

import android.content.Context
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.module.annotations.ReactModule
import org.json.JSONArray
import org.json.JSONObject

@ReactModule(name = EventEmitterModule.NAME)
class EventEmitterModule(reactContext: ReactApplicationContext) : NativeEventEmitterSpec(reactContext) {

    companion object {
        const val NAME = "EventEmitter"
        private const val PREFS_NAME = "group.io.bluewallet.bluewallet"
        private const val MOST_RECENT_ACTIVITY_KEY = "onUserActivityOpen"

        @Volatile
        private var activeModule: EventEmitterModule? = null

        @JvmStatic
        fun persistAndEmitUserActivity(context: Context, payload: JSONObject, reactContext: ReactContext?) {
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putString(MOST_RECENT_ACTIVITY_KEY, payload.toString())
                .apply()

            activeModule?.emitUserActivity(payload)
                ?: emitToReactContext(reactContext, payload)
        }

        private fun emitToReactContext(reactContext: ReactContext?, payload: JSONObject) {
            if (reactContext == null) return
            try {
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("onUserActivityOpen", jsonObjectToWritableMap(payload))
            } catch (_: Exception) {
                // JS bridge may not be ready yet; payload is still persisted for initial processing.
            }
        }

        private fun jsonObjectToWritableMap(json: JSONObject): WritableMap {
            val map = Arguments.createMap()
            json.keys().forEach { key ->
                when (val value = json.opt(key)) {
                    null, JSONObject.NULL -> map.putNull(key)
                    is Boolean -> map.putBoolean(key, value)
                    is Number -> map.putDouble(key, value.toDouble())
                    is String -> map.putString(key, value)
                    is JSONObject -> map.putMap(key, jsonObjectToWritableMap(value))
                    is JSONArray -> map.putArray(key, jsonArrayToWritableArray(value))
                    else -> map.putString(key, value.toString())
                }
            }
            return map
        }

        private fun jsonArrayToWritableArray(array: JSONArray): WritableArray {
            val writableArray = Arguments.createArray()
            for (index in 0 until array.length()) {
                when (val value = array.opt(index)) {
                    null, JSONObject.NULL -> writableArray.pushNull()
                    is Boolean -> writableArray.pushBoolean(value)
                    is Number -> writableArray.pushDouble(value.toDouble())
                    is String -> writableArray.pushString(value)
                    is JSONObject -> writableArray.pushMap(jsonObjectToWritableMap(value))
                    is JSONArray -> writableArray.pushArray(jsonArrayToWritableArray(value))
                    else -> writableArray.pushString(value.toString())
                }
            }
            return writableArray
        }
    }

    private var hasListeners = false

    init {
        activeModule = this
    }

    override fun invalidate() {
        if (activeModule === this) {
            activeModule = null
        }
        super.invalidate()
    }

    override fun addListener(eventName: String) {
        hasListeners = true
    }

    override fun removeListeners(count: Double) {
        if (count > 0) {
            hasListeners = false
        }
    }

    override fun getMostRecentUserActivity(promise: Promise) {
        val payloadString = reactApplicationContext
            .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(MOST_RECENT_ACTIVITY_KEY, null)

        if (payloadString.isNullOrBlank()) {
            promise.resolve(null)
            return
        }

        try {
            val payload = JSONObject(payloadString)
            promise.resolve(jsonObjectToWritableMap(payload))
        } catch (_: Exception) {
            promise.resolve(null)
        }
    }

    override fun clearMostRecentUserActivity() {
        reactApplicationContext
            .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .remove(MOST_RECENT_ACTIVITY_KEY)
            .apply()
    }

    private fun emitUserActivity(payload: JSONObject) {
        if (!hasListeners) return
        emitToReactContext(reactApplicationContext, payload)
    }
}
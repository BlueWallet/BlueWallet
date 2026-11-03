package io.bluewallet.bluewallet.components.draggablefile

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import android.util.Log
import io.bluewallet.bluewallet.BuildConfig

object DragAndDropState {
    /** Identifies drags originating in BlueWallet so the app-wide import target ignores them. */
    val outboundMarker = Any()

    @Volatile
    var isScreenProtected: Boolean = false

    @Volatile
    var hasFocusedDropConsumer: Boolean = false
}

class DragAndDropModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName() = "DragAndDropModule"

    @ReactMethod
    fun setScreenProtectEnabled(enabled: Boolean, promise: Promise) {
        DragAndDropState.isScreenProtected = enabled
        if (BuildConfig.DEBUG) Log.d("DragAndDrop", "Screen protection ${if (enabled) "enabled" else "disabled"}")
        promise.resolve(true)
    }

    @ReactMethod
    fun setFocusedDropConsumer(enabled: Boolean, promise: Promise) {
        DragAndDropState.hasFocusedDropConsumer = enabled
        if (BuildConfig.DEBUG) Log.d("DragAndDrop", "Focused consumer ${if (enabled) "registered" else "removed"}")
        promise.resolve(true)
    }

    @ReactMethod fun addListener(eventName: String) = Unit
    @ReactMethod fun removeListeners(count: Double) = Unit
}

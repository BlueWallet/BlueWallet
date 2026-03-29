package io.bluewallet.bluewallet.sizeclass

import android.content.res.Configuration
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class SizeClassEmitterModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "SizeClassEmitter"
        private const val EVENT_NAME = "sizeClassDidChange"

        // Material Design window size class breakpoints (dp)
        private const val COMPACT_WIDTH_MAX = 600
        private const val MEDIUM_WIDTH_MAX = 840
        private const val COMPACT_HEIGHT_MAX = 480

        // SizeClass enum values matching iOS/TS
        private const val SIZE_CLASS_COMPACT = 0
        private const val SIZE_CLASS_REGULAR = 1
        private const val SIZE_CLASS_LARGE = 2
    }

    private var listenerCount = 0

    override fun getName(): String = NAME

    @ReactMethod
    fun getCurrentSizeClass(promise: Promise) {
        try {
            val payload = buildPayload()
            promise.resolve(payload)
        } catch (e: Exception) {
            promise.reject("size_class_error", "Unable to read current size class", e)
        }
    }

    @ReactMethod
    fun addListener(@Suppress("UNUSED_PARAMETER") eventName: String) {
        listenerCount++
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        listenerCount -= count
        if (listenerCount < 0) listenerCount = 0
    }

    fun emitSizeClassChange() {
        if (listenerCount <= 0) return
        val payload = buildPayload()
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(EVENT_NAME, payload)
    }

    private fun buildPayload(): WritableMap {
        val activity = currentActivity
        val config = activity?.resources?.configuration ?: reactContext.resources.configuration

        val widthDp = config.screenWidthDp
        val heightDp = config.screenHeightDp

        val horizontalClass = when {
            widthDp < COMPACT_WIDTH_MAX -> SIZE_CLASS_COMPACT
            widthDp < MEDIUM_WIDTH_MAX -> SIZE_CLASS_REGULAR
            else -> SIZE_CLASS_LARGE
        }
        val verticalClass = if (heightDp < COMPACT_HEIGHT_MAX) SIZE_CLASS_COMPACT else SIZE_CLASS_REGULAR

        val overallClass = horizontalClass

        val isLandscape = config.orientation == Configuration.ORIENTATION_LANDSCAPE
        val orientation = if (isLandscape) "landscape" else "portrait"

        val payload = Arguments.createMap()
        payload.putInt("horizontal", horizontalClass)
        payload.putInt("vertical", verticalClass)
        payload.putInt("sizeClass", overallClass)
        payload.putString("orientation", orientation)
        payload.putBoolean("isLargeScreen", horizontalClass != SIZE_CLASS_COMPACT)
        payload.putDouble("width", widthDp.toDouble())
        payload.putDouble("height", heightDp.toDouble())
        return payload
    }
}

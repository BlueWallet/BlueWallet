package io.bluewallet.bluewallet

import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = SpotlightModule.NAME)
class SpotlightModule(reactContext: ReactApplicationContext) : NativeSpotlightSpec(reactContext) {
    companion object {
        const val NAME = "SpotlightModule"
    }

    @ReactMethod
    override fun replaceIndex(itemsJSON: String, promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            promise.resolve(0)
            return
        }
        AndroidAppSearchIndex.replace(reactApplicationContext, itemsJSON, promise)
    }

    @ReactMethod
    override fun deleteIndex(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            promise.resolve(null)
            return
        }
        AndroidAppSearchIndex.delete(reactApplicationContext, promise)
    }

    @ReactMethod
    override fun popPendingURL(promise: Promise) {
        promise.resolve(null)
    }

    @ReactMethod
    override fun donateActivity(identifier: String, title: String) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AndroidAppSearchIndex.reportUsage(reactApplicationContext, identifier)
        }
    }

    @ReactMethod
    override fun clearActivity() = Unit
}

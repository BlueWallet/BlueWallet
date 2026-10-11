package io.bluewallet.bluewallet

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = WidgetHelperModule.NAME)
class WidgetHelperModule(private val context: ReactApplicationContext) : NativeWidgetHelperSpec(context) {
    companion object {
        const val NAME = "WidgetHelper"
    }

    override fun getName() = NAME

    @ReactMethod
    override fun reloadAllWidgets() {
        AppWidgetUtils.refreshAllWidgets(context)
    }
}

package io.bluewallet.bluewallet

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class WidgetHelperPackage : BaseReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
        if (name == WidgetHelperModule.NAME) WidgetHelperModule(reactContext) else null

    override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
        mapOf(
            WidgetHelperModule.NAME to ReactModuleInfo(
                WidgetHelperModule.NAME,
                WidgetHelperModule::class.java.name,
                false,
                false,
                false,
                true,
            ),
        )
    }
}

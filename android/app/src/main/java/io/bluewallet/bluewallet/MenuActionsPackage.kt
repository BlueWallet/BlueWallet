package io.bluewallet.bluewallet

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class MenuActionsPackage : BaseReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
        if (name == MenuActionsModule.NAME) MenuActionsModule(reactContext) else null

    override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
        mapOf(MenuActionsModule.NAME to ReactModuleInfo(
            MenuActionsModule.NAME,
            MenuActionsModule::class.java.name,
            false,
            false,
            false,
            true
        ))
    }
}

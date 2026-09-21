package io.bluewallet.bluewallet

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class MenuElementsPackage : BaseReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
        if (name == MenuElementsModule.NAME) MenuElementsModule(reactContext) else null

    override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
        mapOf(MenuElementsModule.NAME to ReactModuleInfo(
            MenuElementsModule.NAME,
            MenuElementsModule::class.java.name,
            false,
            false,
            false,
            true
        ))
    }
}

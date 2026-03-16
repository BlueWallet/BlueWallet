package io.bluewallet.bluewallet

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ViewManager

class SettingsPackage : TurboReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
        return if (name == SettingsModule.NAME) SettingsModule(reactContext) else null
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider = ReactModuleInfoProvider {
        val moduleInfo = ReactModuleInfo(
            SettingsModule.NAME,
            SettingsModule.NAME,
            false, // canOverrideExistingModule
            false, // needsEagerInit
            false, // hasConstants
            false, // isCxxModule
            true   // isTurboModule
        )
        mapOf(SettingsModule.NAME to moduleInfo)
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}

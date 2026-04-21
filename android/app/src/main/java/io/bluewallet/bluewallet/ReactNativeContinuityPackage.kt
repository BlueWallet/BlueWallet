package io.bluewallet.bluewallet

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ViewManager

class ReactNativeContinuityPackage : TurboReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
        return when (name) {
            ReactNativeContinuityModule.NAME -> ReactNativeContinuityModule(reactContext)
            EventEmitterModule.NAME -> EventEmitterModule(reactContext)
            else -> null
        }
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider = ReactModuleInfoProvider {
        val continuityModuleInfo = ReactModuleInfo(
            ReactNativeContinuityModule.NAME,
            ReactNativeContinuityModule.NAME,
            false, // canOverrideExistingModule
            false, // needsEagerInit
            false, // hasConstants
            false, // isCxxModule
            true   // isTurboModule
        )
        val eventEmitterModuleInfo = ReactModuleInfo(
            EventEmitterModule.NAME,
            EventEmitterModule.NAME,
            false, // canOverrideExistingModule
            false, // needsEagerInit
            false, // hasConstants
            false, // isCxxModule
            true   // isTurboModule
        )
        mapOf(
            ReactNativeContinuityModule.NAME to continuityModuleInfo,
            EventEmitterModule.NAME to eventEmitterModuleInfo,
        )
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}

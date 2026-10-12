package io.bluewallet.bluewallet

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ViewManager

class LocalNetworkDiscoveryPackage : TurboReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
        if (name == LocalNetworkDiscoveryModule.NAME) LocalNetworkDiscoveryModule(reactContext) else null

    override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
        mapOf(
            LocalNetworkDiscoveryModule.NAME to ReactModuleInfo(
                LocalNetworkDiscoveryModule.NAME, LocalNetworkDiscoveryModule.NAME,
                false, false, false, false, true
            )
        )
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}

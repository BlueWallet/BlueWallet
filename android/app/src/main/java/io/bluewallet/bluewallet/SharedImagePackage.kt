package io.bluewallet.bluewallet

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class SharedImagePackage : BaseReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
        if (name == SharedImageModule.NAME) SharedImageModule(reactContext) else null

    override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
        mapOf(SharedImageModule.NAME to ReactModuleInfo(
            SharedImageModule.NAME,
            SharedImageModule::class.java.name,
            false,
            false,
            false,
            true,
        ))
    }
}

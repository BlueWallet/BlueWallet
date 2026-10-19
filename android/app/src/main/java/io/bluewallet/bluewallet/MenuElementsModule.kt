package io.bluewallet.bluewallet

import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = MenuElementsModule.NAME)
class MenuElementsModule(context: ReactApplicationContext) :
    NativeMenuElementsEmitterSpec(context), LifecycleEventListener {

    // Menu state and dispatch are confined to the UI thread.
    private var actions = emptySet<String>()
    @Volatile private var invalidated = false

    init {
        context.addLifecycleEventListener(this)
    }

    override fun getName() = NAME

    override fun setAvailableActions(actions: ReadableArray) {
        val updated = (0 until actions.size()).mapNotNull { actions.getString(it) }.toSet()
        UiThreadUtil.runOnUiThread {
            if (!invalidated && this.actions != updated) {
                this.actions = updated
                reactApplicationContext.currentActivity?.invalidateOptionsMenu()
            }
        }
    }

    fun availableActions(): List<WalletMenuAction> {
        UiThreadUtil.assertOnUiThread()
        return if (invalidated) emptyList() else WalletMenuAction.entries.filter { it.action in actions }
    }

    fun perform(action: WalletMenuAction): Boolean {
        UiThreadUtil.assertOnUiThread()
        if (invalidated || action.action !in actions || !reactApplicationContext.hasActiveReactInstance()) return false
        emitOnMenuAction(action.action)
        return true
    }

    override fun onHostResume() {
        reactApplicationContext.currentActivity?.invalidateOptionsMenu()
    }

    override fun onHostPause() = Unit
    override fun onHostDestroy() = Unit

    override fun invalidate() {
        invalidated = true
        reactApplicationContext.removeLifecycleEventListener(this)
        UiThreadUtil.runOnUiThread {
            actions = emptySet()
            reactApplicationContext.currentActivity?.invalidateOptionsMenu()
        }
        super.invalidate()
    }

    companion object {
        const val NAME = "MenuElementsEmitter"
    }
}

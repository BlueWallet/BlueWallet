package io.bluewallet.bluewallet

import android.view.Menu
import android.view.KeyEvent
import org.json.JSONArray
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = MenuElementsModule.NAME)
class MenuElementsModule(context: ReactApplicationContext) :
    NativeMenuElementsEmitterSpec(context), LifecycleEventListener {

    // Menu state and dispatch are confined to the UI thread.
    private var headerItems = JSONArray()
    private var headerJSON = "[]"
    private var headerActionIDs = emptySet<String>()
    private var actions = emptySet<String>()
    internal var headerShortcuts = emptyList<HeaderMenuShortcut>()
        private set
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

    override fun setHeaderMenu(items: String) {
        val parsed = try { JSONArray(items) } catch (_: Exception) { return }
        UiThreadUtil.runOnUiThread {
            if (!invalidated && headerJSON != items) {
                headerJSON = items
                headerItems = parsed
                headerShortcuts = HeaderMenuShortcut.collect(parsed)
                val enabled = mutableSetOf<String>()
                fun collect(entries: JSONArray) {
                    for (index in 0 until entries.length()) {
                        val entry = entries.optJSONObject(index) ?: continue
                        if (entry.optBoolean("disabled")) continue
                        val children = entry.optJSONArray("children")
                        if (children != null && children.length() > 0) collect(children)
                        else enabled.add(entry.optString("id"))
                    }
                }
                collect(parsed)
                headerActionIDs = enabled
                reactApplicationContext.currentActivity?.invalidateOptionsMenu()
            }
        }
    }

    fun addMenuItems(menu: Menu) {
        UiThreadUtil.assertOnUiThread()
        if (invalidated || actions.isEmpty()) return
        HeaderMenuRenderer(reactApplicationContext).populate(menu, headerItems, availableActions().toSet())
    }

    internal fun headerShortcut(event: KeyEvent): HeaderMenuShortcut? =
        if (invalidated) null else headerShortcuts.firstOrNull { it.matches(event) }

    fun closeHeaderAction(): String? =
        if (invalidated) null else headerActionIDs.firstOrNull { it.endsWith(":NavigationCloseButton") }

    fun performHeaderAction(action: String): Boolean {
        UiThreadUtil.assertOnUiThread()
        if (invalidated || action !in headerActionIDs || !reactApplicationContext.hasActiveReactInstance()) return false
        emitOnMenuAction(action)
        return true
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
            headerItems = JSONArray()
            headerActionIDs = emptySet()
            headerShortcuts = emptyList()
            reactApplicationContext.currentActivity?.invalidateOptionsMenu()
        }
        super.invalidate()
    }

    companion object {
        const val NAME = "MenuElementsEmitter"
    }
}

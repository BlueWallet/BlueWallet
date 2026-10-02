package io.bluewallet.bluewallet

import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.module.annotations.ReactModule
import org.json.JSONArray

data class RecentMenuEntry(val id: String, val title: String, val kind: String)
data class MenuActionState(val disabled: Boolean = false, val checked: Boolean? = null)

@ReactModule(name = MenuActionsModule.NAME)
class MenuActionsModule(context: ReactApplicationContext) :
    NativeMenuActionsEmitterSpec(context), LifecycleEventListener {

    // Menu state and dispatch are confined to the UI thread.
    private var actions = emptySet<String>()
    private var actionStates = emptyMap<String, MenuActionState>()
    private var menuTitles = emptyMap<String, String>()
    private var recentItems = emptyList<RecentMenuEntry>()
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

    override fun setActionStates(statesJson: String) {
        val updated = try {
            val objectValue = org.json.JSONObject(statesJson)
            objectValue.keys().asSequence().associateWith { action ->
                val state = objectValue.getJSONObject(action)
                MenuActionState(state.optBoolean("disabled"), if (state.has("checked")) state.getBoolean("checked") else null)
            }
        } catch (_: Exception) {
            emptyMap()
        }
        UiThreadUtil.runOnUiThread {
            if (!invalidated && actionStates != updated) {
                actionStates = updated
                reactApplicationContext.currentActivity?.invalidateOptionsMenu()
            }
        }
    }

    override fun setRecentItems(itemsJson: String) {
        val updated = try {
            val array = JSONArray(itemsJson)
            (0 until array.length()).map { index ->
                val item = array.getJSONObject(index)
                RecentMenuEntry(item.getString("id"), item.getString("title"), item.getString("kind"))
            }
        } catch (_: Exception) {
            emptyList()
        }
        UiThreadUtil.runOnUiThread {
            if (!invalidated && recentItems != updated) {
                recentItems = updated
                reactApplicationContext.currentActivity?.invalidateOptionsMenu()
            }
        }
    }

    override fun setMenuTitles(titlesJson: String) {
        val updated = try {
            val objectValue = org.json.JSONObject(titlesJson)
            objectValue.keys().asSequence().associateWith { objectValue.getString(it) }
        } catch (_: Exception) {
            emptyMap()
        }
        UiThreadUtil.runOnUiThread {
            if (!invalidated && menuTitles != updated) {
                menuTitles = updated
                reactApplicationContext.currentActivity?.invalidateOptionsMenu()
            }
        }
    }

    fun titleFor(action: String): String? {
        UiThreadUtil.assertOnUiThread()
        return if (invalidated) null else menuTitles[action]
    }

    fun availableActions(): List<WalletMenuAction> {
        UiThreadUtil.assertOnUiThread()
        return if (invalidated) emptyList() else WalletMenuAction.entries.filter { it.action in actions }
    }

    fun stateFor(action: WalletMenuAction): MenuActionState = actionStates[action.action] ?: MenuActionState()

    fun availableRecentItems(): List<RecentMenuEntry> {
        UiThreadUtil.assertOnUiThread()
        return if (invalidated || "openFile" !in actions) emptyList() else recentItems
    }

    fun performRecentItem(itemId: Int): Boolean {
        UiThreadUtil.assertOnUiThread()
        val item = availableRecentItems().getOrNull(itemId - RECENT_ITEM_ID_BASE) ?: return false
        if (!reactApplicationContext.hasActiveReactInstance()) return false
        emitOnMenuAction("openRecent:${item.id}")
        return true
    }

    fun perform(action: WalletMenuAction): Boolean {
        UiThreadUtil.assertOnUiThread()
        if (invalidated || action.action !in actions || stateFor(action).disabled || !reactApplicationContext.hasActiveReactInstance()) return false
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
            actionStates = emptyMap()
            menuTitles = emptyMap()
            recentItems = emptyList()
            reactApplicationContext.currentActivity?.invalidateOptionsMenu()
        }
        super.invalidate()
    }

    companion object {
        const val NAME = "MenuActionsEmitter"
        const val RECENT_ITEM_ID_BASE = 0x0B1E0000
    }
}

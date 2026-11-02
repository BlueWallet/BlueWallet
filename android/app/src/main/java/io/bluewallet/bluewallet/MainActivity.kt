package io.bluewallet.bluewallet

import android.content.Context
import android.content.pm.ActivityInfo
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.KeyEvent
import android.view.KeyboardShortcutGroup
import android.view.KeyboardShortcutInfo
import android.view.Menu
import android.view.MenuItem
import android.view.Window
import androidx.appcompat.app.AlertDialog
import androidx.core.view.MenuItemCompat
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.swmansion.rnscreens.fragment.restoration.RNScreensFragmentFactory

class MainActivity : ReactActivity() {

    private fun menuModule(): MenuActionsModule? =
        (application as MainApplication).reactHost.currentReactContext
            ?.getNativeModule(MenuActionsModule::class.java)

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        super.onCreateOptionsMenu(menu)
        return true
    }

    override fun onPrepareOptionsMenu(menu: Menu): Boolean {
        super.onPrepareOptionsMenu(menu)
        menu.removeGroup(R.id.wallet_menu_group)
        val availableActions = menuModule()?.availableActions().orEmpty()
        fun addAction(target: Menu, action: WalletMenuAction, order: Int) {
            target.add(R.id.wallet_menu_group, action.itemId, order, menuModule()?.titleFor(action.action) ?: getString(action.titleId)).apply {
                setIcon(action.iconId)
                val state = menuModule()?.stateFor(action) ?: MenuActionState()
                isEnabled = !state.disabled
                isCheckable = state.checked != null
                isChecked = state.checked == true
                action.shortcut?.let { MenuItemCompat.setAlphabeticShortcut(this, it, action.modifiers) }
                setShowAsAction(MenuItem.SHOW_AS_ACTION_NEVER)
            }
        }

        availableActions.filter { it.group == WalletMenuAction.Group.GENERAL }.forEachIndexed { index, action ->
            addAction(menu, action, index)
        }
        val groupDetails = listOf(
            Triple(WalletMenuAction.Group.WALLET, R.id.wallet_menu_wallet, R.string.wallet_menu_wallet),
            Triple(WalletMenuAction.Group.EDIT, R.id.wallet_menu_edit, R.string.wallet_menu_edit),
            Triple(WalletMenuAction.Group.VIEW, R.id.wallet_menu_view, R.string.wallet_menu_view),
            Triple(WalletMenuAction.Group.SEND, R.id.wallet_menu_send_actions, R.string.wallet_menu_send_actions),
            Triple(WalletMenuAction.Group.TOOLS, R.id.wallet_menu_tools, R.string.wallet_menu_tools)
        )
        groupDetails.forEachIndexed { groupIndex, (group, itemId, titleId) ->
            val groupActions = availableActions.filter { it.group == group }
            if (groupActions.isEmpty()) return@forEachIndexed
            val subMenu = menu.addSubMenu(
                R.id.wallet_menu_group,
                itemId,
                WalletMenuAction.entries.size + groupIndex,
                if (group == WalletMenuAction.Group.TOOLS) menuModule()?.titleFor("tools") ?: getString(titleId) else getString(titleId)
            )
            groupActions.forEachIndexed { index, action -> addAction(subMenu, action, index) }
        }
        val recentItems = menuModule()?.availableRecentItems().orEmpty()
        if (WalletMenuAction.OPEN_FILE in availableActions) {
            val recentMenu = menu.addSubMenu(
                R.id.wallet_menu_group,
                R.id.wallet_menu_recent,
                WalletMenuAction.entries.size,
                menuModule()?.titleFor("openRecent") ?: getString(R.string.wallet_menu_recent)
            )
            recentMenu.item.setIcon(android.R.drawable.ic_menu_recent_history)
            if (recentItems.isEmpty()) {
                recentMenu.add(menuModule()?.titleFor("noRecent") ?: getString(R.string.wallet_menu_no_recent)).apply {
                    setIcon(android.R.drawable.ic_menu_recent_history)
                    isEnabled = false
                }
            } else {
                recentItems.forEachIndexed { index, item ->
                    recentMenu.add(
                        R.id.wallet_menu_group,
                        MenuActionsModule.RECENT_ITEM_ID_BASE + index,
                        index,
                        item.title
                    ).setIcon(
                        if (item.kind == "wallet") android.R.drawable.ic_menu_agenda
                        else android.R.drawable.ic_menu_recent_history
                    )
                }
            }
        }
        return menu.hasVisibleItems()
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        val action = WalletMenuAction.entries.firstOrNull { it.itemId == item.itemId }
        if (action != null) {
            // Consume stale items too; the module checks the latest screen state.
            menuModule()?.perform(action)
            return true
        }
        if (menuModule()?.performRecentItem(item.itemId) == true) return true
        return super.onOptionsItemSelected(item)
    }

    override fun dispatchKeyShortcutEvent(event: KeyEvent): Boolean {
        val module = menuModule()
        val available = module?.availableActions().orEmpty()
        if (available.isNotEmpty() && event.keyCode == KeyEvent.KEYCODE_M && event.hasModifiers(KeyEvent.META_CTRL_ON)) {
            if (event.action == KeyEvent.ACTION_DOWN && event.repeatCount == 0) {
                // The app uses NoActionBar; open the native options panel directly.
                window.openPanel(Window.FEATURE_OPTIONS_PANEL, null)
            }
            return true
        }
        val action = available.firstOrNull { it.matches(event) }
        if (action != null) {
            if (event.action == KeyEvent.ACTION_DOWN && event.repeatCount == 0) module?.perform(action)
            return true
        }
        return super.dispatchKeyShortcutEvent(event)
    }

    override fun onProvideKeyboardShortcuts(data: MutableList<KeyboardShortcutGroup>, menu: Menu?, deviceId: Int) {
        // Let the system describe other menus, avoiding duplicate entries for our own group.
        super.onProvideKeyboardShortcuts(data, null, deviceId)
        val actions = menuModule()?.availableActions().orEmpty()
        if (actions.isEmpty()) return
        WalletMenuAction.Group.entries.forEach { group ->
            val shortcuts = actions.filter { it.group == group }.mapNotNull {
                it.keyCode?.let { keyCode -> KeyboardShortcutInfo(menuModule()?.titleFor(it.action) ?: getString(it.titleId), keyCode, it.modifiers) }
            }
            if (shortcuts.isNotEmpty()) {
                val title = when (group) {
                    WalletMenuAction.Group.WALLET -> getString(R.string.wallet_menu_wallet)
                    WalletMenuAction.Group.EDIT -> getString(R.string.wallet_menu_edit)
                    WalletMenuAction.Group.VIEW -> getString(R.string.wallet_menu_view)
                    WalletMenuAction.Group.SEND -> getString(R.string.wallet_menu_send_actions)
                    WalletMenuAction.Group.TOOLS -> getString(R.string.wallet_menu_tools)
                    WalletMenuAction.Group.GENERAL -> getString(R.string.app_name)
                }
                data.add(KeyboardShortcutGroup(title, shortcuts))
            }
        }
        data.add(KeyboardShortcutGroup(getString(R.string.app_name), listOf(
            KeyboardShortcutInfo(getString(R.string.wallet_menu_open), KeyEvent.KEYCODE_M, KeyEvent.META_CTRL_ON)
        )))
    }

    /**
     * Returns the name of the main component registered from JavaScript.
     * This is used to schedule rendering of the component.
     */
    override fun getMainComponentName(): String {
        return "BlueWallet"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        // react-native-screens override
        supportFragmentManager.fragmentFactory = RNScreensFragmentFactory()
        super.onCreate(null)
        if (resources.getBoolean(R.bool.portrait_only)) {
            requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        }
    }

    override fun onResume() {
        super.onResume()
        Log.d("MainActivity", "MainActivity resumed. Confirming single instance is active.")
        
        // Check if we should show cache cleared alert
        checkAndShowCacheClearedAlert()
    }
    
    private fun checkAndShowCacheClearedAlert() {
        val sharedPref = getSharedPreferences("group.io.bluewallet.bluewallet", Context.MODE_PRIVATE)
        val shouldShowAlert = sharedPref.getBoolean("shouldShowCacheClearedAlert", false)
        
        if (shouldShowAlert) {
            // Reset the flag
            sharedPref.edit()
                .putBoolean("shouldShowCacheClearedAlert", false)
                .apply()
            
            // Show alert after a short delay to ensure UI is ready
            Handler(Looper.getMainLooper()).postDelayed({
                AlertDialog.Builder(this)
                    .setTitle(R.string.cache_cleared_title)
                    .setMessage(R.string.cache_cleared_message)
                    .setPositiveButton(android.R.string.ok, null)
                    .show()
            }, 500)
        }
    }

    /**
     * Returns the instance of the [ReactActivityDelegate]. Here we use a util class [DefaultReactActivityDelegate]
     * which allows you to easily enable Fabric and Concurrent React (aka React 18) with two boolean flags.
     */

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}

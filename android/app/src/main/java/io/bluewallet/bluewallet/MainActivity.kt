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
        val toolActions = setOf(
            WalletMenuAction.IS_IT_MY_ADDRESS,
            WalletMenuAction.BROADCAST_TRANSACTION,
            WalletMenuAction.GENERATE_WORD
        )
        availableActions.filterNot { it in toolActions }.forEachIndexed { index, action ->
            menu.add(R.id.wallet_menu_group, action.itemId, index, menuModule()?.titleFor(action.action) ?: getString(action.titleId)).apply {
                setIcon(action.iconId)
                val state = menuModule()?.stateFor(action) ?: MenuActionState()
                isEnabled = !state.disabled
                isCheckable = state.checked != null
                isChecked = state.checked == true
                action.shortcut?.let { MenuItemCompat.setAlphabeticShortcut(this, it, action.modifiers) }
                setShowAsAction(MenuItem.SHOW_AS_ACTION_NEVER)
            }
        }
        val availableTools = availableActions.filter { it in toolActions }
        if (availableTools.isNotEmpty()) {
            val toolsMenu = menu.addSubMenu(
                R.id.wallet_menu_group,
                R.id.wallet_menu_tools,
                WalletMenuAction.entries.size + 1,
                menuModule()?.titleFor("tools") ?: getString(R.string.wallet_menu_tools)
            )
            toolsMenu.item.setIcon(android.R.drawable.ic_menu_manage)
            availableTools.forEachIndexed { index, action ->
                toolsMenu.add(R.id.wallet_menu_group, action.itemId, index, action.titleId).setIcon(action.iconId)
            }
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
        val shortcuts = actions.mapNotNull {
            it.keyCode?.let { keyCode -> KeyboardShortcutInfo(menuModule()?.titleFor(it.action) ?: getString(it.titleId), keyCode, it.modifiers) }
        } + KeyboardShortcutInfo(getString(R.string.wallet_menu_open), KeyEvent.KEYCODE_M, KeyEvent.META_CTRL_ON)
        data.add(KeyboardShortcutGroup(getString(R.string.app_name), shortcuts))
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

package io.bluewallet.bluewallet

import android.content.Context
import android.content.ClipData
import android.content.Intent
import android.content.pm.ActivityInfo
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.HapticFeedbackConstants
import android.view.accessibility.AccessibilityEvent
import android.view.KeyEvent
import android.view.DragAndDropPermissions
import android.view.DragEvent
import android.view.KeyboardShortcutGroup
import android.view.KeyboardShortcutInfo
import android.view.Menu
import android.view.MenuItem
import android.view.Window
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.swmansion.rnscreens.fragment.restoration.RNScreensFragmentFactory
import io.bluewallet.bluewallet.components.draggablefile.DragAndDropState

class MainActivity : ReactActivity() {

    private val dropPermissions = mutableListOf<DragAndDropPermissions>()
    private var dropOverlay: TextView? = null

    private fun menuModule(): MenuElementsModule? =
        (application as MainApplication).reactHost.currentReactContext
            ?.getNativeModule(MenuElementsModule::class.java)

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        super.onCreateOptionsMenu(menu)
        return true
    }

    override fun onPrepareOptionsMenu(menu: Menu): Boolean {
        super.onPrepareOptionsMenu(menu)
        menu.removeGroup(R.id.wallet_menu_group)
        menuModule()?.availableActions()?.forEachIndexed { index, action ->
            menu.add(R.id.wallet_menu_group, action.itemId, index, action.titleId).apply {
                setAlphabeticShortcut(action.shortcut, action.modifiers)
                setShowAsAction(MenuItem.SHOW_AS_ACTION_NEVER)
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
        val shortcuts = actions.map {
            KeyboardShortcutInfo(getString(it.titleId), it.keyCode, it.modifiers)
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
        window.decorView.setOnDragListener { _, event -> handleDragEvent(event) }
    }

    private fun handleDragEvent(event: DragEvent): Boolean {
        if (DragAndDropState.isScreenProtected) {
            hideDropOverlay()
            return false
        }
        // The window-level target is for imports. Do not turn a BlueWallet export
        // dropped back onto the same window into a second inbound navigation event.
        if (event.localState === DragAndDropState.outboundMarker) return false
        return when (event.action) {
            DragEvent.ACTION_DRAG_STARTED -> event.clipDescription?.let { description ->
                description.hasMimeType("text/*") ||
                    description.hasMimeType("image/*") ||
                    description.hasMimeType("application/*")
            } == true
            DragEvent.ACTION_DROP -> {
                hideDropOverlay()
                window.decorView.performHapticFeedback(
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) HapticFeedbackConstants.CONFIRM else HapticFeedbackConstants.VIRTUAL_KEY,
                )
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    requestDragAndDropPermissions(event)?.let(dropPermissions::add)
                }
                val clipData = event.clipData ?: return false
                for (index in 0 until clipData.itemCount) {
                    val item = clipData.getItemAt(index)
                    val uri = item.uri
                    val droppedValue = uri?.toString()
                        ?: item.text?.toString()?.trim()
                        ?: item.coerceToText(this)?.toString()?.trim()
                    if (!droppedValue.isNullOrEmpty()) {
                        if (DragAndDropState.hasFocusedDropConsumer) {
                            val payload = Arguments.createMap().apply {
                                if (uri != null) putString("uri", droppedValue) else putString("text", droppedValue)
                                putString("mimeType", uri?.let(contentResolver::getType) ?: event.clipDescription?.getMimeType(0))
                            }
                            (application as MainApplication).reactHost.currentReactContext
                                ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                                ?.emit("onFileDrop", payload)
                            continue
                        }
                        val droppedUri = android.net.Uri.parse(droppedValue)
                        val intent = Intent(Intent.ACTION_VIEW).apply {
                            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                            if (uri != null) {
                                setDataAndType(uri, contentResolver.getType(uri) ?: event.clipDescription?.getMimeType(0))
                                // Android grants URI access through ClipData. Mirroring the
                                // URI here preserves that grant when React Native handles it.
                                setClipData(ClipData.newUri(contentResolver, item.text ?: "Dropped item", uri))
                            } else {
                                data = droppedUri
                            }
                        }
                        onNewIntent(intent)
                    }
                }
                true
            }
            DragEvent.ACTION_DRAG_ENTERED -> {
                showDropOverlay(event.clipData?.itemCount ?: 1)
                true
            }
            DragEvent.ACTION_DRAG_LOCATION -> true
            DragEvent.ACTION_DRAG_EXITED,
            DragEvent.ACTION_DRAG_ENDED -> {
                hideDropOverlay()
                true
            }
            else -> false
        }
    }

    private fun showDropOverlay(itemCount: Int) {
        if (dropOverlay != null) return
        val root = window.decorView as? ViewGroup ?: return
        val density = resources.displayMetrics.density
        val overlay = TextView(this).apply {
            text = if (itemCount == 1) getString(R.string.drag_drop_open) else getString(R.string.drag_drop_open_multiple, itemCount)
            contentDescription = text
            setTextColor(Color.WHITE)
            textSize = 18f
            gravity = Gravity.CENTER
            setCompoundDrawablesWithIntrinsicBounds(0, android.R.drawable.stat_sys_download_done, 0, 0)
            compoundDrawablePadding = (12 * density).toInt()
            setPadding((24 * density).toInt(), (24 * density).toInt(), (24 * density).toInt(), (24 * density).toInt())
            background = GradientDrawable().apply {
                setColor(Color.argb(210, 0, 92, 169))
                setStroke((3 * density).toInt(), Color.rgb(61, 169, 252))
                cornerRadius = 18 * density
            }
            isClickable = false
            isFocusable = false
            elevation = 24 * density
            alpha = 0f
        }
        root.addView(overlay, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT).apply {
            setMargins((12 * density).toInt(), (12 * density).toInt(), (12 * density).toInt(), (12 * density).toInt())
        })
        dropOverlay = overlay
        overlay.animate().alpha(1f).setDuration(180).start()
        overlay.sendAccessibilityEvent(AccessibilityEvent.TYPE_ANNOUNCEMENT)
    }

    private fun hideDropOverlay() {
        val overlay = dropOverlay ?: return
        dropOverlay = null
        overlay.animate().alpha(0f).setDuration(120).withEndAction {
            (overlay.parent as? ViewGroup)?.removeView(overlay)
        }.start()
    }

    override fun onDestroy() {
        hideDropOverlay()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            dropPermissions.forEach(DragAndDropPermissions::release)
            dropPermissions.clear()
        }
        super.onDestroy()
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

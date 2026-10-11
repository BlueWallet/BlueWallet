package io.bluewallet.bluewallet

import android.content.Context
import android.content.pm.ActivityInfo
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.KeyEvent
import android.view.KeyboardShortcutGroup
import android.view.KeyboardShortcutInfo
import android.view.Menu
import android.view.MenuItem
import android.view.View
import android.view.Window
import android.widget.ImageView
import android.widget.FrameLayout
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.TextView
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.card.MaterialCardView
import com.swmansion.rnscreens.fragment.restoration.RNScreensFragmentFactory
import androidx.appcompat.app.AlertDialog

class MainActivity : ReactActivity() {

    @Volatile private var sharedImageRequestId = 0
    private var sharedImageDialog: AlertDialog? = null

    companion object {
        private const val ANDROID_IMAGE_SHARING_HELP = "https://support.google.com/photos/answer/6131416?co=GENIE.Platform%3DAndroid"
    }

    private fun notifySharedQRCodeAvailable(attempt: Int = 0) {
        val reactContext = (application as MainApplication).reactHost.currentReactContext
        if (reactContext != null) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(SharedImageStore.EVENT_NAME, null)
            return
        }
        if (attempt < 100) {
            Handler(Looper.getMainLooper()).postDelayed({ notifySharedQRCodeAvailable(attempt + 1) }, 100)
        }
    }

    private fun prepareSharedImageIntent(intent: Intent?) {
        val sharedIntent = intent ?: return
        if (sharedIntent.action !in setOf(Intent.ACTION_SEND, Intent.ACTION_SEND_MULTIPLE) || sharedIntent.type?.lowercase()?.startsWith("image/") != true) return

        val sharedImages = if (sharedIntent.action == Intent.ACTION_SEND_MULTIPLE) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                sharedIntent.getParcelableArrayListExtra(Intent.EXTRA_STREAM, Uri::class.java).orEmpty()
            } else {
                @Suppress("DEPRECATION")
                sharedIntent.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM).orEmpty()
            }
        } else {
            listOfNotNull(if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                sharedIntent.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
            } else {
                @Suppress("DEPRECATION")
                sharedIntent.getParcelableExtra(Intent.EXTRA_STREAM) as? Uri
            })
        }
        if (sharedImages.isEmpty()) return

        val requestId = ++sharedImageRequestId
        sharedImageDialog?.dismiss()
        sharedImageDialog = null
        if (sharedImages.size > 10) {
            sharedIntent.removeExtra(Intent.EXTRA_STREAM)
            showSharedImageError(SharedImageImportError.TOO_MANY_IMAGES)
            return
        }

        // Consume the share once. The file is copied on a worker thread and
        // exposed through SharedImageModule for both cold and warm launches.
        sharedIntent.removeExtra(Intent.EXTRA_STREAM)
        SharedImageStore.importManyAsync(
            applicationContext,
            sharedImages,
            shouldContinue = { requestId == sharedImageRequestId && !isDestroyed },
        ) { values, error ->
            if (values.isNotEmpty()) {
                val preview = values.firstOrNull()?.let { runCatching { SharedQRCodePreview.render(applicationContext, it) }.getOrNull() }
                runOnUiThread {
                    if (requestId == sharedImageRequestId) confirmSharedQRCodes(values, preview)
                }
            } else {
                runOnUiThread {
                    if (requestId == sharedImageRequestId) showSharedImageError(error ?: SharedImageImportError.UNREADABLE)
                }
            }
        }
    }

    private fun confirmSharedQRCodes(values: List<String>, preview: Bitmap?) {
        if (isFinishing || isDestroyed) return
        val addresses = values.mapNotNull(SharedQRCodePreviewPolicy::bitcoinAddress)
        val isBitcoinBatch = SharedQRCodePreviewPolicy.shouldOpenAsBitcoinBatch(values)
        val requiresSelection = values.size > 1 && !isBitcoinBatch
        var selectedValue = values.first()
        val resultView = layoutInflater.inflate(R.layout.shared_qr_result, null)
        val previewView = resultView.findViewById<ImageView>(R.id.shared_qr_preview).apply {
            if (preview == null) visibility = android.view.View.GONE else setImageBitmap(preview)
        }
        val contentView = resultView.findViewById<TextView>(R.id.shared_qr_content).apply {
            text = if (isBitcoinBatch) addresses.joinToString("\n") else selectedValue
        }
        if (isBitcoinBatch && addresses.size > 1) {
            showAddressDeck(resultView.findViewById(R.id.shared_address_deck), addresses)
        }
        if (requiresSelection) {
            resultView.findViewById<RadioGroup>(R.id.shared_qr_choices).apply {
                visibility = View.VISIBLE
                values.forEachIndexed { index, value ->
                    addView(RadioButton(context).apply {
                        id = View.generateViewId()
                        text = value
                        maxLines = 2
                        isChecked = index == 0
                        setOnClickListener {
                            selectedValue = value
                            contentView.text = value
                            runCatching { SharedQRCodePreview.render(applicationContext, value) }.getOrNull()?.let {
                                previewView.visibility = View.VISIBLE
                                previewView.setImageBitmap(it)
                            }
                        }
                    })
                }
            }
        }
        MaterialAlertDialogBuilder(this)
            .setTitle(
                when {
                    requiresSelection -> R.string.shared_image_selection_title
                    isBitcoinBatch -> R.string.shared_image_confirm_title
                    else -> R.string.shared_image_qr_title
                },
            )
            .setView(resultView)
            .setNegativeButton(android.R.string.cancel, null)
            .setPositiveButton(R.string.shared_image_confirm_button) { _, _ ->
                SharedImageStore.store(applicationContext, if (isBitcoinBatch) values else listOf(selectedValue))
                notifySharedQRCodeAvailable()
            }
            .create()
            .also { dialog ->
                sharedImageDialog = dialog
                dialog.setOnDismissListener { if (sharedImageDialog === dialog) sharedImageDialog = null }
                dialog.show()
            }
    }

    private fun showAddressDeck(container: FrameLayout, addresses: List<String>) {
        val cardHeight = dp(58)
        val cardOffset = dp(14)
        container.visibility = View.VISIBLE
        container.layoutParams = container.layoutParams.apply {
            height = cardHeight + cardOffset * (addresses.size - 1)
        }
        val animationsEnabled = Settings.Global.getFloat(contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) != 0f
        addresses.forEachIndexed { index, address ->
            val card = MaterialCardView(this).apply {
                radius = dp(14).toFloat()
                cardElevation = dp(4).toFloat()
                translationZ = (addresses.size - index).toFloat()
                addView(TextView(context).apply {
                    text = address
                    gravity = Gravity.CENTER
                    maxLines = 2
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
                    setPadding(dp(14), 0, dp(14), 0)
                    contentDescription = address
                }, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
            }
            container.addView(card, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, cardHeight))
            val finalX = if (index % 2 == 0) -dp(3).toFloat() else dp(3).toFloat()
            val finalY = (index * cardOffset).toFloat()
            val finalRotation = if (index % 2 == 0) -1.2f else 1.2f
            if (animationsEnabled) {
                card.translationY = dp(28).toFloat()
                card.alpha = if (index == 0) 1f else 0.45f
                card.animate()
                    .translationX(finalX)
                    .translationY(finalY)
                    .rotation(finalRotation)
                    .alpha(1f)
                    .setStartDelay(index * 55L)
                    .setDuration(460L)
                    .start()
            } else {
                card.translationX = finalX
                card.translationY = finalY
                card.rotation = finalRotation
            }
        }
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    private fun showSharedImageError(error: SharedImageImportError) {
        if (isFinishing || isDestroyed) return
        MaterialAlertDialogBuilder(this)
            .setTitle(R.string.shared_image_error_title)
            .setMessage(error.messageResource)
            .setPositiveButton(android.R.string.ok, null)
            .setNeutralButton(R.string.shared_image_help_button) { _, _ ->
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(ANDROID_IMAGE_SHARING_HELP)))
            }
            .create()
            .also { dialog ->
                sharedImageDialog = dialog
                dialog.setOnDismissListener { if (sharedImageDialog === dialog) sharedImageDialog = null }
                dialog.show()
            }
    }

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
        prepareSharedImageIntent(intent)
        if (resources.getBoolean(R.bool.portrait_only)) {
            requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        }
    }

    override fun onNewIntent(intent: Intent) {
        prepareSharedImageIntent(intent)
        super.onNewIntent(intent)
        setIntent(intent)
    }

    override fun onDestroy() {
        sharedImageRequestId++
        sharedImageDialog?.dismiss()
        sharedImageDialog = null
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
                MaterialAlertDialogBuilder(this)
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

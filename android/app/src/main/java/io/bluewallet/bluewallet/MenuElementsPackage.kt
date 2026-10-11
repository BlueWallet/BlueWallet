package io.bluewallet.bluewallet

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class MenuElementsPackage : BaseReactPackage() {
    override fun createViewManagers(reactContext: ReactApplicationContext): List<com.facebook.react.uimanager.ViewManager<*, *>> = listOf(AppMenuButtonManager())

    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
        if (name == MenuElementsModule.NAME) MenuElementsModule(reactContext) else null

    override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
        mapOf(MenuElementsModule.NAME to ReactModuleInfo(
            MenuElementsModule.NAME,
            MenuElementsModule::class.java.name,
            false,
            false,
            false,
            true
        ))
    }
}

/** Android owns the button, accessibility, focus, ripple, and menu interaction. */
internal class AppMenuButtonManager : com.facebook.react.uimanager.SimpleViewManager<androidx.appcompat.widget.AppCompatButton>(),
    com.facebook.react.viewmanagers.AppMenuButtonManagerInterface<androidx.appcompat.widget.AppCompatButton> {
    private val viewDelegate = com.facebook.react.viewmanagers.AppMenuButtonManagerDelegate(this)
    override fun getDelegate() = viewDelegate
    override fun getName() = "AppMenuButton"
    override fun createViewInstance(context: com.facebook.react.uimanager.ThemedReactContext) =
        createButton(context) { (context.currentActivity as? MainActivity)?.openAppMenu() }

    internal fun createButton(context: android.content.Context, openMenu: () -> Unit) =
        androidx.appcompat.widget.AppCompatButton(context).apply {
            text = context.getString(R.string.wallet_menu_open)
            isAllCaps = false
            gravity = android.view.Gravity.START or android.view.Gravity.CENTER_VERTICAL
            contentDescription = context.getString(R.string.wallet_menu_open)
            androidx.appcompat.widget.TooltipCompat.setTooltipText(this, context.getString(R.string.wallet_menu_open_hint))
            setOnClickListener { openMenu() }
        }
    @com.facebook.react.uimanager.annotations.ReactProp(name = "textColor", customType = "Color")
    override fun setTextColor(view: androidx.appcompat.widget.AppCompatButton, color: Int?) {
        view.setTextColor(color ?: android.graphics.Color.BLACK)
    }
    @com.facebook.react.uimanager.annotations.ReactProp(name = "buttonTintColor", customType = "Color")
    override fun setButtonTintColor(view: androidx.appcompat.widget.AppCompatButton, color: Int?) {
        view.backgroundTintList = color?.let { android.content.res.ColorStateList.valueOf(it) }
    }

}

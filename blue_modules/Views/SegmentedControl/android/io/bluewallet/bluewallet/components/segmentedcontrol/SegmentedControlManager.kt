package io.bluewallet.bluewallet.components.segmentedcontrol

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.common.MapBuilder
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

@ReactModule(name = SegmentedControlManager.REACT_CLASS)
class SegmentedControlManager : SimpleViewManager<SegmentedControl>() {

    companion object {
        const val REACT_CLASS = "SegmentedControl"
    }

    override fun getName(): String = REACT_CLASS

    override fun createViewInstance(reactContext: ThemedReactContext): SegmentedControl =
        SegmentedControl(reactContext)

    @ReactProp(name = "values")
    fun setValues(view: SegmentedControl, values: ReadableArray?) {
        view.values = values?.let { arr -> Array(arr.size()) { arr.getString(it) ?: "" } } ?: emptyArray()
    }

    @ReactProp(name = "selectedIndex", defaultInt = 0)
    fun setSelectedIndex(view: SegmentedControl, selectedIndex: Int) {
        view.selectedIndex = selectedIndex
    }

    @ReactProp(name = "enabled", defaultBoolean = true)
    fun setEnabled(view: SegmentedControl, enabled: Boolean) {
        view.setEnabledProp(enabled)
    }

    @ReactProp(name = "momentary", defaultBoolean = false)
    fun setMomentary(view: SegmentedControl, momentary: Boolean) {
        view.setMomentaryProp(momentary)
    }

    @ReactProp(name = "backgroundColor")
    fun setBackgroundColor(view: SegmentedControl, backgroundColor: String?) {
        view.setBackgroundColorProp(backgroundColor)
    }

    @ReactProp(name = "tintColor")
    fun setTintColor(view: SegmentedControl, tintColor: String?) {
        view.setTintColorProp(tintColor)
    }

    @ReactProp(name = "textColor")
    fun setTextColor(view: SegmentedControl, textColor: String?) {
        view.setTextColorProp(textColor)
    }

    override fun getExportedCustomBubblingEventTypeConstants(): Map<String, Any>? =
        MapBuilder.builder<String, Any>()
            .put(
                "topChange",
                MapBuilder.of(
                    "phasedRegistrationNames",
                    MapBuilder.of("bubbled", "onChange", "captured", "onChangeCapture"),
                ),
            )
            .build()
}
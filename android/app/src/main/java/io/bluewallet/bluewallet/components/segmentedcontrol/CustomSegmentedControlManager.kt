package io.bluewallet.bluewallet.components.segmentedcontrol

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.viewmanagers.CustomSegmentedControlManagerInterface

@ReactModule(name = CustomSegmentedControlManager.REACT_CLASS)
class CustomSegmentedControlManager : SimpleViewManager<CustomSegmentedControl>(),
    CustomSegmentedControlManagerInterface<CustomSegmentedControl> {

    companion object {
        const val REACT_CLASS = "CustomSegmentedControl"
        private const val TOP_CHANGE = "topChange"
        private const val REGISTRATION_NAME = "onChange"
    }

    override fun getName(): String = REACT_CLASS

    override fun createViewInstance(reactContext: ThemedReactContext): CustomSegmentedControl {
        return CustomSegmentedControl(reactContext)
    }

    @ReactProp(name = "values")
    override fun setValues(view: CustomSegmentedControl, values: ReadableArray?) {
        val valuesArray = values?.let { array ->
            Array(array.size()) { index ->
                array.getString(index) ?: ""
            }
        } ?: emptyArray()
        
        view.values = valuesArray
    }

    @ReactProp(name = "selectedIndex", defaultInt = 0)
    override fun setSelectedIndex(view: CustomSegmentedControl, selectedIndex: Int) {
        view.selectedIndex = selectedIndex
    }

    @ReactProp(name = "backgroundColor")
    override fun setBackgroundColor(view: CustomSegmentedControl, value: String?) {
        view.setBackgroundColorProp(value)
    }

    @ReactProp(name = "tintColor")
    override fun setTintColor(view: CustomSegmentedControl, value: String?) {
        view.setTintColorProp(value)
    }

    @ReactProp(name = "textColor")
    override fun setTextColor(view: CustomSegmentedControl, value: String?) {
        view.setTextColorProp(value)
    }

    @ReactProp(name = "momentary", defaultBoolean = false)
    override fun setMomentary(view: CustomSegmentedControl, value: Boolean) {
        view.setMomentaryProp(value)
    }

    @ReactProp(name = "enabled", defaultBoolean = true)
    override fun setEnabled(view: CustomSegmentedControl, value: Boolean) {
        view.setEnabledProp(value)
    }

    override fun getExportedCustomBubblingEventTypeConstants(): Map<String, Any>? {
        return MapBuilder.builder<String, Any>()
            .put(
                TOP_CHANGE,
                MapBuilder.of(
                    "phasedRegistrationNames",
                    MapBuilder.of("bubbled", REGISTRATION_NAME, "captured", "${REGISTRATION_NAME}Capture")
                )
            )
            .build()
    }

    override fun onAfterUpdateTransaction(view: CustomSegmentedControl) {
        super.onAfterUpdateTransaction(view)
    }
}

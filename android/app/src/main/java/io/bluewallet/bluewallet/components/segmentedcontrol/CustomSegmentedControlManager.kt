package io.bluewallet.bluewallet.components.segmentedcontrol

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class CustomSegmentedControlManager : SimpleViewManager<CustomSegmentedControl>() {

    companion object {
        const val REACT_CLASS = "CustomSegmentedControl"
        private const val ON_CHANGE_EVENT = "onChangeEvent"
    }

    override fun getName(): String = REACT_CLASS

    override fun createViewInstance(reactContext: ThemedReactContext): CustomSegmentedControl {
        return CustomSegmentedControl(reactContext)
    }

    @ReactProp(name = "values")
    fun setValues(view: CustomSegmentedControl, values: ReadableArray?) {
        val valuesArray = values?.let { array ->
            Array(array.size()) { index ->
                array.getString(index) ?: ""
            }
        } ?: emptyArray()
        
        view.values = valuesArray
    }

    @ReactProp(name = "selectedIndex", defaultInt = 0)
    fun setSelectedIndex(view: CustomSegmentedControl, selectedIndex: Int) {
        view.selectedIndex = selectedIndex
    }

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any>? {
        return MapBuilder.builder<String, Any>()
            .put(ON_CHANGE_EVENT, MapBuilder.of("registrationName", ON_CHANGE_EVENT))
            .build()
    }

    override fun onAfterUpdateTransaction(view: CustomSegmentedControl) {
        super.onAfterUpdateTransaction(view)
    }
}

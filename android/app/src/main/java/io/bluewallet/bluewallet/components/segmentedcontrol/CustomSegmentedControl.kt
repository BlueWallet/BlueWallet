package io.bluewallet.bluewallet.components.segmentedcontrol

import android.content.Context
import android.content.res.ColorStateList
import android.graphics.Color
import android.util.AttributeSet
import android.widget.LinearLayout
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event
import com.facebook.react.uimanager.UIManagerHelper
import com.google.android.material.button.MaterialButton
import com.google.android.material.button.MaterialButtonToggleGroup
import io.bluewallet.bluewallet.R

class CustomSegmentedControl @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : LinearLayout(context, attrs, defStyleAttr) {

    private val toggleGroup: MaterialButtonToggleGroup
    private var currentSelectedIndex: Int = 0
    private var onChangeEvent: ((WritableMap) -> Unit)? = null

    var values: Array<String> = emptyArray()
        set(value) {
            field = value
            updateSegments()
        }

    var selectedIndex: Int = 0
        set(value) {
            field = value
            currentSelectedIndex = value
            updateSelectedSegment()
        }

    init {
        orientation = HORIZONTAL
        toggleGroup = MaterialButtonToggleGroup(context).apply {
            isSingleSelection = true
            isSelectionRequired = true
        }
        addView(toggleGroup, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ))

        toggleGroup.addOnButtonCheckedListener { _, checkedId, isChecked ->
            if (isChecked) {
                val newIndex = findIndexById(checkedId)
                if (newIndex != -1 && newIndex != currentSelectedIndex) {
                    currentSelectedIndex = newIndex
                    emitChangeEvent(newIndex)
                }
            }
        }
    }

    private fun updateSegments() {
        toggleGroup.removeAllViews()
        
        values.forEachIndexed { index, title ->
            val button = MaterialButton(
                context,
                null,
                com.google.android.material.R.attr.materialButtonOutlinedStyle
            ).apply {
                text = title
                id = generateViewId()
                layoutParams = LinearLayout.LayoutParams(
                    0,
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    1f
                )
                isCheckable = true
                
                strokeWidth = 2
                
                val cornerRadius = resources.getDimensionPixelSize(
                    com.google.android.material.R.dimen.mtrl_btn_corner_radius
                )
                
                when {
                    values.size == 1 -> {
                        this.cornerRadius = cornerRadius
                    }
                    index == 0 -> {
                        this.cornerRadius = cornerRadius
                    }
                    index == values.size - 1 -> {
                        this.cornerRadius = cornerRadius
                    }
                    else -> {
                        this.cornerRadius = 0
                    }
                }
            }
            
            toggleGroup.addView(button)
        }
        
        updateButtonColors()
        updateSelectedSegment()
    }

    private fun updateButtonColors() {
        for (i in 0 until toggleGroup.childCount) {
            val button = toggleGroup.getChildAt(i) as? MaterialButton ?: continue
            
            val selectedBgColor = ContextCompat.getColor(context, R.color.button_background_color)
            val unselectedBgColor = ContextCompat.getColor(context, R.color.button_disabled_background_color)
            val selectedTextColor = ContextCompat.getColor(context, R.color.button_text_color)
            val unselectedTextColor = ContextCompat.getColor(context, R.color.button_disabled_text_color)
            val borderColor = ContextCompat.getColor(context, R.color.form_border_color)
            val rippleColor = ContextCompat.getColor(context, R.color.ripple_color)
            val rippleColorSelected = ContextCompat.getColor(context, R.color.ripple_color_selected)
            
            val bgColorStateList = ColorStateList(
                arrayOf(
                    intArrayOf(android.R.attr.state_checked),
                    intArrayOf(-android.R.attr.state_checked)  
                ),
                intArrayOf(selectedBgColor, unselectedBgColor)
            )
            
            val textColorStateList = ColorStateList(
                arrayOf(
                    intArrayOf(android.R.attr.state_checked),  
                    intArrayOf(-android.R.attr.state_checked)  
                ),
                intArrayOf(selectedTextColor, unselectedTextColor)
            )
            
            val strokeColorStateList = ColorStateList(
                arrayOf(
                    intArrayOf(android.R.attr.state_checked),  
                    intArrayOf(-android.R.attr.state_checked)  
                ),
                intArrayOf(borderColor, borderColor)
            )
            
            val rippleColorStateList = ColorStateList(
                arrayOf(
                    intArrayOf(android.R.attr.state_checked),  
                    intArrayOf(-android.R.attr.state_checked)  
                ),
                intArrayOf(rippleColorSelected, rippleColor)
            )
            
            button.backgroundTintList = bgColorStateList
            button.setTextColor(textColorStateList)
            button.strokeColor = strokeColorStateList
            button.rippleColor = rippleColorStateList
        }
    }

    private fun updateSelectedSegment() {
        if (values.isNotEmpty() && currentSelectedIndex in 0 until values.size) {
            val buttonId = getButtonIdAtIndex(currentSelectedIndex)
            if (buttonId != -1) {
                toggleGroup.check(buttonId)
            }
        }
    }

    private fun findIndexById(id: Int): Int {
        for (i in 0 until toggleGroup.childCount) {
            if (toggleGroup.getChildAt(i).id == id) {
                return i
            }
        }
        return -1
    }

    private fun getButtonIdAtIndex(index: Int): Int {
        return if (index in 0 until toggleGroup.childCount) {
            toggleGroup.getChildAt(index).id
        } else {
            -1
        }
    }

    private fun emitChangeEvent(selectedIndex: Int) {
        val reactContext = context as? ReactContext ?: return
        val surfaceId = UIManagerHelper.getSurfaceId(reactContext)
        val eventDispatcher = UIManagerHelper.getEventDispatcherForReactTag(reactContext, id)
        
        val event = Arguments.createMap().apply {
            putInt("selectedIndex", selectedIndex)
        }
        
        eventDispatcher?.dispatchEvent(ChangeEvent(surfaceId, id, event))
    }

    private inner class ChangeEvent(
        surfaceId: Int,
        viewId: Int,
        private val eventData: WritableMap
    ) : Event<ChangeEvent>(surfaceId, viewId) {
        
        override fun getEventName(): String = "onChangeEvent"
        
        override fun getEventData(): WritableMap = eventData
    }

    fun setOnChangeEvent(callback: ((WritableMap) -> Unit)?) {
        onChangeEvent = callback
    }
}

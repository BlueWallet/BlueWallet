package org.neurai.neuraiwallet

import android.content.Context

object AppWidgetUtils {
    /** Redraws the Neurai widgets after a theme change (their colors follow day/night). */
    fun updateWidgetsForThemeChange(context: Context) {
        NeuraiWidgets.renderAll(context)
    }
}

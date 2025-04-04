package io.bluewallet.bluewallet

import android.content.Context
import android.content.res.Configuration
import androidx.appcompat.app.AppCompatDelegate

object ThemeHelper {
    private const val SHARED_PREF_NAME = "group.io.bluewallet.bluewallet"
    private const val KEY_FORCE_DARK_MODE = "force_dark_mode"

    /**
     * Check if dark mode is currently active
     * @param context Application context
     * @return true if dark mode is active, false otherwise
     */
    fun isDarkModeActive(context: Context): Boolean {
        val preferences = context.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
        val forceDarkMode = preferences.getBoolean(KEY_FORCE_DARK_MODE, false)

        return if (forceDarkMode) {
            true
        } else {
            val currentNightMode = context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
            currentNightMode == Configuration.UI_MODE_NIGHT_YES
        }
    }

    /**
     * Set the force dark mode option
     * @param context Application context
     * @param forceDarkMode Whether to force dark mode
     */
    fun setForceDarkMode(context: Context, forceDarkMode: Boolean) {
        context.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(KEY_FORCE_DARK_MODE, forceDarkMode)
            .apply()
            
        // Apply theme setting immediately
        AppCompatDelegate.setDefaultNightMode(
            if (forceDarkMode) AppCompatDelegate.MODE_NIGHT_YES 
            else AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
        )
        
        // Update widgets with new theme
        updateAllWidgets(context)
    }
    
    /**
     * Get whether force dark mode is enabled
     * @param context Application context
     * @return true if force dark mode is enabled, false otherwise
     */
    fun isForceDarkModeEnabled(context: Context): Boolean {
        return context.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
            .getBoolean(KEY_FORCE_DARK_MODE, false)
    }
    
    /**
     * Update all widgets to reflect current theme
     * @param context Application context
     */
    fun updateAllWidgets(context: Context) {
        // Update Bitcoin Price Widgets
        val bitcoinPriceWidgetIds = AppWidgetUtils.getBitcoinPriceWidgetIds(context)
        if (bitcoinPriceWidgetIds.isNotEmpty()) {
            BitcoinPriceWidget.updateNetworkStatus(context, bitcoinPriceWidgetIds)
        }
        
        // Update Market Widgets
        val marketWidgetIds = MarketWidget.getAllWidgetIds(context)
        if (marketWidgetIds.isNotEmpty()) {
            MarketWidget.refreshAllWidgetsImmediately(context)
        }
    }
}

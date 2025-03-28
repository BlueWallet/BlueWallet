package io.bluewallet.bluewallet

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.util.Log

/**
 * BroadcastReceiver to handle system theme changes (light/dark mode)
 */
class ThemeChangeReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "ThemeChangeReceiver"
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_CONFIGURATION_CHANGED) {
            val currentNightMode = context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
            
            if (!ThemeHelper.isForceDarkModeEnabled(context)) {
                Log.d(TAG, "Configuration changed, updating widgets for theme change")
                AppWidgetUtils.updateWidgetsForThemeChange(context)
            }
        }
    }
}

package io.bluewallet.bluewallet

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import android.widget.Toast
import androidx.work.WorkManager

class BitcoinPriceWidget : AppWidgetProvider() {

    companion object {
        private const val TAG = "BitcoinPriceWidget"
        private const val SHARED_PREF_NAME = "group.io.bluewallet.bluewallet"
        
        /**
         * Update network status and apply proper theme
         */
        fun updateNetworkStatus(context: Context, appWidgetIds: IntArray) {
            val isNetworkAvailable = NetworkUtils.isNetworkAvailable(context)
            val appWidgetManager = AppWidgetManager.getInstance(context)
            
            for (appWidgetId in appWidgetIds) {
                val views = RemoteViews(context.packageName, R.layout.widget_layout)
                views.setViewVisibility(R.id.network_status, if (isNetworkAvailable) View.GONE else View.VISIBLE)
                
                updateWidgetTheme(context, views)
                
                appWidgetManager.partiallyUpdateAppWidget(appWidgetId, views)
            }
        }
        
        /**
         * Update widget with current theme settings
         */
        fun updateWidgetTheme(context: Context, views: RemoteViews) {
            // With the proper use of theme-aware resource qualifiers,
            // Android will automatically apply the right colors
            // This method can be expanded if manual theme handling is needed
            Log.d(TAG, "Updating widget theme, isDarkMode: ${ThemeHelper.isDarkModeActive(context)}")
        }

        /**
         * Completely refresh widget appearance
         */
        fun refreshWidget(context: Context, appWidgetId: Int) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            
            // Create new RemoteViews to ensure it picks up current theme
            val views = RemoteViews(context.packageName, R.layout.widget_layout)
            
            // Set network status
            val isNetworkAvailable = NetworkUtils.isNetworkAvailable(context)
            views.setViewVisibility(R.id.network_status, if (isNetworkAvailable) View.GONE else View.VISIBLE)
            
            // Show loading state initially
            views.setViewVisibility(R.id.loading_indicator, View.VISIBLE)
            views.setViewVisibility(R.id.price_value, View.GONE)
            views.setViewVisibility(R.id.last_updated_label, View.GONE)
            views.setViewVisibility(R.id.last_updated_time, View.GONE)
            views.setViewVisibility(R.id.price_arrow_container, View.GONE)
            
            // Update widget with current theme
            updateWidgetTheme(context, views)
            
            // Update widget
            appWidgetManager.updateAppWidget(appWidgetId, views)
            
            // Schedule data update
            WidgetUpdateWorker.scheduleWork(context)
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)
        
        for (widgetId in appWidgetIds) {
            Log.d(TAG, "Updating widget with ID: $widgetId")
            refreshWidget(context, widgetId)
        }
        Log.d("BitcoinPriceWidget", "BitcoinPriceWidget updated. Confirming interaction with MainActivity.")
    }

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        Log.d(TAG, "onEnabled called")
        WidgetUpdateWorker.scheduleWork(context)
    }

    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        Log.d(TAG, "onDisabled called")
        clearCache(context)
        WorkManager.getInstance(context).cancelUniqueWork(WidgetUpdateWorker.WORK_NAME)
    }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        super.onDeleted(context, appWidgetIds)
        Log.d(TAG, "onDeleted called for widgets: ${appWidgetIds.joinToString()}")
    }

    private fun clearCache(context: Context) {
        val sharedPref = context.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
        sharedPref.edit().clear().apply()
        Log.d(TAG, "Cache cleared from $SHARED_PREF_NAME")
    }

    /**
     * Called when widget is receiving configuration changes
     */
    override fun onAppWidgetOptionsChanged(context: Context, appWidgetManager: AppWidgetManager, 
                                          appWidgetId: Int, newOptions: Bundle?) {
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
        // Update this specific widget with full refresh to ensure theme is applied
        refreshWidget(context, appWidgetId)
    }

    private fun launchMainActivity(context: Context) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            action = Intent.ACTION_MAIN
            addCategory(Intent.CATEGORY_LAUNCHER)
        }
        context.startActivity(intent)
    }
}
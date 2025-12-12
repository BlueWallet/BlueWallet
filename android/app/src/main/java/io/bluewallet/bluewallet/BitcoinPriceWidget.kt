package io.bluewallet.bluewallet

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import androidx.work.WorkManager

class BitcoinPriceWidget : AppWidgetProvider() {

    companion object {
        private const val TAG = "BitcoinPriceWidget"
        private const val SHARED_PREF_NAME = "group.io.bluewallet.bluewallet"
        
        fun updateNetworkStatus(context: Context, appWidgetIds: IntArray) {
            val isNetworkAvailable = NetworkUtils.isNetworkAvailable(context)
            val appWidgetManager = AppWidgetManager.getInstance(context)
            
            for (appWidgetId in appWidgetIds) {
                val views = RemoteViews(context.packageName, R.layout.widget_layout)
                views.setViewVisibility(R.id.network_status, if (isNetworkAvailable) View.GONE else View.VISIBLE)
                appWidgetManager.partiallyUpdateAppWidget(appWidgetId, views)
            }
        }

        fun refreshWidget(context: Context, appWidgetId: Int) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            
            // Create new RemoteViews to ensure it picks up current theme
            val views = RemoteViews(context.packageName, R.layout.widget_layout)
            
            // Set network status
            val isNetworkAvailable = NetworkUtils.isNetworkAvailable(context)
            views.setViewVisibility(R.id.network_status, if (isNetworkAvailable) View.GONE else View.VISIBLE)
            
            // Try to load cached data first
            val sharedPref = context.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
            val cachedPrice = sharedPref.getString("previous_price", null)
            
            if (cachedPrice != null) {
                // Show cached data immediately
                val preferredCurrency = sharedPref.getString("preferredCurrency", "USD")
                val preferredCurrencyLocale = sharedPref.getString("preferredCurrencyLocale", "en-US")
                
                try {
                    val localeParts = preferredCurrencyLocale?.split("-") ?: listOf("en", "US")
                    val locale = if (localeParts.size == 2) {
                        java.util.Locale(localeParts[0], localeParts[1])
                    } else {
                        java.util.Locale.getDefault()
                    }
                    val currencyFormat = java.text.NumberFormat.getCurrencyInstance(locale)
                    val currency = java.util.Currency.getInstance(preferredCurrency ?: "USD")
                    currencyFormat.currency = currency
                    currencyFormat.maximumFractionDigits = 0
                    
                    views.setViewVisibility(R.id.loading_indicator, View.GONE)
                    views.setViewVisibility(R.id.price_value, View.VISIBLE)
                    views.setViewVisibility(R.id.last_updated_label, View.VISIBLE)
                    views.setViewVisibility(R.id.last_updated_time, View.VISIBLE)
                    views.setTextViewText(R.id.price_value, currencyFormat.format(cachedPrice.toDouble().toInt()))
                    views.setTextViewText(R.id.last_updated_time, java.text.SimpleDateFormat("hh:mm a", java.util.Locale.getDefault()).format(java.util.Date()))
                    views.setViewVisibility(R.id.price_arrow_container, View.GONE)
                } catch (e: Exception) {
                    Log.e(TAG, "Error displaying cached price", e)
                    // Show loading state if cache display fails
                    views.setViewVisibility(R.id.loading_indicator, View.VISIBLE)
                    views.setViewVisibility(R.id.price_value, View.GONE)
                    views.setViewVisibility(R.id.last_updated_label, View.GONE)
                    views.setViewVisibility(R.id.last_updated_time, View.GONE)
                    views.setViewVisibility(R.id.price_arrow_container, View.GONE)
                }
            } else {
                // No cached data, show loading state
                views.setViewVisibility(R.id.loading_indicator, View.VISIBLE)
                views.setViewVisibility(R.id.price_value, View.GONE)
                views.setViewVisibility(R.id.last_updated_label, View.GONE)
                views.setViewVisibility(R.id.last_updated_time, View.GONE)
                views.setViewVisibility(R.id.price_arrow_container, View.GONE)
            }
            
            appWidgetManager.updateAppWidget(appWidgetId, views)
            WidgetUpdateWorker.scheduleImmediateUpdate(context)
            WidgetUpdateWorker.scheduleWork(context)
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)
        
        for (widgetId in appWidgetIds) {
            Log.d(TAG, "Updating widget with ID: $widgetId")
            refreshWidget(context, widgetId)
        }
    }

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        WidgetUpdateWorker.scheduleImmediateUpdate(context)
        WidgetUpdateWorker.scheduleWork(context)
    }

    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        context.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE).edit().clear().apply()
        WorkManager.getInstance(context).cancelUniqueWork(WidgetUpdateWorker.WORK_NAME)
    }

    override fun onAppWidgetOptionsChanged(context: Context, appWidgetManager: AppWidgetManager, 
                                          appWidgetId: Int, newOptions: Bundle?) {
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
        refreshWidget(context, appWidgetId)
    }
}
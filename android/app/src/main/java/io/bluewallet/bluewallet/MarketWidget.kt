package io.bluewallet.bluewallet

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import androidx.work.WorkManager
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class MarketWidget : AppWidgetProvider() {

    companion object {
        private const val TAG = "MarketWidget"
        private const val SHARED_PREF_NAME = "group.io.bluewallet.bluewallet"
        private const val DEFAULT_CURRENCY = "USD"
        private const val KEY_LAST_ONLINE_STATUS = "market_widget_last_online_status"

        fun updateWidget(context: Context, appWidgetId: Int) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
        
        fun updateAllWidgets(context: Context) {
            val widgetIds = getAllWidgetIds(context)
            if (widgetIds.isNotEmpty()) {
                MarketWidgetUpdateWorker.scheduleMarketUpdate(context, widgetIds)
            }
        }
        
        fun refreshAllWidgetsImmediately(context: Context) {
            val widgetIds = getAllWidgetIds(context)
            if (widgetIds.isNotEmpty()) {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                for (widgetId in widgetIds) {
                    updateAppWidget(context, appWidgetManager, widgetId)
                }
                
                // Schedule an immediate update
                MarketWidgetUpdateWorker.scheduleMarketUpdate(context, widgetIds, true)
                
                Log.d(TAG, "Scheduled immediate market widget update")
            }
        }
        
        fun getAllWidgetIds(context: Context): IntArray {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val thisWidget = ComponentName(context, MarketWidget::class.java)
            return appWidgetManager.getAppWidgetIds(thisWidget)
        }

        private fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            Log.d(TAG, "Updating widget: $appWidgetId")
            
            // Check network connectivity
            val isNetworkAvailable = NetworkUtils.isNetworkAvailable(context)
            
            // Store connectivity status
            storeConnectivityStatus(context, isNetworkAvailable)
            
            // Get market data from shared preferences
            val marketData = getStoredMarketData(context)
            Log.d(TAG, "Retrieved market data for widget: $marketData")
            
            // Create RemoteViews to update the widget
            val views = RemoteViews(context.packageName, R.layout.widget_market)
            
            // Set network status indicator visibility
            views.setViewVisibility(R.id.network_status, if (isNetworkAvailable) View.GONE else View.VISIBLE)
            
            // Apply theme appropriate styling if needed beyond resource qualifiers
            applyTheme(context, views)
            
            // Add click intent to open the app
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            }
            val pendingIntent = PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_market, pendingIntent)
            
            // Set the text for each view
            val formattedNextBlock = marketData.formattedNextBlock
            Log.d(TAG, "Setting next block value to: $formattedNextBlock")
            views.setTextViewText(R.id.next_block_value, formattedNextBlock)
            
            // Get the user preferred currency
            val currency = getPreferredCurrency(context)
            views.setTextViewText(R.id.sats_label, context.getString(R.string.market_sats_label, currency))
            views.setTextViewText(R.id.sats_value, marketData.sats)
            views.setTextViewText(R.id.price_value, marketData.price)
            
            // Update the widget
            appWidgetManager.updateAppWidget(appWidgetId, views)
            
            // Schedule update if network available, otherwise retry in 30 seconds
            if (isNetworkAvailable) {
                MarketWidgetUpdateWorker.scheduleMarketUpdate(context, intArrayOf(appWidgetId))
            } else {
                MarketWidgetUpdateWorker.scheduleRetryOnNetworkAvailable(context, intArrayOf(appWidgetId))
            }
        }
        
        /**
         * Apply theme based on current system settings or user preference
         */
        private fun applyTheme(context: Context, views: RemoteViews) {
            // No manual styling needed here as we're using resource qualifiers (values-night)
            // This is a stub for any future manual theme adjustments
        }
        
        private fun storeConnectivityStatus(context: Context, isOnline: Boolean) {
            val sharedPrefs = context.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
            sharedPrefs.edit().putBoolean(KEY_LAST_ONLINE_STATUS, isOnline).apply()
        }
        
        private fun getStoredMarketData(context: Context): MarketData {
            val sharedPrefs = context.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
            val marketDataJson = sharedPrefs.getString(MarketData.PREF_KEY, null)
            
            return if (marketDataJson != null) {
                try {
                    val json = JSONObject(marketDataJson)
                    MarketData(
                        nextBlock = json.optString("nextBlock", "..."),
                        sats = json.optString("sats", "..."),
                        price = json.optString("price", "..."),
                        rate = json.optDouble("rate", 0.0),
                        dateString = json.optString("dateString", "")
                    )
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing stored market data", e)
                    MarketData()
                }
            } else {
                MarketData()
            }
        }
        
        private fun getPreferredCurrency(context: Context): String {
            val sharedPrefs = context.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
            return sharedPrefs.getString("preferredCurrency", DEFAULT_CURRENCY) ?: DEFAULT_CURRENCY
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)
        
        // First update widgets with existing data
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
        
        // Then schedule a work request to fetch fresh data
        MarketWidgetUpdateWorker.scheduleMarketUpdate(context, appWidgetIds)
    }

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        Log.d(TAG, "MarketWidget enabled")
    }

    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        Log.d(TAG, "MarketWidget disabled")
        WorkManager.getInstance(context).cancelUniqueWork(MarketWidgetUpdateWorker.WORK_NAME)
    }
}

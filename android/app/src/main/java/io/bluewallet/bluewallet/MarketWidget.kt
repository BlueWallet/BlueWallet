package io.bluewallet.bluewallet

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.util.Log
import android.widget.RemoteViews
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.Data
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OutOfQuotaPolicy
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.text.NumberFormat
import java.util.Currency
import java.util.Locale
import java.util.concurrent.TimeUnit

class MarketWidget : AppWidgetProvider() {

    companion object {
        private const val TAG = "MarketWidget"
        private const val SHARED_PREF_NAME = "group.io.bluewallet.bluewallet"
        private const val DEFAULT_CURRENCY = "USD"

        fun updateWidget(context: Context, appWidgetId: Int) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
        
        fun updateAllWidgets(context: Context) {
            val widgetIds = getAllWidgetIds(context)
            if (widgetIds.isNotEmpty()) {
                WidgetUpdateWorker.scheduleMarketUpdate(context, widgetIds)
            }
        }
        
        fun refreshAllWidgetsImmediately(context: Context) {
            val widgetIds = getAllWidgetIds(context)
            if (widgetIds.isNotEmpty()) {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                for (widgetId in widgetIds) {
                    updateAppWidget(context, appWidgetManager, widgetId)
                }
                
                val data = androidx.work.Data.Builder()
                    .putIntArray("widget_ids", widgetIds)
                    .build()
                    
                val constraints = androidx.work.Constraints.Builder()
                    .setRequiredNetworkType(androidx.work.NetworkType.CONNECTED)
                    .build()
                    
                val updateRequest = androidx.work.OneTimeWorkRequestBuilder<WidgetUpdateWorker>()
                    .setConstraints(constraints)
                    .setInputData(data)
                    .build()
                    
                androidx.work.WorkManager.getInstance(context).enqueueUniqueWork(
                    WidgetUpdateWorker.MARKET_WORK_NAME,
                    androidx.work.ExistingWorkPolicy.REPLACE,
                    updateRequest
                )
                
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
            
            // Get market data from shared preferences
            val marketData = getStoredMarketData(context)
            
            // Create RemoteViews to update the widget
            val views = RemoteViews(context.packageName, R.layout.widget_market)
            
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
            views.setOnClickPendingIntent(R.id.widget_market_layout, pendingIntent)
            
            // Set the text for each view
            views.setTextViewText(R.id.next_block_value, marketData.formattedNextBlock)
            
            // Get the user preferred currency
            val currency = getPreferredCurrency(context)
            views.setTextViewText(R.id.sats_label, "Sats/$currency")
            views.setTextViewText(R.id.sats_value, marketData.sats)
            views.setTextViewText(R.id.price_value, marketData.price)
            
            // Update the widget
            appWidgetManager.updateAppWidget(appWidgetId, views)
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
        WidgetUpdateWorker.scheduleMarketUpdate(context, appWidgetIds)
    }

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        Log.d(TAG, "MarketWidget enabled")
    }

    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        Log.d(TAG, "MarketWidget disabled")
        WorkManager.getInstance(context).cancelUniqueWork(WidgetUpdateWorker.MARKET_WORK_NAME)
    }
}

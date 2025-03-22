package io.bluewallet.bluewallet

import android.appwidget.AppWidgetManager
import android.content.Context
import android.util.Log
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.Data
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OutOfQuotaPolicy
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.text.NumberFormat
import java.util.concurrent.TimeUnit

class MarketWidgetUpdateWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    companion object {
        private const val TAG = "MarketWidgetUpdateWorker"
        const val WORK_NAME = "market_widget_update_work"
        private const val KEY_WIDGET_IDS = "widget_ids"
        private const val SHARED_PREF_NAME = "group.io.bluewallet.bluewallet"
        private const val DEFAULT_CURRENCY = "USD"
        private const val KEY_LAST_UPDATE_TIME = "market_widget_last_update_time"
        private const val MIN_UPDATE_INTERVAL_MS = 15L * 60 * 1000 // 15 minutes
        private const val RATE_LIMIT_COOLDOWN_MS = 30L * 60 * 1000 // 30 minutes
        
        fun scheduleUpdate(context: Context, appWidgetIds: IntArray) {
            val sharedPrefs = context.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
            val lastUpdateTime = sharedPrefs.getLong(KEY_LAST_UPDATE_TIME, 0)
            val currentTime = System.currentTimeMillis()
            
            // Check if we should schedule a new update based on the last update time
            if (currentTime - lastUpdateTime < MIN_UPDATE_INTERVAL_MS) {
                Log.d(TAG, "Skipping update - too soon since last update")
                return
            }
            
            val data = Data.Builder()
                .putIntArray(KEY_WIDGET_IDS, appWidgetIds)
                .build()
                
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
                
            // Calculate delay for the next update
            val initialDelay = calculateInitialDelay(context)
            
            val updateRequest = OneTimeWorkRequestBuilder<MarketWidgetUpdateWorker>()
                .setConstraints(constraints)
                .setInputData(data)
                .setInitialDelay(initialDelay, TimeUnit.MILLISECONDS)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.MINUTES)
                .build()
                
            WorkManager.getInstance(context).enqueueUniqueWork(
                WORK_NAME,
                ExistingWorkPolicy.REPLACE,
                updateRequest
            )
            
            Log.d(TAG, "Scheduled market widget update work with delay: ${initialDelay}ms")
        }
        
        private fun calculateInitialDelay(context: Context): Long {
            val sharedPrefs = context.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
            val rateLimitedTime = sharedPrefs.getLong("market_widget_rate_limited_time", 0)
            val currentTime = System.currentTimeMillis()
            
            return if (rateLimitedTime > 0 && currentTime - rateLimitedTime < RATE_LIMIT_COOLDOWN_MS) {
                // If we were rate-limited recently, wait longer
                val remainingCooldown = RATE_LIMIT_COOLDOWN_MS - (currentTime - rateLimitedTime)
                Log.d(TAG, "Rate limit cooldown active, delaying for ${remainingCooldown}ms")
                remainingCooldown
            } else {
                // Normal scheduling
                0
            }
        }
    }
    
    override suspend fun doWork(): Result {
        Log.d(TAG, "Starting market widget update work")
        
        val widgetIds = inputData.getIntArray(KEY_WIDGET_IDS)
        if (widgetIds == null || widgetIds.isEmpty()) {
            Log.e(TAG, "No widget IDs provided")
            return Result.failure()
        }
        
        val currency = getPreferredCurrency(applicationContext)
        
        try {
            // Mark update time before fetching data
            markUpdateTime()
            
            // Fetch complete market data
            val marketData = withContext(Dispatchers.IO) {
                MarketAPI.fetchMarketData(applicationContext, currency)
            }
            
            // Only update the widget if we got valid data
            if (marketData.rate > 0) {
                // Store the market data
                storeMarketData(marketData)
                
                // Update all widgets
                val appWidgetManager = AppWidgetManager.getInstance(applicationContext)
                for (widgetId in widgetIds) {
                    MarketWidget.updateWidget(applicationContext, widgetId)
                }
                
                // Clear any rate limit flag since we succeeded
                clearRateLimitFlag()
                
                // Schedule the next update in 30 minutes
                scheduleNextUpdate(widgetIds, TimeUnit.MINUTES.toMillis(30))
                
                return Result.success()
            } else {
                Log.w(TAG, "Market data fetch returned invalid rate (${marketData.rate})")
                // Schedule retry with backoff
                scheduleNextUpdate(widgetIds, TimeUnit.MINUTES.toMillis(15))
                return Result.retry()
            }
        } catch (e: RateLimitException) {
            Log.e(TAG, "Rate limit encountered", e)
            setRateLimitFlag()
            // Schedule retry after rate limit cooldown
            scheduleNextUpdate(widgetIds, RATE_LIMIT_COOLDOWN_MS)
            return Result.failure()
        } catch (e: Exception) {
            Log.e(TAG, "Error updating market widget", e)
            // Schedule retry with standard backoff
            scheduleNextUpdate(widgetIds, TimeUnit.MINUTES.toMillis(15))
            return Result.retry()
        }
    }
    
    // Replace this with the direct call to MarketAPI.fetchMarketData
    private suspend fun fetchMarketData(currency: String): MarketData {
        return MarketAPI.fetchMarketData(applicationContext, currency)
    }
    
    private fun storeMarketData(marketData: MarketData) {
        try {
            val json = JSONObject().apply {
                put("nextBlock", marketData.nextBlock)
                put("sats", marketData.sats)
                put("price", marketData.price)
                put("rate", marketData.rate)
                put("dateString", marketData.dateString)
            }
            
            applicationContext.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
                .edit()
                .putString(MarketData.PREF_KEY, json.toString())
                .apply()
                
            Log.d(TAG, "Stored market data: $marketData")
        } catch (e: Exception) {
            Log.e(TAG, "Error storing market data", e)
        }
    }
    
    private fun scheduleNextUpdate(widgetIds: IntArray, delayMs: Long) {
        // Schedule next update with the proper delay
        val data = Data.Builder()
            .putIntArray(KEY_WIDGET_IDS, widgetIds)
            .build()
            
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
            
        val updateRequest = OneTimeWorkRequestBuilder<MarketWidgetUpdateWorker>()
            .setConstraints(constraints)
            .setInputData(data)
            .setInitialDelay(delayMs, TimeUnit.MILLISECONDS)
            .build()
            
        WorkManager.getInstance(applicationContext).enqueueUniqueWork(
            WORK_NAME,
            ExistingWorkPolicy.REPLACE,
            updateRequest
        )
        
        Log.d(TAG, "Scheduled next update with delay: ${delayMs}ms")
    }
    
    private fun getPreferredCurrency(context: Context): String {
        val sharedPrefs = context.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
        return sharedPrefs.getString("preferredCurrency", DEFAULT_CURRENCY) ?: DEFAULT_CURRENCY
    }
    
    private fun markUpdateTime() {
        applicationContext.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
            .edit()
            .putLong(KEY_LAST_UPDATE_TIME, System.currentTimeMillis())
            .apply()
    }
    
    private fun setRateLimitFlag() {
        applicationContext.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
            .edit()
            .putLong("market_widget_rate_limited_time", System.currentTimeMillis())
            .apply()
    }
    
    private fun clearRateLimitFlag() {
        applicationContext.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
            .edit()
            .remove("market_widget_rate_limited_time")
            .apply()
    }
    
    class RateLimitException(message: String) : Exception(message)
}

package io.bluewallet.bluewallet

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.util.Log
import androidx.work.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class MarketWidgetUpdateWorker(context: Context, workerParams: WorkerParameters) : CoroutineWorker(context, workerParams) {

    companion object {
        const val TAG = "MarketWidgetUpdateWorker"
        const val WORK_NAME = "market_widget_update_work"
        const val NETWORK_RETRY_WORK_NAME = "market_network_retry_work"
        private const val SHARED_PREF_NAME = "group.io.bluewallet.bluewallet"
        private const val DEFAULT_CURRENCY = "USD"
        private const val KEY_LAST_UPDATE_TIME = "market_widget_last_update_time"
        private const val MIN_UPDATE_INTERVAL_MS = 15L * 60 * 1000
        private const val RATE_LIMIT_COOLDOWN_MS = 30L * 60 * 1000
        private const val NETWORK_RETRY_DELAY_SECONDS = 30L

        fun scheduleMarketUpdate(context: Context, forceUpdate: Boolean = false) {
            val sharedPrefs = context.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
            val lastUpdateTime = sharedPrefs.getLong(KEY_LAST_UPDATE_TIME, 0)
            val currentTime = System.currentTimeMillis()
            
            if (!forceUpdate && currentTime - lastUpdateTime < MIN_UPDATE_INTERVAL_MS) {
                Log.d(TAG, "Skipping update - too soon since last update")
                return
            }
                
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
                
            val initialDelay = if (forceUpdate) 0 else calculateInitialDelay(context)
            
            val updateRequest = OneTimeWorkRequestBuilder<MarketWidgetUpdateWorker>()
                .setConstraints(constraints)
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
        
        /**
         * Calculate delay for rate limiting
         */
        private fun calculateInitialDelay(context: Context): Long {
            val sharedPrefs = context.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
            val rateLimitedTime = sharedPrefs.getLong("market_widget_rate_limited_time", 0)
            val currentTime = System.currentTimeMillis()
            
            return if (rateLimitedTime > 0 && currentTime - rateLimitedTime < RATE_LIMIT_COOLDOWN_MS) {
                val remainingCooldown = RATE_LIMIT_COOLDOWN_MS - (currentTime - rateLimitedTime)
                Log.d(TAG, "Rate limit cooldown active, delaying for ${remainingCooldown}ms")
                remainingCooldown
            } else {
                0
            }
        }

        fun scheduleRetryOnNetworkAvailable(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
                
            val updateRequest = OneTimeWorkRequestBuilder<MarketWidgetUpdateWorker>()
                .setConstraints(constraints)
                .setInitialDelay(NETWORK_RETRY_DELAY_SECONDS, TimeUnit.SECONDS)
                .build()
                
            WorkManager.getInstance(context).enqueueUniqueWork(
                NETWORK_RETRY_WORK_NAME,
                ExistingWorkPolicy.REPLACE,
                updateRequest
            )
            
            Log.d(TAG, "Scheduled network retry in $NETWORK_RETRY_DELAY_SECONDS seconds")
        }
    }

    override suspend fun doWork(): Result {
        Log.d(TAG, "MarketWidgetUpdateWorker running. Confirming interaction with MainActivity.")
        return updateMarketWidgets()
    }

    private suspend fun updateMarketWidgets(): Result {
        Log.d(TAG, "Starting market widget update work")
        val widgetIds = MarketWidget.getAllWidgetIds(applicationContext)
        
        val currency = getPreferredCurrency(applicationContext)
        
        try {
            markUpdateTime()
            
            // Fetch market data
            Log.i(TAG, "About to call MarketAPI.fetchMarketData")
            val marketData = withContext(Dispatchers.IO) {
                MarketAPI.fetchMarketData(applicationContext, currency)
            }
            Log.i(TAG, "Received market data from API: $marketData with nextBlock=${marketData.nextBlock}")
            
            storeMarketData(marketData)
            Log.i(TAG, "Stored market data including nextBlock=${marketData.nextBlock}")
            
            for (widgetId in widgetIds) {
                MarketWidget.updateWidget(applicationContext, widgetId)
            }
            
            if (marketData.rate > 0) {
                clearRateLimitFlag()
                scheduleNextMarketUpdate(TimeUnit.MINUTES.toMillis(30))
                return Result.success()
            } else {
                Log.w(TAG, "Market data fetch returned invalid rate (${marketData.rate}), but fee may be available")
                scheduleNextMarketUpdate(TimeUnit.MINUTES.toMillis(15))
                return Result.retry()
            }
        } catch (e: RateLimitException) {
            Log.e(TAG, "Rate limit encountered", e)
            setRateLimitFlag()
            scheduleNextMarketUpdate(RATE_LIMIT_COOLDOWN_MS)
            return Result.failure()
        } catch (e: Exception) {
            Log.e(TAG, "Error updating market widget", e)
            scheduleNextMarketUpdate(TimeUnit.MINUTES.toMillis(15))
            return Result.retry()
        }
    }

    /**
     * Store market data in shared preferences
     */
    private fun storeMarketData(marketData: MarketData) {
        try {
            val json = JSONObject().apply {
                put("nextBlock", marketData.nextBlock)
                put("sats", marketData.sats)
                put("price", marketData.price)
                put("rate", marketData.rate)
                put("dateString", marketData.dateString)
            }
            
            val jsonString = json.toString()
            Log.d(TAG, "Storing market data JSON: $jsonString")
            
            applicationContext.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
                .edit()
                .putString(MarketData.PREF_KEY, jsonString)
                .apply()
                
            Log.d(TAG, "Stored market data: $marketData")
        } catch (e: Exception) {
            Log.e(TAG, "Error storing market data", e)
        }
    }
    
    private fun scheduleNextMarketUpdate(delayMs: Long) {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
            
        val updateRequest = OneTimeWorkRequestBuilder<MarketWidgetUpdateWorker>()
            .setConstraints(constraints)
            .setInitialDelay(delayMs, TimeUnit.MILLISECONDS)
            .build()
            
        WorkManager.getInstance(applicationContext).enqueueUniqueWork(
            WORK_NAME,
            ExistingWorkPolicy.REPLACE,
            updateRequest
        )
        
        Log.d(TAG, "Scheduled next market update with delay: ${delayMs}ms")
    }
    
    /**
     * Get user's preferred currency
     */
    private fun getPreferredCurrency(context: Context): String {
        val sharedPrefs = context.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
        return sharedPrefs.getString("preferredCurrency", DEFAULT_CURRENCY) ?: DEFAULT_CURRENCY
    }
    
    /**
     * Mark last update time
     */
    private fun markUpdateTime() {
        applicationContext.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
            .edit()
            .putLong(KEY_LAST_UPDATE_TIME, System.currentTimeMillis())
            .apply()
    }
    
    /**
     * Set rate limit flag when API rate limit encountered
     */
    private fun setRateLimitFlag() {
        applicationContext.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
            .edit()
            .putLong("market_widget_rate_limited_time", System.currentTimeMillis())
            .apply()
    }
    
    /**
     * Clear rate limit flag
     */
    private fun clearRateLimitFlag() {
        applicationContext.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
            .edit()
            .remove("market_widget_rate_limited_time")
            .apply()
    }
}

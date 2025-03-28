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
        const val BLOCK_CHECK_WORK_NAME = "block_check_work"
        private const val KEY_WIDGET_IDS = "widget_ids"
        private const val SHARED_PREF_NAME = "group.io.bluewallet.bluewallet"
        private const val DEFAULT_CURRENCY = "USD"
        private const val KEY_LAST_UPDATE_TIME = "market_widget_last_update_time"
        private const val KEY_LAST_BLOCK_CHECK = "market_last_block_check"
        private const val MIN_UPDATE_INTERVAL_MS = 15L * 60 * 1000 // 15 minutes
        private const val BLOCK_CHECK_INTERVAL_MS = 5L * 60 * 1000 // 5 minutes
        private const val RATE_LIMIT_COOLDOWN_MS = 30L * 60 * 1000 // 30 minutes
        private const val NETWORK_RETRY_DELAY_SECONDS = 30L

        /**
         * Schedule a market widget update
         */
        fun scheduleMarketUpdate(context: Context, appWidgetIds: IntArray, forceUpdate: Boolean = false) {
            val sharedPrefs = context.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
            val lastUpdateTime = sharedPrefs.getLong(KEY_LAST_UPDATE_TIME, 0)
            val currentTime = System.currentTimeMillis()
            
            if (!forceUpdate && currentTime - lastUpdateTime < MIN_UPDATE_INTERVAL_MS) {
                Log.d(TAG, "Skipping update - too soon since last update")
                return
            }
            
            val data = Data.Builder()
                .putIntArray(KEY_WIDGET_IDS, appWidgetIds)
                .build()
                
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
                
            val initialDelay = if (forceUpdate) 0 else calculateInitialDelay(context)
            
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

        /**
         * Schedule a retry when network becomes available
         */
        fun scheduleRetryOnNetworkAvailable(context: Context, appWidgetIds: IntArray) {
            val data = Data.Builder()
                .putIntArray(KEY_WIDGET_IDS, appWidgetIds)
                .build()
                
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
                
            val updateRequest = OneTimeWorkRequestBuilder<MarketWidgetUpdateWorker>()
                .setConstraints(constraints)
                .setInputData(data)
                .setInitialDelay(NETWORK_RETRY_DELAY_SECONDS, TimeUnit.SECONDS)
                .build()
                
            WorkManager.getInstance(context).enqueueUniqueWork(
                NETWORK_RETRY_WORK_NAME,
                ExistingWorkPolicy.REPLACE,
                updateRequest
            )
            
            Log.d(TAG, "Scheduled network retry in $NETWORK_RETRY_DELAY_SECONDS seconds")
        }

        /**
         * Schedule regular checks for new Bitcoin blocks
         */
        fun scheduleBlockHeightChecks(context: Context) {
            Log.d(TAG, "Scheduling regular Bitcoin block height checks")
            
            val sharedPrefs = context.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
            val lastBlockCheck = sharedPrefs.getLong(KEY_LAST_BLOCK_CHECK, 0)
            val currentTime = System.currentTimeMillis()
            
            if (currentTime - lastBlockCheck < BLOCK_CHECK_INTERVAL_MS) {
                Log.d(TAG, "Skipping block check - too soon since last check")
                return
            }
            
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            
            val checkRequest = OneTimeWorkRequestBuilder<BlockHeightCheckWorker>()
                .setConstraints(constraints)
                .build()
            
            WorkManager.getInstance(context).enqueueUniqueWork(
                BLOCK_CHECK_WORK_NAME,
                ExistingWorkPolicy.REPLACE,
                checkRequest
            )
            
            // Update last check time
            sharedPrefs.edit().putLong(KEY_LAST_BLOCK_CHECK, currentTime).apply()
            
            Log.d(TAG, "Scheduled block height check")
        }
    }

    override suspend fun doWork(): Result {
        Log.d(TAG, "Market widget update worker running")

        // Check network connectivity first
        if (!NetworkUtils.isNetworkAvailable(applicationContext)) {
            Log.d(TAG, "No network connection available")
            
            // Update widgets to show offline status
            val widgetIds = inputData.getIntArray(KEY_WIDGET_IDS)
            if (widgetIds != null && widgetIds.isNotEmpty()) {
                val appWidgetManager = AppWidgetManager.getInstance(applicationContext)
                for (widgetId in widgetIds) {
                    MarketWidget.updateWidget(applicationContext, widgetId)
                }
            } else {
                // Update all market widgets to show offline status
                val marketComponent = ComponentName(applicationContext, MarketWidget::class.java)
                val marketWidgetIds = AppWidgetManager.getInstance(applicationContext).getAppWidgetIds(marketComponent)
                for (widgetId in marketWidgetIds) {
                    MarketWidget.updateWidget(applicationContext, widgetId)
                }
            }
            
            // Schedule retry with network constraint
            scheduleRetryOnNetworkAvailable(applicationContext, widgetIds ?: intArrayOf())
            
            return Result.retry()
        }

        return updateMarketWidgets(inputData.getIntArray(KEY_WIDGET_IDS) ?: intArrayOf())
    }
    
    /**
     * Update market widgets with latest data
     */
    private suspend fun updateMarketWidgets(widgetIds: IntArray): Result {
        Log.d(TAG, "Starting market widget update work")
        
        val currency = getPreferredCurrency(applicationContext)
        
        try {
            markUpdateTime()
            
            // Also schedule periodic block height checks
            scheduleBlockHeightChecks(applicationContext)
            
            val marketData = withContext(Dispatchers.IO) {
                MarketAPI.fetchMarketData(applicationContext, currency)
            }
            
            if (marketData.rate > 0) {
                storeMarketData(marketData)
                
                val appWidgetManager = AppWidgetManager.getInstance(applicationContext)
                for (widgetId in widgetIds) {
                    MarketWidget.updateWidget(applicationContext, widgetId)
                }
                
                clearRateLimitFlag()
                
                scheduleNextMarketUpdate(widgetIds, TimeUnit.MINUTES.toMillis(30))
                
                return Result.success()
            } else {
                Log.w(TAG, "Market data fetch returned invalid rate (${marketData.rate})")
                scheduleNextMarketUpdate(widgetIds, TimeUnit.MINUTES.toMillis(15))
                return Result.retry()
            }
        } catch (e: RateLimitException) {
            Log.e(TAG, "Rate limit encountered", e)
            setRateLimitFlag()
            scheduleNextMarketUpdate(widgetIds, RATE_LIMIT_COOLDOWN_MS)
            return Result.failure()
        } catch (e: Exception) {
            Log.e(TAG, "Error updating market widget", e)
            scheduleNextMarketUpdate(widgetIds, TimeUnit.MINUTES.toMillis(15))
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
            
            applicationContext.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
                .edit()
                .putString(MarketData.PREF_KEY, json.toString())
                .apply()
                
            Log.d(TAG, "Stored market data: $marketData")
        } catch (e: Exception) {
            Log.e(TAG, "Error storing market data", e)
        }
    }
    
    /**
     * Schedule next update
     */
    private fun scheduleNextMarketUpdate(widgetIds: IntArray, delayMs: Long) {
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

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
        private const val RATE_LIMIT_COOLDOWN_MS = 30L * 60 * 1000
        const val REPEAT_INTERVAL_MINUTES = 15L
        private const val NETWORK_RETRY_DELAY_SECONDS = 30L

        /**
         * Schedule periodic market widget updates every 15 minutes.
         * Uses PeriodicWorkRequest for reliable, self-sustaining updates
         * (consistent with WidgetUpdateWorker and iOS 15-min refresh interval).
         */
        fun scheduleWork(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .setRequiresBatteryNotLow(false)
                .build()

            val workRequest = PeriodicWorkRequestBuilder<MarketWidgetUpdateWorker>(
                REPEAT_INTERVAL_MINUTES, TimeUnit.MINUTES
            )
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, WorkRequest.MIN_BACKOFF_MILLIS, TimeUnit.MILLISECONDS)
                .addTag(TAG)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                workRequest
            )

            Log.d(TAG, "Scheduled periodic market widget updates every ${REPEAT_INTERVAL_MINUTES} minutes")
        }

        /**
         * Schedule an immediate one-time market widget update.
         */
        fun scheduleImmediateUpdate(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val updateRequest = OneTimeWorkRequestBuilder<MarketWidgetUpdateWorker>()
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, WorkRequest.MIN_BACKOFF_MILLIS, TimeUnit.MILLISECONDS)
                .addTag(TAG)
                .build()

            WorkManager.getInstance(context).enqueue(updateRequest)

            Log.d(TAG, "Scheduled immediate market widget update")
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
        Log.d(TAG, "MarketWidgetUpdateWorker running")

        // Check rate limit before proceeding
        if (isRateLimited()) {
            Log.d(TAG, "Rate limited, skipping update")
            return Result.success()
        }

        return updateMarketWidgets()
    }

    private suspend fun updateMarketWidgets(): Result {
        Log.d(TAG, "Starting market widget update work")
        val widgetIds = MarketWidget.getAllWidgetIds(applicationContext)

        val currency = getPreferredCurrency(applicationContext)

        try {
            markUpdateTime()

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
            } else {
                Log.w(TAG, "Market data fetch returned invalid rate (${marketData.rate}), but fee may be available")
            }

            return Result.success()
        } catch (e: RateLimitException) {
            Log.e(TAG, "Rate limit encountered", e)
            setRateLimitFlag()
            return Result.failure()
        } catch (e: Exception) {
            Log.e(TAG, "Error updating market widget", e)
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
     * Check if currently rate limited
     */
    private fun isRateLimited(): Boolean {
        val sharedPrefs = applicationContext.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
        val rateLimitedTime = sharedPrefs.getLong("market_widget_rate_limited_time", 0)
        val currentTime = System.currentTimeMillis()
        return rateLimitedTime > 0 && currentTime - rateLimitedTime < RATE_LIMIT_COOLDOWN_MS
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

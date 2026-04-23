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
        }

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
        }
    }

    override suspend fun doWork(): Result {
        if (isRateLimited()) return Result.success()

        val widgetIds = MarketWidget.getAllWidgetIds(applicationContext)
        val currency = getPreferredCurrency()

        return try {
            markUpdateTime()

            val marketData = withContext(Dispatchers.IO) {
                MarketAPI.fetchMarketData(applicationContext, currency)
            }

            storeMarketData(marketData)

            for (widgetId in widgetIds) {
                MarketWidget.updateWidget(applicationContext, widgetId)
            }

            if (marketData.rate > 0) clearRateLimitFlag()
            Result.success()
        } catch (e: RateLimitException) {
            Log.e(TAG, "Rate limit encountered", e)
            setRateLimitFlag()
            Result.failure()
        } catch (e: Exception) {
            Log.e(TAG, "Error updating market widget", e)
            Result.retry()
        }
    }

    private fun storeMarketData(marketData: MarketData) {
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
    }

    private fun getPreferredCurrency(): String {
        return applicationContext.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
            .getString("preferredCurrency", DEFAULT_CURRENCY) ?: DEFAULT_CURRENCY
    }

    private fun markUpdateTime() {
        applicationContext.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
            .edit()
            .putLong(KEY_LAST_UPDATE_TIME, System.currentTimeMillis())
            .apply()
    }

    private fun isRateLimited(): Boolean {
        val rateLimitedTime = applicationContext.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
            .getLong("market_widget_rate_limited_time", 0)
        return rateLimitedTime > 0 && System.currentTimeMillis() - rateLimitedTime < RATE_LIMIT_COOLDOWN_MS
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
}

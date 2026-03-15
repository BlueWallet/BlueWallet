package io.bluewallet.bluewallet

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import androidx.work.*
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class WidgetUpdateWorker(context: Context, workerParams: WorkerParameters) : CoroutineWorker(context, workerParams) {

    companion object {
        const val TAG = "WidgetUpdateWorker"
        const val WORK_NAME = "bitcoin_price_widget_update_work"
        const val NETWORK_RETRY_WORK_NAME = "bitcoin_price_network_retry_work"
        const val REPEAT_INTERVAL_MINUTES = 15L
        private const val SHARED_PREF_NAME = "group.io.bluewallet.bluewallet"
        private const val NETWORK_RETRY_DELAY_SECONDS = 30L

        fun scheduleWork(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .setRequiresBatteryNotLow(false)
                .build()
                
            val workRequest = PeriodicWorkRequestBuilder<WidgetUpdateWorker>(
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
                
            val updateRequest = OneTimeWorkRequestBuilder<WidgetUpdateWorker>()
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
                
            val updateRequest = OneTimeWorkRequestBuilder<WidgetUpdateWorker>()
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
        val sharedPref = applicationContext.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)

        if (!NetworkUtils.isNetworkAvailable(applicationContext)) {
            val component = ComponentName(applicationContext, BitcoinPriceWidget::class.java)
            val widgetIds = AppWidgetManager.getInstance(applicationContext).getAppWidgetIds(component)
            BitcoinPriceWidget.updateNetworkStatus(applicationContext, widgetIds)
            scheduleRetryOnNetworkAvailable(applicationContext)
            return Result.retry()
        }

        val appWidgetManager = AppWidgetManager.getInstance(applicationContext)
        val widgetIds = appWidgetManager.getAppWidgetIds(
            ComponentName(applicationContext, BitcoinPriceWidget::class.java)
        )

        val preferredCurrency = sharedPref.getString("preferredCurrency", "USD") ?: "USD"
        val previousPrice = sharedPref.getString("previous_price", null)

        // Fetch market data using the single API entry point
        val marketData = try {
            withContext(Dispatchers.IO) {
                MarketAPI.fetchMarketData(applicationContext, preferredCurrency)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching market data", e)
            null
        }

        val views = RemoteViews(applicationContext.packageName, R.layout.widget_layout)

        // Set tap-to-open intent
        val intent = Intent(applicationContext, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            action = Intent.ACTION_MAIN
            addCategory(Intent.CATEGORY_LAUNCHER)
        }
        views.setOnClickPendingIntent(R.id.widget_layout, PendingIntent.getActivity(
            applicationContext, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        ))

        views.setViewVisibility(R.id.network_status,
            if (NetworkUtils.isNetworkAvailable(applicationContext)) View.GONE else View.VISIBLE
        )

        val currentTime = SimpleDateFormat("hh:mm a", Locale.getDefault()).format(Date())
        val currentPrice = marketData?.rate?.takeIf { it > 0 }

        if (currentPrice != null) {
            val formattedPrice = MarketAPI.formatCurrencyAmount(currentPrice, preferredCurrency)
            views.setViewVisibility(R.id.loading_indicator, View.GONE)
            views.setViewVisibility(R.id.price_value, View.VISIBLE)
            views.setViewVisibility(R.id.last_updated_label, View.VISIBLE)
            views.setViewVisibility(R.id.last_updated_time, View.VISIBLE)
            views.setTextViewText(R.id.price_value, formattedPrice)
            views.setTextViewText(R.id.last_updated_time, currentTime)

            if (previousPrice != null) {
                val prevInt = previousPrice.toDoubleOrNull()?.toInt() ?: 0
                val currInt = currentPrice.toInt()
                views.setViewVisibility(R.id.price_arrow_container, View.VISIBLE)
                views.setTextViewText(R.id.previous_price, MarketAPI.formatCurrencyAmount(prevInt.toDouble(), preferredCurrency))
                views.setImageViewResource(R.id.price_arrow,
                    if (currInt > prevInt) android.R.drawable.arrow_up_float else android.R.drawable.arrow_down_float
                )
            } else {
                views.setViewVisibility(R.id.price_arrow_container, View.GONE)
            }

            // Save current rate as previous_price for next comparison
            sharedPref.edit().putString("previous_price", currentPrice.toString()).apply()
        } else if (previousPrice != null) {
            // Show cached price on fetch failure
            val cachedRate = previousPrice.toDoubleOrNull() ?: 0.0
            views.setViewVisibility(R.id.loading_indicator, View.GONE)
            views.setViewVisibility(R.id.price_value, View.VISIBLE)
            views.setViewVisibility(R.id.last_updated_label, View.VISIBLE)
            views.setViewVisibility(R.id.last_updated_time, View.VISIBLE)
            views.setTextViewText(R.id.price_value, MarketAPI.formatCurrencyAmount(cachedRate, preferredCurrency))
            views.setTextViewText(R.id.last_updated_time, currentTime)
            views.setViewVisibility(R.id.price_arrow_container, View.GONE)
        } else {
            // No data at all
            views.setViewVisibility(R.id.loading_indicator, View.GONE)
            views.setViewVisibility(R.id.price_value, View.GONE)
            views.setViewVisibility(R.id.last_updated_label, View.GONE)
            views.setViewVisibility(R.id.last_updated_time, View.GONE)
            views.setViewVisibility(R.id.price_arrow_container, View.GONE)
        }

        appWidgetManager.updateAppWidget(widgetIds, views)
        return Result.success()
    }
}
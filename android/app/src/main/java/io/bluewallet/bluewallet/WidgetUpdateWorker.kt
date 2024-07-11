package io.bluewallet.bluewallet

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import androidx.work.*
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit

class WidgetUpdateWorker(context: Context, workerParams: WorkerParameters) : Worker(context, workerParams) {

    companion object {
        const val TAG = "WidgetUpdateWorker"
        const val WORK_NAME = "widget_update_work"
        const val REPEAT_INTERVAL_MINUTES = 15L

        fun scheduleWork(context: Context) {
            val workRequest = PeriodicWorkRequestBuilder<WidgetUpdateWorker>(
                REPEAT_INTERVAL_MINUTES, TimeUnit.MINUTES
            ).build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.REPLACE,
                workRequest
            )
            Log.d(TAG, "Scheduling work for widget updates, will run every $REPEAT_INTERVAL_MINUTES minutes")
        }
    }

    override fun doWork(): Result {
        Log.d(TAG, "Widget update worker running")

        val appWidgetManager = AppWidgetManager.getInstance(applicationContext)
        val thisWidget = ComponentName(applicationContext, BitcoinPriceWidget::class.java)
        val appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget)
        val views = RemoteViews(applicationContext.packageName, R.layout.widget_layout)

        // Simulate fetching price data
        val currentTime = SimpleDateFormat("hh:mm a", Locale.getDefault()).format(Date())
        val price = fetchPrice() // Simulated method to fetch the price
        val previousPrice = getPreviousPrice() // Simulated method to fetch the previous price

        // Log fetched data
        Log.d(TAG, "Fetch completed with price: $price at $currentTime. Previous price: $previousPrice")

        // Update views
        val currencyFormat = NumberFormat.getCurrencyInstance(Locale.getDefault()).apply {
            maximumFractionDigits = 0
        }
        views.setTextViewText(R.id.price_value, currencyFormat.format(price.toDouble()))
        views.setTextViewText(R.id.last_updated_time, currentTime)

        if (previousPrice != null) {
            views.setViewVisibility(R.id.price_arrow_container, View.VISIBLE)
            views.setTextViewText(R.id.previous_price, currencyFormat.format(previousPrice.toDouble()))
            if (price.toDouble() > previousPrice.toDouble()) {
                views.setImageViewResource(R.id.price_arrow, android.R.drawable.arrow_up_float)
            } else {
                views.setImageViewResource(R.id.price_arrow, android.R.drawable.arrow_down_float)
            }
        } else {
            views.setViewVisibility(R.id.price_arrow_container, View.GONE)
        }

        appWidgetManager.updateAppWidget(appWidgetIds, views)

        return Result.success()
    }

    private fun fetchPrice(): String {
        // Simulate a network call to fetch the price
        return (60000 + Random().nextInt(5000)).toString() // Replace with actual fetch logic
    }

    private fun getPreviousPrice(): String? {
        // Simulate retrieving the previous price from shared preferences or a database
        return (60000 + Random().nextInt(5000)).toString() // Replace with actual retrieval logic
    }
}
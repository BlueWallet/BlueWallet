package io.bluewallet.bluewallet

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import androidx.work.*
import java.text.NumberFormat
import java.util.Locale
import java.util.concurrent.TimeUnit

class WidgetUpdateWorker(context: Context, params: WorkerParameters) : Worker(context, params) {

    override fun doWork(): Result {
        val appWidgetManager = AppWidgetManager.getInstance(applicationContext)
        val widgetComponent = ComponentName(applicationContext, BitcoinPriceWidget::class.java)
        val allWidgetIds = appWidgetManager.getAppWidgetIds(widgetComponent)

        val price = MarketAPI.fetchPrice(applicationContext, "USD")
        val views = RemoteViews(applicationContext.packageName, R.layout.widget_layout)

        if (price != null) {
            val formattedPrice = NumberFormat.getCurrencyInstance(Locale.getDefault()).format(price.toDouble())

            views.setTextViewText(R.id.price_value, formattedPrice)
            views.setViewVisibility(R.id.loading_indicator, View.GONE)
            views.setViewVisibility(R.id.price_value, View.VISIBLE)
            views.setViewVisibility(R.id.last_updated, View.VISIBLE)

            val currentTime = System.currentTimeMillis()
            val formattedTime = java.text.DateFormat.getTimeInstance().format(currentTime)
            views.setTextViewText(R.id.last_updated, "Last Updated: $formattedTime")
        } else {
            Log.d("WidgetUpdateWorker", "Failed to fetch price")
        }

        for (widgetId in allWidgetIds) {
            appWidgetManager.updateAppWidget(widgetId, views)
        }

        scheduleNextUpdate()
        return Result.success()
    }

    private fun scheduleNextUpdate() {
        val request = OneTimeWorkRequestBuilder<WidgetUpdateWorker>()
            .setInitialDelay(10, TimeUnit.MINUTES)
            .build()

        WorkManager.getInstance(applicationContext).enqueueUniqueWork(
            "widget_update_work",
            ExistingWorkPolicy.REPLACE,
            request
        )

        Log.d("WidgetUpdateWorker", "Scheduled next update for widget")
    }

    companion object {
        fun createWorkRequest(): OneTimeWorkRequest {
            return OneTimeWorkRequestBuilder<WidgetUpdateWorker>()
                .setInitialDelay(0, TimeUnit.SECONDS)
                .build()
        }

        fun scheduleWork(context: Context) {
            WorkManager.getInstance(context).enqueue(createWorkRequest())
        }
    }
}
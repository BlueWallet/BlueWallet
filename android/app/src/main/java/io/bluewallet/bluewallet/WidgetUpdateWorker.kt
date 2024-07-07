package io.bluewallet.bluewallet

import android.content.Context
import android.util.Log
import android.widget.RemoteViews
import androidx.work.Worker
import androidx.work.WorkerParameters
import java.text.NumberFormat
import java.util.*

class WidgetUpdateWorker(context: Context, workerParams: WorkerParameters) : Worker(context, workerParams) {

    override fun doWork(): Result {
        val context = applicationContext
        val appWidgetManager = android.appwidget.AppWidgetManager.getInstance(context)
        val thisWidget = android.content.ComponentName(context, BitcoinPriceWidget::class.java)
        val allWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget)

        for (widgetId in allWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_layout)

            // Show loading indicator
            views.setViewVisibility(R.id.loading_indicator, android.view.View.VISIBLE)
            views.setViewVisibility(R.id.price_value, android.view.View.GONE)
            views.setViewVisibility(R.id.last_updated, android.view.View.GONE)
            views.setViewVisibility(R.id.last_updated_time, android.view.View.GONE)
            views.setViewVisibility(R.id.price_arrow_container, android.view.View.GONE)

            appWidgetManager.updateAppWidget(widgetId, views)

            val price = MarketAPI.fetchPrice(context, "USD")

            if (price != null) {
                updateWidgetWithPrice(context, appWidgetManager, widgetId, views, price)
            } else {
                handleError(context, appWidgetManager, widgetId, views)
            }
        }
        return Result.success()
    }

    private fun updateWidgetWithPrice(context: Context, appWidgetManager: android.appwidget.AppWidgetManager, widgetId: Int, views: RemoteViews, price: String) {
        val sharedPref = context.getSharedPreferences("group.io.bluewallet.bluewallet", Context.MODE_PRIVATE)
        val prevPrice = sharedPref.getString("prev_price", null)
        val editor = sharedPref.edit()

        Log.d("WidgetUpdateWorker", "Fetch completed with price: $price at ${getCurrentTime()}. Previous price: $prevPrice at ${sharedPref.getString("prev_time", "N/A")}")

        val currencyFormat = NumberFormat.getCurrencyInstance(Locale.getDefault())
        views.setTextViewText(R.id.price_value, currencyFormat.format(price.toDouble()))

        if (prevPrice != null) {
            val previousPrice = prevPrice.toDouble()
            val currentPrice = price.toDouble()

            if (currentPrice > previousPrice) {
                views.setImageViewResource(R.id.price_arrow, android.R.drawable.arrow_up_float)
            } else if (currentPrice < previousPrice) {
                views.setImageViewResource(R.id.price_arrow, android.R.drawable.arrow_down_float)
            } else {
                views.setImageViewResource(R.id.price_arrow, 0)
            }

            views.setTextViewText(R.id.previous_price, "from ${currencyFormat.format(previousPrice)}")
            views.setViewVisibility(R.id.price_arrow_container, android.view.View.VISIBLE)
        }

        editor.putString("prev_price", price)
        editor.putString("prev_time", getCurrentTime())
        editor.apply()

        views.setTextViewText(R.id.last_updated, "Last Updated")
        views.setTextViewText(R.id.last_updated_time, getCurrentTime())

        // Hide loading indicator
        views.setViewVisibility(R.id.loading_indicator, android.view.View.GONE)
        views.setViewVisibility(R.id.price_value, android.view.View.VISIBLE)
        views.setViewVisibility(R.id.last_updated, android.view.View.VISIBLE)
        views.setViewVisibility(R.id.last_updated_time, android.view.View.VISIBLE)

        appWidgetManager.updateAppWidget(widgetId, views)
    }

    private fun handleError(context: Context, appWidgetManager: android.appwidget.AppWidgetManager, widgetId: Int, views: RemoteViews) {
        Log.e("WidgetUpdateWorker", "Failed to fetch Bitcoin price")
        views.setViewVisibility(R.id.loading_indicator, android.view.View.GONE)
        views.setViewVisibility(R.id.price_value, android.view.View.VISIBLE)
        appWidgetManager.updateAppWidget(widgetId, views)
    }

    private fun getCurrentTime(): String {
        val dateFormatter = java.text.SimpleDateFormat.getTimeInstance(java.text.SimpleDateFormat.SHORT, Locale.getDefault())
        return dateFormatter.format(Date())
    }
}
package io.bluewallet.bluewallet

import android.content.Context
import android.content.SharedPreferences
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import androidx.work.Worker
import androidx.work.WorkerParameters
import androidx.work.PeriodicWorkRequest
import androidx.work.WorkManager
import androidx.work.ExistingPeriodicWorkPolicy
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

class WidgetUpdateWorker(context: Context, params: WorkerParameters) : Worker(context, params) {

    companion object {
        private const val FETCH_INTERVAL_MINUTES = 15L
        private const val PREFS_NAME = "BitcoinPriceWidgetPrefs"
        private const val PREF_PREFIX_KEY = "appwidget_"

        fun createWorkRequest(appWidgetId: Int): PeriodicWorkRequest {
            return PeriodicWorkRequest.Builder(WidgetUpdateWorker::class.java, FETCH_INTERVAL_MINUTES, TimeUnit.MINUTES)
                .addTag(appWidgetId.toString())
                .build()
        }
    }

    override fun doWork(): Result {
        val appWidgetId = inputData.getInt("appWidgetId", -1)
        if (appWidgetId == -1) return Result.failure()

        val context = applicationContext
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val previousPrice = prefs.getString(PREF_PREFIX_KEY + appWidgetId, null)
        val previousTime = prefs.getString("${PREF_PREFIX_KEY}${appWidgetId}_time", null)

        val price = MarketAPI.fetchPrice(context, "USD")
        if (price != null) {
            updateWidgetWithPrice(context, appWidgetId, price, previousPrice, previousTime)
            Log.d("WidgetUpdateWorker", "Fetch completed with price: $price at ${getCurrentTime()}. Previous price: $previousPrice at $previousTime. Next fetch at: ${getNextFetchTime()}")
        } else {
            handleError(context, appWidgetId)
            Log.e("WidgetUpdateWorker", "Failed to fetch Bitcoin price. Next fetch at: ${getNextFetchTime()}")
        }

        return Result.success()
    }

    private fun getCurrentTime(): String {
        return SimpleDateFormat("hh:mm a", Locale.getDefault()).format(Date())
    }

    private fun getNextFetchTime(): String {
        val nextFetch = System.currentTimeMillis() + FETCH_INTERVAL_MINUTES * 60 * 1000
        return SimpleDateFormat("hh:mm a", Locale.getDefault()).format(Date(nextFetch))
    }

    private fun updateWidgetWithPrice(context: Context, appWidgetId: Int, price: String, previousPrice: String?, previousTime: String?) {
        val views = RemoteViews(context.packageName, R.layout.widget_layout)
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
        val currencyFormat = NumberFormat.getCurrencyInstance(Locale.US)
        views.setTextViewText(R.id.price_value, currencyFormat.format(price.toDouble()))

        if (previousPrice != null && previousTime != null) {
            val previousPriceValue = previousPrice.toDouble()
            val currentPriceValue = price.toDouble()
            if (currentPriceValue != previousPriceValue) {
                views.setTextViewText(R.id.previous_price, "From ${currencyFormat.format(previousPriceValue)}")
                views.setViewVisibility(R.id.price_arrow, View.VISIBLE)
                views.setViewVisibility(R.id.previous_price, View.VISIBLE)
                if (currentPriceValue > previousPriceValue) {
                    views.setImageViewResource(R.id.price_arrow, R.drawable.ic_arrow_upward)
                } else {
                    views.setImageViewResource(R.id.price_arrow, R.drawable.ic_arrow_downward)
                }
            } else {
                views.setViewVisibility(R.id.price_arrow, View.GONE)
                views.setViewVisibility(R.id.previous_price, View.GONE)
            }
        } else {
            views.setViewVisibility(R.id.price_arrow, View.GONE)
            views.setViewVisibility(R.id.previous_price, View.GONE)
        }

        prefs.putString(PREF_PREFIX_KEY + appWidgetId, price)
        prefs.putString("${PREF_PREFIX_KEY}${appWidgetId}_time", getCurrentTime())
        prefs.apply()

        views.setTextViewText(R.id.last_updated, "Last Updated")
        views.setTextViewText(R.id.last_updated_time, getCurrentTime())

        val appWidgetManager = AppWidgetManager.getInstance(context)
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    private fun handleError(context: Context, appWidgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.widget_layout)
        views.setTextViewText(R.id.price_value, "Error")
        views.setViewVisibility(R.id.price_arrow, View.GONE)
        views.setViewVisibility(R.id.previous_price, View.GONE)

        val appWidgetManager = AppWidgetManager.getInstance(context)
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
}

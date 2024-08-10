package io.bluewallet.bluewallet

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.SharedPreferences
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

        val sharedPref = applicationContext.getSharedPreferences("widget_prefs", Context.MODE_PRIVATE)
        val preferredCurrency = sharedPref.getString("preferredCurrency", "USD")
        val preferredCurrencyLocale = sharedPref.getString("preferredCurrencyLocale", "en-US")
        val previousPrice = sharedPref.getString("previous_price", null)

        val currentTime = SimpleDateFormat("hh:mm a", Locale.getDefault()).format(Date())

        fetchPrice(preferredCurrency) { fetchedPrice, error ->
            handlePriceResult(
                appWidgetManager, appWidgetIds, views, sharedPref,
                fetchedPrice, previousPrice, currentTime, preferredCurrencyLocale, error
            )
        }

        return Result.success()
    }

    private fun handlePriceResult(
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
        views: RemoteViews,
        sharedPref: SharedPreferences,
        fetchedPrice: String?,
        previousPrice: String?,
        currentTime: String,
        preferredCurrencyLocale: String?,
        error: String?
    ) {
        val isPriceFetched = fetchedPrice != null
        val isPriceCached = previousPrice != null

        if (error != null || !isPriceFetched) {
            Log.e(TAG, "Error fetching price: $error")
            if (!isPriceCached) {
                showLoadingError(views)
            } else {
                displayCachedPrice(views, previousPrice, currentTime, preferredCurrencyLocale)
            }
        } else {
            displayFetchedPrice(
                views, fetchedPrice!!, previousPrice, currentTime, preferredCurrencyLocale
            )
            savePrice(sharedPref, fetchedPrice)
        }

        appWidgetManager.updateAppWidget(appWidgetIds, views)
    }

    private fun showLoadingError(views: RemoteViews) {
        views.apply {
            setViewVisibility(R.id.loading_indicator, View.VISIBLE)
            setViewVisibility(R.id.price_value, View.GONE)
            setViewVisibility(R.id.last_updated_label, View.GONE)
            setViewVisibility(R.id.last_updated_time, View.GONE)
            setViewVisibility(R.id.price_arrow_container, View.GONE)
        }
    }

    private fun displayCachedPrice(
        views: RemoteViews,
        previousPrice: String?,
        currentTime: String,
        preferredCurrencyLocale: String?
    ) {
        val currencyFormat = NumberFormat.getCurrencyInstance(Locale.forLanguageTag(preferredCurrencyLocale!!)).apply {
            maximumFractionDigits = 0
        }

        views.apply {
            setViewVisibility(R.id.loading_indicator, View.GONE)
            setTextViewText(R.id.price_value, currencyFormat.format(previousPrice?.toDouble()?.toInt()))
            setTextViewText(R.id.last_updated_time, currentTime)
            setViewVisibility(R.id.price_value, View.VISIBLE)
            setViewVisibility(R.id.last_updated_label, View.VISIBLE)
            setViewVisibility(R.id.last_updated_time, View.VISIBLE)
            setViewVisibility(R.id.price_arrow_container, View.GONE)
        }
    }

    private fun displayFetchedPrice(
        views: RemoteViews,
        fetchedPrice: String,
        previousPrice: String?,
        currentTime: String,
        preferredCurrencyLocale: String?
    ) {
        val currentPrice = fetchedPrice.toDouble().let { it.toInt() } // Remove cents
        val currencyFormat = NumberFormat.getCurrencyInstance(Locale.forLanguageTag(preferredCurrencyLocale!!)).apply {
            maximumFractionDigits = 0
        }

        views.apply {
            setViewVisibility(R.id.loading_indicator, View.GONE)
            setTextViewText(R.id.price_value, currencyFormat.format(currentPrice))
            setTextViewText(R.id.last_updated_time, currentTime)
            setViewVisibility(R.id.price_value, View.VISIBLE)
            setViewVisibility(R.id.last_updated_label, View.VISIBLE)
            setViewVisibility(R.id.last_updated_time, View.VISIBLE)

            if (previousPrice != null) {
                setViewVisibility(R.id.price_arrow_container, View.VISIBLE)
                setTextViewText(R.id.previous_price, currencyFormat.format(previousPrice.toDouble().toInt()))
                setImageViewResource(
                    R.id.price_arrow,
                    if (currentPrice > previousPrice.toDouble().toInt()) android.R.drawable.arrow_up_float else android.R.drawable.arrow_down_float
                )
            } else {
                setViewVisibility(R.id.price_arrow_container, View.GONE)
            }
        }
    }

    private fun fetchPrice(currency: String?, callback: (String?, String?) -> Unit) {
        val price = MarketAPI.fetchPrice(applicationContext, currency ?: "USD")
        if (price == null) {
            callback(null, "Failed to fetch price")
        } else {
            callback(price, null)
        }
    }

    private fun savePrice(sharedPref: SharedPreferences, price: String) {
        sharedPref.edit().putString("previous_price", price).apply()
    }
}
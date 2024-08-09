package io.bluewallet.bluewallet

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import androidx.work.Worker
import androidx.work.WorkerParameters
import org.json.JSONObject
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.*

class WidgetUpdateWorker(context: Context, workerParams: WorkerParameters) : Worker(context, workerParams) {

    companion object {
        const val TAG = "WidgetUpdateWorker"
        const val WORK_NAME = "widget_update_work"
        const val REPEAT_INTERVAL_MINUTES = 15L

        fun scheduleWork(context: Context) {
            val workRequest = androidx.work.PeriodicWorkRequestBuilder<WidgetUpdateWorker>(
                REPEAT_INTERVAL_MINUTES, java.util.concurrent.TimeUnit.MINUTES
            ).build()
            androidx.work.WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                androidx.work.ExistingPeriodicWorkPolicy.REPLACE,
                workRequest
            )
            Log.d(TAG, "Scheduling work for widget updates, will run every $REPEAT_INTERVAL_MINUTES minutes")
        }
    }

    private val sharedPref: SharedPreferences = applicationContext.getSharedPreferences("group.io.bluewallet.bluewallet", Context.MODE_PRIVATE)
    private val widgetDataPref: SharedPreferences = applicationContext.getSharedPreferences("widget_data", Context.MODE_PRIVATE)

    override fun doWork(): Result {
        Log.d(TAG, "Widget update worker running")

        val appWidgetManager = AppWidgetManager.getInstance(applicationContext)
        val thisWidget = ComponentName(applicationContext, BitcoinPriceWidget::class.java)
        val appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget)
        val views = RemoteViews(applicationContext.packageName, R.layout.widget_layout)

        // Set up an intent to launch the app when the widget is tapped
        val intent = Intent(applicationContext, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(applicationContext, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        views.setOnClickPendingIntent(R.id.widget_layout, pendingIntent)

        // Show the loading indicator
        views.setViewVisibility(R.id.loading_indicator, View.VISIBLE)
        views.setViewVisibility(R.id.price_value, View.GONE)
        views.setViewVisibility(R.id.last_updated_label, View.GONE)
        views.setViewVisibility(R.id.last_updated_time, View.GONE)
        views.setViewVisibility(R.id.price_arrow_container, View.GONE)
        appWidgetManager.updateAppWidget(appWidgetIds, views)

        // Get the preferred currency
        val preferredCurrency = sharedPref.getString("preferredCurrency", "USD") ?: "USD"
        val lastSavedCurrency = widgetDataPref.getString("last_saved_currency", null)

        // Check if preferredCurrency has changed
        if (lastSavedCurrency != null && lastSavedCurrency != preferredCurrency) {
            Log.d(TAG, "preferredCurrency changed from $lastSavedCurrency to $preferredCurrency, clearing cache.")
            clearCache(widgetDataPref)
        }

        val currencyInfo = getCurrencyInfo(preferredCurrency)
        val previousPrice = widgetDataPref.getString("previous_price", null)

        val currentTime = SimpleDateFormat("hh:mm a", Locale.getDefault()).format(Date())

        fetchPrice(preferredCurrency) { fetchedPrice, error ->
            if (fetchedPrice != null) {
                displayFetchedPrice(views, fetchedPrice, previousPrice, currentTime, currencyInfo)
                savePrice(widgetDataPref, fetchedPrice, currentTime, currencyInfo)
            } else {
                displayError(views, previousPrice, currentTime, currencyInfo)
            }
            appWidgetManager.updateAppWidget(appWidgetIds, views)
        }

        return Result.success()
    }

    private fun getCurrencyInfo(currency: String): CurrencyInfo {
        return try {
            val fiatUnitsJson = applicationContext.assets.open("fiatUnits.json").bufferedReader().use { it.readText() }
            val json = JSONObject(fiatUnitsJson)
            val currencyInfo = json.getJSONObject(currency)
            val symbol = currencyInfo.getString("symbol")
            val locale = currencyInfo.getString("locale")
            CurrencyInfo(symbol, locale)
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching currency info", e)
            CurrencyInfo("$", "en-US")
        }
    }

    private data class CurrencyInfo(val symbol: String, val locale: String)

    private fun displayFetchedPrice(
        views: RemoteViews,
        fetchedPrice: String,
        previousPrice: String?,
        currentTime: String,
        currencyInfo: CurrencyInfo
    ) {
        val currentPrice = fetchedPrice.toDouble()
        val formattedPrice = formatPrice(currentPrice, currencyInfo)

        views.apply {
            setViewVisibility(R.id.loading_indicator, View.GONE)
            setTextViewText(R.id.price_value, formattedPrice)
            setTextViewText(R.id.last_updated_time, currentTime)
            setViewVisibility(R.id.price_value, View.VISIBLE)
            setViewVisibility(R.id.last_updated_label, View.VISIBLE)
            setViewVisibility(R.id.last_updated_time, View.VISIBLE)
            setViewVisibility(R.id.warning_icon, View.GONE)

            if (previousPrice != null) {
                val formattedPreviousPrice = formatPrice(previousPrice.toDouble(), currencyInfo)
                setViewVisibility(R.id.price_arrow_container, View.VISIBLE)
                setTextViewText(R.id.previous_price, formattedPreviousPrice)
                setImageViewResource(
                    R.id.price_arrow,
                    if (currentPrice > previousPrice.toDouble()) android.R.drawable.arrow_up_float else android.R.drawable.arrow_down_float
                )
            } else {
                setViewVisibility(R.id.price_arrow_container, View.GONE)
            }
        }
    }

    private fun displayError(
        views: RemoteViews,
        previousPrice: String?,
        currentTime: String,
        currencyInfo: CurrencyInfo
    ) {
        views.apply {
            setViewVisibility(R.id.loading_indicator, View.GONE)
            setTextViewText(R.id.price_value, "Error fetching price")
            setViewVisibility(R.id.price_value, View.VISIBLE)
            setTextViewText(R.id.last_updated_time, currentTime)
            setViewVisibility(R.id.last_updated_label, View.VISIBLE)
            setViewVisibility(R.id.last_updated_time, View.VISIBLE)
            setViewVisibility(R.id.warning_icon, View.VISIBLE)

            if (previousPrice != null) {
                val formattedPreviousPrice = formatPrice(previousPrice.toDouble(), currencyInfo)
                setViewVisibility(R.id.price_arrow_container, View.GONE)
                setTextViewText(R.id.previous_price, formattedPreviousPrice)
            } else {
                setViewVisibility(R.id.price_arrow_container, View.GONE)
            }
        }
    }

    private fun formatPrice(amount: Double, currencyInfo: CurrencyInfo): String {
        val numberFormat = NumberFormat.getNumberInstance(Locale.forLanguageTag(currencyInfo.locale))
        numberFormat.maximumFractionDigits = 0 // No cents
        val formattedAmount = numberFormat.format(amount)
    
        return "${currencyInfo.symbol} $formattedAmount"
    }

    private fun fetchPrice(currency: String?, callback: (String?, String?) -> Unit) {
        val price = MarketAPI.fetchPrice(applicationContext, currency ?: "USD")
        if (price == null) {
            callback(null, "Failed to fetch price")
        } else {
            callback(price, null)
        }
    }

    private fun savePrice(widgetDataPref: SharedPreferences, price: String, currentTime: String, currencyInfo: CurrencyInfo) {
        widgetDataPref.edit().apply {
            putString("previous_price", price)
            putString("last_updated_time", currentTime)
            putString("current_price", price)
            putString("last_saved_currency", currencyInfo.symbol)
            apply()
        }
    }

    private fun clearCache(widgetDataPref: SharedPreferences) {
        widgetDataPref.edit().clear().apply()
        Log.d(TAG, "Cache cleared")
    }
}
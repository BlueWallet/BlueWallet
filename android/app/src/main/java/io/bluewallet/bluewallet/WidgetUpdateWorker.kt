package io.bluewallet.bluewallet

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import androidx.work.*
import java.text.DecimalFormatSymbols
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

    private lateinit var sharedPref: SharedPreferences
    private lateinit var preferenceChangeListener: SharedPreferences.OnSharedPreferenceChangeListener

    override fun doWork(): Result {
        Log.d(TAG, "Widget update worker running")

        sharedPref = applicationContext.getSharedPreferences("group.io.bluewallet.bluewallet", Context.MODE_PRIVATE)
        registerPreferenceChangeListener()

        val appWidgetManager = AppWidgetManager.getInstance(applicationContext)
        val thisWidget = ComponentName(applicationContext, BitcoinPriceWidget::class.java)
        val appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget)
        val views = RemoteViews(applicationContext.packageName, R.layout.widget_layout)

        val preferredCurrency = sharedPref.getString("preferredCurrency", null) ?: "USD"
        val preferredCurrencyLocale = sharedPref.getString("preferredCurrencyLocale", null) ?: "en-US"
        val previousPrice = sharedPref.getString("previous_price", null)

        val currentTime = SimpleDateFormat("hh:mm a", Locale.getDefault()).format(Date())

        fetchPrice(preferredCurrency) { fetchedPrice, error ->
            handlePriceResult(
                appWidgetManager, appWidgetIds, views, sharedPref,
                fetchedPrice, previousPrice, currentTime, preferredCurrency, preferredCurrencyLocale, error
            )
        }

        return Result.success()
    }

    private fun registerPreferenceChangeListener() {
        preferenceChangeListener = SharedPreferences.OnSharedPreferenceChangeListener { sharedPreferences, key ->
            if (key == "preferredCurrency" || key == "preferredCurrencyLocale" || key == "previous_price") {
                Log.d(TAG, "Preference changed: $key")
                updateWidgetOnPreferenceChange()
            }
        }
        sharedPref.registerOnSharedPreferenceChangeListener(preferenceChangeListener)
    }

    override fun onStopped() {
        super.onStopped()
        sharedPref.unregisterOnSharedPreferenceChangeListener(preferenceChangeListener)
    }

    private fun updateWidgetOnPreferenceChange() {
        val appWidgetManager = AppWidgetManager.getInstance(applicationContext)
        val thisWidget = ComponentName(applicationContext, BitcoinPriceWidget::class.java)
        val appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget)
        val views = RemoteViews(applicationContext.packageName, R.layout.widget_layout)

        val preferredCurrency = sharedPref.getString("preferredCurrency", null) ?: "USD"
        val preferredCurrencyLocale = sharedPref.getString("preferredCurrencyLocale", null) ?: "en-US"
        val previousPrice = sharedPref.getString("previous_price", null)
        val currentTime = SimpleDateFormat("hh:mm a", Locale.getDefault()).format(Date())

        fetchPrice(preferredCurrency) { fetchedPrice, error ->
            handlePriceResult(
                appWidgetManager, appWidgetIds, views, sharedPref,
                fetchedPrice, previousPrice, currentTime, preferredCurrency, preferredCurrencyLocale, error
            )
        }
    }

    private fun handlePriceResult(
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
        views: RemoteViews,
        sharedPref: SharedPreferences,
        fetchedPrice: String?,
        previousPrice: String?,
        currentTime: String,
        preferredCurrency: String?,
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
                displayCachedPrice(views, previousPrice, currentTime, preferredCurrency, preferredCurrencyLocale)
            }
        } else {
            displayFetchedPrice(
                views, fetchedPrice!!, previousPrice, currentTime, preferredCurrency, preferredCurrencyLocale
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
        preferredCurrency: String?,
        preferredCurrencyLocale: String?
    ) {
        val currencyFormat = getCurrencyFormat(preferredCurrency, preferredCurrencyLocale)

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
        preferredCurrency: String?,
        preferredCurrencyLocale: String?
    ) {
        val currentPrice = fetchedPrice.toDouble().toInt() // Remove cents
        val currencyFormat = getCurrencyFormat(preferredCurrency, preferredCurrencyLocale)

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

    private fun getCurrencyFormat(currencyCode: String?, localeString: String?): NumberFormat {
        val localeParts = localeString?.split("-") ?: listOf("en", "US")
        val locale = if (localeParts.size == 2) {
            Locale(localeParts[0], localeParts[1])
        } else {
            Locale.getDefault()
        }
        val currencyFormat = NumberFormat.getCurrencyInstance(locale)
        val currency = try {
            Currency.getInstance(currencyCode ?: "USD")
        } catch (e: IllegalArgumentException) {
            Currency.getInstance("USD") // Default to USD if an invalid code is provided
        }
        currencyFormat.currency = currency
        currencyFormat.maximumFractionDigits = 0 // No cents

        // Remove the ISO country code and keep only the symbol
        val decimalFormatSymbols = (currencyFormat as java.text.DecimalFormat).decimalFormatSymbols
        decimalFormatSymbols.currencySymbol = currency.symbol
        currencyFormat.decimalFormatSymbols = decimalFormatSymbols

        return currencyFormat
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
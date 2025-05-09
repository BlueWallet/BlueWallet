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
import androidx.work.*
import java.text.DecimalFormatSymbols
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

class WidgetUpdateWorker(context: Context, workerParams: WorkerParameters) : CoroutineWorker(context, workerParams) {

    companion object {
        const val TAG = "WidgetUpdateWorker"
        const val WORK_NAME = "bitcoin_price_widget_update_work"
        const val NETWORK_RETRY_WORK_NAME = "bitcoin_price_network_retry_work"
        const val REPEAT_INTERVAL_MINUTES = 15L
        private const val SHARED_PREF_NAME = "group.io.bluewallet.bluewallet"
        private const val DEFAULT_CURRENCY = "USD"
        private const val NETWORK_RETRY_DELAY_SECONDS = 30L

        /**
         * Schedule periodic work for Bitcoin Price Widget
         */
        fun scheduleWork(context: Context) {
            val workRequest = PeriodicWorkRequestBuilder<WidgetUpdateWorker>(
                REPEAT_INTERVAL_MINUTES, TimeUnit.MINUTES
            ).build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.REPLACE,
                workRequest
            )
            Log.d(TAG, "Scheduling work for Bitcoin price widget updates, will run every $REPEAT_INTERVAL_MINUTES minutes")
        }

        /**
         * Schedule a retry when network becomes available
         */
        fun scheduleRetryOnNetworkAvailable(context: Context, appWidgetIds: IntArray) {
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
            
            Log.d(TAG, "Scheduled network retry in $NETWORK_RETRY_DELAY_SECONDS seconds")
        }
    }

    private lateinit var sharedPref: SharedPreferences

    override suspend fun doWork(): Result {
        Log.d(TAG, "WidgetUpdateWorker running. Confirming interaction with MainActivity.")
        Log.d(TAG, "Bitcoin price widget update worker running")
        
        sharedPref = applicationContext.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
        
        // Check network connectivity first
        if (!NetworkUtils.isNetworkAvailable(applicationContext)) {
            Log.d(TAG, "No network connection available")
            
            // Update all Bitcoin price widgets to show offline status
            val component = ComponentName(applicationContext, BitcoinPriceWidget::class.java)
            val widgetIds = AppWidgetManager.getInstance(applicationContext).getAppWidgetIds(component)
            
            BitcoinPriceWidget.updateNetworkStatus(applicationContext, widgetIds)
            
            // Schedule retry with network constraint
            scheduleRetryOnNetworkAvailable(applicationContext, widgetIds)
            
            return Result.retry()
        }

        return updatePriceWidgets()
    }

    private suspend fun updatePriceWidgets(): Result {
        val appWidgetManager = AppWidgetManager.getInstance(applicationContext)
        val thisWidget = ComponentName(applicationContext, BitcoinPriceWidget::class.java)
        val appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget)
        val views = RemoteViews(applicationContext.packageName, R.layout.widget_layout)

        val intent = Intent(applicationContext, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            action = "android.intent.action.MAIN"
            addCategory("android.intent.category.LAUNCHER")
        }
        val pendingIntent = PendingIntent.getActivity(
            applicationContext,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        views.setOnClickPendingIntent(R.id.widget_layout, pendingIntent)

        views.setViewVisibility(R.id.loading_indicator, View.VISIBLE)
        views.setViewVisibility(R.id.price_value, View.GONE)
        views.setViewVisibility(R.id.last_updated_label, View.GONE)
        views.setViewVisibility(R.id.last_updated_time, View.GONE)
        views.setViewVisibility(R.id.price_arrow_container, View.GONE)

        appWidgetManager.updateAppWidget(appWidgetIds, views)

        val preferredCurrency = sharedPref.getString("preferredCurrency", null) ?: "USD"
        val preferredCurrencyLocale = sharedPref.getString("preferredCurrencyLocale", null) ?: "en-US"
        val previousPrice = sharedPref.getString("previous_price", null)

        val currentTime = SimpleDateFormat("hh:mm a", Locale.getDefault()).format(Date())

        val fetchedPrice = fetchPrice(preferredCurrency)

        // Check network connectivity
        val isNetworkAvailable = NetworkUtils.isNetworkAvailable(applicationContext)
        views.setViewVisibility(R.id.network_status, if (isNetworkAvailable) View.GONE else View.VISIBLE)

        handlePriceResult(
            appWidgetManager, appWidgetIds, views, sharedPref,
            fetchedPrice, previousPrice, currentTime, preferredCurrency, preferredCurrencyLocale
        )

        return Result.success()
    }

    private suspend fun fetchPrice(currency: String?): String? {
        return withContext(Dispatchers.IO) {
            MarketAPI.fetchPrice(applicationContext, currency ?: "USD")
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
        preferredCurrencyLocale: String?
    ) {
        val isPriceFetched = fetchedPrice != null
        val isPriceCached = previousPrice != null

        if (!isPriceFetched) {
            Log.e(TAG, "Error fetching price.")
            if (!isPriceCached) {
                showLoadingError(views)
            } else {
                displayCachedPrice(views, previousPrice, currentTime, preferredCurrency, preferredCurrencyLocale)
            }
        } else {
            if (fetchedPrice != null) {
                displayFetchedPrice(
                    views, fetchedPrice, previousPrice, currentTime, preferredCurrency, preferredCurrencyLocale
                )
            }
            if (fetchedPrice != null) {
                savePrice(sharedPref, fetchedPrice)
            }
        }

        appWidgetManager.updateAppWidget(appWidgetIds, views)
    }

    private fun showLoadingError(views: RemoteViews) {
        views.apply {
            setViewVisibility(R.id.loading_indicator, View.GONE)
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
        val currentPrice = fetchedPrice.toDouble().toInt()
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
            Currency.getInstance("USD")
        }
        currencyFormat.currency = currency
        currencyFormat.maximumFractionDigits = 0

        val decimalFormatSymbols = (currencyFormat as java.text.DecimalFormat).decimalFormatSymbols
        decimalFormatSymbols.currencySymbol = currency.symbol
        currencyFormat.decimalFormatSymbols = decimalFormatSymbols

        return currencyFormat
    }

    private fun savePrice(sharedPref: SharedPreferences, price: String) {
        sharedPref.edit().putString("previous_price", price).apply()
    }
}
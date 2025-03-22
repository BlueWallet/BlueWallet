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
        const val WORK_NAME = "widget_update_work"
        const val MARKET_WORK_NAME = "market_widget_update_work"
        const val REPEAT_INTERVAL_MINUTES = 15L
        private const val KEY_WIDGET_IDS = "widget_ids"
        private const val SHARED_PREF_NAME = "group.io.bluewallet.bluewallet"
        private const val DEFAULT_CURRENCY = "USD"
        private const val KEY_LAST_UPDATE_TIME = "market_widget_last_update_time"
        private const val MIN_UPDATE_INTERVAL_MS = 15L * 60 * 1000 // 15 minutes
        private const val RATE_LIMIT_COOLDOWN_MS = 30L * 60 * 1000 // 30 minutes

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
        
        fun scheduleMarketUpdate(context: Context, appWidgetIds: IntArray, forceUpdate: Boolean = false) {
            val sharedPrefs = context.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
            val lastUpdateTime = sharedPrefs.getLong(KEY_LAST_UPDATE_TIME, 0)
            val currentTime = System.currentTimeMillis()
            
            if (!forceUpdate && currentTime - lastUpdateTime < MIN_UPDATE_INTERVAL_MS) {
                Log.d(TAG, "Skipping update - too soon since last update")
                return
            }
            
            val data = Data.Builder()
                .putIntArray(KEY_WIDGET_IDS, appWidgetIds)
                .build()
                
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
                
            val initialDelay = if (forceUpdate) 0 else calculateInitialDelay(context)
            
            val updateRequest = OneTimeWorkRequestBuilder<WidgetUpdateWorker>()
                .setConstraints(constraints)
                .setInputData(data)
                .setInitialDelay(initialDelay, TimeUnit.MILLISECONDS)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.MINUTES)
                .build()
                
            WorkManager.getInstance(context).enqueueUniqueWork(
                MARKET_WORK_NAME,
                ExistingWorkPolicy.REPLACE,
                updateRequest
            )
            
            Log.d(TAG, "Scheduled market widget update work with delay: ${initialDelay}ms")
        }
        
        private fun calculateInitialDelay(context: Context): Long {
            val sharedPrefs = context.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
            val rateLimitedTime = sharedPrefs.getLong("market_widget_rate_limited_time", 0)
            val currentTime = System.currentTimeMillis()
            
            return if (rateLimitedTime > 0 && currentTime - rateLimitedTime < RATE_LIMIT_COOLDOWN_MS) {
                val remainingCooldown = RATE_LIMIT_COOLDOWN_MS - (currentTime - rateLimitedTime)
                Log.d(TAG, "Rate limit cooldown active, delaying for ${remainingCooldown}ms")
                remainingCooldown
            } else {
                0
            }
        }
    }

    private lateinit var sharedPref: SharedPreferences

    override suspend fun doWork(): Result {
        Log.d(TAG, "Widget update worker running")

        sharedPref = applicationContext.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
        
        val widgetIds = inputData.getIntArray(KEY_WIDGET_IDS)
        if (widgetIds != null && widgetIds.isNotEmpty()) {
            return updateMarketWidgets(widgetIds)
        } else {
            return updatePriceWidgets()
        }
    }
    
    private suspend fun updateMarketWidgets(widgetIds: IntArray): Result {
        Log.d(TAG, "Starting market widget update work")
        
        val currency = getPreferredCurrency(applicationContext)
        
        try {
            markUpdateTime()
            
            val marketData = withContext(Dispatchers.IO) {
                MarketAPI.fetchMarketData(applicationContext, currency)
            }
            
            if (marketData.rate > 0) {
                storeMarketData(marketData)
                
                val appWidgetManager = AppWidgetManager.getInstance(applicationContext)
                for (widgetId in widgetIds) {
                    MarketWidget.updateWidget(applicationContext, widgetId)
                }
                
                clearRateLimitFlag()
                
                scheduleNextMarketUpdate(widgetIds, TimeUnit.MINUTES.toMillis(30))
                
                return Result.success()
            } else {
                Log.w(TAG, "Market data fetch returned invalid rate (${marketData.rate})")
                scheduleNextMarketUpdate(widgetIds, TimeUnit.MINUTES.toMillis(15))
                return Result.retry()
            }
        } catch (e: RateLimitException) {
            Log.e(TAG, "Rate limit encountered", e)
            setRateLimitFlag()
            scheduleNextMarketUpdate(widgetIds, RATE_LIMIT_COOLDOWN_MS)
            return Result.failure()
        } catch (e: Exception) {
            Log.e(TAG, "Error updating market widget", e)
            scheduleNextMarketUpdate(widgetIds, TimeUnit.MINUTES.toMillis(15))
            return Result.retry()
        }
    }

    private suspend fun updatePriceWidgets(): Result {
        val appWidgetManager = AppWidgetManager.getInstance(applicationContext)
        val thisWidget = ComponentName(applicationContext, BitcoinPriceWidget::class.java)
        val appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget)
        val views = RemoteViews(applicationContext.packageName, R.layout.widget_layout)

        val intent = Intent(applicationContext, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
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
    
    private fun storeMarketData(marketData: MarketData) {
        try {
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
                
            Log.d(TAG, "Stored market data: $marketData")
        } catch (e: Exception) {
            Log.e(TAG, "Error storing market data", e)
        }
    }
    
    private fun scheduleNextMarketUpdate(widgetIds: IntArray, delayMs: Long) {
        val data = Data.Builder()
            .putIntArray(KEY_WIDGET_IDS, widgetIds)
            .build()
            
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
            
        val updateRequest = OneTimeWorkRequestBuilder<WidgetUpdateWorker>()
            .setConstraints(constraints)
            .setInputData(data)
            .setInitialDelay(delayMs, TimeUnit.MILLISECONDS)
            .build()
            
        WorkManager.getInstance(applicationContext).enqueueUniqueWork(
            MARKET_WORK_NAME,
            ExistingWorkPolicy.REPLACE,
            updateRequest
        )
        
        Log.d(TAG, "Scheduled next market update with delay: ${delayMs}ms")
    }
    
    private fun getPreferredCurrency(context: Context): String {
        val sharedPrefs = context.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
        return sharedPrefs.getString("preferredCurrency", DEFAULT_CURRENCY) ?: DEFAULT_CURRENCY
    }
    
    private fun markUpdateTime() {
        applicationContext.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
            .edit()
            .putLong(KEY_LAST_UPDATE_TIME, System.currentTimeMillis())
            .apply()
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
    
    class RateLimitException(message: String) : Exception(message)
}
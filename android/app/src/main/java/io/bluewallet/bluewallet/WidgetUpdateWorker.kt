package io.bluewallet.bluewallet

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import androidx.work.*
import org.json.JSONObject
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
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

        // Show loading indicator
        views.setViewVisibility(R.id.loading_indicator, View.VISIBLE)
        views.setViewVisibility(R.id.price_value, View.GONE)
        views.setViewVisibility(R.id.last_updated_label, View.GONE)
        views.setViewVisibility(R.id.last_updated_time, View.GONE)
        views.setViewVisibility(R.id.price_arrow_container, View.GONE)

        appWidgetManager.updateAppWidget(appWidgetIds, views)

        val currentTime = SimpleDateFormat("hh:mm a", Locale.getDefault()).format(Date())

        fetchPrice(preferredCurrency) { fetchedPrice, error ->
            if (error != null) {
                Log.e(TAG, "Error fetching price: $error")
                views.setViewVisibility(R.id.loading_indicator, View.GONE)
                views.setTextViewText(R.id.price_value, "Error fetching data")
                views.setViewVisibility(R.id.price_value, View.VISIBLE)
            } else {
                val previousPrice = sharedPref.getString("previous_price", null)
                val currentPrice = fetchedPrice?.toDouble()?.let { it.toInt() } // Remove cents

                if (currentPrice == previousPrice?.toDouble()?.let { it.toInt() }) {
                    views.setTextViewText(R.id.last_updated_time, currentTime)
                } else {
                    Log.d(TAG, "Fetch completed with price: $fetchedPrice at $currentTime. Previous price: $previousPrice")
                    val currencyFormat = NumberFormat.getCurrencyInstance(Locale.forLanguageTag(preferredCurrencyLocale!!)).apply {
                        maximumFractionDigits = 0
                    }
                    views.setViewVisibility(R.id.loading_indicator, View.GONE)
                    views.setTextViewText(R.id.price_value, currencyFormat.format(currentPrice))
                    views.setTextViewText(R.id.last_updated_time, currentTime)
                    views.setViewVisibility(R.id.price_value, View.VISIBLE)
                    views.setViewVisibility(R.id.last_updated_label, View.VISIBLE)
                    views.setViewVisibility(R.id.last_updated_time, View.VISIBLE)

                    if (previousPrice != null) {
                        views.setViewVisibility(R.id.price_arrow_container, View.VISIBLE)
                        views.setTextViewText(R.id.previous_price, currencyFormat.format(previousPrice.toDouble().toInt()))
                        if (currentPrice!! > previousPrice.toDouble().toInt()) {
                            views.setImageViewResource(R.id.price_arrow, android.R.drawable.arrow_up_float)
                        } else {
                            views.setImageViewResource(R.id.price_arrow, android.R.drawable.arrow_down_float)
                        }
                    } else {
                        views.setViewVisibility(R.id.price_arrow_container, View.GONE)
                    }
                    savePrice(sharedPref, fetchedPrice!!)
                }
            }
            appWidgetManager.updateAppWidget(appWidgetIds, views)
        }
        return Result.success()
    }

    private fun fetchPrice(currency: String?, callback: (String?, String?) -> Unit) {
        val fiatUnitsJson = applicationContext.assets.open("fiatUnits.json").bufferedReader().use { it.readText() }
        val json = JSONObject(fiatUnitsJson)
        val currencyInfo = json.getJSONObject(currency ?: "USD")
        val source = currencyInfo.getString("source")
        val endPointKey = currencyInfo.getString("endPointKey")
        val urlString = buildURLString(source, endPointKey)

        Log.d(TAG, "Fetching price from URL: $urlString")

        val url = URL(urlString)
        val urlConnection = url.openConnection() as HttpURLConnection
        try {
            val reader = InputStreamReader(urlConnection.inputStream)
            val jsonResponse = StringBuilder()
            val buffer = CharArray(1024)
            var read: Int
            while (reader.read(buffer).also { read = it } != -1) {
                jsonResponse.append(buffer, 0, read)
            }
            val responseJson = JSONObject(jsonResponse.toString())
            val price = parseJSONBasedOnSource(responseJson, source, endPointKey)
            callback(price, null)
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching price", e)
            callback(null, e.message)
        } finally {
            urlConnection.disconnect()
        }
    }

    private fun buildURLString(source: String, endPointKey: String): String {
        return when (source) {
            "Yadio" -> "https://api.yadio.io/json/$endPointKey"
            "YadioConvert" -> "https://api.yadio.io/convert/1/BTC/$endPointKey"
            "Exir" -> "https://api.exir.io/v1/ticker?symbol=btc-irt"
            "coinpaprika" -> "https://api.coinpaprika.com/v1/tickers/btc-bitcoin?quotes=INR"
            "Bitstamp" -> "https://www.bitstamp.net/api/v2/ticker/btc${endPointKey.lowercase()}"
            "Coinbase" -> "https://api.coinbase.com/v2/prices/BTC-${endPointKey.uppercase()}/buy"
            "CoinGecko" -> "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${endPointKey.lowercase()}"
            "BNR" -> "https://www.bnr.ro/nbrfxrates.xml"
            "Kraken" -> "https://api.kraken.com/0/public/Ticker?pair=XXBTZ${endPointKey.uppercase()}"
            else -> "https://api.coindesk.com/v1/bpi/currentprice/$endPointKey.json"
        }
    }

    private fun parseJSONBasedOnSource(json: JSONObject, source: String, endPointKey: String): String {
        return when (source) {
            "Kraken" -> json.getJSONObject("result").getJSONObject("XXBTZ${endPointKey.uppercase()}").getJSONArray("c").getString(0)
            "CoinGecko" -> json.getJSONObject("bitcoin").getString(endPointKey.lowercase())
            "Coinbase" -> json.getJSONObject("data").getString("amount")
            "Bitstamp" -> json.getString("last")
            "coinpaprika" -> json.getJSONObject("quotes").getJSONObject("INR").getString("price")
            "Exir" -> json.getString("last")
            "Yadio", "YadioConvert" -> json.getJSONObject(endPointKey).getString("price")
            else -> throw IllegalArgumentException("Unsupported source: $source")
        }
    }

    private fun savePrice(sharedPref: SharedPreferences, price: String) {
        sharedPref.edit().putString("previous_price", price).apply()
    }
}
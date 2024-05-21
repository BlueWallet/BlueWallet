package io.bluewallet.bluewallet.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.widget.RemoteViews
import io.bluewallet.bluewallet.R
import io.bluewallet.bluewallet.databinding.PriceWidgetBinding
import kotlinx.coroutines.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.*

class PriceWidgetProvider : AppWidgetProvider() {
    private val TAG = "PriceWidgetProvider"
    private val defaultCurrency = "USD"
    private lateinit var views: RemoteViews
    private val jsonFormat = Json { ignoreUnknownKeys = true }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)

        for (appWidgetId in appWidgetIds) {
            views = RemoteViews(context.packageName, R.layout.price_widget)

            Handler(Looper.getMainLooper()).post {
                updateAppWidget(context, appWidgetManager, appWidgetId)
            }
        }
    }

    private fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        views.setTextViewText(R.id.widget_last_updated, context.getString(R.string.loading))

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val fiatInfo = loadFiatInfo(context)
                val rate = fetchRate(fiatInfo.endPointKey)
                withContext(Dispatchers.Main) {
                    views.setTextViewText(R.id.widget_btc_price, "${fiatInfo.symbol}$rate")
                    views.setTextViewText(R.id.widget_last_updated, SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date()))
                    appWidgetManager.updateAppWidget(appWidgetId, views)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    views.setTextViewText(R.id.widget_last_updated, context.getString(R.string.fetch_error))
                    appWidgetManager.updateAppWidget(appWidgetId, views)
                }
                Log.e(TAG, "Error fetching rate: $e")
            }
        }
    }

    private suspend fun loadFiatInfo(context: Context): FiatInfo {
        val inputStream = context.assets.open("fiatUnits.json")
        val jsonString = InputStreamReader(inputStream).readText()
        val fiatUnits: Map<String, FiatInfo> = jsonFormat.decodeFromString(jsonString)
        return fiatUnits[defaultCurrency] ?: error("Fiat info not found for currency: $defaultCurrency")
    }

    private suspend fun fetchRate(endpoint: String): Double {
        val url = URL(endpoint)
        val connection = url.openConnection() as HttpURLConnection
        connection.requestMethod = "GET"
        connection.connect()

        if (connection.responseCode != 200) {
            throw Exception("Failed to fetch rate, response code: ${connection.responseCode}")
        }

        val reader = InputStreamReader(connection.inputStream)
        val response = reader.readText()
        connection.disconnect()

        val responseJson = jsonFormat.decodeFromString<Map<String, Any>>(response)
        return responseJson["rate"] as Double
    }
}

@Serializable
data class FiatInfo(val symbol: String, val endPointKey: String)

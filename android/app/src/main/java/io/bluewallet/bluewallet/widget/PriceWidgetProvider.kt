package io.bluewallet.bluewallet.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.SystemClock
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import androidx.core.content.edit
import androidx.databinding.DataBindingUtil
import androidx.databinding.ViewDataBinding
import io.bluewallet.bluewallet.R
import io.bluewallet.bluewallet.databinding.PriceWidgetBinding
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import java.io.BufferedReader
import java.io.IOException
import java.io.InputStreamReader
import java.text.SimpleDateFormat
import java.util.*

@Serializable
data class FiatInfo(
    val endPointKey: String,
    val locale: String,
    val source: String,
    val symbol: String
)

class PriceWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val PREFS_NAME = "io.bluewallet.bluewallet.widget.PriceWidgetProvider"
        private const val KEY_PREVIOUS_PRICE = "previous_price"
        private const val KEY_LAST_UPDATED_TIME = "last_updated_time"
        private const val KEY_PREFERRED_CURRENCY = "preferred_currency"
        private const val ACTION_UPDATE_PRICE = "io.bluewallet.bluewallet.widget.UPDATE_PRICE"
        private const val TAG = "PriceWidgetProvider"
        private const val DEFAULT_CURRENCY = "USD"
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)
        Log.d(TAG, "onUpdate called for widget ids: ${appWidgetIds.joinToString()}")

        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.price_widget_placeholder)
            appWidgetManager.updateAppWidget(appWidgetId, views)
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }

        setAlarm(context)

        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.registerOnSharedPreferenceChangeListener { sharedPreferences, key ->
            if (key == KEY_PREFERRED_CURRENCY) {
                val appWidgetIds = AppWidgetManager.getInstance(context)
                    .getAppWidgetIds(ComponentName(context, PriceWidgetProvider::class.java))
                onUpdate(context, AppWidgetManager.getInstance(context), appWidgetIds)
            }
        }

        loadFiatUnits(context)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_UPDATE_PRICE) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(ComponentName(context, PriceWidgetProvider::class.java))
            for (appWidgetId in appWidgetIds) {
                updateAppWidget(context, appWidgetManager, appWidgetId)
            }
        }
    }

    private fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val binding = PriceWidgetBinding.inflate(LayoutInflater.from(context)).apply {
            lifecycleOwner = null
        }

        val lastUpdatedTime = prefs.getString(KEY_LAST_UPDATED_TIME, "N/A") ?: "N/A"
        val previousPrice = prefs.getString(KEY_PREVIOUS_PRICE, null)

        binding.price = previousPrice ?: "Loading..."
        binding.lastUpdatedTime = lastUpdatedTime
        binding.isLoading = previousPrice == null
        binding.priceChange = ""
        binding.showChangeArrow = false
        binding.showLastUpdated = previousPrice != null

        if (previousPrice == null) {
            Log.d(TAG, "No previous price found. Showing loading indicator.")
            fetchAndUpdatePrice(context, appWidgetManager, appWidgetId, binding)
        } else {
            Log.d(TAG, "Previous price found: $previousPrice")
        }

        appWidgetManager.updateAppWidget(appWidgetId, binding.root)
    }

    private fun fetchAndUpdatePrice(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, binding: PriceWidgetBinding) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        // Fetch the preferred currency
        val preferredCurrency = prefs.getString(KEY_PREFERRED_CURRENCY, DEFAULT_CURRENCY) ?: DEFAULT_CURRENCY
        Log.d(TAG, "Preferred currency: $preferredCurrency")

        // Load fiat information from SharedPreferences
        val fiatInfo = loadFiatInfo(context, preferredCurrency)
        if (fiatInfo == null) {
            Log.e(TAG, "Fiat info not found for currency: $preferredCurrency")
            return
        }

        // Fetch the latest market data and update the widget
        MarketAPI.fetchPrice(fiatInfo.source, fiatInfo.endPointKey) { data, error ->
            if (error != null) {
                Log.e(TAG, "Error fetching price: ${error.message}")
                // Handle the error
                binding.price = prefs.getString(KEY_PREVIOUS_PRICE, "N/A") ?: "N/A"
                appWidgetManager.updateAppWidget(appWidgetId, binding.root)
            } else if (data != null) {
                Log.d(TAG, "Fetched new price: ${data.rate}")
                val currentPrice = fiatInfo.symbol + data.rate
                val previousPrice = prefs.getString(KEY_PREVIOUS_PRICE, currentPrice) ?: currentPrice

                binding.price = currentPrice
                binding.isLoading = false

                // Format the last updated time
                val dateFormat = SimpleDateFormat("hh:mm a", Locale.getDefault())
                val newLastUpdatedTime = dateFormat.format(Date())
                binding.lastUpdatedTime = newLastUpdatedTime
                binding.showLastUpdated = true

                // Update the price change and arrow direction
                if (previousPrice != currentPrice) {
                    val previousPriceDouble = previousPrice.replace(fiatInfo.symbol, "").replace(",", "").toDouble()
                    val currentPriceDouble = currentPrice.replace(fiatInfo.symbol, "").replace(",", "").toDouble()
                    if (currentPriceDouble > previousPriceDouble) {
                        binding.showChangeArrow = true
                        binding.changeArrow.setImageResource(R.drawable.ic_arrow_up)
                        Log.d(TAG, "Price increased. Showing up arrow.")
                    } else {
                        binding.showChangeArrow = true
                        binding.changeArrow.setImageResource(R.drawable.ic_arrow_down)
                        Log.d(TAG, "Price decreased. Showing down arrow.")
                    }
                    binding.priceChange = "from $previousPrice"
                } else {
                    binding.showChangeArrow = false
                    binding.priceChange = ""
                }

                // Save the current price and last updated time in SharedPreferences
                prefs.edit {
                    putString(KEY_PREVIOUS_PRICE, currentPrice)
                    putString(KEY_LAST_UPDATED_TIME, newLastUpdatedTime)
                }

                Log.d(TAG, "Saved new price: $currentPrice and last updated time: $newLastUpdatedTime")
                appWidgetManager.updateAppWidget(appWidgetId, binding.root)
            }
        }
    }

    private fun loadFiatInfo(context: Context, currency: String?): FiatInfo? {
        return try {
            val sharedPreferences = context.getSharedPreferences("fiat_units", Context.MODE_PRIVATE)
            val fiatUnitsJson = sharedPreferences.getString("fiatUnits", null)
            val fiatUnits = fiatUnitsJson?.let { Json.decodeFromString<Map<String, FiatInfo>>(it) }
            fiatUnits?.get(currency ?: DEFAULT_CURRENCY)
        } catch (ex: IOException) {
            Log.e(TAG, "Error reading fiatUnits.json", ex)
            null
        }
    }

    private fun loadFiatUnits(context: Context) {
        val sharedPreferences = context.getSharedPreferences("fiat_units", Context.MODE_PRIVATE)
        if (sharedPreferences.contains("fiatUnits")) {
            Log.d(TAG, "Fiat units already loaded.")
            return
        }

        try {
            val inputStream = context.assets.open("fiatUnits.json")
            val reader = BufferedReader(InputStreamReader(inputStream))
            val content = reader.readText()
            reader.close()

            sharedPreferences.edit {
                putString("fiatUnits", content)
            }

            Log.d(TAG, "Fiat units loaded from assets.")
        } catch (ex: IOException) {
            Log.e(TAG, "Error loading fiatUnits.json", ex)
        }
    }

    private fun setAlarm(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, PriceWidgetProvider::class.java).apply {
            action = ACTION_UPDATE_PRICE
        }
        val pendingIntent = PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        alarmManager.setRepeating(
            AlarmManager.ELAPSED_REALTIME_WAKEUP,
            SystemClock.elapsedRealtime() + 5 * 60 * 1000,
            5 * 60 * 1000,
            pendingIntent
        )
        Log.d(TAG, "Alarm set to update widget every 5 minutes.")
    }
}

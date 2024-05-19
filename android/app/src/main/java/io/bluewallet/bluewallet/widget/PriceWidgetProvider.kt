package com.bluewallet.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.SystemClock
import android.widget.RemoteViews
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.*

class PriceWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val PREFS_NAME = "com.bluewallet.widget.PriceWidgetProvider"
        private const val KEY_PREVIOUS_PRICE = "previous_price"
        private const val KEY_LAST_UPDATED_TIME = "last_updated_time"
        private const val ACTION_UPDATE_PRICE = "com.bluewallet.widget.UPDATE_PRICE"
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)

        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }

        setAlarm(context)
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
        val views = RemoteViews(context.packageName, R.layout.price_widget)
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        // Fetch the latest market data and update the widget
        MarketAPI.fetchPrice { data, error ->
            if (error != null) {
                // Handle the error
                val previousPrice = prefs.getString(KEY_PREVIOUS_PRICE, null)
                val lastUpdatedTime = prefs.getString(KEY_LAST_UPDATED_TIME, null)
                views.setTextViewText(R.id.price, previousPrice)
                views.setTextViewText(R.id.last_updated_time, lastUpdatedTime)
                appWidgetManager.updateAppWidget(appWidgetId, views)
            } else if (data != null) {
                val currentPrice = data.price
                val previousPrice = prefs.getString(KEY_PREVIOUS_PRICE, currentPrice) ?: currentPrice

                views.setTextViewText(R.id.price, currentPrice)

                // Format the last updated time
                val dateFormat = SimpleDateFormat("hh:mm a", Locale.getDefault())
                val lastUpdatedTime = dateFormat.format(Date())
                views.setTextViewText(R.id.last_updated_time, lastUpdatedTime)

                // Update the price change and arrow direction
                val previousPriceDouble = previousPrice.replace("$", "").replace(",", "").toDouble()
                val currentPriceDouble = currentPrice.replace("$", "").replace(",", "").toDouble()
                if (currentPriceDouble > previousPriceDouble) {
                    views.setImageViewResource(R.id.change_arrow, R.drawable.ic_arrow_up)
                } else {
                    views.setImageViewResource(R.id.change_arrow, R.drawable.ic_arrow_down)
                }
                views.setTextViewText(R.id.price_change, "from $previousPrice")

                // Save the current price and last updated time in SharedPreferences
                prefs.edit().apply {
                    putString(KEY_PREVIOUS_PRICE, currentPrice)
                    putString(KEY_LAST_UPDATED_TIME, lastUpdatedTime)
                    apply()
                }

                appWidgetManager.updateAppWidget(appWidgetId, views)
            }
        }
    }

    private fun setAlarm(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, PriceWidgetProvider::class.java).apply {
            action = ACTION_UPDATE_PRICE
        }
        val pendingIntent = PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT)
        alarmManager.setRepeating(
            AlarmManager.ELAPSED_REALTIME_WAKEUP,
            SystemClock.elapsedRealtime() + 10 * 60 * 1000,
            10 * 60 * 1000,
            pendingIntent
        )
    }
}
package io.bluewallet.bluewallet

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import androidx.work.WorkManager
import org.json.JSONObject

class MarketWidget : AppWidgetProvider() {

    companion object {
        private const val TAG = "MarketWidget"
        private const val SHARED_PREF_NAME = "group.io.bluewallet.bluewallet"
        private const val DEFAULT_CURRENCY = "USD"

        fun updateWidget(context: Context, appWidgetId: Int) {
            updateAppWidget(context, AppWidgetManager.getInstance(context), appWidgetId)
        }

        fun refreshAllWidgetsImmediately(context: Context) {
            val widgetIds = getAllWidgetIds(context)
            if (widgetIds.isNotEmpty()) {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                for (widgetId in widgetIds) {
                    updateAppWidget(context, appWidgetManager, widgetId)
                }
                MarketWidgetUpdateWorker.scheduleImmediateUpdate(context)
            }
        }

        fun getAllWidgetIds(context: Context): IntArray {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            return appWidgetManager.getAppWidgetIds(ComponentName(context, MarketWidget::class.java))
        }

        private fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val isNetworkAvailable = NetworkUtils.isNetworkAvailable(context)
            val marketData = getStoredMarketData(context)
            val views = RemoteViews(context.packageName, R.layout.widget_market)

            views.setViewVisibility(R.id.network_status, if (isNetworkAvailable) View.GONE else View.VISIBLE)

            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                action = Intent.ACTION_MAIN
                addCategory(Intent.CATEGORY_LAUNCHER)
            }
            views.setOnClickPendingIntent(R.id.widget_market, PendingIntent.getActivity(
                context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            ))

            val formattedNextBlock = marketData.formattedNextBlock
            views.setTextViewText(R.id.next_block_value, when (formattedNextBlock) {
                "..." -> context.getString(R.string.loading_placeholder, "...")
                "!" -> context.getString(R.string.error_placeholder, "!")
                else -> formattedNextBlock
            })

            val currency = getPreferredCurrency(context)
            views.setTextViewText(R.id.sats_label, context.getString(R.string.market_sats_label, currency))
            views.setTextViewText(R.id.sats_value, marketData.sats)
            views.setTextViewText(R.id.price_value, marketData.price)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        private fun getStoredMarketData(context: Context): MarketData {
            val json = context.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
                .getString(MarketData.PREF_KEY, null) ?: return MarketData()

            return try {
                val obj = JSONObject(json)
                MarketData(
                    nextBlock = obj.optString("nextBlock", "..."),
                    sats = obj.optString("sats", "..."),
                    price = obj.optString("price", "..."),
                    rate = obj.optDouble("rate", 0.0),
                    dateString = obj.optString("dateString", "")
                )
            } catch (e: Exception) {
                Log.e(TAG, "Error parsing stored market data", e)
                MarketData()
            }
        }

        private fun getPreferredCurrency(context: Context): String {
            return context.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
                .getString("preferredCurrency", DEFAULT_CURRENCY) ?: DEFAULT_CURRENCY
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
        MarketWidgetUpdateWorker.scheduleWork(context)
    }

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        MarketWidgetUpdateWorker.scheduleImmediateUpdate(context)
        MarketWidgetUpdateWorker.scheduleWork(context)
    }

    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        val workManager = WorkManager.getInstance(context)
        workManager.cancelUniqueWork(MarketWidgetUpdateWorker.WORK_NAME)
        workManager.cancelUniqueWork(MarketWidgetUpdateWorker.NETWORK_RETRY_WORK_NAME)

        context.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
            .edit()
            .remove(MarketData.PREF_KEY)
            .apply()
    }
}

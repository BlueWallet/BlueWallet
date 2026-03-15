package io.bluewallet.bluewallet

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews
import androidx.work.WorkManager
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class BitcoinPriceWidget : AppWidgetProvider() {

    companion object {
        private const val SHARED_PREF_NAME = "group.io.bluewallet.bluewallet"
        
        fun updateNetworkStatus(context: Context, appWidgetIds: IntArray) {
            val isNetworkAvailable = NetworkUtils.isNetworkAvailable(context)
            val appWidgetManager = AppWidgetManager.getInstance(context)
            
            for (appWidgetId in appWidgetIds) {
                val views = RemoteViews(context.packageName, R.layout.widget_layout)
                views.setViewVisibility(R.id.network_status, if (isNetworkAvailable) View.GONE else View.VISIBLE)
                appWidgetManager.partiallyUpdateAppWidget(appWidgetId, views)
            }
        }

        fun refreshWidget(context: Context, appWidgetId: Int) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val views = RemoteViews(context.packageName, R.layout.widget_layout)

            views.setViewVisibility(R.id.network_status,
                if (NetworkUtils.isNetworkAvailable(context)) View.GONE else View.VISIBLE
            )

            val sharedPref = context.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
            val cachedPrice = sharedPref.getString("previous_price", null)
            val preferredCurrency = sharedPref.getString("preferredCurrency", "USD") ?: "USD"

            if (cachedPrice != null) {
                val rate = cachedPrice.toDoubleOrNull()
                if (rate != null) {
                    views.setViewVisibility(R.id.loading_indicator, View.GONE)
                    views.setViewVisibility(R.id.price_value, View.VISIBLE)
                    views.setViewVisibility(R.id.last_updated_label, View.VISIBLE)
                    views.setViewVisibility(R.id.last_updated_time, View.VISIBLE)
                    views.setTextViewText(R.id.price_value, MarketAPI.formatCurrencyAmount(rate, preferredCurrency))
                    views.setTextViewText(R.id.last_updated_time,
                        SimpleDateFormat("hh:mm a", Locale.getDefault()).format(Date()))
                    views.setViewVisibility(R.id.price_arrow_container, View.GONE)
                } else {
                    setLoadingState(views)
                }
            } else {
                setLoadingState(views)
            }
            
            appWidgetManager.updateAppWidget(appWidgetId, views)
            WidgetUpdateWorker.scheduleImmediateUpdate(context)
            WidgetUpdateWorker.scheduleWork(context)
        }

        private fun setLoadingState(views: RemoteViews) {
            views.setViewVisibility(R.id.loading_indicator, View.VISIBLE)
            views.setViewVisibility(R.id.price_value, View.GONE)
            views.setViewVisibility(R.id.last_updated_label, View.GONE)
            views.setViewVisibility(R.id.last_updated_time, View.GONE)
            views.setViewVisibility(R.id.price_arrow_container, View.GONE)
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)
        for (widgetId in appWidgetIds) {
            refreshWidget(context, widgetId)
        }
    }

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        WidgetUpdateWorker.scheduleImmediateUpdate(context)
        WidgetUpdateWorker.scheduleWork(context)
    }

    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        context.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE).edit().clear().apply()
        WorkManager.getInstance(context).cancelUniqueWork(WidgetUpdateWorker.WORK_NAME)
    }

    override fun onAppWidgetOptionsChanged(context: Context, appWidgetManager: AppWidgetManager, 
                                          appWidgetId: Int, newOptions: Bundle?) {
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
        refreshWidget(context, appWidgetId)
    }
}
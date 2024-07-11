package io.bluewallet.bluewallet

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.work.WorkManager

class BitcoinPriceWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)
        WidgetUpdateWorker.scheduleWork(context)
    }

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        Log.d("BitcoinPriceWidget", "Widget enabled")
        WidgetUpdateWorker.scheduleWork(context)
    }

    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        Log.d("BitcoinPriceWidget", "Widget disabled")
        WorkManager.getInstance(context).cancelAllWorkByTag("widget_update_work")
    }
}
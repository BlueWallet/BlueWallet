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
        Log.d("BitcoinPriceWidget", "onUpdate called")
        WidgetUpdateWorker.scheduleWork(context)
    }

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        Log.d("BitcoinPriceWidget", "onEnabled called")
        WidgetUpdateWorker.scheduleWork(context)
    }

    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        Log.d("BitcoinPriceWidget", "onDisabled called")
        WorkManager.getInstance(context).cancelUniqueWork(WidgetUpdateWorker.WORK_NAME)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        Log.d("BitcoinPriceWidget", "onReceive called with action: ${intent.action}")
    }
}
package io.bluewallet.bluewallet

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.util.Log
import android.widget.Toast
import androidx.work.WorkManager

class BitcoinPriceWidget : AppWidgetProvider() {

    companion object {
        private const val TAG = "BitcoinPriceWidget"
        private const val SHARED_PREF_NAME = "group.io.bluewallet.bluewallet"
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)
        for (widgetId in appWidgetIds) {
            Log.d(TAG, "Updating widget with ID: $widgetId")
            WidgetUpdateWorker.scheduleWork(context)
        }
    }

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        Log.d(TAG, "onEnabled called")
        WidgetUpdateWorker.scheduleWork(context)
    }

    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        Log.d(TAG, "onDisabled called")
        clearCache(context)
        WorkManager.getInstance(context).cancelUniqueWork(WidgetUpdateWorker.WORK_NAME)
    }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        super.onDeleted(context, appWidgetIds)
        Log.d(TAG, "onDeleted called for widgets: ${appWidgetIds.joinToString()}")
    }

    private fun clearCache(context: Context) {
        val sharedPref = context.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)
        sharedPref.edit().clear().apply()
        Log.d(TAG, "Cache cleared from $SHARED_PREF_NAME")
    }

}
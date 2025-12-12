package io.bluewallet.bluewallet

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.os.Build
import android.util.Log
import androidx.annotation.RequiresApi

object AppWidgetUtils {
    private const val TAG = "AppWidgetUtils"
    
    /**
     * Get all Bitcoin Price Widget IDs
     */
    fun getBitcoinPriceWidgetIds(context: Context): IntArray {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val component = ComponentName(context, BitcoinPriceWidget::class.java)
        return appWidgetManager.getAppWidgetIds(component)
    }
    
    /**
     * Trigger update for all widgets when theme changes
     */
    fun updateWidgetsForThemeChange(context: Context) {
        Log.d(TAG, "Updating widgets for theme change")
        
        // Update Bitcoin Price widgets - force a complete refresh
        val bitcoinWidgetIds = getBitcoinPriceWidgetIds(context)
        if (bitcoinWidgetIds.isNotEmpty()) {
            Log.d(TAG, "Refreshing ${bitcoinWidgetIds.size} Bitcoin Price widgets")
            for (widgetId in bitcoinWidgetIds) {
                BitcoinPriceWidget.refreshWidget(context, widgetId)
            }
        }
        
        // Update Market widgets
        val marketWidgetIds = MarketWidget.getAllWidgetIds(context)
        if (marketWidgetIds.isNotEmpty()) {
            Log.d(TAG, "Refreshing ${marketWidgetIds.size} Market widgets")
            MarketWidget.refreshAllWidgetsImmediately(context)
        }
    }
    
    /**
     * Check if app widgets are supported and available on this device
     */
    fun isWidgetAvailable(context: Context): Boolean {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        return appWidgetManager != null
    }
    
    /**
     * Request to pin a widget to the home screen (Android 8.0+)
     */
    @RequiresApi(Build.VERSION_CODES.O)
    fun requestPinBitcoinWidget(context: Context): Boolean {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        if (!appWidgetManager.isRequestPinAppWidgetSupported) {
            Log.w(TAG, "Pin widget not supported on this device")
            return false
        }
        
        val myProvider = ComponentName(context, BitcoinPriceWidget::class.java)
        return try {
            appWidgetManager.requestPinAppWidget(myProvider, null, null)
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to request pin widget", e)
            false
        }
    }
    
    /**
     * Request to pin a market widget to the home screen (Android 8.0+)
     */
    @RequiresApi(Build.VERSION_CODES.O)
    fun requestPinMarketWidget(context: Context): Boolean {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        if (!appWidgetManager.isRequestPinAppWidgetSupported) {
            Log.w(TAG, "Pin widget not supported on this device")
            return false
        }
        
        val myProvider = ComponentName(context, MarketWidget::class.java)
        return try {
            appWidgetManager.requestPinAppWidget(myProvider, null, null)
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to request pin widget", e)
            false
        }
    }
    
    /**
     * Refresh all widgets by triggering updates
     */
    fun refreshAllWidgets(context: Context) {
        Log.d(TAG, "Refreshing all widgets")
        
        // Refresh Bitcoin Price widgets
        val bitcoinWidgetIds = getBitcoinPriceWidgetIds(context)
        if (bitcoinWidgetIds.isNotEmpty()) {
            for (widgetId in bitcoinWidgetIds) {
                BitcoinPriceWidget.refreshWidget(context, widgetId)
            }
        }
        
        // Refresh Market widgets
        val marketWidgetIds = MarketWidget.getAllWidgetIds(context)
        if (marketWidgetIds.isNotEmpty()) {
            MarketWidget.refreshAllWidgetsImmediately(context)
        }
    }
}

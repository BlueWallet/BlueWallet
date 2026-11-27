package org.neurai.neuraiwallet

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.os.Bundle

/**
 * The Neurai market widget: XNA price, 24-hour change, market cap and 24-hour
 * volume. Its class name is its component name, kept for the widgets already
 * placed.
 */
class MarketWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        // Placed, or the system's periodic update (also offline): draw from the stored quote.
        NeuraiWidgets.refresh(context)
    }

    override fun onAppWidgetOptionsChanged(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, newOptions: Bundle?) {
        appWidgetManager.updateAppWidget(appWidgetId, NeuraiWidgets.marketViews(context))
    }

    override fun onDisabled(context: Context) {
        // The last market widget is gone; the work and the quote stay while a small widget exists.
        if (!NeuraiWidgets.hasWidgets(context)) {
            NeuraiWidgetWorker.cancelAll(context)
            NeuraiMarket.forget(context)
        }
    }
}

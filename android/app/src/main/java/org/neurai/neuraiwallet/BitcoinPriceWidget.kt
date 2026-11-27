package org.neurai.neuraiwallet

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.os.Bundle

/**
 * The small Neurai widget: XNA price and its 24-hour change.
 *
 * The class keeps its old name on purpose: it is the widget's component name,
 * and renaming it would break the widgets already on users' home screens
 * (they turn into this one instead).
 */
class BitcoinPriceWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        // Placed, or the system's periodic update (also offline): draw from the stored quote.
        NeuraiWidgets.refresh(context)
    }

    override fun onAppWidgetOptionsChanged(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, newOptions: Bundle?) {
        appWidgetManager.updateAppWidget(appWidgetId, NeuraiWidgets.priceViews(context))
    }

    override fun onDisabled(context: Context) {
        // The last small widget is gone; the work and the quote stay while a market widget exists.
        if (!NeuraiWidgets.hasWidgets(context)) {
            NeuraiWidgetWorker.cancelAll(context)
            NeuraiMarket.forget(context)
        }
    }
}

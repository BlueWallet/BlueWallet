package org.neurai.neuraiwallet

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.view.View
import android.widget.RemoteViews
import androidx.core.content.ContextCompat

/**
 * Draws both Neurai widgets from the last stored quote. Drawing never touches
 * the network: `NeuraiWidgetWorker` fetches, stores and calls `renderAll`.
 *
 * Whether the phone is online is not asked here: outside a job with a network
 * constraint Android reports no network to an app in the background, so the
 * widget only says what it knows, that its data is old.
 */
object NeuraiWidgets {
    /** A quote older than this is marked as not up to date. */
    private const val STALE_AFTER_MS = 60L * 60 * 1000
    /** A quote younger than this is not fetched again when the widgets are redrawn. */
    private const val FRESH_FOR_MS = 10L * 60 * 1000

    fun priceIds(context: Context): IntArray =
        AppWidgetManager.getInstance(context).getAppWidgetIds(ComponentName(context, BitcoinPriceWidget::class.java))

    fun marketIds(context: Context): IntArray =
        AppWidgetManager.getInstance(context).getAppWidgetIds(ComponentName(context, MarketWidget::class.java))

    fun hasWidgets(context: Context): Boolean = priceIds(context).isNotEmpty() || marketIds(context).isNotEmpty()

    /**
     * What a widget update, the app start or a placed widget does: draw from
     * the stored quote, keep the periodic fetch, and fetch now if the quote is
     * missing, not fresh, or asked in another currency than the app's now.
     */
    fun refresh(context: Context) {
        NeuraiMarket.forgetLegacyState(context)
        renderAll(context)
        NeuraiWidgetWorker.schedule(context)
        val quote = NeuraiMarket.stored(context)
        val otherCurrency = quote != null && !quote.requested.equals(NeuraiMarket.preferredCurrency(context), ignoreCase = true)
        if (quote == null || otherCurrency || System.currentTimeMillis() - quote.fetchedAt > FRESH_FOR_MS) NeuraiWidgetWorker.updateNow(context)
    }

    /** Redraws every Neurai widget on the home screens. */
    fun renderAll(context: Context) {
        val manager = AppWidgetManager.getInstance(context)
        val prices = priceIds(context)
        if (prices.isNotEmpty()) manager.updateAppWidget(prices, priceViews(context))
        val markets = marketIds(context)
        if (markets.isNotEmpty()) manager.updateAppWidget(markets, marketViews(context))
    }

    private fun openApp(context: Context): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            action = Intent.ACTION_MAIN
            addCategory(Intent.CATEGORY_LAUNCHER)
        }
        return PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    /** "Not updated" when the quote is old (no network, or the service did not answer); nothing otherwise. */
    private fun status(context: Context, quote: NeuraiQuote?): String? =
        if (quote != null && System.currentTimeMillis() - quote.fetchedAt > STALE_AFTER_MS) context.getString(R.string.widget_not_updated) else null

    private fun RemoteViews.showStatus(text: String?) {
        setViewVisibility(R.id.data_status, if (text == null) View.GONE else View.VISIBLE)
        if (text != null) setTextViewText(R.id.data_status, text)
    }

    private fun RemoteViews.showChange(context: Context, quote: NeuraiQuote) {
        val change = quote.change24h
        if (change == null) {
            setTextViewText(R.id.change_value, "—")
            setTextColor(R.id.change_value, ContextCompat.getColor(context, R.color.text_secondary))
            return
        }
        setTextViewText(R.id.change_value, NeuraiMarket.formatChange(change, NeuraiMarket.preferredLocale(context)))
        val color = when {
            change > 0.05 -> R.color.widget_up
            change < -0.05 -> R.color.widget_down
            else -> R.color.text_secondary
        }
        setTextColor(R.id.change_value, ContextCompat.getColor(context, color))
    }

    /** The small widget: XNA price and its 24-hour change. */
    fun priceViews(context: Context): RemoteViews {
        val quote = NeuraiMarket.stored(context)
        val views = RemoteViews(context.packageName, R.layout.widget_layout)
        views.setOnClickPendingIntent(R.id.widget_layout, openApp(context))
        views.showStatus(status(context, quote))
        if (quote == null) {
            views.setViewVisibility(R.id.loading_indicator, View.VISIBLE)
            views.setViewVisibility(R.id.price_value, View.GONE)
            views.setViewVisibility(R.id.change_value, View.GONE)
            return views
        }
        val locale = NeuraiMarket.preferredLocale(context)
        views.setViewVisibility(R.id.loading_indicator, View.GONE)
        views.setViewVisibility(R.id.price_value, View.VISIBLE)
        views.setViewVisibility(R.id.change_value, View.VISIBLE)
        views.setTextViewText(R.id.price_value, NeuraiMarket.formatPrice(quote.price, quote.currency, locale))
        views.showChange(context, quote)
        return views
    }

    /** The market widget: price, 24-hour change, market cap and 24-hour volume. */
    fun marketViews(context: Context): RemoteViews {
        val quote = NeuraiMarket.stored(context)
        val views = RemoteViews(context.packageName, R.layout.widget_market)
        views.setOnClickPendingIntent(R.id.widget_market, openApp(context))
        views.showStatus(status(context, quote))
        if (quote == null) {
            for (id in listOf(R.id.price_value, R.id.change_value, R.id.market_cap_value, R.id.volume_value)) {
                views.setTextViewText(id, "…")
            }
            return views
        }
        val locale = NeuraiMarket.preferredLocale(context)
        views.setTextViewText(R.id.price_value, NeuraiMarket.formatPrice(quote.price, quote.currency, locale))
        views.showChange(context, quote)
        views.setTextViewText(R.id.market_cap_value, quote.marketCap?.let { NeuraiMarket.formatCompact(it, quote.currency, locale) } ?: "—")
        views.setTextViewText(R.id.volume_value, quote.volume24h?.let { NeuraiMarket.formatCompact(it, quote.currency, locale) } ?: "—")
        return views
    }
}

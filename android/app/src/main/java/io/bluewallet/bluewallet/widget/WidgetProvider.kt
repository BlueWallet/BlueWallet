package io.bluewallet.widget

import android.content.Context
import android.util.Log
import android.widget.RemoteViews
import androidx.glance.GlanceAppWidget
import androidx.glance.GlanceAppWidgetReceiver
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.GlanceAppWidgetProvider
import androidx.glance.appwidget.appWidgetBackground
import androidx.glance.layout.Column
import androidx.glance.layout.Text
import androidx.glance.state.GlanceStateDefinition
import androidx.glance.state.PreferencesGlanceStateDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.Date

class PriceWidgetProvider : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget
        get() = PriceWidget()
}

class PriceWidget : GlanceAppWidget() {
    override val stateDefinition: GlanceStateDefinition<Preferences> = PreferencesGlanceStateDefinition

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val marketData = fetchMarketData()
        updateContent(context, id, marketData)
    }

    private suspend fun fetchMarketData(): MarketData {
        // Placeholder for fetching MarketData
        return MarketData(nextBlock = "", sats = "", price = "$10,000", rate = 10000.0, dateString = "2019-09-18T17:27:00+00:00")
    }

    private suspend fun updateContent(context: Context, id: GlanceId, marketData: MarketData) {
        val glanceView = GlanceAppWidgetView(context, id)
        glanceView.setRemoteViews {
            RemoteViews(context.packageName, R.layout.price_widget).apply {
                setTextViewText(R.id.price, marketData.price)
                setTextViewText(R.id.rate, marketData.rate.toString())
            }
        }
    }
}

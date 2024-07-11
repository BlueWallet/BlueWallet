package io.bluewallet.bluewallet

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.widget.RemoteViews
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.testing.WorkManagerTestInitHelper
import com.squareup.okhttp.mockwebserver.MockResponse
import com.squareup.okhttp.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.text.NumberFormat
import java.util.*
import java.util.concurrent.TimeUnit

@RunWith(AndroidJUnit4::class)
class MockServerTest {

    private lateinit var mockWebServer: MockWebServer

    @Before
    fun setUp() {
        mockWebServer = MockWebServer()
        mockWebServer.start()
        MarketAPI.baseUrl = mockWebServer.url("/").toString()
    }

    @After
    fun tearDown() {
        mockWebServer.shutdown()
    }

    @Test
    fun testWidgetUpdate() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        WorkManagerTestInitHelper.initializeTestWorkManager(context)

        val prices = listOf("60000", "60500", "61000", "61500", "62000")
        prices.forEach {
            mockWebServer.enqueue(MockResponse().setBody("""{"USD": {"price": "$it"}}"""))
        }

        WidgetUpdateWorker.scheduleWork(context)
        WorkManagerTestInitHelper.getTestDriver()?.setAllConstraintsMet(WidgetUpdateWorker.WORK_NAME)

        val appWidgetManager = AppWidgetManager.getInstance(context)
        val thisWidget = ComponentName(context, BitcoinPriceWidget::class.java)
        val appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget)
        val views = RemoteViews(context.packageName, R.layout.widget_layout)

        prices.forEachIndexed { index, price ->
            val currencyFormat = NumberFormat.getCurrencyInstance(Locale.getDefault()).apply {
                maximumFractionDigits = 0
            }
            val formattedPrice = currencyFormat.format(price.toDouble())
            views.setTextViewText(R.id.price_value, formattedPrice)
            views.setTextViewText(R.id.last_updated_time, SimpleDateFormat("hh:mm a", Locale.getDefault()).format(Date()))

            if (index > 0) {
                views.setViewVisibility(R.id.price_arrow_container, View.VISIBLE)
                views.setTextViewText(R.id.previous_price, currencyFormat.format(prices[index - 1].toDouble()))
            } else {
                views.setViewVisibility(R.id.price_arrow_container, View.GONE)
            }

            appWidgetManager.updateAppWidget(appWidgetIds, views)
            Thread.sleep(5000) // Wait for 5 seconds before updating to the next price
        }
    }
}
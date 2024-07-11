package io.bluewallet.bluewallet

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.widget.RemoteViews
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.work.testing.WorkManagerTestInitHelper
import androidx.work.WorkManager
import com.google.common.util.concurrent.ListenableFuture
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.json.JSONObject
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.TimeUnit

@RunWith(AndroidJUnit4::class)
class MockServerTest {

    private lateinit var mockWebServer: MockWebServer
    private lateinit var context: Context

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext()
        mockWebServer = MockWebServer()
        mockWebServer.start()

        val baseUrl = mockWebServer.url("/").toString()
        MarketAPI.baseUrl = baseUrl

        WorkManagerTestInitHelper.initializeTestWorkManager(context)
    }

    @After
    fun tearDown() {
        mockWebServer.shutdown()
    }

    @Test
    fun testWidgetUpdate() {
        // Mock API response
        val mockResponse = MockResponse()
            .setBody(createMockJsonResponse("USD", "61500"))
            .setResponseCode(200)
        mockWebServer.enqueue(mockResponse)

        // Trigger the widget update
        WidgetUpdateWorker.scheduleWork(context)

        // Wait for the worker to run
        val workInfos = WorkManager.getInstance(context).getWorkInfosByTag(WidgetUpdateWorker.WORK_NAME).get()
        val testDriver = WorkManagerTestInitHelper.getTestDriver()
        for (workInfo in workInfos) {
            testDriver?.setAllConstraintsMet(workInfo.id)
        }
        Thread.sleep(10000) // Wait for 10 seconds to simulate the update interval

        // Validate the widget updates
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val widgetIds = appWidgetManager.getAppWidgetIds(ComponentName(context, BitcoinPriceWidget::class.java))

        for (widgetId in widgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_layout)
            // Add your assertions here to validate the widget update
        }
    }

    private fun createMockJsonResponse(currency: String, price: String): String {
        return """
            {
                "$currency": {
                    "endPointKey": "$currency",
                    "locale": "en-US",
                    "source": "Kraken",
                    "symbol": "$",
                    "country": "United States (US Dollar)",
                    "price": "$price"
                }
            }
        """.trimIndent()
    }
}
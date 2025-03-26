package io.bluewallet.bluewallet

import android.appwidget.AppWidgetManager
import android.content.Intent
import android.os.Bundle
import android.widget.Button
import androidx.appcompat.app.AppCompatActivity

/**
 * Configuration activity for the Market Widget.
 * This allows the widget to be properly configured when added to the home screen.
 */
class MarketWidgetConfigureActivity : AppCompatActivity() {

    private var appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Set the result to CANCELED. This will be overridden if the user
        // configures the widget properly and clicks the Add button
        setResult(RESULT_CANCELED)

        // Find the widget id from the intent
        appWidgetId = intent.extras?.getInt(
            AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID
        ) ?: AppWidgetManager.INVALID_APPWIDGET_ID

        // If the widget ID is invalid, just finish the activity
        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish()
            return
        }

        // Currently no configuration needed, so we set result to OK right away
        val resultValue = Intent()
        resultValue.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
        setResult(RESULT_OK, resultValue)

        // Schedule an immediate update for this widget
        val widgetIds = intArrayOf(appWidgetId)
        WidgetUpdateWorker.scheduleMarketUpdate(this, widgetIds, true)

        // Finish the activity
        finish()
    }
}

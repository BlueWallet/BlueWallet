package io.bluewallet.bluewallet;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import android.view.View;
import android.widget.RemoteViews;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import java.text.DateFormat;
import java.util.Date;
import java.util.Locale;

public class WidgetUpdateManager extends Worker {
    private static final String TAG = "WidgetUpdateManager";
    private static final String PREFS_NAME = "BitcoinPriceWidgetPrefs";
    private static final String PREF_PREFIX_KEY = "appwidget_";
    private static final String PREFS_LAST_UPDATE_TIME_KEY = "lastUpdateTime_";
    private static final String PREFS_LAST_PRICE_KEY = "lastPrice_";
    private static final String PREFS_PREV_PRICE_KEY = "prevPrice_";
    private static final String PREFS_PREV_UPDATE_TIME_KEY = "prevUpdateTime_";

    public WidgetUpdateManager(Context context, WorkerParameters params) {
        super(context, params);
    }

    @Override
    public Result doWork() {
        Context context = getApplicationContext();
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, BitcoinPriceWidget.class));

        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
        return Result.success();
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, 0);
        String previousPrice = prefs.getString(PREFS_PREV_PRICE_KEY + appWidgetId, "N/A");
        String lastPrice = prefs.getString(PREFS_LAST_PRICE_KEY + appWidgetId, "N/A");
        String lastUpdateTime = prefs.getString(PREFS_LAST_UPDATE_TIME_KEY + appWidgetId, "N/A");
        String previousUpdateTime = prefs.getString(PREFS_PREV_UPDATE_TIME_KEY + appWidgetId, "N/A");

        Log.d(TAG, "Fetch completed with price: " + lastPrice + " at " + lastUpdateTime + ". Previous price: " + previousPrice + " at " + previousUpdateTime);

        String price = MarketAPI.fetchPrice(context, "USD");
        if (price != null) {
            Log.d(TAG, "Fetch completed with price: " + price);
            SharedPreferences.Editor editor = prefs.edit();
            editor.putString(PREFS_PREV_PRICE_KEY + appWidgetId, lastPrice);
            editor.putString(PREFS_PREV_UPDATE_TIME_KEY + appWidgetId, lastUpdateTime);
            editor.putString(PREFS_LAST_PRICE_KEY + appWidgetId, price);
            editor.putString(PREFS_LAST_UPDATE_TIME_KEY + appWidgetId, DateFormat.getTimeInstance(DateFormat.SHORT).format(new Date()));
            editor.apply();

            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout);
            views.setTextViewText(R.id.price_value, price);
            views.setTextViewText(R.id.last_updated_time, DateFormat.getTimeInstance(DateFormat.SHORT).format(new Date()));
            views.setViewVisibility(R.id.loading_indicator, View.GONE);
            views.setViewVisibility(R.id.price_value, View.VISIBLE);
            views.setViewVisibility(R.id.last_updated, View.VISIBLE);
            views.setViewVisibility(R.id.last_updated_time, View.VISIBLE);

            if (!"N/A".equals(previousPrice)) {
                views.setViewVisibility(R.id.price_arrow_container, View.VISIBLE);
                views.setViewVisibility(R.id.previous_price, View.VISIBLE);
            } else {
                views.setViewVisibility(R.id.price_arrow_container, View.GONE);
                views.setViewVisibility(R.id.previous_price, View.GONE);
            }
            appWidgetManager.updateAppWidget(appWidgetId, views);
        } else {
            Log.e(TAG, "Failed to fetch Bitcoin price");
        }
    }
}
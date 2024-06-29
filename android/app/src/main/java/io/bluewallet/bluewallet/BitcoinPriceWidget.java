package io.bluewallet.bluewallet;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import android.view.View;
import android.widget.RemoteViews;

public class BitcoinPriceWidget extends AppWidgetProvider {

    private static final String TAG = "BitcoinPriceWidget";
    private static final String PREFS_NAME = "BitcoinPriceWidgetPrefs";
    private static final String PREF_PREFIX_KEY = "appwidget_";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        Log.d(TAG, "Updating widget");

        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }

        WidgetUpdateWorker.scheduleWork(context); // Schedule to run periodically
    }

    private void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, 0);
        String currentPrice = prefs.getString(PREF_PREFIX_KEY + appWidgetId + "_current_price", "N/A");
        String currentTime = prefs.getString(PREF_PREFIX_KEY + appWidgetId + "_current_time", "N/A");
        String previousPrice = prefs.getString(PREF_PREFIX_KEY + appWidgetId + "_previous_price", "N/A");
        String previousTime = prefs.getString(PREF_PREFIX_KEY + appWidgetId + "_previous_time", "N/A");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout);

        if (!currentPrice.equals("N/A")) {
            views.setTextViewText(R.id.price_value, currentPrice);
            views.setTextViewText(R.id.last_updated, "Last Updated");
            views.setTextViewText(R.id.last_updated_time, currentTime);
            views.setViewVisibility(R.id.loading_indicator, View.GONE);
        } else {
            views.setTextViewText(R.id.price_value, "Loading...");
            views.setViewVisibility(R.id.loading_indicator, View.VISIBLE);
        }

        if (!previousPrice.equals("N/A") && !previousPrice.equals(currentPrice)) {
            views.setViewVisibility(R.id.price_arrow_container, View.VISIBLE);
            views.setTextViewText(R.id.previous_price, "From " + previousPrice);

            try {
                double current = Double.parseDouble(currentPrice.replaceAll("[^\\d.]", ""));
                double previous = Double.parseDouble(previousPrice.replaceAll("[^\\d.]", ""));
                if (current > previous) {
                    views.setImageViewResource(R.id.price_arrow, android.R.drawable.arrow_up_float);
                } else {
                    views.setImageViewResource(R.id.price_arrow, android.R.drawable.arrow_down_float);
                }
            } catch (NumberFormatException e) {
                Log.e(TAG, "Error parsing prices", e);
            }

        } else {
            views.setViewVisibility(R.id.price_arrow_container, View.GONE);
        }

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    public static void savePreferences(Context context, int appWidgetId, String currentPrice, String currentTime, String previousPrice, String previousTime) {
        SharedPreferences.Editor prefs = context.getSharedPreferences(PREFS_NAME, 0).edit();
        prefs.putString(PREF_PREFIX_KEY + appWidgetId + "_current_price", currentPrice);
        prefs.putString(PREF_PREFIX_KEY + appWidgetId + "_current_time", currentTime);
        prefs.putString(PREF_PREFIX_KEY + appWidgetId + "_previous_price", previousPrice);
        prefs.putString(PREF_PREFIX_KEY + appWidgetId + "_previous_time", previousTime);
        prefs.apply();
    }
}
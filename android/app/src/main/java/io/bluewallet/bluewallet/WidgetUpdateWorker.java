package io.bluewallet.bluewallet;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import android.view.View;
import android.widget.RemoteViews;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import androidx.work.OneTimeWorkRequest;

import java.text.NumberFormat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.TimeUnit;

public class WidgetUpdateWorker extends Worker {

    private static final String TAG = "WidgetUpdateWorker";
    private static final String PREFS_NAME = "BitcoinPriceWidgetPrefs";
    private static final String PREF_PREFIX_KEY_CURRENT = "appwidget_current_";
    private static final String PREF_PREFIX_KEY_PREVIOUS = "appwidget_previous_";

    public WidgetUpdateWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context context = getApplicationContext();
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName thisWidget = new ComponentName(context, BitcoinPriceWidget.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
        return Result.success();
    }

    private void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, 0);
        String prevPrice = prefs.getString(PREF_PREFIX_KEY_PREVIOUS + appWidgetId, "N/A");
        String currentPrice = prefs.getString(PREF_PREFIX_KEY_CURRENT + appWidgetId, "N/A");

        Log.d(TAG, "Previous price: " + prevPrice);
        Log.d(TAG, "Current price: " + currentPrice);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout);

        // Fetch the latest price
        String newPrice = MarketAPI.fetchPrice(context, "USD");
        if (newPrice != null) {
            String currentTime = new SimpleDateFormat("hh:mm a", Locale.getDefault()).format(new Date());
            NumberFormat currencyFormat = NumberFormat.getCurrencyInstance(Locale.getDefault());

            // Update the widget views
            views.setTextViewText(R.id.price_value, currencyFormat.format(Double.parseDouble(newPrice)));
            views.setTextViewText(R.id.last_updated_time, currentTime);
            views.setViewVisibility(R.id.last_updated_label, View.VISIBLE);
            views.setViewVisibility(R.id.last_updated_time, View.VISIBLE);

            if (!prevPrice.equals("N/A") && !prevPrice.equals(newPrice)) {
                views.setViewVisibility(R.id.price_arrow_container, View.VISIBLE);
                views.setTextViewText(R.id.previous_price, currencyFormat.format(Double.parseDouble(prevPrice)));
                views.setViewVisibility(R.id.previous_price_label, View.VISIBLE);
                views.setViewVisibility(R.id.previous_price, View.VISIBLE);
                if (Double.parseDouble(newPrice) > Double.parseDouble(prevPrice)) {
                    views.setImageViewResource(R.id.price_arrow, android.R.drawable.arrow_up_float);
                } else {
                    views.setImageViewResource(R.id.price_arrow, android.R.drawable.arrow_down_float);
                }
            } else {
                views.setViewVisibility(R.id.price_arrow_container, View.GONE);
                views.setViewVisibility(R.id.previous_price_label, View.GONE);
                views.setViewVisibility(R.id.previous_price, View.GONE);
            }

            // Save the new price and time
            SharedPreferences.Editor editor = prefs.edit();
            editor.putString(PREF_PREFIX_KEY_PREVIOUS + appWidgetId, currentPrice);
            editor.putString(PREF_PREFIX_KEY_CURRENT + appWidgetId, newPrice);
            editor.apply();

            Log.d(TAG, "Fetch completed with price: " + newPrice + " at " + currentTime + ". Previous price: " + prevPrice);

            appWidgetManager.updateAppWidget(appWidgetId, views);

            // Log the next update time
            long nextUpdateTimeMillis = System.currentTimeMillis() + TimeUnit.MINUTES.toMillis(4);
            String nextUpdateTime = new SimpleDateFormat("hh:mm a", Locale.getDefault()).format(new Date(nextUpdateTimeMillis));
            Log.d(TAG, "Next fetch scheduled at: " + nextUpdateTime);
        } else {
            Log.e(TAG, "Failed to fetch Bitcoin price");
            views.setTextViewText(R.id.price_value, "Error");
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }

    public static OneTimeWorkRequest createWorkRequest() {
        return new OneTimeWorkRequest.Builder(WidgetUpdateWorker.class).build();
    }
}
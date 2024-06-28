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
import androidx.work.WorkManager;

import java.text.NumberFormat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.TimeUnit;

public class UpdateWidgetWorker extends Worker {

    private static final String TAG = "UpdateWidgetWorker";
    private static final String PREFS_NAME = "BitcoinPriceWidgetPrefs";
    private static final String PREF_PREFIX_KEY = "appwidget_";
    private static final int UPDATE_INTERVAL_MINUTES = 10; // Adjustable interval in minutes

    public UpdateWidgetWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context context = getApplicationContext();
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName widget = new ComponentName(context, BitcoinPriceWidget.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(widget);

        for (int appWidgetId : appWidgetIds) {
            fetchAndUpdatePrice(context, appWidgetManager, appWidgetId);
        }

        scheduleNextUpdate(context); // Schedule the next update

        return Result.success();
    }

    private void fetchAndUpdatePrice(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        Log.d(TAG, "Fetching Bitcoin price...");

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String preferredCurrency = prefs.getString("preferredCurrency", "USD");
        String price = MarketAPI.fetchPrice(context, preferredCurrency);

        if (price != null) {
            updateWidgetWithPrice(context, appWidgetManager, appWidgetId, price);
        } else {
            handleError(context, appWidgetManager, appWidgetId);
        }
    }

    private void updateWidgetWithPrice(Context context, AppWidgetManager appWidgetManager, int appWidgetId, String price) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout);
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, 0);

        // Fetch current and previous data
        String prevPrice = prefs.getString(PREF_PREFIX_KEY + appWidgetId + "_prev_price", "N/A");
        String prevTime = prefs.getString(PREF_PREFIX_KEY + appWidgetId + "_prev_time", "N/A");
        String currentPrice = prefs.getString(PREF_PREFIX_KEY + appWidgetId + "_current_price", null);
        String currentTime = prefs.getString(PREF_PREFIX_KEY + appWidgetId + "_current_time", null);

        SharedPreferences.Editor editor = prefs.edit();

        String newTime = new SimpleDateFormat("hh:mm a", Locale.getDefault()).format(new Date());
        Log.d(TAG, "Fetch completed with price: " + price + " at " + newTime + ". Previous price: " + prevPrice + " at " + prevTime);
        NumberFormat currencyFormat = NumberFormat.getCurrencyInstance(Locale.US);
        views.setTextViewText(R.id.price_value, currencyFormat.format(Double.parseDouble(price)));

        if (currentPrice != null) {
            double previousPrice = Double.parseDouble(currentPrice);
            double newPrice = Double.parseDouble(price);
            if (newPrice > previousPrice) {
                views.setImageViewResource(R.id.price_arrow, android.R.drawable.arrow_up_float);
            } else if (newPrice < previousPrice) {
                views.setImageViewResource(R.id.price_arrow, android.R.drawable.arrow_down_float);
            } else {
                views.setImageViewResource(R.id.price_arrow, 0);
            }

            if (newPrice != previousPrice) {
                views.setTextViewText(R.id.previous_price, "from " + currencyFormat.format(previousPrice));
                views.setViewVisibility(R.id.price_arrow_container, View.VISIBLE);
                views.setViewVisibility(R.id.previous_price, View.VISIBLE);
            } else {
                views.setTextViewText(R.id.previous_price, "");
                views.setViewVisibility(R.id.price_arrow_container, View.GONE);
                views.setViewVisibility(R.id.previous_price, View.GONE);
            }
        } else {
            views.setImageViewResource(R.id.price_arrow, 0);
            views.setTextViewText(R.id.previous_price, "");
            views.setViewVisibility(R.id.price_arrow_container, View.GONE);
            views.setViewVisibility(R.id.previous_price, View.GONE);
        }

        // Shift current to previous
        editor.putString(PREF_PREFIX_KEY + appWidgetId + "_prev_price", currentPrice);
        editor.putString(PREF_PREFIX_KEY + appWidgetId + "_prev_time", currentTime);

        // Set new current
        editor.putString(PREF_PREFIX_KEY + appWidgetId + "_current_price", price);
        editor.putString(PREF_PREFIX_KEY + appWidgetId + "_current_time", newTime);
        editor.apply();

        views.setTextViewText(R.id.last_updated, "Last Updated");
        views.setTextViewText(R.id.last_updated_time, newTime);

        views.setViewVisibility(R.id.loading_indicator, View.GONE);
        views.setViewVisibility(R.id.price_value, View.VISIBLE);
        views.setViewVisibility(R.id.last_updated, View.VISIBLE);
        views.setViewVisibility(R.id.last_updated_time, View.VISIBLE);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private void handleError(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout);
        String errorMessage = "Network Error";
        Log.e(TAG, errorMessage);
        views.setTextViewText(R.id.price_value, errorMessage);
        views.setTextViewText(R.id.last_updated, "");
        views.setTextViewText(R.id.last_updated_time, "");
        views.setImageViewResource(R.id.price_arrow, 0);
        views.setTextViewText(R.id.previous_price, "");
        views.setViewVisibility(R.id.price_arrow_container, View.GONE);
        views.setViewVisibility(R.id.previous_price, View.GONE);
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private void scheduleNextUpdate(Context context) {
        OneTimeWorkRequest workRequest = new OneTimeWorkRequest.Builder(UpdateWidgetWorker.class)
                .setInitialDelay(UPDATE_INTERVAL_MINUTES, TimeUnit.MINUTES)
                .build();
        WorkManager.getInstance(context).enqueue(workRequest);
    }
}
package io.bluewallet.bluewallet;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import android.view.View;
import android.widget.RemoteViews;

import androidx.annotation.NonNull;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import java.text.DateFormat;
import java.text.NumberFormat;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.TimeUnit;

public class WidgetUpdateWorker extends Worker {

    private static final String TAG = "WidgetUpdateWorker";
    private static final String WORK_NAME = "WidgetUpdateWorker";
    private static final int UPDATE_INTERVAL_MINUTES = 10; // You can adjust this value as needed

    public WidgetUpdateWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context context = getApplicationContext();
        SharedPreferences prefs = context.getSharedPreferences("group.io.bluewallet.bluewallet", Context.MODE_PRIVATE);

        // Fetch the preferred currency from shared preferences
        String preferredCurrency = prefs.getString("preferredCurrency", "USD");

        Log.d(TAG, "Fetching price for currency: " + preferredCurrency);

        // Fetch the price using MarketAPI
        String price = MarketAPI.fetchPrice(context, preferredCurrency);
        String previousPrice = prefs.getString("previous_price", "N/A");
        String previousTime = prefs.getString("previous_time", "N/A");

        Log.d(TAG, "Fetch completed with price: " + price + " at " + getCurrentTime() + ". Previous price: " + previousPrice + " at " + previousTime);

        // Update the widget with the fetched price
        if (price != null) {
            SharedPreferences.Editor editor = prefs.edit();
            editor.putString("previous_price", prefs.getString("current_price", "N/A"));
            editor.putString("previous_time", prefs.getString("current_time", "N/A"));
            editor.putString("current_price", price);
            editor.putString("current_time", getCurrentTime());
            editor.apply();

            updateWidget(context, price, preferredCurrency, previousPrice);
        } else {
            handleError(context);
            return Result.retry();
        }

        Log.d(TAG, "Next fetch will occur at: " + getNextFetchTime());

        return Result.success();
    }

    private void updateWidget(Context context, String price, String currency, String previousPrice) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout);

        NumberFormat currencyFormat = NumberFormat.getCurrencyInstance(Locale.getDefault());
        currencyFormat.setCurrency(java.util.Currency.getInstance(currency));

        views.setTextViewText(R.id.price_value, currencyFormat.format(Double.parseDouble(price)));
        views.setTextViewText(R.id.last_updated, "Last Updated");
        views.setTextViewText(R.id.last_updated_time, getCurrentTime());

        SharedPreferences prefs = context.getSharedPreferences("group.io.bluewallet.bluewallet", Context.MODE_PRIVATE);
        String currentStoredPrice = prefs.getString("current_price", null);
        if (currentStoredPrice == null || currentStoredPrice.isEmpty()) {
            views.setViewVisibility(R.id.loading_indicator, View.VISIBLE);
            views.setViewVisibility(R.id.price_value, View.GONE);
            views.setViewVisibility(R.id.last_updated, View.GONE);
            views.setViewVisibility(R.id.last_updated_time, View.GONE);
        } else {
            views.setViewVisibility(R.id.loading_indicator, View.GONE);
            views.setViewVisibility(R.id.price_value, View.VISIBLE);
            views.setViewVisibility(R.id.last_updated, View.VISIBLE);
            views.setViewVisibility(R.id.last_updated_time, View.VISIBLE);
        }

        if (!previousPrice.equals("N/A") && !previousPrice.equals(price)) {
            views.setViewVisibility(R.id.price_arrow_container, View.VISIBLE);
            views.setTextViewText(R.id.previous_price, "From " + currencyFormat.format(Double.parseDouble(previousPrice)));

            double current = Double.parseDouble(price);
            double previous = Double.parseDouble(previousPrice);
            if (current > previous) {
                views.setImageViewResource(R.id.price_arrow, android.R.drawable.arrow_up_float);
            } else {
                views.setImageViewResource(R.id.price_arrow, android.R.drawable.arrow_down_float);
            }
        } else {
            views.setViewVisibility(R.id.price_arrow_container, View.GONE);
        }

        // Update the widget
        WidgetUtils.updateAppWidget(context, views);
    }

    private void handleError(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout);
        views.setTextViewText(R.id.price_value, "Failed to fetch");
        views.setTextViewText(R.id.last_updated, "Last Updated");
        views.setTextViewText(R.id.last_updated_time, getCurrentTime());

        views.setViewVisibility(R.id.loading_indicator, View.GONE);

        // Update the widget
        WidgetUtils.updateAppWidget(context, views);
    }

    private String getCurrentTime() {
        DateFormat dateFormat = android.text.format.DateFormat.getTimeFormat(getApplicationContext());
        return dateFormat.format(new Date());
    }

    private String getNextFetchTime() {
        long currentTimeMillis = System.currentTimeMillis();
        long nextFetchTimeMillis = currentTimeMillis + TimeUnit.MINUTES.toMillis(UPDATE_INTERVAL_MINUTES);
        Date nextFetchDate = new Date(nextFetchTimeMillis);
        DateFormat dateFormat = android.text.format.DateFormat.getTimeFormat(getApplicationContext());
        return dateFormat.format(nextFetchDate);
    }

    public static PeriodicWorkRequest createWorkRequest(int intervalMinutes) {
        Constraints constraints = new Constraints.Builder()
                .setRequiresBatteryNotLow(true)
                .build();

        return new PeriodicWorkRequest.Builder(WidgetUpdateWorker.class, intervalMinutes, TimeUnit.MINUTES)
                .setConstraints(constraints)
                .build();
    }

    public static void scheduleWork(Context context) {
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.REPLACE,
                createWorkRequest(UPDATE_INTERVAL_MINUTES)
        );
    }
}
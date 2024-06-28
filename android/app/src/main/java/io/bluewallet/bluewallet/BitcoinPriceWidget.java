package io.bluewallet.bluewallet;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;
import android.view.View;
import android.widget.RemoteViews;

import androidx.annotation.NonNull;
import androidx.work.Constraints;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;

import java.lang.ref.WeakReference;
import java.text.NumberFormat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

public class BitcoinPriceWidget extends AppWidgetProvider {

    private static final String TAG = "BitcoinPriceWidget";
    private static final String ACTION_UPDATE = "io.bluewallet.bluewallet.UPDATE";
    private static final String PREFS_NAME = "BitcoinPriceWidgetPrefs";
    private static final String PREF_PREFIX_KEY = "appwidget_";
    private static final int UPDATE_INTERVAL_MINUTES = 10; // Adjustable interval in minutes
    private static ExecutorService executorService;

    @Override
    public void onEnabled(Context context) {
        super.onEnabled(context);
        initializeExecutorService();
    }

    @Override
    public void onDisabled(Context context) {
        super.onDisabled(context);
        if (executorService != null) {
            executorService.shutdown();
        }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        initializeExecutorService();
        if (appWidgetIds.length > 0) {
            for (int appWidgetId : appWidgetIds) {
                Log.d(TAG, "Updating widget ID: " + appWidgetId);

                RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout);

                // Set up the pending intent to open the app when the widget is clicked
                Intent launchAppIntent = new Intent(context, MainActivity.class);
                PendingIntent launchAppPendingIntent = PendingIntent.getActivity(context, 0, launchAppIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                views.setOnClickPendingIntent(R.id.widget_layout, launchAppPendingIntent);

                // Set the loading indicator visible initially
                views.setViewVisibility(R.id.loading_indicator, View.VISIBLE);
                views.setViewVisibility(R.id.price_value, View.GONE);
                views.setViewVisibility(R.id.last_updated, View.GONE);
                views.setViewVisibility(R.id.last_updated_time, View.GONE);

                appWidgetManager.updateAppWidget(appWidgetId, views);

                executorService.execute(new FetchBitcoinPriceTask(context, appWidgetManager, appWidgetId));
            }

            scheduleNextUpdate(context);
        }
    }

    private void initializeExecutorService() {
        if (executorService == null || executorService.isShutdown()) {
            executorService = Executors.newSingleThreadExecutor();
        }
    }

    private void scheduleNextUpdate(Context context) {
        OneTimeWorkRequest workRequest = new OneTimeWorkRequest.Builder(UpdateWidgetWorker.class)
                .setInitialDelay(UPDATE_INTERVAL_MINUTES, TimeUnit.MINUTES)
                .build();

        WorkManager.getInstance(context).enqueue(workRequest);
    }

    private static class FetchBitcoinPriceTask implements Runnable {
        private final WeakReference<Context> contextRef;
        private final AppWidgetManager appWidgetManager;
        private final int appWidgetId;

        FetchBitcoinPriceTask(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
            this.contextRef = new WeakReference<>(context);
            this.appWidgetManager = appWidgetManager;
            this.appWidgetId = appWidgetId;
        }

        @Override
        public void run() {
            Context context = contextRef.get();
            if (context == null) return;

            Log.d(TAG, "Starting to fetch Bitcoin price...");

            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String preferredCurrency = prefs.getString("preferredCurrency", "USD");
            String price = MarketAPI.fetchPrice(context, preferredCurrency);

            if (price != null) {
                updateWidgetWithPrice(context, price);
            } else {
                handleError(context);
            }
        }

        private void updateWidgetWithPrice(Context context, String price) {
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

        private void handleError(Context context) {
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
            views.setViewVisibility(R.id.loading_indicator, View.GONE);

            appWidgetManager.updateAppWidget(appWidgetId, views);

            Log.e(TAG, "Failed to fetch Bitcoin price");
        }
    }
}

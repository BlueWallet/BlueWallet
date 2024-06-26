package io.bluewallet.bluewallet;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Handler;
import android.util.Log;
import android.view.View;
import android.widget.RemoteViews;
import android.widget.Toast;

import java.lang.ref.WeakReference;
import java.text.DateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class BitcoinPriceWidget extends AppWidgetProvider {

    private static final String TAG = "BitcoinPriceWidget";
    private static final String ACTION_UPDATE = "io.bluewallet.bluewallet.UPDATE";
    private static final String PREFS_NAME = "BitcoinPriceWidgetPrefs";
    private static final String PREF_PREFIX_KEY = "appwidget_";
    private static final ExecutorService executorService = Executors.newSingleThreadExecutor();
    private static final Handler handler = new Handler();

    @Override
    public void onEnabled(Context context) {
        super.onEnabled(context);
        scheduleNextUpdate(context);
    }

    @Override
    public void onDisabled(Context context) {
        super.onDisabled(context);
        executorService.shutdown();
        handler.removeCallbacksAndMessages(null);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            Log.d(TAG, "Updating widget ID: " + appWidgetId);

            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout);

            // Set up the pending intent to open the app when the widget is clicked
            Intent launchAppIntent = new Intent(context, MainActivity.class);
            PendingIntent launchAppPendingIntent = PendingIntent.getActivity(context, 0, launchAppIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.widget_layout, launchAppPendingIntent);

            appWidgetManager.updateAppWidget(appWidgetId, views);

            executorService.execute(new FetchBitcoinPriceTask(context, appWidgetManager, appWidgetId));
        }

        scheduleNextUpdate(context);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (ACTION_UPDATE.equals(intent.getAction())) {
            Log.d(TAG, "Received update action");

            ComponentName widget = new ComponentName(context, BitcoinPriceWidget.class);
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(widget);
            onUpdate(context, appWidgetManager, appWidgetIds);
        }
    }

    private void scheduleNextUpdate(final Context context) {
        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                Intent intent = new Intent(context, BitcoinPriceWidget.class);
                intent.setAction(ACTION_UPDATE);
                context.sendBroadcast(intent);
                scheduleNextUpdate(context);
            }
        }, 10 * 60 * 1000); // Update every 10 minutes
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

            String price = MarketAPI.fetchPrice("USD"); // Using hardcoded "USD" for now

            if (price != null) {
                updateWidgetWithPrice(context, price);
            } else {
                handleError(context);
            }
        }

        private void updateWidgetWithPrice(Context context, String price) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout);
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, 0);
            String prevPrice = prefs.getString(PREF_PREFIX_KEY + appWidgetId, null);
            SharedPreferences.Editor editor = prefs.edit();

            Log.d(TAG, "Fetch completed with price: " + price);
            NumberFormat currencyFormat = NumberFormat.getCurrencyInstance(Locale.US);
            views.setTextViewText(R.id.price_value, currencyFormat.format(Double.parseDouble(price)));

            if (prevPrice != null) {
                double previousPrice = Double.parseDouble(prevPrice);
                double currentPrice = Double.parseDouble(price);
                if (currentPrice > previousPrice) {
                    views.setImageViewResource(R.id.price_arrow, android.R.drawable.arrow_up_float);
                } else if (currentPrice < previousPrice) {
                    views.setImageViewResource(R.id.price_arrow, android.R.drawable.arrow_down_float);
                } else {
                    views.setImageViewResource(R.id.price_arrow, 0);
                }

                if (currentPrice != previousPrice) {
                    views.setTextViewText(R.id.previous_price, "from " + currencyFormat.format(previousPrice));
                    views.setViewVisibility(R.id.price_arrow, View.VISIBLE);
                    views.setViewVisibility(R.id.previous_price, View.VISIBLE);
                } else {
                    views.setTextViewText(R.id.previous_price, "");
                    views.setViewVisibility(R.id.price_arrow, View.GONE);
                    views.setViewVisibility(R.id.previous_price, View.GONE);
                }
            } else {
                views.setImageViewResource(R.id.price_arrow, 0);
                views.setTextViewText(R.id.previous_price, "");
                views.setViewVisibility(R.id.price_arrow, View.GONE);
                views.setViewVisibility(R.id.previous_price, View.GONE);
            }

            editor.putString(PREF_PREFIX_KEY + appWidgetId, price);
            editor.apply();

            DateFormat timeFormat = DateFormat.getTimeInstance(DateFormat.SHORT, Locale.getDefault());
            String currentTime = timeFormat.format(new Date());
            views.setTextViewText(R.id.last_updated, "Last Updated");
            views.setTextViewText(R.id.last_updated_time, currentTime);

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
            views.setViewVisibility(R.id.price_arrow, View.GONE);
            views.setViewVisibility(R.id.previous_price, View.GONE);
            Toast.makeText(context, "Failed to fetch Bitcoin price", Toast.LENGTH_SHORT).show();
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}

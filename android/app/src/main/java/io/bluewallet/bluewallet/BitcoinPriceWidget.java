package io.bluewallet.bluewallet;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.AsyncTask;
import android.util.Log;
import android.widget.RemoteViews;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatDelegate;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.text.NumberFormat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class BitcoinPriceWidget extends AppWidgetProvider {

    private static final String TAG = "BitcoinPriceWidget";
    private static final String ACTION_UPDATE = "io.bluewallet.bluewallet.UPDATE";
    private static final String PREFS_NAME = "BitcoinPriceWidgetPrefs";
    private static final String PREF_PREFIX_KEY = "appwidget_";

    @Override
    public void onEnabled(Context context) {
        super.onEnabled(context);
        scheduleNextUpdate(context);
    }

    @Override
    public void onDisabled(Context context) {
        super.onDisabled(context);
        cancelUpdate(context);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            Log.d(TAG, "Updating widget ID: " + appWidgetId);

            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout);

            Intent intent = new Intent(context, BitcoinPriceWidget.class);
            intent.setAction(ACTION_UPDATE);
            PendingIntent pendingIntent = PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

            views.setOnClickPendingIntent(R.id.price_value, pendingIntent);

            appWidgetManager.updateAppWidget(appWidgetId, views);

            fetchBitcoinPrice(context, appWidgetManager, appWidgetId);
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

    private void scheduleNextUpdate(Context context) {
        Intent intent = new Intent(context, BitcoinPriceWidget.class);
        intent.setAction(ACTION_UPDATE);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        try {
            alarmManager.setExact(AlarmManager.RTC, System.currentTimeMillis() + 300000, pendingIntent);
        } catch (SecurityException e) {
            Log.e(TAG, "Permission not granted for setting exact alarms", e);
        }
    }

    private void cancelUpdate(Context context) {
        Intent intent = new Intent(context, BitcoinPriceWidget.class);
        intent.setAction(ACTION_UPDATE);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        alarmManager.cancel(pendingIntent);
    }

    private void fetchBitcoinPrice(final Context context, final AppWidgetManager appWidgetManager, final int appWidgetId) {
        new AsyncTask<Void, Void, String>() {
            @Override
            protected void onPreExecute() {
                super.onPreExecute();
                Log.d(TAG, "Starting to fetch Bitcoin price...");
            }

            @Override
            protected String doInBackground(Void... voids) {
                try {
                    Log.d(TAG, "Creating URI...");
                    URI uri = new URI("https://api.kraken.com/0/public/Ticker?pair=XBTUSD");
                    URL url = uri.toURL();
                    Log.d(TAG, "Opening connection to URL: " + url);
                    HttpURLConnection urlConnection = (HttpURLConnection) url.openConnection();
                    urlConnection.setRequestMethod("GET");
                    urlConnection.connect();

                    int responseCode = urlConnection.getResponseCode();
                    Log.d(TAG, "Response code: " + responseCode);
                    if (responseCode != 200) {
                        Log.e(TAG, "Failed to fetch Bitcoin price. Response code: " + responseCode);
                        return null;
                    }

                    InputStreamReader reader = new InputStreamReader(urlConnection.getInputStream());
                    StringBuilder json = new StringBuilder();
                    int read;
                    char[] buffer = new char[1024];
                    while ((read = reader.read(buffer)) != -1) {
                        json.append(buffer, 0, read);
                    }

                    Log.d(TAG, "JSON response: " + json.toString());
                    JSONObject jsonObject = new JSONObject(json.toString());
                    JSONObject resultObject = jsonObject.getJSONObject("result");
                    JSONObject xbtusdObject = resultObject.getJSONObject("XXBTZUSD");
                    JSONArray priceArray = xbtusdObject.getJSONArray("c");
                    String price = priceArray.getString(0);
                    return price;
                } catch (Exception e) {
                    Log.e(TAG, "Exception while fetching Bitcoin price", e);
                    return null;
                }
            }

            @Override
            protected void onPostExecute(String price) {
                RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout);
                SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, 0);
                String prevPrice = prefs.getString(PREF_PREFIX_KEY + appWidgetId, null);
                SharedPreferences.Editor editor = prefs.edit();

                if (price != null) {
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
                        views.setTextViewText(R.id.previous_price, "from " + currencyFormat.format(previousPrice));
                    } else {
                        views.setImageViewResource(R.id.price_arrow, 0);
                        views.setTextViewText(R.id.previous_price, "");
                    }

                    editor.putString(PREF_PREFIX_KEY + appWidgetId, price);
                    editor.apply();

                    String currentTime = new SimpleDateFormat("hh:mm a", Locale.getDefault()).format(new Date());
                    views.setTextViewText(R.id.last_updated, "Last Updated");
                    views.setTextViewText(R.id.last_updated_time, currentTime);

                    if (AppCompatDelegate.getDefaultNightMode() == AppCompatDelegate.MODE_NIGHT_YES) {
                        views.setTextColor(R.id.last_updated, context.getResources().getColor(android.R.color.white));
                        views.setTextColor(R.id.last_updated_time, context.getResources().getColor(android.R.color.white));
                        views.setTextColor(R.id.price_value, context.getResources().getColor(android.R.color.white));
                        views.setTextColor(R.id.previous_price, context.getResources().getColor(android.R.color.white));
                        views.setInt(R.id.widget_layout, "setBackgroundColor", context.getResources().getColor(android.R.color.black));
                    } else {
                        views.setTextColor(R.id.last_updated, context.getResources().getColor(android.R.color.black));
                        views.setTextColor(R.id.last_updated_time, context.getResources().getColor(android.R.color.black));
                        views.setTextColor(R.id.price_value, context.getResources().getColor(android.R.color.black));
                        views.setTextColor(R.id.previous_price, context.getResources().getColor(android.R.color.black));
                        views.setInt(R.id.widget_layout, "setBackgroundColor", context.getResources().getColor(android.R.color.white));
                    }
                } else {
                    String errorMessage = "Network Error";
                    Log.e(TAG, errorMessage);
                    views.setTextViewText(R.id.price_value, errorMessage);
                    views.setTextViewText(R.id.last_updated, "");
                    views.setTextViewText(R.id.last_updated_time, "");
                    views.setImageViewResource(R.id.price_arrow, 0);
                    views.setTextViewText(R.id.previous_price, "");
                    Toast.makeText(context, "Failed to fetch Bitcoin price", Toast.LENGTH_SHORT).show();
                }
                appWidgetManager.updateAppWidget(appWidgetId, views);
            }
        }.execute();
    }
}

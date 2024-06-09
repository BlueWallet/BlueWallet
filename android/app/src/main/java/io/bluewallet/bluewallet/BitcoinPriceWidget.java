package io.bluewallet.bluewallet;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.ContentObserver;
import android.net.Uri;
import android.os.AsyncTask;
import android.os.Handler;
import android.provider.Settings;
import android.util.Log;
import android.view.View;
import android.widget.RemoteViews;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatDelegate;

import org.json.JSONObject;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
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
    private CurrencyObserver currencyObserver;

    @Override
    public void onEnabled(Context context) {
        super.onEnabled(context);
        scheduleNextUpdate(context);
        registerCurrencyObserver(context);
    }

    @Override
    public void onDisabled(Context context) {
        super.onDisabled(context);
        cancelUpdate(context);
        unregisterCurrencyObserver(context);
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
        new FetchPriceTask(context, appWidgetManager, appWidgetId).execute();
    }

    private void clearSavedValues(Context context, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, 0);
        SharedPreferences.Editor editor = prefs.edit();
        editor.remove(PREF_PREFIX_KEY + appWidgetId);
        editor.apply();
    }

    private void updateAllWidgets(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName thisWidget = new ComponentName(context, BitcoinPriceWidget.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
        onUpdate(context, appWidgetManager, appWidgetIds);
    }

    private void registerCurrencyObserver(Context context) {
        if (currencyObserver == null) {
            currencyObserver = new CurrencyObserver(new Handler(), context);
        }
        context.getContentResolver().registerContentObserver(Settings.System.CONTENT_URI, true, currencyObserver);
    }

    private void unregisterCurrencyObserver(Context context) {
        if (currencyObserver != null) {
            context.getContentResolver().unregisterContentObserver(currencyObserver);
        }
    }

    private static class FetchPriceTask extends AsyncTask<Void, Void, String> {

        private final Context context;
        private final AppWidgetManager appWidgetManager;
        private final int appWidgetId;

        FetchPriceTask(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
            this.context = context;
            this.appWidgetManager = appWidgetManager;
            this.appWidgetId = appWidgetId;
        }

        @Override
        protected void onPreExecute() {
            super.onPreExecute();
            Log.d(TAG, "Starting to fetch Bitcoin price...");
        }

        @Override
        protected String doInBackground(Void... voids) {
            try {
                // Get preferred currency
                SharedPreferences sharedPref = context.getSharedPreferences("group.io.bluewallet.bluewallet", Context.MODE_PRIVATE);
                String preferredCurrency = sharedPref.getString("preferredCurrency", "USD");
                Log.d(TAG, "Preferred Currency: " + preferredCurrency);

                // Load fiat units from JSON
                InputStream inputStream = context.getAssets().open("fiatUnits.json");
                byte[] buffer = new byte[inputStream.available()];
                inputStream.read(buffer);
                inputStream.close();
                String jsonStr = new String(buffer, "UTF-8");

                JSONObject jsonObject = new JSONObject(jsonStr);
                JSONObject currencyObject = jsonObject.getJSONObject(preferredCurrency);

                String endPointKey = currencyObject.getString("endPointKey");
                String source = currencyObject.getString("source");

                String urlString = MarketAPI.buildURLString(source, endPointKey);
                Log.d(TAG, "Fetching URL: " + urlString);

                URL url = new URL(urlString);
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
                char[] bufferArray = new char[1024];
                while ((read = reader.read(bufferArray)) != -1) {
                    json.append(bufferArray, 0, read);
                }

                Log.d(TAG, "JSON response: " + json.toString());
                JSONObject jsonObjectResponse = new JSONObject(json.toString());
                return MarketAPI.parsePriceFromJSON(jsonObjectResponse, source, endPointKey);
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
                NumberFormat currencyFormat = NumberFormat.getCurrencyInstance();
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

                String currentTime = new SimpleDateFormat("hh:mm a", Locale.getDefault()).format(new Date());
                views.setTextViewText(R.id.last_updated, "Last Updated");
                views.setTextViewText(R.id.last_updated_time, currentTime);
            } else {
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
            }
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }

    private class CurrencyObserver extends ContentObserver {
        private final Context context;

        CurrencyObserver(Handler handler, Context context) {
            super(handler);
            this.context = context;
        }

        @Override
        public void onChange(boolean selfChange, Uri uri) {
            super.onChange(selfChange, uri);
            SharedPreferences sharedPref = context.getSharedPreferences("group.io.bluewallet.bluewallet", Context.MODE_PRIVATE);
            String preferredCurrency = sharedPref.getString("preferredCurrency", "USD");
            Log.d(TAG, "CurrencyObserver detected change in preferredCurrency: " + preferredCurrency);
            updateAllWidgets(context);
        }
    }
}

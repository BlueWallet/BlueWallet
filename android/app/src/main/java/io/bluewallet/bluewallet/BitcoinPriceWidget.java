package io.bluewallet.bluewallet;

import android.app.Application;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.PowerManager;
import android.util.Log;
import android.widget.RemoteViews;

import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import java.text.NumberFormat;
import java.util.Locale;
import java.util.concurrent.TimeUnit;

public class BitcoinPriceWidget extends AppWidgetProvider {

    private static final String TAG = "BitcoinPriceWidget";
    private static final String ACTION_UPDATE = "io.bluewallet.bluewallet.UPDATE_WIDGET";
    private static final long UPDATE_INTERVAL_MINUTES = 15; // Update interval in minutes
    private static final int MAX_RETRIES = 3;

    private static PowerManager.WakeLock wakeLock;
    private static int retryCount = 0;
    private static boolean isScreenOn = true;

    @Override
    public void onEnabled(Context context) {
        super.onEnabled(context);
        registerScreenReceiver(context);
        schedulePeriodicUpdates(context);
    }

    @Override
    public void onDisabled(Context context) {
        super.onDisabled(context);
        unregisterScreenReceiver(context);
        WorkManager.getInstance(context).cancelUniqueWork("UpdateWidgetWork");
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        super.onUpdate(context, appWidgetManager, appWidgetIds);
        if (isScreenOn) {
            scheduleWork(context);
        }
    }

    private void schedulePeriodicUpdates(Context context) {
        PeriodicWorkRequest workRequest = new PeriodicWorkRequest.Builder(WidgetUpdateWorker.class,
                UPDATE_INTERVAL_MINUTES, TimeUnit.MINUTES)
                .setInitialDelay(UPDATE_INTERVAL_MINUTES, TimeUnit.MINUTES)
                .build();

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                "UpdateWidgetWork",
                ExistingPeriodicWorkPolicy.REPLACE,
                workRequest
        );
    }

    private void registerScreenReceiver(Context context) {
        IntentFilter filter = new IntentFilter();
        filter.addAction(Intent.ACTION_SCREEN_ON);
        filter.addAction(Intent.ACTION_SCREEN_OFF);
        context.getApplicationContext().registerReceiver(screenReceiver, filter);
    }

    private void unregisterScreenReceiver(Context context) {
        context.getApplicationContext().unregisterReceiver(screenReceiver);
    }

    private final BroadcastReceiver screenReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (intent.getAction() != null) {
                PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    switch (intent.getAction()) {
                        case Intent.ACTION_SCREEN_ON:
                            isScreenOn = true;
                            Log.d(TAG, "Screen ON");
                            acquireWakeLock(context);
                            scheduleWork(context);
                            break;
                        case Intent.ACTION_SCREEN_OFF:
                            isScreenOn = false;
                            Log.d(TAG, "Screen OFF");
                            releaseWakeLock();
                            break;
                    }
                }
            }
        }
    };

    private void acquireWakeLock(Context context) {
        if (wakeLock == null) {
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, TAG);
                wakeLock.acquire(10 * 60 * 1000L /*10 minutes*/);
            }
        }
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
            wakeLock = null;
        }
    }

    private void scheduleWork(Context context) {
        Log.d(TAG, "Scheduling work for widget update");
        WorkManager.getInstance(context).enqueue(WidgetUpdateWorker.createWorkRequest());
    }
}
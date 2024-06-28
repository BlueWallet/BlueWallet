package io.bluewallet.bluewallet;

import android.app.Application;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.bugsnag.android.Bugsnag;
import com.facebook.react.PackageList;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactNativeHost;
import com.facebook.soloader.SoLoader;
import java.lang.reflect.InvocationTargetException;
import java.util.List;
import java.util.Timer;
import java.util.TimerTask;

public class BitcoinPriceWidget extends Application implements ReactApplication {

    private static final String TAG = "BitcoinPriceWidget";
    private static final String PREFS_NAME = "BitcoinPriceWidgetPrefs";
    private static final String PREF_PREFIX_KEY = "appwidget_";
    private static final int UPDATE_INTERVAL_MINUTES = 10; // Adjustable interval in minutes
    private Timer timer;

    private final ReactNativeHost mReactNativeHost =
            new DefaultReactNativeHost(this) {
                @Override
                public boolean getUseDeveloperSupport() {
                    return BuildConfig.DEBUG;
                }

                @Override
                protected List<ReactPackage> getPackages() {
                    @SuppressWarnings("UnnecessaryLocalVariable")
                    List<ReactPackage> packages = new PackageList(this).getPackages();
                    // Packages that cannot be autolinked yet can be added manually here, for example:
                    return packages;
                }

                @Override
                protected String getJSMainModuleName() {
                    return "index";
                }

                @Override
                protected boolean isNewArchEnabled() {
                    return BuildConfig.IS_NEW_ARCHITECTURE_ENABLED;
                }

                @Override
                protected Boolean isHermesEnabled() {
                    return BuildConfig.IS_HERMES_ENABLED;
                }
            };

    @Override
    public ReactNativeHost getReactNativeHost() {
        return mReactNativeHost;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        SoLoader.init(this, /* native exopackage */ false);

        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
            // If you opted-in for the New Architecture, we load the native entry point for this app.
            DefaultNewArchitectureEntryPoint.load();
        }

        SharedPreferences sharedPref = getApplicationContext().getSharedPreferences("group.io.bluewallet.bluewallet", Context.MODE_PRIVATE);

        // Retrieve the "donottrack" value. Default to "0" if not found.
        String isDoNotTrackEnabled = sharedPref.getString("donottrack", "0");

        // Check if do not track is not enabled and initialize Bugsnag if so
        if (!isDoNotTrackEnabled.equals("1")) {
            // Initialize Bugsnag or your error tracking here
            Bugsnag.start(this);
        }

        // Schedule the first update
        scheduleUpdate();
    }

    private void scheduleUpdate() {
        timer = new Timer();
        timer.schedule(new TimerTask() {
            @Override
            public void run() {
                // Ensure this runs on the main thread
                Handler handler = new Handler(Looper.getMainLooper());
                handler.post(() -> {
                    Context context = getApplicationContext();
                    // Trigger the update worker here
                    FetchBitcoinPriceTask fetchTask = new FetchBitcoinPriceTask(context);
                    fetchTask.run();
                });
            }
        }, 0, UPDATE_INTERVAL_MINUTES * 60 * 1000); // Update interval in milliseconds
    }

    private static class FetchBitcoinPriceTask implements Runnable {

        private final Context context;

        FetchBitcoinPriceTask(Context context) {
            this.context = context;
        }

        @Override
        public void run() {
            Log.d(TAG, "Fetching Bitcoin price...");

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
            // Update the widget with the fetched price
            // Add your implementation here
        }

        private void handleError(Context context) {
            // Handle the error
            // Add your implementation here
        }
    }
}
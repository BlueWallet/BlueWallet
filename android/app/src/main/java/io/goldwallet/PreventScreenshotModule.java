package io.goldwallet;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

import android.view.WindowManager;

import static com.facebook.react.bridge.UiThreadUtil.runOnUiThread;

public class PreventScreenshotModule extends ReactContextBaseJavaModule {
  private static final String PREVENT_SCREENSHOT_ERROR_CODE = "PREVENT_SCREENSHOT_ERROR_CODE";
  private final ReactApplicationContext reactContext;

  PreventScreenshotModule(ReactApplicationContext context) {
    super(context);
    reactContext = context;
  }

  @Override
  public String getName() {
    return "PreventScreenshotModule";
  }

  @ReactMethod
  public void forbid(Promise promise) {
    runOnUiThread(new Runnable() {
      @Override
      public void run() {
        try {
          getCurrentActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
          promise.resolve("Blocked taking screenshoots.");
        } catch(Exception e) {
          promise.reject(PREVENT_SCREENSHOT_ERROR_CODE, "Forbid screenshot taking failure.");
        }
      }
    });
  }

  @ReactMethod
  public void allow(Promise promise) {
    runOnUiThread(new Runnable() {
      @Override
      public void run() {
        try {
          getCurrentActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
          promise.resolve("Unlock taking screenshots.");
        } catch (Exception e) {
          promise.reject(PREVENT_SCREENSHOT_ERROR_CODE, "Allow screenshot taking failure.");
        }
      }
    });
  }
}
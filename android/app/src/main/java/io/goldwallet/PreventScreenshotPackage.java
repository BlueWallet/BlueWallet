package io.goldwallet;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import io.goldwallet.PreventScreenshotModule;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class PreventScreenshotPackage implements ReactPackage {

  @Override
  public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
    return Collections.emptyList();
  }

  @Override
  public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
   return Arrays.<NativeModule>asList(new PreventScreenshotModule(reactContext));
  }
}
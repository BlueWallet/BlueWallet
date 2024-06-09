package io.bluewallet.bluewallet;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.uimanager.ViewManager;
import com.facebook.react.bridge.ReactApplicationContext;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class CustomSegmentControlPackage implements ReactPackage {

  @Override
  public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
    return Collections.emptyList();
  }

  @Override
  public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
    CustomSegmentedControlManager.registerIfNecessary();
    List<ViewManager> viewManagers = new ArrayList<>();
    viewManagers.add(new CustomSegmentedControlManager());
    return viewManagers;
  }
}

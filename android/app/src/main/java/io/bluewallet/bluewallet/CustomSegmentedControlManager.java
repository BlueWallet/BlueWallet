package io.bluewallet.bluewallet;

import android.content.Context;
import android.widget.LinearLayout;
import androidx.annotation.NonNull;
import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.annotations.ReactProp;
import com.google.android.material.tabs.TabLayout;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.uimanager.events.RCTEventEmitter;
import android.util.Log;

public class CustomSegmentedControlManager extends SimpleViewManager<CustomSegmentedControlManager.CustomSegmentedControlView> {
  public static final String REACT_CLASS = "CustomSegmentedControl";
  private static boolean isRegistered = false;
  private static final String TAG = "CustomSegmentedControlManager";

  public static class CustomSegmentedControlView extends LinearLayout {
    private TabLayout tabLayout;
    private RCTEventEmitter eventEmitter;
    private int viewId;

    public CustomSegmentedControlView(Context context) {
      super(context);
      setOrientation(LinearLayout.HORIZONTAL);
      tabLayout = new TabLayout(context);
      addView(tabLayout, new LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT));

      tabLayout.addOnTabSelectedListener(new TabLayout.OnTabSelectedListener() {
        @Override
        public void onTabSelected(TabLayout.Tab tab) {
          WritableMap event = Arguments.createMap();
          event.putInt("selectedIndex", tab.getPosition());
          if (eventEmitter != null) {
            eventEmitter.receiveEvent(viewId, "topChange", event);
          }
        }

        @Override
        public void onTabUnselected(TabLayout.Tab tab) {}

        @Override
        public void onTabReselected(TabLayout.Tab tab) {}
      });
    }

    public void setValues(ReadableArray values) {
      try {
        tabLayout.removeAllTabs();
        for (int i = 0; i < values.size(); i++) {
          tabLayout.addTab(tabLayout.newTab().setText(values.getString(i)));
        }
      } catch (Exception e) {
        Log.e(TAG, "Error setting property 'values': " + e.getMessage());
      }
    }

    public void setSelectedIndex(int selectedIndex) {
      try {
        if (selectedIndex >= 0 && selectedIndex < tabLayout.getTabCount()) {
          TabLayout.Tab tab = tabLayout.getTabAt(selectedIndex);
          if (tab != null) {
            tab.select();
          }
        }
      } catch (Exception e) {
        Log.e(TAG, "Error setting property 'selectedIndex': " + e.getMessage());
      }
    }

    public void setEventEmitter(RCTEventEmitter eventEmitter, int viewId) {
      this.eventEmitter = eventEmitter;
      this.viewId = viewId;
    }
  }

  @NonNull
  @Override
  public String getName() {
    return REACT_CLASS;
  }

  @NonNull
  @Override
  protected CustomSegmentedControlView createViewInstance(@NonNull ThemedReactContext reactContext) {
    CustomSegmentedControlView view = new CustomSegmentedControlView(reactContext);
    view.setEventEmitter(reactContext.getJSModule(RCTEventEmitter.class), view.getId());
    return view;
  }

  @ReactProp(name = "values")
  public void setValues(CustomSegmentedControlView view, ReadableArray values) {
    view.setValues(values);
  }

  @ReactProp(name = "selectedIndex")
  public void setSelectedIndex(CustomSegmentedControlView view, int selectedIndex) {
    view.setSelectedIndex(selectedIndex);
  }

  public static void registerIfNecessary() {
    if (!isRegistered) {
      isRegistered = true;
      // Registration logic if necessary
    }
  }
}

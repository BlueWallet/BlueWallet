package io.bluewallet.bluewallet;

import android.content.pm.ActivityInfo;
import android.os.Bundle;
import android.os.PersistableBundle;

import androidx.annotation.Nullable;

import com.facebook.react.ReactActivity;

public class MainActivity extends ReactActivity {

    /**
     * Returns the name of the main component registered from JavaScript.
     * This is used to schedule rendering of the component.
     */
    @Override
    protected String getMainComponentName() {
        return "BlueWallet";
    }

    @Override
protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(null);
    if (getResources().getBoolean(R.bool.portrait_only)) {
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
    }
}
}

package io.bluewallet.bluewallet;

import android.app.Application;

import com.facebook.react.ReactApplication;
import com.peel.react.TcpSocketsModule;
import com.remobile.qrcodeLocalImage.RCTQRCodeLocalImagePackage;
import com.imagepicker.ImagePickerPackage;
import com.reactnativecommunity.webview.RNCWebViewPackage;
import io.sentry.RNSentryPackage;
import com.bitgo.randombytes.RandomBytesPackage;
import im.shimo.react.prompt.RNPromptPackage;
import com.BV.LinearGradient.LinearGradientPackage;
import com.mkuczera.RNReactNativeHapticFeedbackPackage;
import com.idehub.GoogleAnalyticsBridge.GoogleAnalyticsBridgePackage;
import com.swmansion.gesturehandler.react.RNGestureHandlerPackage;
import com.rnfs.RNFSPackage;
import com.learnium.RNDeviceInfo.RNDeviceInfo;
import org.reactnative.camera.RNCameraPackage;
import io.sentry.RNSentryPackage;
import com.bitgo.randombytes.RandomBytesPackage;
import im.shimo.react.prompt.RNPromptPackage;
import com.BV.LinearGradient.LinearGradientPackage;
import com.mkuczera.RNReactNativeHapticFeedbackPackage;
import com.idehub.GoogleAnalyticsBridge.GoogleAnalyticsBridgePackage;
import com.reactnativecommunity.webview.RNCWebViewPackage;
import com.oblador.vectoricons.VectorIconsPackage;
import com.horcrux.svg.SvgPackage;
import io.sentry.RNSentryPackage;
import com.bitgo.randombytes.RandomBytesPackage;
import im.shimo.react.prompt.RNPromptPackage;
import com.BV.LinearGradient.LinearGradientPackage;
import com.mkuczera.RNReactNativeHapticFeedbackPackage;
import com.idehub.GoogleAnalyticsBridge.GoogleAnalyticsBridgePackage;
import com.learnium.RNDeviceInfo.RNDeviceInfo;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;
import com.facebook.soloader.SoLoader;
import org.reactnative.camera.RNCameraPackage;
import com.swmansion.gesturehandler.react.RNGestureHandlerPackage;
import com.rnfs.RNFSPackage;

import java.util.Arrays;
import java.util.List;

public class MainApplication extends Application implements ReactApplication {

  private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
    @Override
    public boolean getUseDeveloperSupport() {
      return BuildConfig.DEBUG;
    }

    @Override
    protected List<ReactPackage> getPackages() {
      return Arrays.<ReactPackage>asList(
          new MainReactPackage(),
            new TcpSocketsModule(),
            new RCTQRCodeLocalImagePackage(),
            new ImagePickerPackage(),
            new RNCWebViewPackage(),
            new RNSentryPackage(),
            new RandomBytesPackage(),
            new RNPromptPackage(),
            new RNReactNativeHapticFeedbackPackage(),
            new GoogleAnalyticsBridgePackage(),
            new RNDeviceInfo(),
            new LinearGradientPackage(),
            new RNFSPackage() ,
            new VectorIconsPackage(),
            new SvgPackage(),
            new RNCameraPackage(),
            new RNGestureHandlerPackage()
      );
    }

    @Override
    protected String getJSMainModuleName() {
      return "index";
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
  }
}

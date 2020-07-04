import React, { useRef } from 'react';
import { WebView } from 'react-native-webview';
import { BlueNavigationStyle, SafeBlueArea } from '../../BlueComponents';
import { useRoute, useNavigation } from '@react-navigation/native';

const url = 'https://accounts.hodlhodl.com/accounts/request_access?attributes=api_key,api_signature_key';

let lastTimeIvebeenHere = 0;

const INJECTED_JAVASCRIPT = `(function() {

 window.postMessage = function (data) {
   window.ReactNativeWebView && window.ReactNativeWebView.postMessage(data);    
 }
    
})();`;

const HodlHodlLogin = props => {
  const webView = useRef();
  const route = useRoute();
  const { dismiss } = useNavigation();

  return (
    <SafeBlueArea>
      <WebView
        injectedJavaScript={INJECTED_JAVASCRIPT}
        ref={webView}
        source={{ uri: url }}
        onMessage={e => {
          // this is a handler which receives messages sent from within the browser

          if (lastTimeIvebeenHere && +new Date() - lastTimeIvebeenHere < 5000) return;
          lastTimeIvebeenHere = +new Date();
          // page can post messages several times, and that can confuse our react navigation, so we have protection
          // against that

          let json = false;
          try {
            json = JSON.parse(e.nativeEvent.data);
          } catch (_) {}

          if (json && json.allowed && json.data && json.data.api_key) {
            route.params.cb(json.data.api_key, json.data.api_signature_key);
            dismiss();
          }
        }}
      />
    </SafeBlueArea>
  );
};

HodlHodlLogin.navigationOptions = ({ navigation }) => ({
  ...BlueNavigationStyle(navigation, true),
  title: 'Login',
  headerLeft: null,
});

export default HodlHodlLogin;

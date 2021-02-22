import React, { useRef } from 'react';
import { WebView } from 'react-native-webview';
import { useRoute, useNavigation } from '@react-navigation/native';

import { SafeBlueArea } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import loc from '../../loc';

const url = 'https://accounts.hodlhodl.com/accounts/request_access?attributes=api_key,api_signature_key';

let lastTimeIvebeenHere = 0;

const INJECTED_JAVASCRIPT = `(function() {

 window.postMessage = function (data) {
   window.ReactNativeWebView && window.ReactNativeWebView.postMessage(data);
 }

})();`;

const HodlHodlLogin = () => {
  const webView = useRef();
  const { cb } = useRoute().params;
  const navigation = useNavigation();

  return (
    <SafeBlueArea>
      <WebView
        incognito
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
            cb(json.data.api_key, json.data.api_signature_key);
            navigation.dangerouslyGetParent().pop();
          }
        }}
      />
    </SafeBlueArea>
  );
};

HodlHodlLogin.navigationOptions = navigationStyle(
  {
    closeButton: true,
    headerLeft: null,
  },
  opts => ({ ...opts, title: loc.hodl.login }),
);

export default HodlHodlLogin;

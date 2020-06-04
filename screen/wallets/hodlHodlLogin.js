import React, { Component } from 'react';
import { WebView } from 'react-native-webview';
import { BlueNavigationStyle, SafeBlueArea } from '../../BlueComponents';
import PropTypes from 'prop-types';

const url = 'https://accounts.hodlhodl.com/accounts/request_access?attributes=api_key,api_signature_key';

let lastTimeIvebeenHere = 0;

const INJECTED_JAVASCRIPT = `(function() {

 window.postMessage = function (data) {
   window.ReactNativeWebView && window.ReactNativeWebView.postMessage(data);    
 }
    
})();`;

export default class HodlHodlLogin extends Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(navigation, true),
    title: 'Login',
    headerLeft: null,
  });

  constructor(props) {
    super(props);

    this.state = {
      url: url,
    };
  }

  render() {
    return (
      <SafeBlueArea>
        <WebView
          injectedJavaScript={INJECTED_JAVASCRIPT}
          ref={ref => (this.webview = ref)}
          source={{ uri: this.state.url }}
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
              this.props.route.params.cb(json.data.api_key, json.data.api_signature_key);
              this.props.navigation.pop();
            }
          }}
        />
      </SafeBlueArea>
    );
  }
}

HodlHodlLogin.propTypes = {
  route: PropTypes.shape({
    params: PropTypes.shape({
      cb: PropTypes.func.isRequired,
    }),
  }),
  navigation: PropTypes.shape({
    getParam: PropTypes.func,
    navigate: PropTypes.func,
    pop: PropTypes.func,
  }),
};

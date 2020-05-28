import React, { Component } from 'react';
import { WebView } from 'react-native-webview';
import { BlueNavigationStyle, SafeBlueArea } from '../../BlueComponents';
import PropTypes from 'prop-types';

const url = 'https://accounts.hodlhodl.com/accounts/request_access?attributes=api_key';

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
            let json = false;
            try {
              json = JSON.parse(e.nativeEvent.data);
            } catch (_) {}

            if (json && json.allowed && json.data && json.data.api_key) {
              this.props.navigation.state.params.cb(json.data.api_key);
              this.props.navigation.goBack();
            }
          }}
        />
      </SafeBlueArea>
    );
  }
}

HodlHodlLogin.propTypes = {
  navigation: PropTypes.shape({
    state: PropTypes.shape({
      params: PropTypes.shape({
        cb: PropTypes.func,
      }),
    }),
    getParam: PropTypes.func,
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
};

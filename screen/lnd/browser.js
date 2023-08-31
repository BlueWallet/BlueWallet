import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Keyboard,
  Platform,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

import { SafeBlueArea } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import Notifications from '../../blue_modules/notifications';
import loc from '../../loc';
import { Button } from 'react-native-elements';
import { BlueStorageContext } from '../../blue_modules/storage-context';

let processedInvoices = {};
let lastTimeTriedToPay = 0;

/// ///////////////////////////////////////////////////////////////////////
// this code has no use in RN, it gets copypasted in webview injected code
//
const bluewalletResponses = {};
// eslint-disable-next-line @typescript-eslint/no-unused-vars, no-var
var webln = {
  enable: function () {
    window.ReactNativeWebView.postMessage(JSON.stringify({ enable: true }));
    return new Promise(function (resolve, reject) {
      resolve(true);
    });
  },
  getInfo: function () {
    window.ReactNativeWebView.postMessage('getInfo');
    return new Promise(function (resolve, reject) {
      reject(new Error('not implemented'));
    });
  },
  sendPayment: function (paymentRequest) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ sendPayment: paymentRequest }));
    return new Promise(function (resolve, reject) {
      /* nop. intentionally, forever hang promise.
         lapp page usually asynchroniously checks payment itself, via ajax,
         so atm there's no need to pass payment preimage from RN to webview and fullfill promise.
         might change in future */
    });
  },
  makeInvoice: function (RequestInvoiceArgs) {
    var id = Math.random(); // eslint-disable-line no-var
    window.ReactNativeWebView.postMessage(JSON.stringify({ makeInvoice: RequestInvoiceArgs, id }));
    return new Promise(function (resolve, reject) {
      // eslint-disable-next-line no-var
      var interval = setInterval(function () {
        if (bluewalletResponses[id]) {
          clearInterval(interval);
          resolve(bluewalletResponses[id]);
        }
      }, 1000);
    });
  },
  signMessage: function () {
    window.ReactNativeWebView.postMessage('signMessage');
    return new Promise(function (resolve, reject) {
      reject(new Error('not implemented'));
    });
  },
  verifyMessage: function () {
    window.ReactNativeWebView.postMessage('verifyMessage');
    return new Promise(function (resolve, reject) {
      reject(new Error('not implemented'));
    });
  },
};
// end injected code
/// /////////////////
/// /////////////////

let alreadyInjected = false;
const injectedParadise = `

/* rules:
     no 'let', only 'var'
     no arrow functions
     globals without 'var'
     should work if compressed to single line
*/



/* this is a storage of responses from OUTER code (react native)
   it gets written by message bus handler callback:
   webview makes a call through bus to RN, each request with a unique ID.
   RN processes the request from the bus, and posts response to the bus, with the same ID.
   webview callback handler writes it in this hashmap. Then, some other code that patiently
   waits for a response will see that the answer with such ID is present, and will fulfill a promise */

bluewalletResponses = {};


/* this is injected WEBLN provider */


webln = {
  enable : function () {
    window.ReactNativeWebView.postMessage(JSON.stringify({'enable': true}));
    return new Promise(function(resolve, reject){
      resolve(true);
    })
  },
  getInfo : function () {
    window.ReactNativeWebView.postMessage('getInfo');
    return new Promise(function(resolve, reject){
      reject('not implemented');
    })
  },
  sendPayment: function(paymentRequest) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ sendPayment: paymentRequest }));
    return new Promise(function(resolve, reject) {
      /* nop. intentionally, forever hang promise.
         lapp page usually asynchroniously checks payment itself, via ajax,
         so atm there's no need to pass payment preimage from RN to webview and fullfill promise.
         might change in future */
    });
  },
  makeInvoice: function (RequestInvoiceArgs) {
    var id = Math.random();
    window.ReactNativeWebView.postMessage(JSON.stringify({makeInvoice: RequestInvoiceArgs, id: id}));
    return new Promise(function(resolve, reject) {
      var interval = setInterval(function () {
        if (bluewalletResponses[id]) {
          clearInterval(interval);
          resolve(bluewalletResponses[id]);
        }
      }, 1000);
    });
  },
  signMessage: function () {
    window.ReactNativeWebView.postMessage('signMessage');
    return new Promise(function(resolve, reject){
      reject('not implemented');
    })
  },
  verifyMessage: function () {
    window.ReactNativeWebView.postMessage('verifyMessage');
    return new Promise(function(resolve, reject){
      reject('not implemented');
    })
  },
};


/* end WEBLN */

/* listening to events that might come from RN: */
document.addEventListener("message", function(event) {
  window.ReactNativeWebView.postMessage("inside webview, received post message: " + event.detail);
  var json;
  try {
    json = JSON.parse(event.detail);
  } catch (_) {}

  if (json && json.bluewalletResponse) {
    /* this is an answer to one of our inside-webview calls.
       we store it in answers hashmap for someone who cares about it */
    bluewalletResponses[json.id] = json.bluewalletResponse
  }

}, false);




function tryToPay(invoice) {
  window.ReactNativeWebView.postMessage(JSON.stringify({sendPayment:invoice}));
}

/* for non-webln compatible pages we do it oldschool,
   searching for all bolt11 manually */

setInterval(function() {
window.ReactNativeWebView.postMessage('interval');

  var searchText = "lnbc";

  var aTags = document.getElementsByTagName("span");
  var i;
  for (i = 0; i < aTags.length; i++) {
    if (aTags[i].textContent.indexOf(searchText) === 0) {
      tryToPay(aTags[i].textContent);
    }
  }

  /* ------------------------- */

  aTags = document.getElementsByTagName("input");
  for (i = 0; i < aTags.length; i++) {
    if (aTags[i].value.indexOf(searchText) === 0) {
      tryToPay(aTags[i].value);
    }
  }

  /* ------------------------- */

  aTags = document.getElementsByTagName("a");
  searchText = "lightning:lnbc";


  for (i = 0; i < aTags.length; i++) {
    var href = aTags[i].getAttribute('href') + '';
    if (href.indexOf(searchText) === 0) {
      tryToPay(href.replace('lightning:', ''));
    }
  }

}, 1000);

           `;

const styles = StyleSheet.create({
  safeRoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  safeURL: {
    flex: 1,
    marginHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeURLTextWrap: {
    flexDirection: 'row',
    borderColor: '#d2d2d2',
    borderBottomColor: '#d2d2d2',
    borderWidth: 1.0,
    borderBottomWidth: 0.5,
    backgroundColor: '#f5f5f5',
    minHeight: 44,
    height: 44,
    alignItems: 'center',
    marginVertical: 8,
    borderRadius: 4,
  },
  safeURLText: {
    flex: 1,
    marginLeft: 4,
    minHeight: 33,
    color: '#81868e',
  },
  safeURLHome: {
    alignContent: 'flex-end',
    height: 44,
    flexDirection: 'row',
    marginHorizontal: 8,
  },
  sync: {
    color: 'red',
    backgroundColor: 'transparent',
    paddingLeft: 15,
  },
  activity: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 20,
    alignContent: 'center',
  },
  goBack: {
    backgroundColor: 'transparent',
    paddingLeft: 10,
  },
  colorRed: {
    color: 'red',
  },
  // eslint-disable-next-line react-native/no-unused-styles
  colorGray: {
    color: 'gray',
  },
  transparent: {
    backgroundColor: 'transparent',
  },
  colorGreen: {
    color: 'green',
  },
});

export default class Browser extends Component {
  webView = React.createRef();
  constructor(props, context) {
    super(props);
    if (!props.route.params.walletID) throw new Error('Missing walletID param');
    let url;
    if (props.route.params.url) url = props.route.params.url;

    this.state = {
      url: url || 'https://www.duckduckgo.com/',
      fromWallet: context.wallets.find(w => w.getID() === props.route.params.walletID),
      canGoBack: false,
      pageIsLoading: false,
      stateURL: url || 'https://www.duckduckgo.com/',
    };
    BackHandler.addEventListener('hardwareBackPress', this.handleBackButton.bind(this));
  }

  componentWillUnmount = () => {
    BackHandler.removeEventListener('hardwareBackPress', this.handleBackButton.bind(this));
  };

  handleBackButton() {
    this.state.canGoBack ? this.webView.current?.goBack() : this.props.navigation.goBack(null);
    return true;
  }

  _onNavigationStateChange = webViewState => {
    this.setState({ canGoBack: webViewState.canGoBack, stateURL: webViewState.url });
  };

  renderWebView = () => {
    return (
      <WebView
        onNavigationStateChange={this._onNavigationStateChange}
        ref={this.webView}
        source={{ uri: this.state.url }}
        onMessage={e => {
          // this is a handler which receives messages sent from within the browser
          console.log('---- message from the bus:', e.nativeEvent.data);
          let json = false;
          try {
            json = JSON.parse(e.nativeEvent.data);
          } catch (_) {}
          // message from browser has ln invoice
          if (json && json.sendPayment) {
            // checking that already asked about this invoice:
            if (processedInvoices[json.sendPayment]) {
              return;
            } else {
              // checking that we do not trigger alert too often:
              if (+new Date() - lastTimeTriedToPay < 3000) {
                return;
              }
              lastTimeTriedToPay = +new Date();
              //
              processedInvoices[json.sendPayment] = 1;
            }

            Alert.alert(
              'Page',
              'This page asks for permission to pay an invoice',
              [
                { text: 'Cancel', onPress: () => console.log('Cancel Pressed'), style: 'cancel' },
                {
                  text: 'Pay',
                  onPress: () => {
                    console.log('OK Pressed');
                    this.props.navigation.navigate('ScanLndInvoiceRoot', {
                      screen: 'ScanLndInvoice',
                      params: {
                        uri: json.sendPayment,
                        walletID: this.state.fromWallet.getID(),
                      },
                    });
                  },
                },
              ],
              { cancelable: false },
            );
          }

          if (json && json.makeInvoice) {
            const amount = Math.max(
              json.makeInvoice.minimumAmount || 0,
              json.makeInvoice.maximumAmount || 0,
              json.makeInvoice.defaultAmount || 0,
              json.makeInvoice.amount || 0,
            );
            Alert.alert(
              'Page',
              'This page wants to pay you ' + amount + ' sats (' + json.makeInvoice.defaultMemo + ')',
              [
                { text: 'No thanks', onPress: () => console.log('Cancel Pressed'), style: 'cancel' },
                {
                  text: 'Accept',
                  onPress: async () => {
                    /** @type {LightningCustodianWallet} */
                    const fromWallet = this.state.fromWallet;
                    const payreq = await fromWallet.addInvoice(amount, json.makeInvoice.defaultMemo || ' ');
                    // this.webView.postMessage(JSON.stringify({ bluewalletResponse: { paymentRequest: payreq }, id: json.id }));
                    // Since webview.postMessage is removed from webview, we inject javascript that will manually triger document
                    // event; note how data is passed in 'detail', not 'data'
                    const jsonstr = JSON.stringify({ bluewalletResponse: { paymentRequest: payreq }, id: json.id });
                    this.webView.current?.injectJavaScript(
                      "document.dispatchEvent( new CustomEvent('message', { detail: '" + jsonstr + "' }) );",
                    );

                    // lets decode payreq and subscribe groundcontrol so we can receive push notification when our invoice is paid
                    const decoded = await fromWallet.decodeInvoice(payreq);
                    await Notifications.tryToObtainPermissions();
                    Notifications.majorTomToGroundControl([], [decoded.payment_hash], []);
                  },
                },
              ],
              { cancelable: false },
            );
          }

          if (json && json.enable) {
            console.log('webln enabled');
            this.setState({ weblnEnabled: true });
          }
        }}
        onLoadStart={e => {
          alreadyInjected = false;
          console.log('load start');
          this.setState({ pageIsLoading: true, weblnEnabled: false });
        }}
        onLoadEnd={e => {
          console.log('load end');
          this.setState({ url: e.nativeEvent.url, pageIsLoading: false });
        }}
        onLoadProgress={e => {
          console.log('progress:', e.nativeEvent.progress);
          if (!alreadyInjected && e.nativeEvent.progress > 0.5) {
            this.webView.current?.injectJavaScript(injectedParadise);
            alreadyInjected = true;
            console.log('injected');
          }
        }}
      />
    );
  };

  render() {
    return (
      <SafeBlueArea>
        <View style={styles.safeRoot}>
          <StatusBar barStyle="default" />

          <Button
            icon={{
              type: 'ionicon',
              name: 'arrow-back-outline',
              size: 36,
              color: this.state.canGoBack ? styles.colorRed.color : styles.colorGray.color,
            }}
            type="clear"
            disabled={!this.state.canGoBack}
            style={styles.goBack}
            onPress={() => this.webView.current?.goBack()}
          />

          <View style={styles.safeURL}>
            <View style={styles.safeURLTextWrap}>
              <TextInput
                onChangeText={text => this.setState({ stateURL: text })}
                value={this.state.stateURL}
                numberOfLines={1}
                placeholderTextColor="#81868e"
                style={styles.safeURLText}
                editable
                textContentType="URL"
                keyboardType="url"
                autoCorrect={false}
                autoCapitalize="none"
                onSubmitEditing={() => {
                  Keyboard.dismiss();
                  let url = this.state.stateURL;
                  if (!url.toLowerCase().startsWith('http://') && !url.toLowerCase().startsWith('https://')) {
                    url = 'https://' + url;
                  }
                  this.setState({ url });
                }}
              />
            </View>
          </View>
          <View style={styles.safeURLHome}>
            {Platform.OS !== 'ios' && ( // on iOS lappbrowser opens blank page, thus, no HOME button
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => {
                  processedInvoices = {};
                  this.setState({ url: 'https://www.duckduckgo.com/' });
                }}
              >
                <Ionicons
                  name="ios-home"
                  size={36}
                  style={[styles.transparent, this.state.weblnEnabled ? styles.colorGreen : styles.colorRed]}
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => {
                this.webView.current?.reload();
              }}
            >
              {!this.state.pageIsLoading ? (
                <Ionicons name="ios-sync" size={36} style={styles.sync} />
              ) : (
                <View style={styles.activity}>
                  <ActivityIndicator />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
        {this.renderWebView()}
      </SafeBlueArea>
    );
  }
}

Browser.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
  route: PropTypes.shape({
    params: PropTypes.object,
  }),
};

Browser.contextType = BlueStorageContext;

Browser.navigationOptions = navigationStyle(
  {
    headerHideBackButton: true,
    closeButton: true,
  },
  opts => ({ ...opts, title: loc.wallets.list_ln_browser }),
);

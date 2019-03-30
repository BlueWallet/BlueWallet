import React, { Component } from 'react';
import { TouchableOpacity, ActivityIndicator, TextInput, Keyboard, BackHandler, View, Platform, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import WKWebView from 'react-native-wkwebview-reborn';
import { BlueNavigationStyle, SafeBlueArea } from '../../BlueComponents';
import Ionicons from 'react-native-vector-icons/Ionicons';
import PropTypes from 'prop-types';

let processedInvoices = {};
let lastTimeTriedToPay = 0;

/// ///////////////////////////////////////////////////////////////////////
// this code has no use in RN, it gets copypasted in webview injected code
//
let bluewalletResponses = {};
// eslint-disable-next-line
var webln = {
  enable: function() {
    window.ReactNativeWebView.postMessage(JSON.stringify({ enable: true }));
    return new Promise(function(resolve, reject) {
      resolve(true);
    });
  },
  getInfo: function() {
    window.ReactNativeWebView.postMessage('getInfo');
    return new Promise(function(resolve, reject) {
      reject(new Error('not implemented'));
    });
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
  makeInvoice: function(RequestInvoiceArgs) {
    var id = Math.random();
    window.ReactNativeWebView.postMessage(JSON.stringify({ makeInvoice: RequestInvoiceArgs, id: id }));
    return new Promise(function(resolve, reject) {
      var interval = setInterval(function() {
        if (bluewalletResponses[id]) {
          clearInterval(interval);
          resolve(bluewalletResponses[id]);
        }
      }, 1000);
    });
  },
  signMessage: function() {
    window.ReactNativeWebView.postMessage('signMessage');
    return new Promise(function(resolve, reject) {
      reject(new Error('not implemented'));
    });
  },
  verifyMessage: function() {
    window.ReactNativeWebView.postMessage('verifyMessage');
    return new Promise(function(resolve, reject) {
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
	window.ReactNativeWebView.postMessage("inside webview, received post message: " + event.data);
	var json;
	try {
		json = JSON.parse(event.data);
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

export default class Browser extends Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(navigation, true),
    title: 'Lapp Browser',
    headerLeft: null,
  });

  constructor(props) {
    super(props);
    if (!props.navigation.getParam('fromSecret')) throw new Error('Invalid param');
    if (!props.navigation.getParam('fromWallet')) throw new Error('Invalid param');

    this.state = {
      url: 'https://bluewallet.io/marketplace/',
      fromSecret: props.navigation.getParam('fromSecret'),
      fromWallet: props.navigation.getParam('fromWallet'),
      canGoBack: false,
      pageIsLoading: false,
      stateURL: 'https://bluewallet.io/marketplace/',
    };
    BackHandler.addEventListener('hardwareBackPress', this.handleBackButton.bind(this));
  }

  componentWillUnmount = () => {
    BackHandler.removeEventListener('hardwareBackPress', this.handleBackButton.bind(this));
  };

  handleBackButton() {
    this.state.canGoBack ? this.webview.goBack() : this.props.navigation.goBack(null);
    return true;
  }

  _onNavigationStateChange = webViewState => {
    this.setState({ canGoBack: webViewState.canGoBack, stateURL: webViewState.url });
  };

  renderWebView = () => {
    if (Platform.OS === 'android') {
      return (
        <WebView
          onNavigationStateChange={this._onNavigationStateChange}
          ref={ref => (this.webview = ref)}
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
                      this.props.navigation.navigate({
                        routeName: 'ScanLndInvoice',
                        params: {
                          uri: json.sendPayment,
                          fromSecret: this.state.fromSecret,
                        },
                      });
                    },
                  },
                ],
                { cancelable: false },
              );
            }

            if (json && json.makeInvoice) {
              let amount = Math.max(+json.makeInvoice.minimumAmount, +json.makeInvoice.maximumAmount, +json.makeInvoice.defaultAmount);
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
                      this.webview.postMessage(JSON.stringify({ bluewalletResponse: { paymentRequest: payreq }, id: json.id }));
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
              this.webview.injectJavaScript(injectedParadise);
              alreadyInjected = true;
              console.log('injected');
            }
          }}
        />
      );
    } else if (Platform.OS === 'ios') {
      return (
        <WKWebView
          ref={ref => (this.webview = ref)}
          source={{ uri: this.state.url }}
          injectJavaScript={injectedParadise}
          onNavigationStateChange={this._onNavigationStateChange}
          onMessage={e => {
            // this is a handler which receives messages sent from within the browser
            console.log('---- message from the bus:', e.nativeEvent.data);
            let json = false;
            try {
              json = JSON.parse(e.nativeEvent.data);
            } catch (_) {}
            // message from browser has ln invoice
            if (json && json.sendPayment) {
              // checking that we do not trigger alert too often:
              if (+new Date() - lastTimeTriedToPay < 3000) {
                return;
              }
              lastTimeTriedToPay = +new Date();

              // checking that already asked about this invoice:
              if (processedInvoices[json.sendPayment]) {
                return;
              } else {
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
                      this.props.navigation.navigate({
                        routeName: 'ScanLndInvoice',
                        params: {
                          uri: json.sendPayment,
                          fromSecret: this.state.fromSecret,
                        },
                      });
                    },
                  },
                ],
                { cancelable: false },
              );
            }

            if (json && json.makeInvoice) {
              let amount = Math.max(+json.makeInvoice.minimumAmount, +json.makeInvoice.maximumAmount, +json.makeInvoice.defaultAmount);
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
                      this.webview.postMessage(JSON.stringify({ bluewalletResponse: { paymentRequest: payreq }, id: json.id }));
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
        />
      );
    }
  };
  render() {
    return (
      <SafeBlueArea>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
          <TouchableOpacity
            disabled={!this.state.canGoBack}
            onPress={() => {
              this.webview.goBack();
            }}
            style={{ marginHorizontal: 8 }}
          >
            <Ionicons
              name={'ios-arrow-round-back'}
              size={36}
              style={{
                color: this.state.canGoBack ? 'red' : 'gray',
                backgroundColor: 'transparent',
                paddingLeft: 10,
              }}
            />
          </TouchableOpacity>

          <View style={{ flex: 1, marginHorizontal: 8, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
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
              }}
            >
              <TextInput
                onChangeText={text => this.setState({ stateURL: text })}
                value={this.state.stateURL}
                numberOfLines={1}
                style={{ flex: 1, marginLeft: 4, minHeight: 33 }}
                editable={false}
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>
          </View>
          <View style={{ alignContent: 'flex-end', height: 44, flexDirection: 'row', marginHorizontal: 8 }}>
            <TouchableOpacity
              onPress={() => {
                processedInvoices = {};
                this.setState({ url: 'https://bluewallet.io/marketplace/' });
              }}
            >
              <Ionicons
                name={'ios-home'}
                size={36}
                style={{
                  color: this.state.weblnEnabled ? 'green' : 'red',
                  backgroundColor: 'transparent',
                }}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                let reloadUrl = this.state.url;
                this.setState({ url: 'about:blank' });
                processedInvoices = {};
                setTimeout(() => this.setState({ url: reloadUrl }), 500);
                // this.webview.reload();
              }}
            >
              {!this.state.pageIsLoading ? (
                <Ionicons
                  name={'ios-sync'}
                  size={36}
                  style={{
                    color: 'red',
                    backgroundColor: 'transparent',
                    paddingLeft: 15,
                  }}
                />
              ) : (
                <View style={{ flex: 1, justifyContent: 'center', paddingLeft: 20, alignContent: 'center' }}>
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
    getParam: PropTypes.func,
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
};

import React, { Component } from 'react';
import { TouchableOpacity, ActivityIndicator, View, Alert, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { BlueNavigationStyle, SafeBlueArea } from '../../BlueComponents';
import { FormInput } from 'react-native-elements';
import Ionicons from 'react-native-vector-icons/Ionicons';
import PropTypes from 'prop-types';
const { width } = Dimensions.get('window');

let processedInvoices = {};
let lastTimeTriedToPay = 0;

/// ///////////////////////////////////////////////////////////////////////
// this code has no use in RN, it gets copypasted in webview injected code
//
let bluewalletResponses = {};
// eslint-disable-next-line
let webln = {
  enable: function() {
    window.postMessage('enable');
    return new Promise(function(resolve, reject) {
      resolve(true);
    });
  },

  getInfo: function() {
    window.postMessage('getInfo');
    return new Promise(function(resolve, reject) {
      reject(new Error('not implemented'));
    });
  },

  sendPayment: function(paymentRequest) {
    window.postMessage(JSON.stringify({ sendPayment: paymentRequest }));
    return new Promise(function(resolve, reject) {
      // nop. intentionally, forever hang promise.
      // lapp page usually asynchroniously checks payment itself, via ajax,
      // so atm there's no need to pass payment preimage from RN to webview and fullfill promise.
      // might change in future
    });
  },

  makeInvoice: function(RequestInvoiceArgs) {
    let id = Math.random();
    window.postMessage(JSON.stringify({ makeInvoice: RequestInvoiceArgs, id: id }));
    return new Promise(function(resolve, reject) {
      let interval = setInterval(() => {
        if (bluewalletResponses[id]) {
          clearInterval(interval);
          resolve(bluewalletResponses[id]);
        }
      }, 1000);
    });
  },

  signMessage: function() {
    window.postMessage('signMessage');
    return new Promise(function(resolve, reject) {
      reject(new Error('not implemented'));
    });
  },

  verifyMessage: function() {
    window.postMessage('verifyMessage');
    return new Promise(function(resolve, reject) {
      reject(new Error('not implemented'));
    });
  },
};
// end injected code
/// /////////////////
/// /////////////////

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
      pageIsLoading: false,
      fromSecret: props.navigation.getParam('fromSecret'),
      fromWallet: props.navigation.getParam('fromWallet'),
    };
  }

  render() {
    return (
      <SafeBlueArea>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => {
              this.webview.goBack();
            }}
          >
            <Ionicons
              name={'ios-arrow-round-back'}
              size={36}
              style={{
                color: 'red',
                backgroundColor: 'transparent',
                paddingLeft: 10,
              }}
            />
          </TouchableOpacity>

          <FormInput
            inputStyle={{ color: '#0c2550', maxWidth: width - 150, fontSize: 16 }}
            containerStyle={{
              maxWidth: width - 150,
              borderColor: '#d2d2d2',
              borderWidth: 0.5,
              backgroundColor: '#f5f5f5',
            }}
            value={this.state.url}
          />

          <TouchableOpacity
            onPress={() => {
              this.setState({ url: 'https://bluewallet.io/marketplace/' });
            }}
          >
            <Ionicons
              name={'ios-home'}
              size={36}
              style={{
                color: 'red',
                backgroundColor: 'transparent',
              }}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              this.webview.reload();
            }}
          >
            {(!this.state.pageIsLoading && (
              <Ionicons
                name={'ios-sync'}
                size={36}
                style={{
                  color: 'red',
                  backgroundColor: 'transparent',
                  paddingLeft: 15,
                }}
              />
            )) || (
              <View style={{ paddingLeft: 20 }}>
                <ActivityIndicator />
              </View>
            )}
          </TouchableOpacity>
        </View>

        <WebView
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
              Alert.alert('Page', 'This page wants to pay you ' + amount + ' sats (' + json.makeInvoice.defaultMemo + ')', [
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
              ]);
            }
          }}
          onLoadStart={e => {
            this.setState({ pageIsLoading: true });
          }}
          onLoadEnd={e => {
            this.setState({ url: e.nativeEvent.url, pageIsLoading: false });

            this.webview.injectJavaScript(`

// this is a storage of responses from OUTER code (react native)
// it gets written by message bus handler callback:
// webview makes a call through bus to RN, each request with a unique ID.
// RN processes the request from the bus, and posts response to the bus, with the same ID.
// webview callback handler writes it in this hashmap. Then, some other code that patiently
// waits for a response will see that the answer with such ID is present, and will fulfill a promise

bluewalletResponses = {};


// this is injected WEBLN provider


webln = {

  enable : function () {
    window.postMessage('enable');
    return new Promise(function(resolve, reject){
      resolve(true);
    })
  },

  getInfo : function () {
    window.postMessage('getInfo');
    return new Promise(function(resolve, reject){
      reject('not implemented');
    })
  },

  sendPayment: function(paymentRequest) {
    window.postMessage(JSON.stringify({ sendPayment: paymentRequest }));
    return new Promise(function(resolve, reject) {
      // nop. intentionally, forever hang promise.
      // lapp page usually asynchroniously checks payment itself, via ajax,
      // so atm there's no need to pass payment preimage from RN to webview and fullfill promise.
      // might change in future
    });
  },

  makeInvoice: function (RequestInvoiceArgs) {
    let id = Math.random();
    window.postMessage(JSON.stringify({makeInvoice: RequestInvoiceArgs, id: id}));
    return new Promise(function(resolve, reject) {
      let interval = setInterval(() => {
        if (bluewalletResponses[id]) {
          clearInterval(interval);
          resolve(bluewalletResponses[id]);
        }
      }, 1000);
    });
  },

  signMessage: function () {
    window.postMessage('signMessage');
    return new Promise(function(resolve, reject){
      reject('not implemented');
    })
  },

  verifyMessage: function () {
    window.postMessage('verifyMessage');
    return new Promise(function(resolve, reject){
      reject('not implemented');
    })
  },
};


// end WEBLN

// listening to events that might come from RN:
document.addEventListener("message", function(event) {
    window.postMessage("inside webview, received post message: " + event.data);
    let json;
    try {
      json = JSON.parse(event.data);
    } catch (_) {}

    if (json && json.bluewalletResponse) {
      // this is an answer to one of our inside-webview calls.
      // we store it in answers hashmap for someone who cares about it
      bluewalletResponses[json.id] = json.bluewalletResponse
    }

    logMessage(event.data);
}, false);




            function tryToPay(invoice) {
              window.postMessage(JSON.stringify({sendPayment:invoice}));
            }

            // for non-webln compatible pages we do it oldschool,
            // searching for all bolt11 manually

	          setInterval(function() {

	            var searchText = "lnbc";

	            var aTags = document.getElementsByTagName("span");
							for (var i = 0; i < aTags.length; i++) {
							  if (aTags[i].textContent.indexOf(searchText) === 0) {
							    tryToPay(aTags[i].textContent);
							  }
							}

							//////////////////////////////////

							var aTags = document.getElementsByTagName("input");

							for (var i = 0; i < aTags.length; i++) {
							  if (aTags[i].value.indexOf(searchText) === 0) {
							    tryToPay(aTags[i].value);
							  }
							}

							//////////////////////////////////

							var aTags = document.getElementsByTagName("a");
							var searchText = "lightning:lnbc";

							for (var i = 0; i < aTags.length; i++) {
							  let href = aTags[i].getAttribute('href') + '';
							  if (href.indexOf(searchText) === 0) {
							    tryToPay(href.replace('lightning:', ''));
							  }
							}

	          }, 1000);
	         `);
          }}
        />
      </SafeBlueArea>
    );
  }
}

Browser.propTypes = {
  navigation: PropTypes.shape({
    getParam: PropTypes.function,
    navigate: PropTypes.func,
  }),
};

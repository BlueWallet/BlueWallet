import React, { Component } from 'react';
import { View, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { BlueNavigationStyle } from '../../BlueComponents';
import { FormInput } from 'react-native-elements';
import Ionicons from 'react-native-vector-icons/Ionicons';
import PropTypes from 'prop-types';

export default class Browser extends Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(navigation, true),
    title: 'Lapp Browser',
    headerLeft: null,
  });

  constructor(props) {
    super(props);
    this.state = { url: '' };
  }

  render() {
    return (
      <React.Fragment>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons
            onPress={() => {
              this.webview.goBack();
            }}
            name={'ios-arrow-round-back'}
            size={26}
            style={{
              color: 'red',
              backgroundColor: 'transparent',
              minWidth:36,
              paddingLeft:10,
              left: 8,
              top: 1,
            }}
          />

          <FormInput
            inputStyle={{ color: '#0c2550', maxWidth: 300, fontSize: 16 }}
            containerStyle={{
              borderColor: '#d2d2d2',
              borderWidth: 0.5,
              backgroundColor: '#f5f5f5',
            }}
            value={this.state.url}
          />

          <Ionicons
            onPress={() => {
              this.webview.reload();
            }}
            name={'ios-sync'}
            size={26}
            style={{
              color: 'red',
              backgroundColor: 'transparent',
              left: 8,
              top: 1,
            }}
          />
        </View>

        <WebView
          ref={ref => (this.webview = ref)}
          source={{ uri: 'https://bluewallet.io/marketplace/' }}
          onMessage={e => {
            // this is a handler which receives messages sent from within the browser
            let json = false;
            try {
              json = JSON.parse(e.nativeEvent.data);
            } catch (_) {}
            // message from browser has ln invoice
            if (json && json.pay) {
              Alert.alert(
                'Page',
                'This page asks for permission to pay this invoice',
                [
                  { text: 'Cancel', onPress: () => console.log('Cancel Pressed'), style: 'cancel' },
                  {
                    text: 'Pay',
                    onPress: () => {
                      console.log('OK Pressed');
                      this.props.navigation.navigate({
                        routeName: 'ScanLndInvoice',
                        params: {
                          uri: json.pay,
                        },
                      });
                    },
                  },
                ],
                { cancelable: false },
              );
            }
          }}
          onLoadEnd={e => {
            this.setState({ url: e.nativeEvent.url });

            this.webview.injectJavaScript(`

            lastTimeTriedToPay = 0;
            function tryToPay(invoice) {
              if (+new Date() - lastTimeTriedToPay >= 3000) {
                window.postMessage(JSON.stringify({pay:invoice}));
                lastTimeTriedToPay = +new Date();
              }
            }



	          setInterval(function(){

	            var searchText = "lnbc";

	            var aTags = document.getElementsByTagName("span");
							for (var i = 0; i < aTags.length; i++) {
							  if (aTags[i].textContent.indexOf(searchText) === 0) {
							    tryToPay(aTags[i].textContent);
							    aTags[i].replaceWith('Invoice intercepted by BlueWallet');
							    break;
							  }
							}


							//////////////////////////////////
							//////////////////////////////////
							//////////////////////////////////


							var aTags = document.getElementsByTagName("input");

							for (var i = 0; i < aTags.length; i++) {
							  if (aTags[i].value.indexOf(searchText) === 0) {
							    tryToPay(aTags[i].value);
							    aTags[i].replaceWith('Invoice intercepted by BlueWallet');
							    break;
							  }
							}



							//////////////////////////////////
							//////////////////////////////////
							//////////////////////////////////


							var aTags = document.getElementsByTagName("a");
							var searchText = "lightning:lnbc";

							for (var i = 0; i < aTags.length; i++) {
							  let href = aTags[i].getAttribute('href') + '';
							  if (href.indexOf(searchText) === 0) {
							    tryToPay(href.replace('lightning:', ''));
							    aTags[i].replaceWith('Invoice intercepted by BlueWallet');
							    break;
							  }
							}

	          }, 1000);
	         `);
          }}
        />
      </React.Fragment>
    );
  }
}

Browser.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
  }),
};

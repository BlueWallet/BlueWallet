import React, { Component } from 'react';
import { Dimensions, Platform, ActivityIndicator, View, Clipboard, Animated, TouchableOpacity } from 'react-native';
import { QRCode as QRSlow } from 'react-native-custom-qr-codes';
import { BlueSpacing40, SafeBlueArea, BlueCard, BlueText, BlueNavigationStyle } from '../../BlueComponents';
import PropTypes from 'prop-types';
const QRFast = require('react-native-qrcode');
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');
const { height, width } = Dimensions.get('window');
const aspectRatio = height / width;
let isIpad;
if (aspectRatio > 1.6) {
  isIpad = false;
} else {
  isIpad = true;
}

export default class WalletXpub extends Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(navigation, true),
    title: loc.wallets.xpub.title,
    headerLeft: null,
  });

  constructor(props) {
    super(props);

    let secret = props.navigation.state.params.secret;
    let wallet;

    for (let w of BlueApp.getWallets()) {
      if (w.getSecret() === secret) {
        // found our wallet
        wallet = w;
      }
    }

    this.state = {
      isLoading: true,
      wallet,
      xpub: wallet.getXpub(),
      xpubText: wallet.getXpub(),
    };
  }

  async componentDidMount() {
    this.setState({
      isLoading: false,
      showQr: false,
    });

    setTimeout(() => {
      this.setState({ showQr: true });
    }, 1000);
  }

  determineSize = () => {
    if (width > 312) {
      return width - 48;
    }
    return 312;
  };

  copyToClipboard = () => {
    this.setState({ xpubText: loc.wallets.xpub.copiedToClipboard }, () => {
      Clipboard.setString(this.state.xpub);
      setTimeout(() => this.setState({ xpubText: this.state.xpub }), 1000);
    });
  };

  render() {
    if (this.state.isLoading) {
      return (
        <View style={{ flex: 1, paddingTop: 20 }}>
          <ActivityIndicator />
        </View>
      );
    }

    return (
      <SafeBlueArea style={{ flex: 1, paddingTop: 20 }}>
        {isIpad && <BlueSpacing40 />}
        <BlueCard style={{ alignItems: 'center', flex: 1 }}>
          <View>
            <BlueText>{this.state.wallet.typeReadable}</BlueText>
          </View>

          {(() => {
            if (this.state.showQr) {
              if (Platform.OS === 'ios' || this.state.xpub.length < 54) {
                return (
                  <QRSlow
                    content={this.state.xpub}
                    size={this.determineSize()}
                    color={BlueApp.settings.foregroundColor}
                    backgroundColor={BlueApp.settings.brandingColor}
                    logo={require('../../img/qr-code.png')}
                    ecl={'Q'}
                  />
                );
              } else {
                return (
                  <QRFast
                    value={this.state.xpub}
                    size={this.determineSize()}
                    fgColor={BlueApp.settings.brandingColor}
                    bgColor={BlueApp.settings.foregroundColor}
                  />
                );
              }
            } else {
              return (
                <View>
                  <ActivityIndicator />
                </View>
              );
            }
          })()}

          <TouchableOpacity onPress={this.copyToClipboard}>
            <Animated.Text style={{ marginVertical: 8, textAlign: 'center' }} numberOfLines={0}>
              {this.state.xpubText}
            </Animated.Text>
          </TouchableOpacity>
        </BlueCard>
      </SafeBlueArea>
    );
  }
}

WalletXpub.propTypes = {
  navigation: PropTypes.shape({
    state: PropTypes.shape({
      params: PropTypes.shape({
        secret: PropTypes.string,
      }),
    }),
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
};

import React, { Component } from 'react';
import { Dimensions, Platform, ActivityIndicator, View, Clipboard, Animated, TouchableOpacity } from 'react-native';
import { QRCode as QRSlow } from 'react-native-custom-qr-codes';
import { BlueSpacing20, SafeBlueArea, BlueText, BlueNavigationStyle } from '../../BlueComponents';
import PropTypes from 'prop-types';
const QRFast = require('react-native-qrcode');
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');
const { height, width } = Dimensions.get('window');

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
      qrCodeHeight: height > width ? width - 40 : width / 2,
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

  copyToClipboard = () => {
    this.setState({ xpubText: loc.wallets.xpub.copiedToClipboard }, () => {
      Clipboard.setString(this.state.xpub);
      setTimeout(() => this.setState({ xpubText: this.state.xpub }), 1000);
    });
  };

  onLayout = () => {
    const { height } = Dimensions.get('window');
    this.setState({ qrCodeHeight: height > width ? width - 40 : width / 2 });
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
        <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }} onLayout={this.onLayout}>
          <View>
            <BlueText>{this.state.wallet.typeReadable}</BlueText>
          </View>
          <BlueSpacing20 />

          {(() => {
            if (this.state.showQr) {
              if (Platform.OS === 'ios' || this.state.xpub.length < 54) {
                return (
                  <QRSlow
                    content={this.state.xpub}
                    color={BlueApp.settings.foregroundColor}
                    backgroundColor={BlueApp.settings.brandingColor}
                    logo={require('../../img/qr-code.png')}
                    size={this.state.qrCodeHeight}
                    ecl={'H'}
                  />
                );
              } else {
                return (
                  <QRFast
                    value={this.state.xpub}
                    fgColor={BlueApp.settings.brandingColor}
                    bgColor={BlueApp.settings.foregroundColor}
                    size={this.state.qrCodeHeight}
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
          <BlueSpacing20 />
          <TouchableOpacity onPress={this.copyToClipboard}>
            <Animated.Text style={{ paddingHorizontal: 8, textAlign: 'center' }} numberOfLines={0}>
              {this.state.xpubText}
            </Animated.Text>
          </TouchableOpacity>
        </View>
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

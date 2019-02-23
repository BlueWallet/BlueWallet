import React, { Component } from 'react';
import { Dimensions, ActivityIndicator, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { BlueSpacing20, SafeBlueArea, BlueText, BlueNavigationStyle, BlueCopyTextToClipboard } from '../../BlueComponents';
import PropTypes from 'prop-types';
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
              return (
                <QRCode
                  value={this.state.xpub}
                  logo={require('../../img/qr-code.png')}
                  size={this.state.qrCodeHeight}
                  logoSize={90}
                  color={BlueApp.settings.foregroundColor}
                  logoBackgroundColor={BlueApp.settings.brandingColor}
                  ecl={'H'}
                />
              );
            } else {
              return (
                <View>
                  <ActivityIndicator />
                </View>
              );
            }
          })()}
          <BlueSpacing20 />
          <BlueCopyTextToClipboard text={this.state.xpubText} />
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

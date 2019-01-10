import React, { Component } from 'react';
import { Dimensions, Platform, ActivityIndicator, View } from 'react-native';
import { QRCode as QRSlow } from 'react-native-custom-qr-codes';
import { BlueSpacing20, SafeBlueArea, BlueNavigationStyle, BlueText } from '../../BlueComponents';
import PropTypes from 'prop-types';
const QRFast = require('react-native-qrcode');
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');
const { height, width } = Dimensions.get('window');

export default class WalletExport extends Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(navigation, true),
    title: loc.wallets.export.title,
    headerLeft: null,
  });

  constructor(props) {
    super(props);

    let address = props.navigation.state.params.address;
    let secret = props.navigation.state.params.secret;
    let wallet;
    for (let w of BlueApp.getWallets()) {
      if ((address && w.getAddress() === address) || w.getSecret() === secret) {
        // found our wallet
        wallet = w;
      }
    }

    this.state = {
      isLoading: true,
      qrCodeHeight: height > width ? width - 40 : width / 2,
      wallet,
    };
  }

  componentDidMount() {
    this.setState({
      isLoading: false,
      showQr: false,
    });

    let that = this;
    setTimeout(function() {
      that.setState({ showQr: true });
    }, 1000);
  }

  onLayout = () => {
    const { height } = Dimensions.get('window');
    this.setState({ qrCodeHeight: height > width ? width - 40 : width / 2 });
  };

  render() {
    if (this.state.isLoading) {
      return (
        <View style={{ flex: 1, paddingTop: 20 }} onLayout={this.onLayout}>
          <ActivityIndicator />
        </View>
      );
    }

    return (
      <SafeBlueArea style={{ flex: 1, paddingTop: 20 }}>
        <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: 0 }} onLayout={this.onLayout}>
          <View>
            <BlueText>{this.state.wallet.typeReadable}</BlueText>
          </View>

          {(() => {
            if (this.state.wallet.getAddress()) {
              return (
                <View>
                  <BlueText>{this.state.wallet.getAddress()}</BlueText>
                </View>
              );
            }
          })()}
          <BlueSpacing20 />
          {(() => {
            if (this.state.showQr) {
              if (Platform.OS === 'ios' || this.state.wallet.getSecret().length < 54) {
                return (
                  <QRSlow
                    content={this.state.wallet.getSecret()}
                    size={this.state.qrCodeHeight}
                    color={BlueApp.settings.foregroundColor}
                    backgroundColor={BlueApp.settings.brandingColor}
                    logo={require('../../img/qr-code.png')}
                    ecl={'H'}
                  />
                );
              } else {
                return (
                  <QRFast
                    value={this.state.wallet.getSecret()}
                    size={this.state.qrCodeHeight}
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
          <BlueSpacing20 />

          <BlueText style={{ alignItems: 'center', paddingHorizontal: 8 }}>{this.state.wallet.getSecret()}</BlueText>
        </View>
      </SafeBlueArea>
    );
  }
}

WalletExport.propTypes = {
  navigation: PropTypes.shape({
    state: PropTypes.shape({
      params: PropTypes.shape({
        address: PropTypes.string,
        secret: PropTypes.string,
      }),
    }),
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
};

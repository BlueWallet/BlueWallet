import React, { Component } from 'react';
import { Dimensions, Platform, ActivityIndicator, View } from 'react-native';
import { QRCode as QRSlow } from 'react-native-custom-qr-codes';
import { BlueSpacing40, SafeBlueArea, BlueNavigationStyle, BlueCard, BlueText } from '../../BlueComponents';
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
      wallet,
    };
  }

  async componentDidMount() {
    this.setState({
      isLoading: false,
      showQr: false,
    });

    let that = this;
    setTimeout(function() {
      that.setState({ showQr: true });
    }, 1000);
  }

  determineSize = () => {
    if (width > 312) {
      return width - 48;
    }
    return 312;
  };

  render() {
    if (this.state.isLoading) {
      return (
        <View style={{ flex: 1, paddingTop: 20 }}>
          <ActivityIndicator />
        </View>
      );
    }

    /*

          <BlueText style={{marginBottom: 10}}>
            WIF stands for Wallet Import Format. Backup your WIF (also shown on QR) in a safe place.
          </BlueText>

          <Divider style={{ backgroundColor: '#ebebeb', marginBottom:20, }} />

    */

    return (
      <SafeBlueArea style={{ flex: 1, paddingTop: 20 }}>
        {(() => {
          if (isIpad) {
            return <BlueSpacing40 />;
          }
        })()}
        <BlueCard style={{ alignItems: 'center', flex: 1 }}>
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

          {(() => {
            if (this.state.showQr) {
              if (Platform.OS === 'ios' || this.state.wallet.getSecret().length < 54) {
                return (
                  <QRSlow
                    content={this.state.wallet.getSecret()}
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
                    value={this.state.wallet.getSecret()}
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

          <BlueText style={{ marginVertical: 8 }}>{this.state.wallet.getSecret()}</BlueText>
        </BlueCard>
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

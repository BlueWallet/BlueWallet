import React, { Component } from 'react';
import { Dimensions, ActivityIndicator, View } from 'react-native';
import QRCode from 'react-native-qrcode';
import {
  BlueSpacing,
  BlueSpacing40,
  SafeBlueArea,
  BlueCard,
  BlueText,
  BlueHeaderDefaultSub,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
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
  static navigationOptions = {
    tabBarVisible: false,
  };

  constructor(props) {
    super(props);

    let address = props.navigation.state.params.address;
    let wallet;

    for (let w of BlueApp.getWallets()) {
      if (w.getAddress() === address) {
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
    });
  }

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
          } else {
            return <BlueSpacing />;
          }
        })()}
        <BlueHeaderDefaultSub
          leftText={loc.wallets.export.title}
          onClose={() => this.props.navigation.goBack()}
        />

        <BlueCard style={{ alignItems: 'center', flex: 1 }}>
          <BlueText>{this.state.wallet.getAddress()}</BlueText>
          <QRCode
            value={this.state.wallet.getSecret()}
            size={312}
            bgColor={BlueApp.settings.foregroundColor}
            fgColor={BlueApp.settings.brandingColor}
          />
          <BlueText>
            {this.state.wallet.getSecret()} [Wallet Import Format]
          </BlueText>
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
      }),
    }),
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
};

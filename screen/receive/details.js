import React, { Component } from 'react';
import { View, Share } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import bip21 from 'bip21';
import {
  BlueLoading,
  SafeBlueArea,
  BlueCopyTextToClipboard,
  BlueButton,
  BlueButtonLink,
  BlueNavigationStyle,
  is,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');
// let EV = require('../../events');

export default class ReceiveDetails extends Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(navigation, true),
    title: loc.receive.header,
    headerLeft: null,
  });

  constructor(props) {
    super(props);
    let address = props.navigation.state.params.address;
    let secret = props.navigation.state.params.secret;

    this.state = {
      isLoading: true,
      address: address,
      secret: secret,
      addressText: '',
    };

    // EV(EV.enum.RECEIVE_ADDRESS_CHANGED, this.redrawScreen.bind(this));
  }

  /*  redrawScreen(newAddress) {
    console.log('newAddress =', newAddress);
    this.setState({
      address: newAddress,
    });
  } */

  async componentDidMount() {
    console.log('receive/details - componentDidMount');

    /**  @type {AbstractWallet}   */
    let wallet;
    let address = this.state.address;
    for (let w of BlueApp.getWallets()) {
      if ((address && w.getAddress() === this.state.address) || w.getSecret() === this.state.secret) {
        // found our wallet
        wallet = w;
      }
    }

    if (wallet && wallet.getAddressAsync) {
      setTimeout(async () => {
        address = await wallet.getAddressAsync();
        BlueApp.saveToDisk(); // caching whatever getAddressAsync() generated internally
        this.setState({
          address: address,
          addressText: address,
          isLoading: false,
        });
      }, 1);
    } else {
      this.setState({
        isLoading: false,
        address,
        addressText: address,
      });
    }
  }

  render() {
    if (this.state.isLoading) {
      return <BlueLoading />;
    }

    return (
      <SafeBlueArea style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
            <QRCode
              value={bip21.encode(this.state.address)}
              logo={require('../../img/qr-code.png')}
              size={(is.ipad() && 300) || 300}
              logoSize={90}
              color={BlueApp.settings.foregroundColor}
              logoBackgroundColor={BlueApp.settings.brandingColor}
            />
            <BlueCopyTextToClipboard text={this.state.addressText} />
          </View>
          <View style={{ flex: 0.2, marginBottom: 24, alignItems: 'center' }}>
            <BlueButtonLink
              title={loc.receive.details.setAmount}
              onPress={() => {
                this.props.navigation.navigate('ReceiveAmount', {
                  address: this.state.address,
                });
              }}
            />
            <BlueButton
              icon={{
                name: 'share-alternative',
                type: 'entypo',
                color: BlueApp.settings.buttonTextColor,
              }}
              onPress={async () => {
                Share.share({
                  message: this.state.address,
                });
              }}
              title={loc.receive.details.share}
            />
          </View>
        </View>
      </SafeBlueArea>
    );
  }
}

ReceiveDetails.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func,
    navigate: PropTypes.func,
    state: PropTypes.shape({
      params: PropTypes.shape({
        address: PropTypes.string,
        secret: PropTypes.string,
      }),
    }),
  }),
};

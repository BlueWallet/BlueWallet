/* global alert */
import React, { Component } from 'react';
import { View, Share, InteractionManager } from 'react-native';
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
import Privacy from '../../Privacy';
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
      address: address,
      secret: secret,
      addressText: '',
      bip21encoded: undefined,
    };
  }

  async componentDidMount() {
    Privacy.enableBlur();
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
    if (wallet) {
      if (wallet.getAddressAsync) {
        address = await wallet.getAddressAsync();
      }
      BlueApp.saveToDisk(); // caching whatever getAddressAsync() generated internally
      this.setState({
        address: address,
        addressText: address,
      });
    } else {
      alert('There was a problem obtaining your receive address. Please, try again.');
      this.props.navigation.goBack();
      this.setState({
        address,
        addressText: address,
      });
    }

    InteractionManager.runAfterInteractions(async () => {
      const bip21encoded = bip21.encode(this.state.address);
      this.setState({ bip21encoded });
    });
  }

  componentWillUnmount() {
    Privacy.disableBlur();
  }

  render() {
    return (
      <SafeBlueArea style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'space-between' }}>
          <View style={{ marginTop: 32, alignItems: 'center', paddingHorizontal: 16 }}>
            {this.state.bip21encoded === undefined ? (
              <BlueLoading />
            ) : (
              <QRCode
                value={this.state.bip21encoded}
                logo={require('../../img/qr-code.png')}
                size={(is.ipad() && 300) || 300}
                logoSize={90}
                color={BlueApp.settings.foregroundColor}
                logoBackgroundColor={BlueApp.settings.brandingColor}
                ecl={'H'}
              />
            )}
          </View>
          <View style={{ alignItems: 'center', alignContent: 'flex-end', marginBottom: 24 }}>
            <BlueCopyTextToClipboard text={this.state.addressText} />
            <BlueButtonLink
              title={loc.receive.details.setAmount}
              onPress={() => {
                this.props.navigation.navigate('ReceiveAmount', {
                  address: this.state.address,
                });
              }}
            />
            <View>
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

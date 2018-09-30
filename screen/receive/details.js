import React, { Component } from 'react';
import { Animated, StyleSheet, View, TouchableOpacity, Clipboard, Share } from 'react-native';
import QRCode from 'react-native-qrcode';
import { BlueLoading, SafeBlueArea, BlueButton, BlueHeaderDefaultSub, is } from '../../BlueComponents';
import PropTypes from 'prop-types';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');
// let EV = require('../../events');

export default class ReceiveDetails extends Component {
  static navigationOptions = {
    header: ({ navigation }) => {
      return <BlueHeaderDefaultSub leftText={loc.receive.header.toLowerCase()} onClose={() => navigation.goBack(null)} />;
    },
  };

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

    // EV(EV.enum.RECEIVE_ADDRESS_CHANGED, this.refreshFunction.bind(this));
  }

  /*  refreshFunction(newAddress) {
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

  copyToClipboard = () => {
    this.setState({ addressText: loc.receive.details.copiedToClipboard }, () => {
      Clipboard.setString(this.state.address);
      setTimeout(() => this.setState({ addressText: this.state.address }), 1000);
    });
  };

  render() {
    console.log('render() receive/details, address,secret=', this.state.address, ',', this.state.secret);
    if (this.state.isLoading) {
      return <BlueLoading />;
    }

    return (
      <SafeBlueArea style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <QRCode
              value={this.state.address}
              size={(is.ipad() && 300) || 300}
              bgColor={BlueApp.settings.foregroundColor}
              fgColor={BlueApp.settings.brandingColor}
            />
            <TouchableOpacity onPress={this.copyToClipboard}>
              <Animated.Text style={styles.address} numberOfLines={0}>
                {this.state.addressText}
              </Animated.Text>
            </TouchableOpacity>
          </View>
          <View style={{ marginBottom: 24 }}>
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

const styles = StyleSheet.create({
  address: {
    marginVertical: 32,
    fontSize: 15,
    color: '#9aa0aa',
  },
});

ReceiveDetails.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.function,
    state: PropTypes.shape({
      params: PropTypes.shape({
        address: PropTypes.string,
        secret: PropTypes.string,
      }),
    }),
  }),
};

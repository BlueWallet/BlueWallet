import React, { Component } from 'react';
import { Animated, StyleSheet, View, TouchableOpacity, Clipboard, Share, TextInput, KeyboardAvoidingView } from 'react-native';
import { QRCode } from 'react-native-custom-qr-codes';
import bip21 from 'bip21';
import { BlueLoading, SafeBlueArea, BlueButton, BlueNavigationStyle, is } from '../../BlueComponents';
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
      amount: undefined,
      label: undefined,
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

  setAmount = value => {
    if (!value || parseFloat(value) <= 0) {
      this.setState({ amount: undefined });
    } else {
      this.setState({ amount: value });
    }
  };

  setLabel = text => {
    if (!text) {
      this.setState({ label: undefined });
    } else {
      this.setState({ label: text });
    }
  };

  render() {
    console.log('render() receive/details, address,secret=', this.state.address, ',', this.state.secret);
    if (this.state.isLoading) {
      return <BlueLoading />;
    }

    const { amount, label } = this.state;

    return (
      <SafeBlueArea style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'space-between', alignItems: 'center' }}>
          <KeyboardAvoidingView behavior="position">
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
              <QRCode
                content={bip21.encode(this.state.address, { amount, label })}
                size={(is.ipad() && 300) || 300}
                color={BlueApp.settings.foregroundColor}
                backgroundColor={BlueApp.settings.brandingColor}
                logo={require('../../img/qr-code.png')}
              />
              <TouchableOpacity onPress={this.copyToClipboard}>
                <Animated.Text style={styles.address} numberOfLines={0}>
                  {this.state.addressText}
                </Animated.Text>
              </TouchableOpacity>
              <View
                style={{
                  flexDirection: 'row',
                  borderColor: '#d2d2d2',
                  borderBottomColor: '#d2d2d2',
                  borderWidth: 1.0,
                  borderBottomWidth: 0.5,
                  backgroundColor: '#f5f5f5',
                  minHeight: 44,
                  height: 44,
                  marginHorizontal: 20,
                  alignItems: 'center',
                  marginVertical: 8,
                  borderRadius: 4,
                  width: '100%',
                }}
              >
                <TextInput
                  onChangeText={this.setLabel}
                  placeholder={loc.receive.details.label}
                  value={this.state.label}
                  numberOfLines={1}
                  style={{ flex: 1, marginHorizontal: 8, minHeight: 33 }}
                  editable={!this.state.isLoading}
                />
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  borderColor: '#d2d2d2',
                  borderBottomColor: '#d2d2d2',
                  borderWidth: 1.0,
                  borderBottomWidth: 0.5,
                  backgroundColor: '#f5f5f5',
                  minHeight: 44,
                  height: 44,
                  marginHorizontal: 20,
                  alignItems: 'center',
                  marginVertical: 8,
                  borderRadius: 4,
                  width: '100%',
                }}
              >
                <TextInput
                  onChangeText={this.setAmount}
                  placeholder={loc.receive.details.amount}
                  value={this.state.amount}
                  numberOfLines={1}
                  style={{ flex: 1, marginHorizontal: 8, minHeight: 33 }}
                  editable={!this.state.isLoading}
                  keyboardType="numeric"
                />
              </View>
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
          </KeyboardAvoidingView>
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
    textAlign: 'center',
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

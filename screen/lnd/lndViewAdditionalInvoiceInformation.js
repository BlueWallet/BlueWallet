/* global alert */
import React, { Component } from 'react';
import { Animated, StyleSheet, View, TouchableOpacity, Clipboard, Share } from 'react-native';
import { BlueLoading, SafeBlueArea, BlueButton, BlueNavigationStyle, BlueText, BlueSpacing20 } from '../../BlueComponents';
import PropTypes from 'prop-types';
import { QRCode } from 'react-native-custom-qr-codes';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
const loc = require('../../loc');

export default class LNDViewAdditionalInvoiceInformation extends Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(navigation, true, () => navigation.dismiss()),
    title: 'Additional Information',
  });

  state = { walletInfo: undefined };

  copyToClipboard = () => {
    this.setState({ addressText: loc.receive.details.copiedToClipboard }, () => {
      Clipboard.setString(this.state.walletInfo.uris[0]);
      setTimeout(() => this.setState({ addressText: this.state.walletInfo.uris[0] }), 1000);
    });
  };

  async componentDidMount() {
    const fromWallet = this.props.navigation.getParam('fromWallet');
    try {
      await fromWallet.fetchInfo();
    } catch (_) {
      alert('Network error');
      return;
    }
    this.setState({ walletInfo: fromWallet.info_raw, addressText: fromWallet.info_raw.uris[0] });
  }

  render() {
    if (typeof this.state.walletInfo === 'undefined') {
      return (
        <SafeBlueArea style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <BlueLoading />
        </SafeBlueArea>
      );
    }

    return (
      <SafeBlueArea style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
            <QRCode
              content={this.state.walletInfo.uris[0]}
              size={300}
              color={BlueApp.settings.foregroundColor}
              backgroundColor={BlueApp.settings.brandingColor}
              logo={require('../../img/qr-code.png')}
            />
            <BlueSpacing20 />
            <BlueText>Open direct channel with this node:</BlueText>
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
                  message: this.state.walletInfo.uris[0],
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
    textAlign: 'center',
  },
});

LNDViewAdditionalInvoiceInformation.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.function,
    getParam: PropTypes.function,
    dismiss: PropTypes.function,
  }),
};

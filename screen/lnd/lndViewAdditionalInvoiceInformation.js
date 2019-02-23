/* global alert */
import React, { Component } from 'react';
import { View, Share } from 'react-native';
import {
  BlueLoading,
  BlueCopyTextToClipboard,
  SafeBlueArea,
  BlueButton,
  BlueNavigationStyle,
  BlueText,
  BlueSpacing20,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
import QRCode from 'react-native-qrcode-svg';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
const loc = require('../../loc');

export default class LNDViewAdditionalInvoiceInformation extends Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(),
    title: 'Additional Information',
  });

  state = { walletInfo: undefined };

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
              value={this.state.walletInfo.uris[0]}
              logo={require('../../img/qr-code.png')}
              size={300}
              logoSize={90}
              color={BlueApp.settings.foregroundColor}
              logoBackgroundColor={BlueApp.settings.brandingColor}
            />
            <BlueSpacing20 />
            <BlueText>Open direct channel with this node:</BlueText>
            <BlueCopyTextToClipboard text={this.state.walletInfo.uris[0]} />
          </View>
          <View style={{ marginBottom: 25 }}>
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

LNDViewAdditionalInvoiceInformation.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func,
    getParam: PropTypes.func,
    dismiss: PropTypes.func,
  }),
};

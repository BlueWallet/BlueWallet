/* global alert */
import React, { Component } from 'react';
import { View, Share, StyleSheet } from 'react-native';
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

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  root: {
    flex: 1,
  },
  wrapper: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qrcode: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  share: {
    marginBottom: 25,
  },
});

export default class LNDViewAdditionalInvoiceInformation extends Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(),
    title: 'Additional Information',
  });

  state = { walletInfo: undefined };

  async componentDidMount() {
    const fromWallet = this.props.route.params.fromWallet;
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
        <SafeBlueArea style={styles.loading}>
          <BlueLoading />
        </SafeBlueArea>
      );
    }

    return (
      <SafeBlueArea style={styles.root}>
        <View style={styles.wrapper}>
          <View style={styles.qrcode}>
            <QRCode
              value={this.state.walletInfo.uris[0]}
              logo={require('../../img/qr-code.png')}
              size={300}
              logoSize={90}
              color={BlueApp.settings.foregroundColor}
              logoBackgroundColor={BlueApp.settings.brandingColor}
            />
            <BlueSpacing20 />
            <BlueText>{loc.lndViewInvoice.open_direct_channel}</BlueText>
            <BlueCopyTextToClipboard text={this.state.walletInfo.uris[0]} />
          </View>
          <View style={styles.share}>
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
  route: PropTypes.shape({
    params: PropTypes.object,
  }),
};

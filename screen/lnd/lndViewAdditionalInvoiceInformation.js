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
import loc from '../../loc';
import { BlueCurrentTheme } from '../../components/themes';

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BlueCurrentTheme.colors.elevated,
  },
  root: {
    flex: 1,
    backgroundColor: BlueCurrentTheme.colors.elevated,
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
  state = { walletInfo: undefined };

  async componentDidMount() {
    const fromWallet = this.props.route.params.fromWallet;
    try {
      await fromWallet.fetchInfo();
    } catch (_) {
      alert(loc.errors.network);
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
              color={BlueCurrentTheme.colors.foregroundColor}
              logoBackgroundColor={BlueCurrentTheme.colors.brandingColor}
              backgroundColor={BlueCurrentTheme.colors.background}
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
                color: BlueCurrentTheme.colors.buttonTextColor,
              }}
              onPress={async () => {
                Share.share({
                  message: this.state.walletInfo.uris[0],
                });
              }}
              title={loc.receive.details_share}
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

LNDViewAdditionalInvoiceInformation.navigationOptions = ({ navigation }) => ({
  ...BlueNavigationStyle(),
  title: 'Additional Information',
});

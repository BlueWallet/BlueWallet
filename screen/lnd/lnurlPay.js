/* global alert */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from 'react-native-elements';

import {
  BlueButton,
  BlueCard,
  BlueDismissKeyboardInputAccessory,
  BlueLoading,
  BlueSpacing20,
  BlueText,
  SafeBlueArea,
} from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import AmountInput from '../../components/AmountInput';
import { BlueCurrentTheme } from '../../components/themes';
import Lnurl from '../../class/lnurl';
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import loc, { formatBalanceWithoutSuffix } from '../../loc';
import Biometric from '../../class/biometrics';
import { BlueStorageContext } from '../../blue_modules/storage-context';
const currency = require('../../blue_modules/currency');

export default class LnurlPay extends Component {
  static contextType = BlueStorageContext;

  constructor(props, context) {
    super(props);
    const fromWalletID = props.route.params.fromWalletID;
    const lnurl = props.route.params.lnurl;

    const fromWallet = context.wallets.find(w => w.getID() === fromWalletID);

    this.state = {
      isLoading: true,
      fromWalletID,
      fromWallet,
      lnurl,
      payButtonDisabled: false,
    };
  }

  async componentDidMount() {
    const LN = new Lnurl(this.state.lnurl, AsyncStorage);
    const payload = await LN.callLnurlPayService();

    this.setState({
      payload,
      amount: payload.min,
      isLoading: false,
      unit: BitcoinUnit.SATS,
      LN,
    });
  }

  onWalletSelect = wallet => {
    this.setState({ fromWallet: wallet, fromWalletID: wallet.getID() }, () => {
      this.props.navigation.pop();
    });
  };

  pay = async () => {
    this.setState({
      payButtonDisabled: true,
    });
    /** @type {Lnurl} */
    const LN = this.state.LN;

    const isBiometricsEnabled = await Biometric.isBiometricUseCapableAndEnabled();
    if (isBiometricsEnabled) {
      if (!(await Biometric.unlockWithBiometrics())) {
        return;
      }
    }

    let amountSats = this.state.amount;
    switch (this.state.unit) {
      case BitcoinUnit.SATS:
        amountSats = parseInt(amountSats); // nop
        break;
      case BitcoinUnit.BTC:
        amountSats = currency.btcToSatoshi(amountSats);
        break;
      case BitcoinUnit.LOCAL_CURRENCY:
        amountSats = currency.btcToSatoshi(currency.fiatToBTC(amountSats));
        break;
    }

    /** @type {LightningCustodianWallet} */
    const fromWallet = this.state.fromWallet;

    let bolt11payload;
    try {
      bolt11payload = await LN.requestBolt11FromLnurlPayService(amountSats);
      await fromWallet.payInvoice(bolt11payload.pr);
      const decoded = fromWallet.decodeInvoice(bolt11payload.pr);
      this.setState({ payButtonDisabled: false });

      // success, probably
      ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
      if (fromWallet.last_paid_invoice_result && fromWallet.last_paid_invoice_result.payment_preimage) {
        await LN.storeSuccess(decoded.payment_hash, fromWallet.last_paid_invoice_result.payment_preimage);
      }

      this.props.navigation.navigate('ScanLndInvoiceRoot', {
        screen: 'LnurlPaySuccess',
        params: {
          paymentHash: decoded.payment_hash,
          justPaid: true,
          fromWalletID: this.state.fromWalletID,
        },
      });
    } catch (Err) {
      console.log(Err.message);
      this.setState({ isLoading: false, payButtonDisabled: false });
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
      return alert(Err.message);
    }
  };

  renderWalletSelectionButton = () => {
    if (this.state.renderWalletSelectionButtonHidden) return;
    return (
      <View style={styles.walletSelectRoot}>
        {!this.state.isLoading && (
          <TouchableOpacity
            style={styles.walletSelectTouch}
            onPress={() =>
              this.props.navigation.navigate('SelectWallet', { onWalletSelect: this.onWalletSelect, chainType: Chain.OFFCHAIN })
            }
          >
            <Text style={styles.walletSelectText}>{loc.wallets.select_wallet.toLowerCase()}</Text>
            <Icon name="angle-right" size={18} type="font-awesome" color="#9aa0aa" />
          </TouchableOpacity>
        )}
        <View style={styles.walletWrap}>
          <TouchableOpacity
            style={styles.walletWrapTouch}
            onPress={() =>
              this.props.navigation.navigate('SelectWallet', { onWalletSelect: this.onWalletSelect, chainType: Chain.OFFCHAIN })
            }
          >
            <Text style={styles.walletWrapLabel}>{this.state.fromWallet.getLabel()}</Text>
            <Text style={styles.walletWrapBalance}>
              {formatBalanceWithoutSuffix(this.state.fromWallet.getBalance(), BitcoinUnit.SATS, false)}
            </Text>
            <Text style={styles.walletWrapSats}>{BitcoinUnit.SATS}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  renderGotPayload() {
    return (
      <SafeBlueArea style={styles.root}>
        <ScrollView>
          <BlueCard>
            <AmountInput
              isLoading={this.state.isLoading}
              amount={this.state.amount.toString()}
              onAmountUnitChange={unit => {
                this.setState({ unit });
              }}
              onChangeText={text => {
                this.setState({ amount: text });
              }}
              disabled={this.state.payload && this.state.payload.fixed}
              unit={this.state.unit}
              inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
            />
            <BlueText style={styles.alignSelfCenter}>
              please pay between {this.state.payload.min} and {this.state.payload.max} sat
            </BlueText>
            <BlueSpacing20 />
            {this.state.payload.image && <Image style={styles.img} source={{ uri: this.state.payload.image }} />}
            <BlueText style={styles.alignSelfCenter}>{this.state.payload.description}</BlueText>
            <BlueText style={styles.alignSelfCenter}>{this.state.payload.domain}</BlueText>
            <BlueSpacing20 />
            <BlueButton title={loc.lnd.payButton} onPress={this.pay} disabled={this.state.payButtonDisabled} />
            <BlueSpacing20 />
            {this.renderWalletSelectionButton()}
          </BlueCard>
        </ScrollView>
      </SafeBlueArea>
    );
  }

  render() {
    if (this.state.isLoading) {
      return (
        <View style={styles.root}>
          <BlueLoading />
        </View>
      );
    }

    return this.renderGotPayload();
  }
}

LnurlPay.propTypes = {
  route: PropTypes.shape({
    params: PropTypes.shape({
      fromWalletID: PropTypes.string.isRequired,
      lnurl: PropTypes.string.isRequired,
    }),
  }),
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    pop: PropTypes.func,
    dangerouslyGetParent: PropTypes.func,
  }),
};

const styles = StyleSheet.create({
  img: { width: 200, height: 200, alignSelf: 'center' },
  alignSelfCenter: {
    alignSelf: 'center',
  },
  root: {
    flex: 1,
    backgroundColor: BlueCurrentTheme.colors.background,
  },
  walletSelectRoot: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  walletSelectTouch: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletSelectText: {
    color: '#9aa0aa',
    fontSize: 14,
    marginRight: 8,
  },
  walletWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  walletWrapTouch: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletWrapLabel: {
    color: BlueCurrentTheme.colors.buttonAlternativeTextColor,
    fontSize: 14,
  },
  walletWrapBalance: {
    color: BlueCurrentTheme.colors.buttonAlternativeTextColor,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
    marginRight: 4,
  },
  walletWrapSats: {
    color: BlueCurrentTheme.colors.buttonAlternativeTextColor,
    fontSize: 11,
    fontWeight: '600',
    textAlignVertical: 'bottom',
    marginTop: 2,
  },
});

LnurlPay.navigationOptions = navigationStyle({
  title: '',
  closeButton: true,
  closeButtonFunc: ({ navigation }) => navigation.dangerouslyGetParent().popToTop(),
  headerLeft: null,
});

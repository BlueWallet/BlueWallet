/* global alert */
import React, { Component } from 'react';
import { ActivityIndicator, FlatList, TouchableOpacity, StyleSheet, Switch, View } from 'react-native';
import { Text } from 'react-native-elements';
import { PayjoinClient } from 'payjoin-client';
import PayjoinWallet from '../../class/payjoin-wallet';
import { BlueButton, BlueText, SafeBlueArea, BlueCard, BlueSpacing40, BlueNavigationStyle } from '../../BlueComponents';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import PropTypes from 'prop-types';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Biometric from '../../class/biometrics';
import {
  HDLegacyElectrumSeedP2PKHWallet,
  HDLegacyP2PKHWallet,
  HDSegwitBech32Wallet,
  HDSegwitP2SHWallet,
  HDLegacyBreadwalletWallet,
  LegacyWallet,
  SegwitP2SHWallet,
  SegwitBech32Wallet,
} from '../../class';
let loc = require('../../loc');
let EV = require('../../events');
let currency = require('../../currency');
let BlueElectrum = require('../../BlueElectrum');
let Bignumber = require('bignumber.js');
/** @type {AppStorage} */
const BlueApp = require('../../BlueApp');

export default class Confirm extends Component {
  static navigationOptions = () => ({
    ...BlueNavigationStyle(null, false),
    title: loc.send.confirm.header,
  });

  constructor(props) {
    super(props);

    this.state = {
      isLoading: false,
      fee: props.navigation.getParam('fee'),
      feeSatoshi: new Bignumber(props.navigation.getParam('fee')).multipliedBy(100000000).toNumber(),
      memo: props.navigation.getParam('memo'),
      recipients: props.navigation.getParam('recipients'),
      size: Math.round(props.navigation.getParam('tx').length / 2),
      tx: props.navigation.getParam('tx'),
      satoshiPerByte: props.navigation.getParam('satoshiPerByte'),
      fromWallet: props.navigation.getParam('fromWallet'),
      isPayjoinEnabled: false,
      payjoinUrl: props.navigation.getParam('payjoinUrl'),
      psbt: props.navigation.getParam('psbt'),
    };
  }

  async componentDidMount() {
    console.log('send/confirm - componentDidMount');
    console.log('address = ', this.state.recipients);
    this.isBiometricUseCapableAndEnabled = await Biometric.isBiometricUseCapableAndEnabled();
  }

  send() {
    this.setState({ isLoading: true }, async () => {
      try {
        if (!this.state.isPayjoinEnabled) {
          this.broadcast(this.state.tx);
        } else {
          const wallet = new PayjoinWallet(this.state.psbt, txHex => this.broadcast(txHex), this.state.fromWallet);
          const payjoinClient = new PayjoinClient({
            wallet,
            payjoinUrl: this.state.payjoinUrl,
          });
          await payjoinClient.run();
        }

        EV(EV.enum.REMOTE_TRANSACTIONS_COUNT_CHANGED); // someone should fetch txs
        let amount = 0;
        const recipients = this.state.recipients;
        if (recipients[0].amount === BitcoinUnit.MAX || !recipients[0].amount) {
          amount = this.state.fromWallet.getBalance() - this.state.feeSatoshi;
        } else {
          for (const recipient of recipients) {
            amount += recipient.amount ? +recipient.amount : recipient.value;
          }
        }

        // wallets that support new createTransaction() instead of deprecated createTx()
        if (
          [
            HDSegwitBech32Wallet.type,
            HDSegwitP2SHWallet.type,
            HDLegacyP2PKHWallet.type,
            HDLegacyBreadwalletWallet.type,
            HDLegacyElectrumSeedP2PKHWallet.type,
            LegacyWallet.type,
            SegwitP2SHWallet.type,
            SegwitBech32Wallet.type,
          ].includes(this.state.fromWallet.type)
        ) {
          amount = loc.formatBalanceWithoutSuffix(amount, BitcoinUnit.BTC, false);
        }

        this.props.navigation.navigate('Success', {
          fee: Number(this.state.fee),
          amount,
          dismissModal: () => this.props.navigation.dismiss(),
        });

        this.setState({ isLoading: false });
      } catch (error) {
        // TODO: Make sure we don't display error messages directly from PJ server
        // here. It's a phishing attack vector!
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
        this.setState({ isLoading: false });
        alert(error.message);
      }
    });
  }

  async broadcast(tx) {
    await BlueElectrum.ping();
    await BlueElectrum.waitTillConnected();

    if (this.isBiometricUseCapableAndEnabled) {
      if (!(await Biometric.unlockWithBiometrics())) {
        return;
      }
    }

    let result = await this.state.fromWallet.broadcastTx(tx);
    if (!result) {
      throw new Error(`Broadcast failed`);
    }

    return result;
  }

  _renderItem = ({ index, item }) => {
    return (
      <>
        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
          <Text
            testID={'TransactionValue'}
            style={{
              color: '#0f5cc0',
              fontSize: 36,
              fontWeight: '600',
            }}
          >
            {!item.value || item.value === BitcoinUnit.MAX
              ? currency.satoshiToBTC(this.state.fromWallet.getBalance() - this.state.feeSatoshi)
              : item.amount || currency.satoshiToBTC(item.value)}
          </Text>
          <Text
            style={{
              color: '#0f5cc0',
              fontSize: 16,
              marginHorizontal: 4,
              paddingBottom: 6,
              fontWeight: '600',
              alignSelf: 'flex-end',
            }}
          >
            {' ' + BitcoinUnit.BTC}
          </Text>
        </View>
        <BlueCard>
          <Text style={styles.transactionDetailsTitle}>{loc.send.create.to}</Text>
          <Text style={styles.transactionDetailsSubtitle}>{item.address}</Text>
        </BlueCard>
        {this.state.recipients.length > 1 && (
          <BlueText style={{ alignSelf: 'flex-end', marginRight: 18, marginVertical: 8 }}>
            {index + 1} of {this.state.recipients.length}
          </BlueText>
        )}
      </>
    );
  };

  renderSeparator = () => {
    return <View style={{ backgroundColor: BlueApp.settings.inputBorderColor, height: 0.5, margin: 16 }} />;
  };

  render() {
    return (
      <SafeBlueArea style={{ flex: 1, paddingTop: 19 }}>
        <View style={{ marginTop: 16, alignItems: 'center', justifyContent: 'space-between' }}>
          <FlatList
            scrollEnabled={this.state.recipients.length > 1}
            extraData={this.state.recipients}
            data={this.state.recipients}
            renderItem={this._renderItem}
            keyExtractor={(_item, index) => `${index}`}
            ItemSeparatorComponent={this.renderSeparator}
            style={{ maxHeight: '55%' }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'center', paddingTop: 16, paddingBottom: 16 }}>
            <BlueCard>
              <Text
                style={{
                  color: '#37c0a1',
                  fontSize: 14,
                  marginHorizontal: 4,
                  paddingBottom: 6,
                  fontWeight: '500',
                  alignSelf: 'center',
                }}
              >
                {loc.send.create.fee}: {loc.formatBalance(this.state.feeSatoshi, BitcoinUnit.BTC)} (
                {currency.satoshiToLocalCurrency(this.state.feeSatoshi)})
              </Text>
              <BlueSpacing40 />
              {!!this.state.payjoinUrl && (
                <View
                  style={{
                    flexDirection: 'row',
                    marginHorizontal: 20,
                    marginBottom: 10,
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#81868e', fontSize: 14 }}>Payjoin</Text>
                  <Switch
                    value={this.state.isPayjoinEnabled}
                    onValueChange={value => this.setState({ isPayjoinEnabled: value })}
                    disabled={!this.state.payjoinUrl}
                  />
                </View>
              )}
              {this.state.isLoading ? <ActivityIndicator /> : <BlueButton onPress={() => this.send()} title={loc.send.confirm.sendNow} />}

              <TouchableOpacity
                testID={'TransactionDetailsButton'}
                style={{ marginVertical: 24 }}
                onPress={async () => {
                  if (this.isBiometricUseCapableAndEnabled) {
                    if (!(await Biometric.unlockWithBiometrics())) {
                      return;
                    }
                  }

                  this.props.navigation.navigate('CreateTransaction', {
                    fee: this.state.fee,
                    recipients: this.state.recipients,
                    memo: this.state.memo,
                    tx: this.state.tx,
                    satoshiPerByte: this.state.satoshiPerByte,
                    wallet: this.state.fromWallet,
                    feeSatoshi: this.state.feeSatoshi,
                  });
                }}
              >
                <Text style={{ color: '#0c2550', fontSize: 15, fontWeight: '500', alignSelf: 'center' }}>
                  {loc.transactions.details.transaction_details}
                </Text>
              </TouchableOpacity>
            </BlueCard>
          </View>
        </View>
      </SafeBlueArea>
    );
  }
}

const styles = StyleSheet.create({
  transactionDetailsTitle: {
    color: '#0c2550',
    fontWeight: '500',
    fontSize: 17,
    marginBottom: 2,
  },
  transactionDetailsSubtitle: {
    color: '#9aa0aa',
    fontWeight: '500',
    fontSize: 15,
    marginBottom: 20,
  },
});

Confirm.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func,
    getParam: PropTypes.func,
    navigate: PropTypes.func,
    dismiss: PropTypes.func,
    state: PropTypes.shape({
      params: PropTypes.shape({
        amount: PropTypes.string,
        fee: PropTypes.number,
        address: PropTypes.string,
        memo: PropTypes.string,
        fromWallet: PropTypes.shape({
          fromAddress: PropTypes.string,
          fromSecret: PropTypes.string,
        }),
      }),
    }),
  }),
};

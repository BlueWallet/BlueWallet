/* global alert */
import React, { Component } from 'react';
import { ActivityIndicator, FlatList, TouchableOpacity, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-elements';
import { BlueButton, BlueText, SafeBlueArea, BlueCard, BlueSpacing40, BlueNavigationStyle } from '../../BlueComponents';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import PropTypes from 'prop-types';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Biometric from '../../class/biometrics';
import { HDSegwitBech32Wallet } from '../../class';
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
    };
  }

  async componentDidMount() {
    console.log('send/confirm - componentDidMount');
    console.log('address = ', this.state.recipients);
    this.isBiometricUseCapableAndEnabled = await Biometric.isBiometricUseCapableAndEnabled();
  }

  broadcast() {
    this.setState({ isLoading: true }, async () => {
      try {
        await BlueElectrum.ping();
        await BlueElectrum.waitTillConnected();

        if (this.isBiometricUseCapableAndEnabled) {
          if (!(await Biometric.unlockWithBiometrics())) {
            this.setState({ isLoading: false });
            return;
          }
        }

        let result = await this.state.fromWallet.broadcastTx(this.state.tx);
        if (result && result.code) {
          if (result.code === 1) {
            const message = result.message.split('\n');
            throw new Error(`${message[0]}: ${message[2]}`);
          }
        } else {
          console.log('broadcast result = ', result);
          EV(EV.enum.REMOTE_TRANSACTIONS_COUNT_CHANGED); // someone should fetch txs
          let amount = 0;
          const recipients = this.state.recipients;
          if (recipients[0].amount === BitcoinUnit.MAX) {
            amount = this.state.fromWallet.getBalance() - this.state.feeSatoshi;
          } else {
            for (const recipient of recipients) {
              amount += recipient.amount ? +recipient.amount : recipient.value;
            }
          }

          if (this.state.fromWallet.type === HDSegwitBech32Wallet.type) {
            amount = loc.formatBalanceWithoutSuffix(amount, BitcoinUnit.BTC, false);
          }

          this.props.navigation.navigate('Success', {
            fee: Number(this.state.fee),
            amount,
            dismissModal: () => this.props.navigation.dismiss(),
          });
          this.setState({ isLoading: false });
        }
      } catch (error) {
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
        this.setState({ isLoading: false });
        alert(error.message);
      }
    });
  }

  _renderItem = ({ index, item }) => {
    return (
      <>
        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
          <Text
            style={{
              color: '#0f5cc0',
              fontSize: 36,
              fontWeight: '600',
            }}
          >
            {item.amount === BitcoinUnit.MAX
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
              {this.state.isLoading ? (
                <ActivityIndicator />
              ) : (
                <BlueButton onPress={() => this.broadcast()} title={loc.send.confirm.sendNow} />
              )}

              <TouchableOpacity
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

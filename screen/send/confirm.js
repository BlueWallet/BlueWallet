/* global alert */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ActivityIndicator, FlatList, TouchableOpacity, StyleSheet, Switch, View } from 'react-native';
import { Text } from 'react-native-elements';
import { PayjoinClient } from 'payjoin-client';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

import PayjoinTransaction from '../../class/payjoin-transaction';
import { BlueButton, BlueText, SafeBlueArea, BlueCard } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import Biometric from '../../class/biometrics';
import loc, { formatBalance, formatBalanceWithoutSuffix } from '../../loc';
import { BlueCurrentTheme } from '../../components/themes';
import Notifications from '../../blue_modules/notifications';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { Psbt } from 'bitcoinjs-lib';
import { isTorCapable } from '../../blue_modules/environment';
const currency = require('../../blue_modules/currency');
const BlueElectrum = require('../../blue_modules/BlueElectrum');
const Bignumber = require('bignumber.js');
const bitcoin = require('bitcoinjs-lib');
const torrific = require('../../blue_modules/torrific');

export default class Confirm extends Component {
  static contextType = BlueStorageContext;
  constructor(props) {
    super(props);

    this.state = {
      isLoading: false,
      isPayjoinEnabled: false,
      payjoinUrl: props.route.params.fromWallet.allowPayJoin() ? props.route.params?.payjoinUrl : false,
      psbt: props.route.params?.psbt,
      fee: props.route.params?.fee,
      feeSatoshi: new Bignumber(props.route.params.fee).multipliedBy(100000000).toNumber(),
      memo: props.route.params.memo,
      recipients: props.route.params.recipients,
      size: Math.round(props.route.params.tx.length / 2),
      tx: props.route.params.tx,
      satoshiPerByte: props.route.params.satoshiPerByte,
      fromWallet: props.route.params.fromWallet,
    };
  }

  async componentDidMount() {
    console.log('send/confirm - componentDidMount');
    console.log('address = ', this.state.recipients);
    if (!this.state.recipients || !this.state.recipients.length) alert('Internal error: recipients list empty (this should never happen)');
    this.isBiometricUseCapableAndEnabled = await Biometric.isBiometricUseCapableAndEnabled();
  }

  /**
   * we need to look into `recipients`, find destination address and return its outputScript
   * (needed for payjoin)
   *
   * @return {string}
   */
  getPaymentScript() {
    return bitcoin.address.toOutputScript(this.state.recipients[0].address);
  }

  send() {
    this.setState({ isLoading: true }, async () => {
      try {
        const txids2watch = [];
        if (!this.state.isPayjoinEnabled) {
          await this.broadcast(this.state.tx);
        } else {
          const wallet = new PayjoinTransaction(this.state.psbt, txHex => this.broadcast(txHex), this.state.fromWallet);
          const paymentScript = this.getPaymentScript();
          let payjoinClient;
          if (isTorCapable && this.state.payjoinUrl.includes('.onion')) {
            console.warn('trying TOR....');
            const payjoinUrl = this.state.payjoinUrl;
            // working through TOR - crafting custom requester that will handle TOR http request
            const customPayjoinRequester = {
              requestPayjoin: async function (psbt) {
                console.warn('requesting payjoin with psbt:', psbt.toBase64());
                const api = new torrific.Torsbee();
                const torResponse = await api.post(payjoinUrl, {
                  headers: {
                    'Content-Type': 'text/plain',
                  },
                  body: psbt.toBase64(),
                });
                console.warn('got torResponse.body');
                if (!torResponse.body) throw new Error('TOR failure, got ' + JSON.stringify(torResponse));
                return Psbt.fromBase64(torResponse.body);
              },
            };
            payjoinClient = new PayjoinClient({
              paymentScript,
              wallet,
              payjoinRequester: customPayjoinRequester,
            });
          } else {
            payjoinClient = new PayjoinClient({
              paymentScript,
              wallet,
              payjoinUrl: this.state.payjoinUrl,
            });
          }
          await payjoinClient.run();
          const payjoinPsbt = wallet.getPayjoinPsbt();
          if (payjoinPsbt) {
            const tx = payjoinPsbt.extractTransaction();
            txids2watch.push(tx.getId());
          }
        }

        const txid = bitcoin.Transaction.fromHex(this.state.tx).getId();
        txids2watch.push(txid);
        Notifications.majorTomToGroundControl([], [], txids2watch);
        let amount = 0;
        const recipients = this.state.recipients;
        for (const recipient of recipients) {
          amount += recipient.value;
        }

        amount = formatBalanceWithoutSuffix(amount, BitcoinUnit.BTC, false);

        this.props.navigation.navigate('Success', {
          fee: Number(this.state.fee),
          amount,
        });

        this.setState({ isLoading: false });

        await new Promise(resolve => setTimeout(resolve, 3000)); // sleep to make sure network propagates
        this.context.fetchAndSaveWalletTransactions(this.state.fromWallet.getID());
      } catch (error) {
        ReactNativeHapticFeedback.trigger('notificationError', {
          ignoreAndroidSystemSettings: false,
        });
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

    const result = await this.state.fromWallet.broadcastTx(tx);
    if (!result) {
      throw new Error(loc.errors.broadcast);
    }

    return result;
  }

  _renderItem = ({ index, item }) => {
    return (
      <>
        <View style={styles.valueWrap}>
          <Text testID="TransactionValue" style={styles.valueValue}>
            {currency.satoshiToBTC(item.value)}
          </Text>
          <Text style={styles.valueUnit}>{' ' + loc.units[BitcoinUnit.BTC]}</Text>
        </View>
        <Text style={styles.transactionAmountFiat}>{currency.satoshiToLocalCurrency(item.value)}</Text>
        <BlueCard>
          <Text style={styles.transactionDetailsTitle}>{loc.send.create_to}</Text>
          <Text testID="TransactionAddress" style={styles.transactionDetailsSubtitle}>
            {item.address}
          </Text>
        </BlueCard>
        {this.state.recipients.length > 1 && (
          <BlueText style={styles.valueOf}>
            {loc.formatString(loc._.of, { number: index + 1, total: this.state.recipients.length })}
          </BlueText>
        )}
      </>
    );
  };

  renderSeparator = () => {
    return <View style={styles.separator} />;
  };

  render() {
    return (
      <SafeBlueArea style={styles.root}>
        <View style={styles.cardTop}>
          <FlatList
            scrollEnabled={this.state.recipients.length > 1}
            extraData={this.state.recipients}
            data={this.state.recipients}
            renderItem={this._renderItem}
            keyExtractor={(_item, index) => `${index}`}
            ItemSeparatorComponent={this.renderSeparator}
          />
          {!!this.state.payjoinUrl && (
            <View style={styles.cardContainer}>
              <BlueCard>
                <View style={styles.payjoinWrapper}>
                  <Text style={styles.payjoinText}>Payjoin</Text>
                  <Switch
                    testID="PayjoinSwitch"
                    value={this.state.isPayjoinEnabled}
                    onValueChange={isPayjoinEnabled => this.setState({ isPayjoinEnabled })}
                  />
                </View>
              </BlueCard>
            </View>
          )}
        </View>
        <View style={styles.cardBottom}>
          <BlueCard>
            <Text style={styles.cardText} testID="TransactionFee">
              {loc.send.create_fee}: {formatBalance(this.state.feeSatoshi, BitcoinUnit.BTC)} (
              {currency.satoshiToLocalCurrency(this.state.feeSatoshi)})
            </Text>
            {this.state.isLoading ? <ActivityIndicator /> : <BlueButton onPress={() => this.send()} title={loc.send.confirm_sendNow} />}
            <TouchableOpacity
              accessibilityRole="button"
              testID="TransactionDetailsButton"
              style={styles.txDetails}
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
              <Text style={styles.txText}>{loc.transactions.details_transaction_details}</Text>
            </TouchableOpacity>
          </BlueCard>
        </View>
      </SafeBlueArea>
    );
  }
}

const styles = StyleSheet.create({
  transactionDetailsTitle: {
    color: BlueCurrentTheme.colors.foregroundColor,
    fontWeight: '500',
    fontSize: 17,
    marginBottom: 2,
  },
  transactionDetailsSubtitle: {
    color: BlueCurrentTheme.colors.feeText,
    fontWeight: '500',
    fontSize: 15,
    marginBottom: 20,
  },
  transactionAmountFiat: {
    color: BlueCurrentTheme.colors.feeText,
    fontWeight: '500',
    fontSize: 15,
    marginVertical: 8,
    textAlign: 'center',
  },
  valueWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  valueValue: {
    color: BlueCurrentTheme.colors.alternativeTextColor2,
    fontSize: 36,
    fontWeight: '700',
  },
  valueUnit: {
    color: BlueCurrentTheme.colors.alternativeTextColor2,
    fontSize: 16,
    marginHorizontal: 4,
    paddingBottom: 6,
    fontWeight: '600',
    alignSelf: 'flex-end',
  },
  valueOf: {
    alignSelf: 'flex-end',
    marginRight: 18,
    marginVertical: 8,
  },
  separator: {
    height: 0.5,
    margin: 16,
  },
  root: {
    paddingTop: 19,
    backgroundColor: BlueCurrentTheme.colors.elevated,
    justifyContent: 'space-between',
  },
  cardTop: {
    flexGrow: 8,
    marginTop: 16,
    alignItems: 'center',
    maxHeight: '70%',
  },
  cardBottom: {
    flexGrow: 2,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  cardContainer: {
    flexGrow: 1,
    width: '100%',
  },
  cardText: {
    flexDirection: 'row',
    color: '#37c0a1',
    fontSize: 14,
    marginVertical: 8,
    marginHorizontal: 24,
    paddingBottom: 6,
    fontWeight: '500',
    alignSelf: 'center',
  },
  txDetails: {
    marginTop: 16,
  },
  txText: {
    color: BlueCurrentTheme.colors.feeText,
    fontSize: 15,
    fontWeight: '500',
    alignSelf: 'center',
  },
  payjoinWrapper: {
    flexDirection: 'row',
    padding: 8,
    borderRadius: 6,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BlueCurrentTheme.colors.buttonDisabledBackgroundColor,
  },
  payjoinText: {
    color: '#81868e',
    fontSize: 15,
    fontWeight: 'bold',
  },
});

Confirm.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func,
    dismiss: PropTypes.func,
    navigate: PropTypes.func,
    dangerouslyGetParent: PropTypes.func,
  }),
  route: PropTypes.shape({
    params: PropTypes.object,
  }),
};

Confirm.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: loc.send.confirm_header }));

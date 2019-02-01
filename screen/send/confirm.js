/* global alert */
import React, { Component } from 'react';
import { ActivityIndicator, TouchableOpacity, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-elements';
import { BlueButton, SafeBlueArea, BlueCard, BlueSpacing40, BlueNavigationStyle } from '../../BlueComponents';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import PropTypes from 'prop-types';
let loc = require('../../loc');
let EV = require('../../events');
let currency = require('../../currency');
let Bignumber = require('bignumber.js');

export default class Confirm extends Component {
  static navigationOptions = () => ({
    ...BlueNavigationStyle(null, false),
    title: loc.send.confirm.header,
  });

  constructor(props) {
    super(props);

    this.state = {
      isLoading: false,
      amount: props.navigation.getParam('amount'),
      fee: props.navigation.getParam('fee'),
      feeSatoshi: new Bignumber(props.navigation.getParam('fee')).multipliedBy(100000000).toNumber(),
      address: props.navigation.getParam('address'),
      memo: props.navigation.getParam('memo'),
      size: Math.round(props.navigation.getParam('tx').length / 2),
      tx: props.navigation.getParam('tx'),
      satoshiPerByte: props.navigation.getParam('satoshiPerByte'),
      fromWallet: props.navigation.getParam('fromWallet'),
    };
  }

  async componentDidMount() {
    console.log('send/confirm - componentDidMount');
    console.log('address = ', this.state.address);
  }

  broadcast() {
    this.setState({ isLoading: true }, async () => {
      let result = await this.state.fromWallet.broadcastTx(this.state.tx);
      console.log('broadcast result = ', result);
      if (typeof result === 'string') {
        result = JSON.parse(result);
      }
      this.setState({ isLoading: false });
      if (result && result.error) {
        alert(JSON.stringify(result.error));
      } else {
        EV(EV.enum.REMOTE_TRANSACTIONS_COUNT_CHANGED); // someone should fetch txs
        this.props.navigation.navigate('Success', {
          fee: Number(this.state.fee),
          amount: this.state.amount,
          address: this.state.address,
          dismissModal: () => this.props.navigation.dismiss(),
        });
      }
    });
  }

  render() {
    return (
      <SafeBlueArea style={{ flex: 1, paddingTop: 19 }}>
        <BlueCard style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'center', paddingTop: 16, paddingBottom: 16 }}>
            <Text
              style={{
                color: '#0f5cc0',
                fontSize: 36,
                fontWeight: '600',
              }}
            >
              {this.state.amount}
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
            {loc.send.create.fee}: {loc.formatBalance(this.state.fee, BitcoinUnit.BTC)} (
            {currency.satoshiToLocalCurrency(this.state.feeSatoshi)})
          </Text>
        </BlueCard>
        <BlueCard>
          <Text style={styles.transactionDetailsTitle}>{loc.send.create.to}</Text>
          <Text style={styles.transactionDetailsSubtitle}>{this.state.address}</Text>
          <BlueSpacing40 />
          {this.state.isLoading ? <ActivityIndicator /> : <BlueButton onPress={() => this.broadcast()} title={loc.send.confirm.sendNow} />}
          <TouchableOpacity
            style={{ marginVertical: 24 }}
            onPress={() =>
              this.props.navigation.navigate('CreateTransaction', {
                amount: this.state.amount,
                fee: this.state.fee,
                address: this.state.address,
                memo: this.state.memo,
                tx: this.state.tx,
                satoshiPerByte: this.state.satoshiPerByte,
              })
            }
          >
            <Text style={{ color: '#0c2550', fontSize: 15, fontWeight: '500', alignSelf: 'center' }}>
              {loc.transactions.details.transaction_details}
            </Text>
          </TouchableOpacity>
        </BlueCard>
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

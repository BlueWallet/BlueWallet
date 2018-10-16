/* global alert */
import React, { Component } from 'react';
import { TextInput, TouchableOpacity, Clipboard, StyleSheet, ScrollView } from 'react-native';
import { Text, FormValidationMessage } from 'react-native-elements';
import { BlueLoading, BlueButton, SafeBlueArea, BlueCard, BlueText } from '../../BlueComponents';
import PropTypes from 'prop-types';
/** @type {AppStorage} */
// let BlueApp = require('../../BlueApp');
let loc = require('../../loc');
let EV = require('../../events');

export default class SendCreate extends Component {
  constructor(props) {
    super(props);
    console.log('send/create constructor');

    this.state = {
      amount: props.navigation.state.params.amount,
      fee: props.navigation.state.params.fee,
      address: props.navigation.state.params.address,
      memo: props.navigation.state.params.memo,
      isLoading: false,
      size: Math.round(props.navigation.getParam('tx').length / 2),
      tx: props.navigation.getParam('tx'),
      satoshiPerByte: props.navigation.getParam('satoshiPerByte'),
    };
  }

  async componentDidMount() {
    // console.log('send/create - componentDidMount');
    // console.log('address = ', this.state.address);
    // let utxo;
    // let satoshiPerByte;
    // let tx;
    // try {
    //   await this.state.fromWallet.fetchUtxo();
    //   if (this.state.fromWallet.getChangeAddressAsync) {
    //     await this.state.fromWallet.getChangeAddressAsync(); // to refresh internal pointer to next free address
    //   }
    //   if (this.state.fromWallet.getAddressAsync) {
    //     await this.state.fromWallet.getAddressAsync(); // to refresh internal pointer to next free address
    //   }
    //   utxo = this.state.fromWallet.utxo;
    //   let startTime = Date.now();
    //   tx = this.state.fromWallet.createTx(utxo, this.state.amount, this.state.fee, this.state.address, this.state.memo);
    //   let endTime = Date.now();
    //   console.log('create tx ', (endTime - startTime) / 1000, 'sec');
    //   let bitcoin = require('bitcoinjs-lib');
    //   let txDecoded = bitcoin.Transaction.fromHex(tx);
    //   let txid = txDecoded.getId();
    //   console.log('txid', txid);
    //   console.log('txhex', tx);
    //   BlueApp.tx_metadata = BlueApp.tx_metadata || {};
    //   BlueApp.tx_metadata[txid] = {
    //     txhex: tx,
    //     memo: this.state.memo,
    //   };
    //   BlueApp.saveToDisk();
    //   let feeSatoshi = new BigNumber(this.state.fee);
    //   satoshiPerByte = feeSatoshi.mul(100000000).toString();
    //   // satoshiPerByte = feeSatoshi.div(Math.round(tx.length / 2));
    //   // satoshiPerByte = Math.floor(satoshiPerByte.toString(10));
    //   // console.warn(satoshiPerByte)
    //   if (satoshiPerByte < 1) {
    //     throw new Error(loc.send.create.not_enough_fee);
    //   }
    // } catch (err) {
    //   console.log(err);
    //   return this.setState({
    //     isError: true,
    //     errorMessage: JSON.stringify(err.message),
    //   });
    // }
  }

  async broadcast() {
    let result = await this.state.fromWallet.broadcastTx(this.state.tx);
    console.log('broadcast result = ', result);
    if (typeof result === 'string') {
      result = JSON.parse(result);
    }
    if (result && result.error) {
      alert(JSON.stringify(result.error));
    } else {
      EV(EV.enum.REMOTE_TRANSACTIONS_COUNT_CHANGED); // someone should fetch txs
      alert('Transaction has been successfully broadcasted. Your transaction ID is: ' + JSON.stringify(result.result));
      this.props.navigation.navigate('Wallets');
    }
  }

  render() {
    if (this.state.isError) {
      return (
        <SafeBlueArea style={{ flex: 1, paddingTop: 20 }}>
          <BlueCard style={{ alignItems: 'center', flex: 1 }}>
            <BlueText>{loc.send.create.error}</BlueText>
            <FormValidationMessage>{this.state.errorMessage}</FormValidationMessage>
          </BlueCard>
          <BlueButton onPress={() => this.props.navigation.goBack()} title={loc.send.create.go_back} />
        </SafeBlueArea>
      );
    }

    if (this.state.isLoading) {
      return <BlueLoading />;
    }

    return (
      <SafeBlueArea style={{ flex: 1, paddingTop: 19 }}>
        <ScrollView>
          <BlueCard style={{ alignItems: 'center', flex: 1 }}>
            <BlueText style={{ color: '#0c2550', fontWeight: '500' }}>{loc.send.create.this_is_hex}</BlueText>

            <TextInput
              style={{
                borderColor: '#ebebeb',
                backgroundColor: '#d2f8d6',
                borderRadius: 4,
                marginTop: 20,
                color: '#37c0a1',
                fontWeight: '500',
                fontSize: 14,
                paddingHorizontal: 16,
                paddingBottom: 16,
                paddingTop: 16,
              }}
              height={72}
              multiline
              editable={false}
              value={this.state.tx}
            />

            <TouchableOpacity style={{ marginVertical: 24 }} onPress={() => Clipboard.setString(this.state.tx)}>
              <Text style={{ color: '#0c2550', fontSize: 15, fontWeight: '500', alignSelf: 'center' }}>Copy and broadcast later</Text>
            </TouchableOpacity>

            <BlueButton onPress={() => this.broadcast()} title={loc.send.details.send} />
          </BlueCard>
          <BlueCard>
            <Text style={styles.transactionDetailsTitle}>{loc.send.create.to}</Text>
            <Text style={styles.transactionDetailsSubtitle}>{this.state.address}</Text>

            <Text style={styles.transactionDetailsTitle}>{loc.send.create.amount}</Text>
            <Text style={styles.transactionDetailsSubtitle}>{this.state.amount} BTC</Text>

            <Text style={styles.transactionDetailsTitle}>{loc.send.create.fee}</Text>
            <Text style={styles.transactionDetailsSubtitle}>{this.state.fee}</Text>

            <Text style={styles.transactionDetailsTitle}>{loc.send.create.tx_size}</Text>
            <Text style={styles.transactionDetailsSubtitle}>{this.state.size}</Text>

            <Text style={styles.transactionDetailsTitle}>{loc.send.create.satoshi_per_byte}</Text>
            <Text style={styles.transactionDetailsSubtitle}>{this.state.satoshiPerByte} Sat/B</Text>

            <Text style={styles.transactionDetailsTitle}>{loc.send.create.memo}</Text>
            <Text style={styles.transactionDetailsSubtitle}>{this.state.memo}</Text>
          </BlueCard>

          <Text style={{ padding: 0, color: '#0f0' }}>{this.state.broadcastSuccessMessage}</Text>
        </ScrollView>
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

SendCreate.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.function,
    getParam: PropTypes.function,
    navigate: PropTypes.function,
    state: PropTypes.shape({
      params: PropTypes.shape({
        amount: PropTypes.string,
        fee: PropTypes.string,
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

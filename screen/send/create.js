/* global alert */
import React, { Component } from 'react';
import { TextInput, ActivityIndicator, TouchableOpacity, Clipboard, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-elements';
import { BlueButton, BlueHeaderDefaultSub, SafeBlueArea, BlueCard, BlueText } from '../../BlueComponents';
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
      isLoading: false,
      amount: props.navigation.state.params.amount,
      fee: props.navigation.state.params.fee,
      address: props.navigation.state.params.address,
      memo: props.navigation.state.params.memo,
      size: Math.round(props.navigation.getParam('tx').length / 2),
      tx: props.navigation.getParam('tx'),
      satoshiPerByte: props.navigation.getParam('satoshiPerByte'),
      fromWallet: props.navigation.getParam('fromWallet'),
    };
  }

  async componentDidMount() {
    console.log('send/create - componentDidMount');
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
        alert('Transaction has been successfully broadcasted. Your transaction ID is: ' + JSON.stringify(result.result));
        this.props.navigation.navigate('Wallets');
      }
    });
  }

  render() {
    return (
      <SafeBlueArea style={{ flex: 1, paddingTop: 19 }}>
        <BlueHeaderDefaultSub leftText={loc.send.create.details.toLowerCase()} onClose={() => this.props.navigation.goBack(null)} />
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
          </BlueCard>
          <BlueCard>
            <Text style={styles.transactionDetailsTitle}>{loc.send.create.to}</Text>
            <Text style={styles.transactionDetailsSubtitle}>{this.state.address}</Text>

            <Text style={styles.transactionDetailsTitle}>{loc.send.create.amount}</Text>
            <Text style={styles.transactionDetailsSubtitle}>{this.state.amount} BTC</Text>

            <Text style={styles.transactionDetailsTitle}>{loc.send.create.fee}</Text>
            <Text style={styles.transactionDetailsSubtitle}>{this.state.fee} BTC</Text>

            <Text style={styles.transactionDetailsTitle}>{loc.send.create.tx_size}</Text>
            <Text style={styles.transactionDetailsSubtitle}>{this.state.size} bytes</Text>

            <Text style={styles.transactionDetailsTitle}>{loc.send.create.satoshi_per_byte}</Text>
            <Text style={styles.transactionDetailsSubtitle}>{this.state.satoshiPerByte} Sat/B</Text>

            <Text style={styles.transactionDetailsTitle}>{loc.send.create.memo}</Text>
            <Text style={styles.transactionDetailsSubtitle}>{this.state.memo}</Text>
            {this.state.isLoading ? (
              <ActivityIndicator />
            ) : (
              <BlueButton
                onPress={() => this.broadcast()}
                title={loc.send.confirm.sendNow}
                style={{ maxWidth: 263, paddingHorizontal: 56 }}
              />
            )}
          </BlueCard>
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

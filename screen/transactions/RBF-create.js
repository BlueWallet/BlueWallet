/** @type {AppStorage}  */
/* global alert */
import React, { Component } from 'react';
import { TextInput, View, ActivtyIndicator } from 'react-native';
import { FormValidationMessage } from 'react-native-elements';
import {
  BlueLoading,
  BlueSpacing20,
  BlueButton,
  SafeBlueArea,
  BlueCard,
  BlueText,
  BlueSpacing,
  BlueNavigationStyle,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
let BigNumber = require('bignumber.js');
let bitcoinjs = require('bitcoinjs-lib');
let BlueApp = require('../../BlueApp');

export default class SendCreate extends Component {
  static navigationOptions = () => ({
    ...BlueNavigationStyle(null, false),
    title: 'Create RBF',
  });
  constructor(props) {
    super(props);
    console.log('send/create constructor');
    if (!props.navigation.state.params.feeDelta) {
      props.navigation.state.params.feeDelta = '0';
    }
    this.state = {
      isLoading: true,
      feeDelta: props.navigation.state.params.feeDelta,
      newDestinationAddress: props.navigation.state.params.newDestinationAddress,
      txid: props.navigation.state.params.txid,
      sourceTx: props.navigation.state.params.sourceTx,
      fromWallet: props.navigation.state.params.sourceWallet,
    };
  }

  async componentDidMount() {
    console.log('RBF-create - componentDidMount');

    let utxo = [];

    let lastSequence = 0;
    let totalInputAmountSatoshi = 0;
    for (let input of this.state.sourceTx.inputs) {
      if (input.sequence > lastSequence) {
        lastSequence = input.sequence;
      }
      totalInputAmountSatoshi += input.output_value;
      // let amount = new BigNumber(input.output_value)
      // amount = amount.div(10000000).toString(10)
      utxo.push({
        tx_hash: input.prev_hash,
        tx_output_n: input.output_index,
        value: input.output_value,
      });
    }

    // check seq=MAX and fail if it is
    if (lastSequence === bitcoinjs.Transaction.DEFAULT_SEQUENCE) {
      return this.setState({
        isLoading: false,
        nonReplaceable: true,
      });
      // lastSequence = 1
    }

    let txMetadata = BlueApp.tx_metadata[this.state.txid];
    if (txMetadata) {
      if (txMetadata.last_sequence) {
        lastSequence = Math.max(lastSequence, txMetadata.last_sequence);
      }
    }

    lastSequence += 1;

    let changeAddress;
    let transferAmount;
    let totalOutputAmountSatoshi = 0;
    for (let o of this.state.sourceTx.outputs) {
      totalOutputAmountSatoshi += o.value;
      if (o.addresses[0] === this.state.fromWallet.getAddress()) {
        // change
        changeAddress = o.addresses[0];
      } else {
        transferAmount = new BigNumber(o.value);
        transferAmount = transferAmount.dividedBy(100000000).toString(10);
      }
    }
    let oldFee = new BigNumber(totalInputAmountSatoshi - totalOutputAmountSatoshi);
    oldFee = parseFloat(oldFee.dividedBy(100000000).toString(10));

    console.log('changeAddress = ', changeAddress);
    console.log('utxo', utxo);
    console.log('lastSequence', lastSequence);
    console.log('totalInputAmountSatoshi', totalInputAmountSatoshi);
    console.log('totalOutputAmountSatoshi', totalOutputAmountSatoshi);
    console.log('transferAmount', transferAmount);
    console.log('oldFee', oldFee);

    let newFee = new BigNumber(oldFee);
    newFee = newFee.plus(this.state.feeDelta).toString(10);
    console.log('new Fee', newFee);

    // creating TX

    setTimeout(() => {
      // more responsive
      let tx;
      try {
        tx = this.state.fromWallet.createTx(utxo, transferAmount, newFee, this.state.newDestinationAddress, false, lastSequence);
        BlueApp.tx_metadata[this.state.txid] = txMetadata || {};
        BlueApp.tx_metadata[this.state.txid]['last_sequence'] = lastSequence;

        // in case new TX get confirmed, we must save metadata under new txid
        let bitcoin = require('bitcoinjs-lib');
        let txDecoded = bitcoin.Transaction.fromHex(tx);
        let txid = txDecoded.getId();
        BlueApp.tx_metadata[txid] = BlueApp.tx_metadata[this.state.txid];
        BlueApp.tx_metadata[txid]['txhex'] = tx;
        //
        BlueApp.saveToDisk();
        console.log('BlueApp.txMetadata[this.state.txid]', BlueApp.tx_metadata[this.state.txid]);
      } catch (err) {
        console.log(err);
        return this.setState({
          isError: true,
          errorMessage: JSON.stringify(err.message),
        });
      }

      let newFeeSatoshi = new BigNumber(newFee);
      newFeeSatoshi = parseInt(newFeeSatoshi.multipliedBy(100000000));
      let satoshiPerByte = Math.round(newFeeSatoshi / (tx.length / 2));
      this.setState({
        isLoading: false,
        size: Math.round(tx.length / 2),
        tx,
        satoshiPerByte: satoshiPerByte,
        amount: transferAmount,
        fee: newFee,
      });
    }, 10);
  }

  async broadcast() {
    this.setState({ isLoading: true }, async () => {
      console.log('broadcasting', this.state.tx);
      let result = await this.state.fromWallet.broadcastTx(this.state.tx);
      console.log('broadcast result = ', result);
      if (typeof result === 'string') {
        result = JSON.parse(result);
      }
      if (result && result.error) {
        alert(JSON.stringify(result.error));
        this.setState({ isLoading: false });
      } else {
        alert(JSON.stringify(result.result || result.txid));
        this.props.navigation.navigate('TransactionDetails');
      }
    });
  }

  render() {
    if (this.state.isError) {
      return (
        <SafeBlueArea style={{ flex: 1, paddingTop: 20 }}>
          <BlueSpacing />
          <BlueCard title={'Replace Transaction'} style={{ alignItems: 'center', flex: 1 }}>
            <BlueText>Error creating transaction. Invalid address or send amount?</BlueText>
            <FormValidationMessage>{this.state.errorMessage}</FormValidationMessage>
          </BlueCard>
          <BlueButton onPress={() => this.props.navigation.goBack()} title="Go back" />
        </SafeBlueArea>
      );
    }

    if (this.state.isLoading) {
      return <BlueLoading />;
    }

    if (this.state.nonReplaceable) {
      return (
        <SafeBlueArea style={{ flex: 1, paddingTop: 20 }}>
          <View style={{ flex: 1, justifyContent: 'center', alignContent: 'center' }}>
            <BlueText h4 style={{ textAlign: 'center' }}>
              This transaction is not replaceable
            </BlueText>
          </View>
        </SafeBlueArea>
      );
    }

    return (
      <SafeBlueArea style={{ flex: 1, paddingTop: 20 }}>
        <BlueSpacing />
        <BlueCard title={'Replace Transaction'} style={{ alignItems: 'center', flex: 1 }}>
          <BlueText>This is transaction hex, signed and ready to be broadcast to the network. Continue?</BlueText>

          <TextInput
            style={{
              borderColor: '#ebebeb',
              borderWidth: 1,
              marginTop: 20,
              color: '#ebebeb',
            }}
            maxHeight={70}
            multiline
            editable={false}
            value={this.state.tx}
          />

          <BlueSpacing20 />

          <BlueText style={{ paddingTop: 20 }}>To: {this.state.newDestinationAddress}</BlueText>
          <BlueText>Amount: {this.state.amount} BTC</BlueText>
          <BlueText>Fee: {this.state.fee} BTC</BlueText>
          <BlueText>TX size: {this.state.size} Bytes</BlueText>
          <BlueText>satoshiPerByte: {this.state.satoshiPerByte} Sat/B</BlueText>
        </BlueCard>
        {this.state.isLoading ? (
          <ActivtyIndicator />
        ) : (
          <BlueButton icon={{ name: 'megaphone', type: 'octicon' }} onPress={() => this.broadcast()} title="Broadcast" />
        )}
      </SafeBlueArea>
    );
  }
}

SendCreate.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func,
    navigate: PropTypes.func,
    state: PropTypes.shape({
      params: PropTypes.shape({
        address: PropTypes.string,
        feeDelta: PropTypes.string,
        fromAddress: PropTypes.string,
        newDestinationAddress: PropTypes.string,
        txid: PropTypes.string,
        sourceTx: PropTypes.object,
        sourceWallet: PropTypes.object,
      }),
    }),
  }),
};

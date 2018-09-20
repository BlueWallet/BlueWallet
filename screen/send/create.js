import React, { Component } from 'react';
import { TextInput } from 'react-native';
import { Text, FormValidationMessage } from 'react-native-elements';
import {
  BlueSpacingVariable,
  BlueHeaderDefaultSub,
  BlueLoading,
  BlueSpacing20,
  BlueButton,
  SafeBlueArea,
  BlueCard,
  BlueText,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
let BigNumber = require('bignumber.js');
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');

export default class SendCreate extends Component {
  static navigationOptions = {
    header: ({ navigation }) => {
      return <BlueHeaderDefaultSub leftText={loc.send.create.title} onClose={() => navigation.goBack(null)} />;
    },
  };

  constructor(props) {
    super(props);
    console.log('send/create constructor');
    this.state = {
      isLoading: true,
      amount: props.navigation.state.params.amount,
      fee: props.navigation.state.params.fee,
      address: props.navigation.state.params.address,
      memo: props.navigation.state.params.memo,
      fromAddress: props.navigation.state.params.fromAddress,
      fromSecret: props.navigation.state.params.fromSecret,
      broadcastErrorMessage: '',
    };

    let fromWallet = false;
    for (let w of BlueApp.getWallets()) {
      if (w.getSecret() === this.state.fromSecret) {
        fromWallet = w;
        break;
      }

      if (w.getAddress() && w.getAddress() === this.state.fromAddress) {
        fromWallet = w;
        break;
      }
    }
    this.state['fromWallet'] = fromWallet;
  }

  async componentDidMount() {
    console.log('send/create - componentDidMount');
    console.log('address = ', this.state.address);

    let utxo;
    let satoshiPerByte;
    let tx;

    try {
      await this.state.fromWallet.fetchUtxo();
      if (this.state.fromWallet.getChangeAddressAsync) {
        await this.state.fromWallet.getChangeAddressAsync(); // to refresh internal pointer to next free address
      }
      if (this.state.fromWallet.getAddressAsync) {
        await this.state.fromWallet.getAddressAsync(); // to refresh internal pointer to next free address
      }

      utxo = this.state.fromWallet.utxo;
      let startTime = Date.now();

      tx = this.state.fromWallet.createTx(utxo, this.state.amount, this.state.fee, this.state.address, this.state.memo);
      let endTime = Date.now();
      console.log('create tx ', (endTime - startTime) / 1000, 'sec');

      let bitcoin = require('bitcoinjs-lib');
      let txDecoded = bitcoin.Transaction.fromHex(tx);
      let txid = txDecoded.getId();
      console.log('txid', txid);
      console.log('txhex', tx);

      BlueApp.tx_metadata = BlueApp.tx_metadata || {};
      BlueApp.tx_metadata[txid] = {
        txhex: tx,
        memo: this.state.memo,
      };
      BlueApp.saveToDisk();

      let feeSatoshi = new BigNumber(this.state.fee);
      feeSatoshi = feeSatoshi.mul(100000000);
      satoshiPerByte = feeSatoshi.div(Math.round(tx.length / 2));
      satoshiPerByte = Math.floor(satoshiPerByte.toString(10));
      if (satoshiPerByte < 1) {
        throw new Error(loc.send.create.not_enough_fee);
      }
    } catch (err) {
      console.log(err);
      return this.setState({
        isError: true,
        errorMessage: JSON.stringify(err.message),
      });
    }

    this.setState({
      isLoading: false,
      size: Math.round(tx.length / 2),
      tx,
      satoshiPerByte,
    });
  }

  async broadcast() {
    let result = await this.state.fromWallet.broadcastTx(this.state.tx);
    console.log('broadcast result = ', result);
    if (typeof result === 'string') {
      result = JSON.parse(result);
    }
    if (result && result.error) {
      this.setState({
        broadcastErrorMessage: JSON.stringify(result.error),
        broadcastSuccessMessage: '',
      });
    } else {
      this.setState({ broadcastErrorMessage: '' });
      this.setState({
        broadcastSuccessMessage: 'Success! TXID: ' + JSON.stringify(result.result),
      });
    }
  }

  render() {
    if (this.state.isError) {
      return (
        <SafeBlueArea style={{ flex: 1, paddingTop: 20 }}>
          <BlueSpacingVariable />
          <BlueHeaderDefaultSub leftText={loc.send.create.title} onClose={() => this.props.navigation.goBack()} />

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
      <SafeBlueArea style={{ flex: 1, paddingTop: 20 }}>
        <BlueSpacingVariable />

        <BlueCard style={{ alignItems: 'center', flex: 1 }}>
          <BlueText>{loc.send.create.this_is_hex}</BlueText>

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

          <BlueText style={{ paddingTop: 20 }}>
            {loc.send.create.to}: {this.state.address}
          </BlueText>
          <BlueText>
            {loc.send.create.amount}: {this.state.amount} BTC
          </BlueText>
          <BlueText>
            {loc.send.create.fee}: {this.state.fee} BTC
          </BlueText>
          <BlueText>
            {loc.send.create.tx_size}: {this.state.size} Bytes
          </BlueText>
          <BlueText>
            {loc.send.create.satoshi_per_byte}: {this.state.satoshiPerByte} Sat/B
          </BlueText>
          <BlueText>
            {loc.send.create.memo}: {this.state.memo}
          </BlueText>
        </BlueCard>

        <BlueButton
          icon={{
            name: 'megaphone',
            type: 'octicon',
            color: BlueApp.settings.buttonTextColor,
          }}
          onPress={() => this.broadcast()}
          title={loc.send.create.broadcast}
        />

        <BlueButton
          icon={{
            name: 'arrow-left',
            type: 'octicon',
            color: BlueApp.settings.buttonTextColor,
          }}
          onPress={() => this.props.navigation.goBack()}
          title={loc.send.create.go_back}
        />

        <FormValidationMessage>{this.state.broadcastErrorMessage}</FormValidationMessage>
        <Text style={{ padding: 0, color: '#0f0' }}>{this.state.broadcastSuccessMessage}</Text>
      </SafeBlueArea>
    );
  }
}

SendCreate.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.function,
    state: PropTypes.shape({
      params: PropTypes.shape({
        amount: PropTypes.string,
        fee: PropTypes.string,
        address: PropTypes.string,
        memo: PropTypes.string,
        fromAddress: PropTypes.string,
        fromSecret: PropTypes.string,
      }),
    }),
  }),
};

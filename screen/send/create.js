import React, { Component } from 'react';
import { TextInput } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Text, FormValidationMessage } from 'react-native-elements';
import {
  BlueLoading,
  BlueSpacing20,
  BlueButton,
  SafeBlueArea,
  BlueCard,
  BlueText,
  BlueSpacing,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
let BigNumber = require('bignumber.js');
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');

export default class SendCreate extends Component {
  static navigationOptions = {
    tabBarIcon: ({ tintColor, focused }) => (
      <Ionicons
        name={focused ? 'md-paper-plane' : 'md-paper-plane'}
        size={26}
        style={{ color: tintColor }}
      />
    ),
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
      broadcastErrorMessage: '',
    };

    let fromWallet = false;
    for (let w of BlueApp.getWallets()) {
      if (w.getAddress() === this.state.fromAddress) {
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
      utxo = this.state.fromWallet.utxo;
      let startTime = Date.now();

      tx = this.state.fromWallet.createTx(
        utxo,
        this.state.amount,
        this.state.fee,
        this.state.address,
        this.state.memo,
      );
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
      satoshiPerByte = Math.round(satoshiPerByte.toString(10));
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
        broadcastSuccessMessage:
          'Success! TXID: ' + JSON.stringify(result.result),
      });
    }
  }

  render() {
    if (this.state.isError) {
      return (
        <SafeBlueArea style={{ flex: 1, paddingTop: 20 }}>
          <BlueSpacing />
          <BlueCard
            title={loc.send.create.title}
            style={{ alignItems: 'center', flex: 1 }}
          >
            <BlueText>{loc.send.create.error}</BlueText>
            <FormValidationMessage>
              {this.state.errorMessage}
            </FormValidationMessage>
          </BlueCard>
          <BlueButton
            onPress={() => this.props.navigation.goBack()}
            title={loc.send.create.go_back}
          />
        </SafeBlueArea>
      );
    }

    if (this.state.isLoading) {
      return <BlueLoading />;
    }

    return (
      <SafeBlueArea style={{ flex: 1, paddingTop: 20 }}>
        <BlueSpacing />
        <BlueCard
          title={loc.send.create.title}
          style={{ alignItems: 'center', flex: 1 }}
        >
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
            {loc.send.create.satoshi_per_byte}: {this.state.satoshiPerByte}{' '}
            Sat/B
          </BlueText>
          <BlueText>
            {loc.send.create.memo}: {this.state.memo}
          </BlueText>
        </BlueCard>

        <BlueButton
          icon={{ name: 'megaphone', type: 'octicon' }}
          onPress={() => this.broadcast()}
          title={loc.send.create.broadcast}
        />

        <BlueButton
          icon={{ name: 'arrow-left', type: 'octicon' }}
          onPress={() => this.props.navigation.goBack()}
          title={loc.send.create.go_back}
        />

        <FormValidationMessage>
          {this.state.broadcastErrorMessage}
        </FormValidationMessage>
        <Text style={{ padding: 0, color: '#0f0' }}>
          {this.state.broadcastSuccessMessage}
        </Text>
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
      }),
    }),
  }),
};

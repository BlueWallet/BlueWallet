import React, { Component } from 'react';
import { ActivityIndicator, View, TextInput } from 'react-native';
import { BlueSpacing20, BlueButton, SafeBlueArea, BlueCard, BlueText, BlueSpacing, BlueNavigationStyle } from '../../BlueComponents';
import PropTypes from 'prop-types';
import { SegwitBech32Wallet } from '../../class';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');

export default class RBF extends Component {
  static navigationOptions = () => ({
    ...BlueNavigationStyle(null, false),
    title: 'RBF',
  });

  constructor(props) {
    super(props);
    let txid;
    if (props.navigation.state.params) txid = props.navigation.state.params.txid;

    let sourceWallet;
    let sourceTx;
    for (let w of BlueApp.getWallets()) {
      for (let t of w.getTransactions()) {
        if (t.hash === txid) {
          // found our source wallet
          sourceWallet = w;
          sourceTx = t;
          console.log(t);
        }
      }
    }

    let destinationAddress;

    for (let o of sourceTx.outputs) {
      if (!o.addresses && o.script) {
        // probably bech32 output, so we need to decode address
        o.addresses = [SegwitBech32Wallet.scriptPubKeyToAddress(o.script)];
      }

      if (o.addresses && o.addresses[0] === sourceWallet.getAddress()) {
        // change
        // nop
      } else {
        // DESTINATION address

        destinationAddress = (o.addresses && o.addresses[0]) || '';
        console.log('dest = ', destinationAddress);
      }
    }

    if (!destinationAddress || sourceWallet.type === 'legacy') {
      // for now I'm too lazy to add RBF support for legacy addresses
      this.state = {
        isLoading: false,
        nonReplaceable: true,
      };
      return;
    }

    this.state = {
      isLoading: true,
      txid,
      sourceTx,
      sourceWallet,
      newDestinationAddress: destinationAddress,
      feeDelta: '',
    };
  }

  async componentDidMount() {
    let startTime = Date.now();
    console.log('transactions/RBF - componentDidMount');
    this.setState({
      isLoading: false,
    });
    let endTime = Date.now();
    console.log('componentDidMount took', (endTime - startTime) / 1000, 'sec');
  }

  createTransaction() {
    this.props.navigation.navigate('CreateRBF', {
      feeDelta: this.state.feeDelta,
      newDestinationAddress: this.state.newDestinationAddress,
      txid: this.state.txid,
      sourceTx: this.state.sourceTx,
      sourceWallet: this.state.sourceWallet,
    });
  }

  render() {
    if (this.state.isLoading) {
      return (
        <View style={{ flex: 1, paddingTop: 20 }}>
          <ActivityIndicator />
        </View>
      );
    }

    if (this.state.nonReplaceable) {
      return (
        <SafeBlueArea style={{ flex: 1, paddingTop: 20 }}>
          <BlueSpacing20 />
          <BlueSpacing20 />
          <BlueSpacing20 />
          <BlueSpacing20 />
          <BlueSpacing20 />

          <BlueText h4>This transaction is not replaceable</BlueText>

          <BlueButton onPress={() => this.props.navigation.goBack()} title="Back" />
        </SafeBlueArea>
      );
    }

    if (!this.state.sourceWallet.getAddress) {
      return (
        <SafeBlueArea style={{ flex: 1, paddingTop: 20 }}>
          <BlueText>System error: Source wallet not found (this should never happen)</BlueText>
          <BlueButton onPress={() => this.props.navigation.goBack()} title="Back" />
        </SafeBlueArea>
      );
    }

    return (
      <SafeBlueArea style={{ flex: 1, paddingTop: 20 }}>
        <BlueSpacing />
        <BlueCard title={'Replace By Fee'} style={{ alignItems: 'center', flex: 1 }}>
          <BlueText>RBF allows you to increase fee on already sent but not confirmed transaction, thus speeding up mining</BlueText>
          <BlueSpacing20 />

          <BlueText>
            From wallet '{this.state.sourceWallet.getLabel()}' ({this.state.sourceWallet.getAddress()})
          </BlueText>
          <BlueSpacing20 />

          <View
            style={{
              flexDirection: 'row',
              borderColor: '#d2d2d2',
              borderBottomColor: '#d2d2d2',
              borderWidth: 1.0,
              borderBottomWidth: 0.5,
              backgroundColor: '#f5f5f5',
              minHeight: 44,
              height: 44,
              alignItems: 'center',
              marginVertical: 8,
              borderRadius: 4,
            }}
          >
            <TextInput
              onChangeText={text => this.setState({ newDestinationAddress: text })}
              placeholder={'receiver address here'}
              value={this.state.newDestinationAddress}
              style={{ flex: 1, minHeight: 33, marginHorizontal: 8 }}
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              borderColor: '#d2d2d2',
              borderBottomColor: '#d2d2d2',
              borderWidth: 1.0,
              borderBottomWidth: 0.5,
              backgroundColor: '#f5f5f5',
              minHeight: 44,
              height: 44,
              alignItems: 'center',
              marginVertical: 8,
              borderRadius: 4,
            }}
          >
            <TextInput
              onChangeText={text => this.setState({ feeDelta: text })}
              keyboardType={'numeric'}
              placeholder={'fee to add (in BTC)'}
              value={this.state.feeDelta + ''}
              style={{ flex: 1, minHeight: 33, marginHorizontal: 8 }}
            />
          </View>
        </BlueCard>
        <BlueSpacing />

        <BlueButton onPress={() => this.createTransaction()} title="Create" />
      </SafeBlueArea>
    );
  }
}

RBF.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func,
    navigate: PropTypes.func,
    state: PropTypes.shape({
      params: PropTypes.shape({
        txid: PropTypes.string,
      }),
    }),
  }),
};

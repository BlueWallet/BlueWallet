/* global alert */
import React from 'react';
import PropTypes from 'prop-types';
import { ActivityIndicator, View, ScrollView, StyleSheet } from 'react-native';
import { BlueSpacing20, SafeBlueArea, BlueText, BlueNavigationStyle } from '../../BlueComponents';
import { HDSegwitBech32Transaction, HDSegwitBech32Wallet } from '../../class';
import CPFP from './CPFP';
import loc from '../../loc';
/** @type {AppStorage} */
const BlueApp = require('../../BlueApp');

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 16,
  },
});

export default class RBFBumpFee extends CPFP {
  async componentDidMount() {
    console.log('transactions/RBFBumpFee - componentDidMount');
    this.setState({
      isLoading: true,
      newFeeRate: '',
      nonReplaceable: false,
    });
    await this.checkPossibilityOfRBFBumpFee();
  }

  async checkPossibilityOfRBFBumpFee() {
    if (this.state.wallet.type !== HDSegwitBech32Wallet.type) {
      return this.setState({ nonReplaceable: true, isLoading: false });
    }

    const tx = new HDSegwitBech32Transaction(null, this.state.txid, this.state.wallet);
    if ((await tx.isOurTransaction()) && (await tx.getRemoteConfirmationsNum()) === 0 && (await tx.isSequenceReplaceable())) {
      const info = await tx.getInfo();
      return this.setState({ nonReplaceable: false, feeRate: info.feeRate + 1, isLoading: false, tx });
      // 1 sat makes a lot of difference, since sometimes because of rounding created tx's fee might be insufficient
    } else {
      return this.setState({ nonReplaceable: true, isLoading: false });
    }
  }

  async createTransaction() {
    const newFeeRate = parseInt(this.state.newFeeRate);
    if (newFeeRate > this.state.feeRate) {
      /** @type {HDSegwitBech32Transaction} */
      const tx = this.state.tx;
      this.setState({ isLoading: true });
      try {
        const { tx: newTx } = await tx.createRBFbumpFee(newFeeRate);
        this.setState({ stage: 2, txhex: newTx.toHex(), newTxid: newTx.getId() });
        this.setState({ isLoading: false });
      } catch (_) {
        this.setState({ isLoading: false });
        alert(loc.errors.error + ': ' + _.message);
      }
    }
  }

  onSuccessBroadcast() {
    // porting memo from old tx:
    if (BlueApp.tx_metadata[this.state.txid]) {
      BlueApp.tx_metadata[this.state.newTxid] = BlueApp.tx_metadata[this.state.txid];
    }
  }

  render() {
    if (this.state.isLoading) {
      return (
        <View style={styles.root}>
          <ActivityIndicator />
        </View>
      );
    }

    if (this.state.stage === 3) {
      return this.renderStage3();
    }

    if (this.state.stage === 2) {
      return this.renderStage2();
    }

    if (this.state.nonReplaceable) {
      return (
        <SafeBlueArea style={styles.root}>
          <BlueSpacing20 />
          <BlueSpacing20 />
          <BlueSpacing20 />
          <BlueSpacing20 />
          <BlueSpacing20 />

          <BlueText h4>{loc.transactions.cpfp_no_bump}</BlueText>
        </SafeBlueArea>
      );
    }

    return (
      <SafeBlueArea style={styles.root}>
        <ScrollView>{this.renderStage1(loc.transactions.rbf_explain)}</ScrollView>
      </SafeBlueArea>
    );
  }
}

RBFBumpFee.propTypes = {
  navigation: PropTypes.shape({
    popToTop: PropTypes.func,
    navigate: PropTypes.func,
    state: PropTypes.shape({
      params: PropTypes.shape({
        txid: PropTypes.string,
        wallet: PropTypes.object,
      }),
    }),
  }),
};

RBFBumpFee.navigationOptions = () => ({
  ...BlueNavigationStyle(null, false),
  title: loc.transactions.rbf_title,
});

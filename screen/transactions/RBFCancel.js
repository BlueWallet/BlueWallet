/* global alert */
import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { BlueSpacing20, SafeBlueArea, BlueText, BlueNavigationStyle } from '../../BlueComponents';
import PropTypes from 'prop-types';
import { HDSegwitBech32Transaction, HDSegwitBech32Wallet } from '../../class';
import CPFP from './CPFP';
import loc from '../../loc';
/** @type {AppStorage} */
const BlueApp = require('../../BlueApp');

const styles = StyleSheet.create({
  common: {
    flex: 1,
    paddingTop: 20,
  },
});

export default class RBFCancel extends CPFP {
  async componentDidMount() {
    console.log('transactions/RBFCancel - componentDidMount');
    this.setState({
      isLoading: true,
      newFeeRate: '',
      nonReplaceable: false,
    });
    await this.checkPossibilityOfRBFCancel();
  }

  async checkPossibilityOfRBFCancel() {
    if (this.state.wallet.type !== HDSegwitBech32Wallet.type) {
      return this.setState({ nonReplaceable: true, isLoading: false });
    }

    const tx = new HDSegwitBech32Transaction(null, this.state.txid, this.state.wallet);
    if (
      (await tx.isOurTransaction()) &&
      (await tx.getRemoteConfirmationsNum()) === 0 &&
      (await tx.isSequenceReplaceable()) &&
      (await tx.canCancelTx())
    ) {
      const info = await tx.getInfo();
      console.log({ info });
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
        const { tx: newTx } = await tx.createRBFcancelTx(newFeeRate);
        this.setState({ stage: 2, txhex: newTx.toHex(), newTxid: newTx.getId() });
        this.setState({ isLoading: false });
      } catch (_) {
        this.setState({ isLoading: false });
        alert(loc.errors.error + ': ' + _.message);
      }
    }
  }

  onSuccessBroadcast() {
    // porting metadata, if any
    BlueApp.tx_metadata[this.state.newTxid] = BlueApp.tx_metadata[this.state.txid] || {};

    // porting tx memo
    if (BlueApp.tx_metadata[this.state.newTxid].memo) {
      BlueApp.tx_metadata[this.state.newTxid].memo = 'Cancelled: ' + BlueApp.tx_metadata[this.state.newTxid].memo;
    } else {
      BlueApp.tx_metadata[this.state.newTxid].memo = 'Cancelled transaction';
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

          <BlueText h4>loc.transactions.cancel_no</BlueText>
        </SafeBlueArea>
      );
    }

    return this.renderStage1(loc.transactions.cancel_explain);
  }
}

RBFCancel.propTypes = {
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

RBFCancel.navigationOptions = () => ({
  ...BlueNavigationStyle(null, false),
  title: loc.transactions.cancel_title,
});

import React from 'react';
import PropTypes from 'prop-types';
import { ActivityIndicator, View, ScrollView } from 'react-native';
import { BlueSpacing20, SafeBlueArea, BlueText } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import { HDSegwitBech32Transaction, HDSegwitBech32Wallet } from '../../class';
import CPFP from './CPFP';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import alert from '../../components/Alert';

export default class RBFCancel extends CPFP {
  static contextType = BlueStorageContext;
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
    const newFeeRate = parseInt(this.state.newFeeRate, 10);
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
    this.context.txMetadata[this.state.newTxid] = this.context.txMetadata[this.state.txid] || {};

    // porting tx memo
    if (this.context.txMetadata[this.state.newTxid].memo) {
      this.context.txMetadata[this.state.newTxid].memo = 'Cancelled: ' + this.context.txMetadata[this.state.newTxid].memo;
    } else {
      this.context.txMetadata[this.state.newTxid].memo = 'Cancelled transaction';
    }
    this.context.sleep(4000).then(() => this.context.fetchAndSaveWalletTransactions(this.state.wallet.getID()));
    this.props.navigation.navigate('Success', { onDonePressed: () => this.props.navigation.popToTop(), amount: undefined });
  }

  render() {
    if (this.state.isLoading) {
      return (
        <View>
          <ActivityIndicator />
        </View>
      );
    }

    if (this.state.stage === 2) {
      return this.renderStage2();
    }

    if (this.state.nonReplaceable) {
      return (
        <SafeBlueArea>
          <BlueSpacing20 />
          <BlueSpacing20 />
          <BlueSpacing20 />
          <BlueSpacing20 />
          <BlueSpacing20 />

          <BlueText h4>{loc.transactions.cancel_no}</BlueText>
        </SafeBlueArea>
      );
    }

    return (
      <SafeBlueArea>
        <ScrollView>{this.renderStage1(loc.transactions.cancel_explain)}</ScrollView>
      </SafeBlueArea>
    );
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

RBFCancel.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: loc.transactions.cancel_title }));

import React from 'react';
import PropTypes from 'prop-types';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import BlueText from '../../components/BlueText';
import { HDSegwitBech32Transaction } from '../../class/hd-segwit-bech32-transaction';
import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';
import presentAlert from '../../components/Alert';
import SafeArea from '../../components/SafeArea';
import loc from '../../loc';
import CPFP from './CPFP';
import { StorageContext } from '../../components/Context/StorageProvider';
import { BlueSpacing20 } from '../../components/BlueSpacing';
import { isWatchOnlySegwitBech32 } from '../../util/isWatchOnlySegwitBech32';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 16,
  },
});

export default class RBFBumpFee extends CPFP {
  static contextType = StorageContext;

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
    let tx;
    if (isWatchOnlySegwitBech32(this.state.wallet)) {
      tx = new HDSegwitBech32Transaction(
        null,
        this.state.txid,
        this.state.wallet._hdWalletInstance,
        this.state.wallet.getMasterFingerprint(),
      );
    } else if (this.state.wallet?.type === HDSegwitBech32Wallet.type) {
      tx = new HDSegwitBech32Transaction(null, this.state.txid, this.state.wallet);
    } else {
      return this.setState({ nonReplaceable: true, isLoading: false });
    }
    if ((await tx.isOurTransaction()) && (await tx.getRemoteConfirmationsNum()) === 0 && (await tx.isSequenceReplaceable())) {
      const info = await tx.getInfo();
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
        const { tx: newTx, psbt } = await tx.createRBFbumpFee(newFeeRate);

        // watch-only wallets with enabled HW wallet support have different flow. we have to show PSBT to user as QR code
        // so he can scan it and sign it. then we have to scan it back from user (via camera and QR code), and ask
        // user whether he wants to broadcast it
        if (isWatchOnlySegwitBech32(this.state.wallet)) {
          let memo;
          // porting memo from old tx:
          if (this.context.txMetadata[this.state.txid]?.memo) {
            memo = this.context.txMetadata[this.state.txid]?.memo;
          }

          this.props.navigation
            .getParent()
            ?.getParent()
            ?.navigate('SendDetailsRoot', {
              screen: 'PsbtWithHardwareWallet',
              params: {
                memo,
                walletID: this.state.wallet.getID(),
                psbt,
              },
            });
          this.setState({ isLoading: false });
          return;
        }

        this.setState({ stage: 2, txhex: newTx.toHex(), newTxid: newTx.getId() });
        this.setState({ isLoading: false });
      } catch (_) {
        this.setState({ isLoading: false });
        presentAlert({ message: loc.errors.error + ': ' + _.message });
      }
    }
  }

  onSuccessBroadcast() {
    // porting memo from old tx:
    if (this.context.txMetadata[this.state.txid]) {
      this.context.txMetadata[this.state.newTxid] = this.context.txMetadata[this.state.txid];
    }
    this.context.sleep(4000).then(() => this.context.fetchAndSaveWalletTransactions(this.state.wallet.getID()));
    this.props.navigation.navigate('Success', { amount: undefined });
  }

  render() {
    if (this.state.isLoading) {
      return (
        <View style={styles.root}>
          <ActivityIndicator />
        </View>
      );
    }

    if (this.state.stage === 2) {
      return this.renderStage2();
    }

    if (this.state.nonReplaceable) {
      return (
        <SafeArea style={styles.root}>
          <BlueSpacing20 />
          <BlueSpacing20 />
          <BlueSpacing20 />
          <BlueSpacing20 />
          <BlueSpacing20 />

          <BlueText h4>{loc.transactions.cpfp_no_bump}</BlueText>
        </SafeArea>
      );
    }

    return (
      <SafeArea style={styles.root}>
        <ScrollView
          automaticallyAdjustContentInsets
          automaticallyAdjustKeyboardInsets
          automaticallyAdjustsScrollIndicatorInsets
          contentInsetAdjustmentBehavior="automatic"
        >
          {this.renderStage1(loc.transactions.rbf_explain)}
        </ScrollView>
      </SafeArea>
    );
  }
}

RBFBumpFee.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    state: PropTypes.shape({
      params: PropTypes.shape({
        txid: PropTypes.string,
        wallet: PropTypes.object,
      }),
    }),
  }),
};

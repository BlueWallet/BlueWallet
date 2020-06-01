/* global alert */
import React, { Component } from 'react';
import { ActivityIndicator, View, TextInput, TouchableOpacity, Linking, Clipboard, ScrollView, StyleSheet } from 'react-native';
import {
  BlueSpacing20,
  BlueReplaceFeeSuggestions,
  BlueButton,
  SafeBlueArea,
  BlueCard,
  BlueText,
  BlueSpacing,
  BlueNavigationStyle,
  BlueBigCheckmark,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
import { HDSegwitBech32Transaction, HDSegwitBech32Wallet } from '../../class';
import { Text } from 'react-native-elements';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
/** @type {AppStorage} */
let EV = require('../../events');
let BlueElectrum = require('../../BlueElectrum');
let loc = require('../../loc');
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 20,
  },
  explain: {
    flex: 1,
    paddingBottom: 16,
  },
  center: {
    alignItems: 'center',
    flex: 1,
  },
  hex: {
    color: '#0c2550',
    fontWeight: '500',
  },
  hexInput: {
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
  },
  action: {
    marginVertical: 24,
  },
  actionText: {
    color: '#9aa0aa',
    fontSize: 15,
    fontWeight: '500',
    alignSelf: 'center',
  },
  doneWrap: {
    flex: 1,
    paddingTop: 19,
  },
  doneCard: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 76,
    paddingBottom: 16,
  },
  blueBigCheckmark: {
    marginTop: 43,
    marginBottom: 53,
  },
});

export default class CPFP extends Component {
  static navigationOptions = () => ({
    ...BlueNavigationStyle(null, false),
    title: 'Bump fee (CPFP)',
  });

  constructor(props) {
    super(props);
    let txid;
    let wallet;
    if (props.route.params) txid = props.route.params.txid;
    if (props.route.params) wallet = props.route.params.wallet;

    this.state = {
      isLoading: true,
      stage: 1,
      txid,
      wallet,
    };
  }

  broadcast() {
    this.setState({ isLoading: true }, async () => {
      try {
        await BlueElectrum.ping();
        await BlueElectrum.waitTillConnected();
        let result = await this.state.wallet.broadcastTx(this.state.txhex);
        if (result) {
          EV(EV.enum.REMOTE_TRANSACTIONS_COUNT_CHANGED); // someone should fetch txs
          this.setState({ stage: 3, isLoading: false });
          this.onSuccessBroadcast();
        } else {
          ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
          this.setState({ isLoading: false });
          alert('Broadcast failed');
        }
      } catch (error) {
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
        this.setState({ isLoading: false });
        alert(error.message);
      }
    });
  }

  onSuccessBroadcast() {
    BlueApp.tx_metadata[this.state.newTxid] = { memo: 'Child pays for parent (CPFP)' };
  }

  async componentDidMount() {
    console.log('transactions/CPFP - componentDidMount');
    this.setState({
      isLoading: true,
      newFeeRate: '',
      nonReplaceable: false,
    });
    await this.checkPossibilityOfCPFP();
  }

  async checkPossibilityOfCPFP() {
    if (this.state.wallet.type !== HDSegwitBech32Wallet.type) {
      return this.setState({ nonReplaceable: true, isLoading: false });
    }

    let tx = new HDSegwitBech32Transaction(null, this.state.txid, this.state.wallet);
    if ((await tx.isToUsTransaction()) && (await tx.getRemoteConfirmationsNum()) === 0) {
      let info = await tx.getInfo();
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
        let { tx: newTx } = await tx.createCPFPbumpFee(newFeeRate);
        this.setState({ stage: 2, txhex: newTx.toHex(), newTxid: newTx.getId() });
        this.setState({ isLoading: false });
      } catch (_) {
        this.setState({ isLoading: false });
        alert('Failed: ' + _.message);
      }
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

          <BlueText h4>This transaction is not bumpable</BlueText>
        </SafeBlueArea>
      );
    }

    return (
      <SafeBlueArea style={styles.explain}>
        <ScrollView>
          {this.renderStage1(
            'We will create another transaction that spends your unconfirmed transaction. The total fee will be higher than the original transaction fee, so it should be mined faster. This is called CPFP - Child Pays For Parent.',
          )}
        </ScrollView>
      </SafeBlueArea>
    );
  }

  renderStage2() {
    return (
      <View style={styles.root}>
        <BlueCard style={styles.center}>
          <BlueText style={styles.hex}>{loc.send.create.this_is_hex}</BlueText>
          <TextInput style={styles.hexInput} height={112} multiline editable value={this.state.txhex} />

          <TouchableOpacity style={styles.action} onPress={() => Clipboard.setString(this.state.txhex)}>
            <Text style={styles.actionText}>Copy and broadcast later</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.action} onPress={() => Linking.openURL('https://coinb.in/?verify=' + this.state.txhex)}>
            <Text style={styles.actionText}>Verify on coinb.in</Text>
          </TouchableOpacity>
          <BlueButton onPress={() => this.broadcast()} title={loc.send.confirm.sendNow} />
        </BlueCard>
      </View>
    );
  }

  renderStage3() {
    return (
      <SafeBlueArea style={styles.doneWrap}>
        <BlueCard style={styles.center}>
          <View style={styles.doneCard} />
        </BlueCard>
        <BlueBigCheckmark style={styles.blueBigCheckmark} />
        <BlueCard>
          <BlueButton
            onPress={() => {
              this.props.navigation.popToTop();
            }}
            title={loc.send.success.done}
          />
        </BlueCard>
      </SafeBlueArea>
    );
  }

  renderStage1(text) {
    return (
      <SafeBlueArea style={styles.root}>
        <BlueSpacing />
        <BlueCard style={styles.center}>
          <BlueText>{text}</BlueText>
          <BlueSpacing20 />
          <BlueReplaceFeeSuggestions onFeeSelected={fee => this.setState({ newFeeRate: fee })} transactionMinimum={this.state.feeRate} />
          <BlueSpacing />
          <BlueButton disabled={this.state.newFeeRate <= this.state.feeRate} onPress={() => this.createTransaction()} title="Create" />
        </BlueCard>
      </SafeBlueArea>
    );
  }
}

CPFP.propTypes = {
  navigation: PropTypes.shape({
    popToTop: PropTypes.func,
    navigate: PropTypes.func,
  }),
  route: PropTypes.shape({
    params: PropTypes.shape({
      txid: PropTypes.string,
      wallet: PropTypes.object,
    }),
  }),
};

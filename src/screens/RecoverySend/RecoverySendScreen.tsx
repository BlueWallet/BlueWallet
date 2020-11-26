import { RouteProp, CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ECPair, address as btcAddress, payments, Transaction } from 'bitcoinjs-lib';
import { map, compose, flatten } from 'lodash/fp';
import React, { Component } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';

import { images, icons } from 'app/assets';
import { Header, ScreenTemplate, Button, InputItem, Image, WalletDropdown } from 'app/components';
import {
  CONST,
  Transaction as ITransaction,
  MainCardStackNavigatorParams,
  Route,
  RootStackParams,
  TransactionInput,
} from 'app/consts';
import { processAddressData } from 'app/helpers/DataProcessing';
import { loadTransactionsFees } from 'app/helpers/fees';
import { typography, palette } from 'app/styles';

import { HDSegwitP2SHArWallet, HDSegwitP2SHAirWallet } from '../../../class';
import config from '../../../config';
import { btcToSatoshi, satoshiToBtc } from '../../../utils/bitcoin';

const BigNumber = require('bignumber.js');

const i18n = require('../../../loc');

interface Props {
  navigation: CompositeNavigationProp<
    StackNavigationProp<RootStackParams, Route.MainCardStackNavigator>,
    StackNavigationProp<MainCardStackNavigatorParams, Route.RecoverySend>
  >;

  route: RouteProp<MainCardStackNavigatorParams, Route.RecoverySend>;
}

interface State {
  isLoading: boolean;
  memo: string;
  fee: number;
  address: string;
}

export class RecoverySendScreen extends Component<Props, State> {
  state = {
    isLoading: false,
    address: '',
    memo: '',
    fee: 1,
  };

  async componentDidMount() {
    const fee = await loadTransactionsFees();
    if (fee) {
      this.setState({ fee });
    }
  }

  renderSetTransactionFeeHeader = () => (
    <View style={{ alignItems: 'center' }}>
      <Text style={styles.setTransactionHeaderTitle}>{i18n.send.create.setTransactionFee}</Text>
      <Text style={styles.setTransactionHeaderDescription}>{i18n.send.create.headerText}</Text>
    </View>
  );

  validateTransaction = (): string | null => {
    const { fee: requestedSatPerByte, address } = this.state;

    if (!requestedSatPerByte || requestedSatPerByte < 1) {
      return i18n.send.details.fee_field_is_not_valid;
    }
    if (!address) {
      return i18n.send.details.address_field_is_not_valid;
    }
    if (address) {
      const addr = address.trim().toLowerCase();
      if (addr.startsWith('lnb') || addr.startsWith('lightning:lnb')) {
        return i18n.send.transaction.lightningError;
      }
    }

    try {
      btcAddress.toOutputScript(address, config.network);
    } catch (_) {
      return i18n.send.details.address_field_is_not_valid;
    }

    return null;
  };

  getActualSatoshi = (tx: string, feeSatoshi: any) =>
    new BigNumber(feeSatoshi).dividedBy(Math.round(tx.length / 2)).toNumber();

  increaseFee = ({
    feeSatoshi,
    requestedSatPerByte,
    actualSatoshiPerByte,
  }: {
    feeSatoshi: any;
    requestedSatPerByte: number;
    actualSatoshiPerByte: any;
  }) =>
    new BigNumber(feeSatoshi)
      .multipliedBy(requestedSatPerByte / actualSatoshiPerByte)
      .plus(10)
      .dividedBy(CONST.satoshiInBtc)
      .toNumber();

  isFeeEnough = ({
    actualSatoshiPerByte,
    requestedSatPerByte,
  }: {
    actualSatoshiPerByte: number;
    requestedSatPerByte: number;
  }) => !(Math.round(actualSatoshiPerByte) !== requestedSatPerByte || Math.floor(actualSatoshiPerByte) < 1);

  getTransactionsAmount = () => {
    const { transactions } = this.props.route.params;
    return transactions.reduce(
      (amount, transaction) => amount + transaction.inputs.reduce((inputsSum, input) => inputsSum + input.value, 0),
      0,
    );
  };

  getTransactionsPendingAmount = () => {
    const { transactions } = this.props.route.params;
    return transactions.reduce((sum: number, t: ITransaction) => sum + t.value, 0);
  };

  getUtxos = () => {
    const { transactions } = this.props.route.params;

    return compose(
      map((i: TransactionInput) => ({
        address: i.addresses[0],
        txid: i.txid,
        vout: i.vout,
        value: btcToSatoshi(i.value),
      })),
      flatten,
      map(({ inputs }) => inputs),
    )(transactions);
  };

  navigateToConfirm = ({
    fee,
    txDecoded,
    actualSatoshiPerByte,
    amount,
    amountWithFee,
  }: {
    fee: number;
    amount: number;
    txDecoded: Transaction;
    actualSatoshiPerByte: number;
    amountWithFee: number;
  }) => {
    const { memo, address } = this.state;
    const { wallet } = this.props.route.params;

    const pendingAmount = this.getTransactionsPendingAmount();

    const pendingAmountDecrease = amountWithFee - satoshiToBtc(-pendingAmount).toNumber();

    this.props.navigation.navigate(Route.SendCoinsConfirm, {
      recipients: [{ amount, address }],
      fee,
      memo,
      fromWallet: wallet,
      txDecoded,
      pendingAmountDecrease,
      satoshiPerByte: actualSatoshiPerByte.toFixed(2),
      headerTitle: i18n.send.recovery.recover,
      buttonTitle: i18n.send.confirm.cancelNow,
      successMsgDesc: i18n.message.cancelTxSuccess,
    });
  };

  createRecoveryTransaction = async (keyPairs: any) => {
    try {
      const { wallet } = this.props.route.params;
      const { fee: requestedSatPerByte, address } = this.state;

      let fee = 0.000001; // initial fee guess
      let actualSatoshiPerByte: any;
      let tx = '';
      const MAX_TRIES = 5;

      const utxos = this.getUtxos();

      const amount = this.getTransactionsAmount();

      let amountWithoutFee = 0;

      for (let tries = 0; tries < MAX_TRIES; tries++) {
        amountWithoutFee = amount - fee;

        const { tx: txHex, fee: feeSatoshi } = await wallet.createTx({
          utxos,
          amount: amountWithoutFee,
          fee,
          address,
          keyPairs,
          vaultTxType: payments.VaultTxType.Recovery,
        });
        tx = txHex;
        fee = satoshiToBtc(feeSatoshi).toNumber();

        actualSatoshiPerByte = this.getActualSatoshi(tx, feeSatoshi);

        if (this.isFeeEnough({ requestedSatPerByte, actualSatoshiPerByte })) {
          break;
        }

        fee = this.increaseFee({ feeSatoshi, requestedSatPerByte, actualSatoshiPerByte });
      }

      const txDecoded = Transaction.fromHex(tx);

      this.navigateToConfirm({ amountWithFee: amount, amount: amountWithoutFee, fee, txDecoded, actualSatoshiPerByte });
    } catch (_) {
      Alert.alert(i18n.wallets.errors.invalidSign);
    }
  };

  createRecoveryForAr = () => {
    const { navigation } = this.props;
    navigation.navigate(Route.RecoverySeed, {
      onSubmit: (keyPair: ECPair.ECPairInterface) => this.createRecoveryTransaction([keyPair]),
      buttonText: i18n.send.recovery.recover,
      subtitle: i18n.send.recovery.confirmSeed,
      description: i18n.send.recovery.confirmSeedDesc,
    });
  };

  navigateToProvideFirstRecoverySeedForAIR = (mnemonic?: Array<string>) => {
    const { navigation } = this.props;
    const { wallet, transactions } = this.props.route.params;
    navigation.navigate(Route.RecoverySeed, {
      onSubmit: (firstKeyPair: ECPair.ECPairInterface, receivedMnemonic: Array<string>) =>
        this.navigateToProvideSecondRecoverySeedForAIR(firstKeyPair, receivedMnemonic),
      buttonText: i18n.send.recovery.recover,
      onBackArrow: () => navigation.navigate(Route.RecoverySend, { wallet, transactions }),
      subtitle: i18n.send.recovery.confirmFirstSeed,
      description: i18n.send.recovery.confirmFirstSeedDesc,
      mnemonic,
    });
  };

  navigateToProvideSecondRecoverySeedForAIR = (firstKeyPair: ECPair.ECPairInterface, mnemonic: Array<string>) => {
    const { navigation } = this.props;
    navigation.goBack();

    navigation.navigate(Route.RecoverySeed, {
      onSubmit: (secondKeyPair: ECPair.ECPairInterface) =>
        this.createRecoveryTransaction([firstKeyPair, secondKeyPair]),
      onBackArrow: () => this.navigateToProvideFirstRecoverySeedForAIR(mnemonic),
      buttonText: i18n.send.recovery.recover,
      subtitle: i18n.send.recovery.confirmSecondSeed,
      description: i18n.send.recovery.confirmSecondSeedDesc,
    });
  };
  createRecoveryForAir = () => {
    this.navigateToProvideFirstRecoverySeedForAIR();
  };

  submit = () => {
    const {
      wallet: { type },
    } = this.props.route.params;

    switch (type) {
      case HDSegwitP2SHArWallet.type:
        return this.createRecoveryForAr();
      case HDSegwitP2SHAirWallet.type:
        return this.createRecoveryForAir();
      default:
        throw new Error(`Unsupported wallet type: ${type}`);
    }
  };

  renderFeeInput = () => {
    const { fee } = this.state;
    return (
      <InputItem
        label={i18n.transactions.details.transactioFee}
        suffix="Sat/B"
        keyboardType="numeric"
        value={fee.toString()}
        setValue={text => {
          const newFee = Number(text.replace(',', ''));
          this.setState({ fee: newFee });
        }}
      />
    );
  };
  processAddressData = (data: string) => {
    const { address } = processAddressData(data);

    this.setAddress(address);
  };

  setAddress = (address: string) => this.setState({ address: address.trim() });

  renderAddressInput = () => {
    const { address } = this.state;
    return (
      <InputItem
        multiline
        maxLength={CONST.maxAddressLength}
        label={i18n.contactDetails.addressLabel}
        style={styles.addressInput}
        value={address}
        setValue={text => this.setAddress(text.trim())}
      />
    );
  };

  setCurrentWalletAddress = () => {
    const { wallet } = this.props.route.params;
    this.setState({ address: wallet.getAddressForTransaction() });
  };

  canSubmit = () => {
    const { address, fee } = this.state;
    return !!(address && fee);
  };

  render() {
    const { wallet } = this.props.route.params;

    return (
      <ScreenTemplate
        footer={
          <Button
            title={i18n.send.details.next}
            onPress={this.submit}
            disabled={!this.canSubmit()}
            containerStyle={styles.buttonContainer}
          />
        }
        header={<Header isBackArrow title={i18n.send.recovery.recover} />}
      >
        <WalletDropdown balance={wallet.balance} label={wallet.label} unit={wallet.preferredBalanceUnit} />
        <View style={styles.inputsContainer}>
          {this.renderFeeInput()}

          <View style={styles.addressContainer}>
            {this.renderAddressInput()}
            <TouchableOpacity
              style={styles.addressBookIcon}
              onPress={() =>
                this.props.navigation.navigate(Route.ChooseContactList, {
                  onContactPress: this.setAddress,
                })
              }
            >
              <Image style={styles.icon} source={images.addressBook} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.qrCodeIcon}
              onPress={() =>
                this.props.navigation.navigate(Route.ScanQrCode, {
                  onBarCodeScan: this.processAddressData,
                })
              }
            >
              <Image style={styles.icon} source={icons.qrCode} />
            </TouchableOpacity>
          </View>
          <View style={styles.useOwnAddressContainer}>
            <TouchableOpacity onPress={this.setCurrentWalletAddress}>
              <Text style={styles.useOwnAddressText}>{i18n.send.recovery.useWalletAddress}</Text>
            </TouchableOpacity>
          </View>

          <InputItem label={i18n.send.details.note} setValue={memo => this.setState({ memo })} />
        </View>
      </ScreenTemplate>
    );
  }
}

export default RecoverySendScreen;

const styles = StyleSheet.create({
  useOwnAddressContainer: {
    marginTop: -5,
    marginBottom: 24,
    display: 'flex',
    alignItems: 'flex-end',
  },
  useOwnAddressText: {
    color: palette.textSecondary,
    ...typography.headline6,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  setTransactionHeaderTitle: {
    ...typography.headline4,
  },
  setTransactionHeaderDescription: {
    ...typography.caption,
    color: palette.textGrey,
    textAlign: 'center',
    paddingTop: 20,
    paddingBottom: 40,
  },
  inputsContainer: {},
  addressContainer: {},
  qrCodeIcon: { position: 'absolute', right: 0, bottom: 25 },
  addressBookIcon: { position: 'absolute', right: 40, bottom: 25 },
  icon: {
    width: 24,
    height: 24,
    padding: 8,
  },
  addressInput: {
    paddingEnd: 100,
  },
});

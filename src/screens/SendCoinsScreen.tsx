import { RouteProp, CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as bitcoin from 'bitcoinjs-lib';
import React, { Component } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';

import { images, icons } from 'app/assets';
import {
  Header,
  ScreenTemplate,
  Button,
  InputItem,
  StyledText,
  Image,
  RadioGroup,
  RadioButton,
  WalletDropdown,
} from 'app/components';
import { CONST, MainCardStackNavigatorParams, Route, RootStackParams, Utxo, Wallet } from 'app/consts';
import { processAddressData } from 'app/helpers/DataProcessing';
import { loadTransactionsFees } from 'app/helpers/fees';
import { typography, palette } from 'app/styles';

import BlueApp from '../../BlueApp';
import { HDSegwitBech32Wallet, HDSegwitP2SHArWallet, HDSegwitP2SHAirWallet, WatchOnlyWallet } from '../../class';
import config from '../../config';
import { BitcoinTransaction } from '../../models/bitcoinTransactionInfo';
import { btcToSatoshi, satoshiToBtc } from '../../utils/bitcoin';

const BigNumber = require('bignumber.js');

const i18n = require('../../loc');

interface Props {
  navigation: CompositeNavigationProp<
    StackNavigationProp<RootStackParams, Route.MainCardStackNavigator>,
    StackNavigationProp<MainCardStackNavigatorParams, Route.SendCoins>
  >;

  route: RouteProp<MainCardStackNavigatorParams, Route.SendCoins>;
}

interface State {
  isLoading: boolean;
  amount: number;
  wallet: any;
  transaction: BitcoinTransaction;
  memo: string;
  fee: number;
  vaultTxType: number;
}

export class SendCoinsScreen extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    const { route } = props;
    const { toAddress, fromWallet } = route.params;

    const wallets = BlueApp.getWallets();

    this.state = {
      isLoading: false,
      amount: 0,
      wallet: fromWallet || wallets[0],
      transaction: new BitcoinTransaction(toAddress),
      memo: '',
      fee: 1,
      vaultTxType: bitcoin.payments.VaultTxType.Alert,
    };
  }

  async componentDidMount() {
    const fee = await loadTransactionsFees();
    if (fee) {
      this.setState({ fee });
    }
  }

  chooseItemFromModal = (index: number) => {
    const wallets = BlueApp.getWallets();

    const wallet = wallets[index];
    this.setState({
      wallet,
    });
  };

  showModal = () => {
    const wallets = BlueApp.getWallets();
    const { wallet } = this.state;
    const selectedIndex = wallets.findIndex((w: Wallet) => w.label === wallet.label);
    this.props.navigation.navigate(Route.ActionSheet, {
      wallets,
      selectedIndex,
      onPress: this.chooseItemFromModal,
    });
  };

  saveTransactionFee = (fee: string) => {
    this.setState({ fee: Number(fee) });
  };

  renderSetTransactionFeeHeader = () => (
    <View style={{ alignItems: 'center' }}>
      <Text style={styles.setTransactionHeaderTitle}>{i18n.send.create.setTransactionFee}</Text>
      <Text style={styles.setTransactionHeaderDescription}>{i18n.send.create.headerText}</Text>
    </View>
  );

  setTransactionFee = () => {
    this.props.navigation.navigate(Route.EditText, {
      title: i18n.send.create.fee,
      label: i18n.send.create.amount,
      onSave: this.saveTransactionFee,
      value: this.state.amount?.toString(),
      header: this.renderSetTransactionFeeHeader(),
    });
  };

  getUnspentUtxos = (utxos: Utxo[]) => utxos.filter((u: Utxo) => u.spend_tx_num === 0);

  createHDBech32Transaction = async () => {
    /** @type {HDSegwitBech32Wallet} */
    const { transaction, wallet } = this.state;
    await wallet.fetchUtxos();
    const changeAddress = await wallet.getAddressForTransaction();
    const requestedSatPerByte: string | number = +this.state.fee.toString().replace(/\D/g, '');

    const targets: any[] = [];
    const amount = satoshiToBtc(transaction.amount).toNumber();
    if (amount > 0.0) {
      targets.push({ address: transaction.address, value: amount });
    }

    const { tx, fee } = await wallet.createTransaction(
      this.getUnspentUtxos(wallet.getUtxos()),
      targets,
      requestedSatPerByte,
      changeAddress,
    );

    BlueApp.tx_metadata = BlueApp.tx_metadata || {};
    BlueApp.tx_metadata[tx.getId()] = {
      txhex: tx.toHex(),
      memo: this.state.memo,
    };
    await BlueApp.saveToDisk();
    this.setState({ isLoading: false }, () =>
      this.props.navigation.navigate(Route.SendCoinsConfirm, {
        fee: btcToSatoshi(fee).toNumber(),
        memo: this.state.memo,
        fromWallet: wallet,
        txDecoded: tx,
        recipients: targets,
        satoshiPerByte: requestedSatPerByte,
      }),
    );
  };

  recalculateAvailableBalance(balance: number, amount: number, fee: number) {
    if (!amount) amount = 0;
    if (!fee) fee = 0;
    let availableBalance;
    try {
      availableBalance = new BigNumber(balance);
      availableBalance = availableBalance.div(CONST.satoshiInBtc); // sat2btc
      availableBalance = availableBalance.minus(amount);
      availableBalance = availableBalance.minus(fee);
      availableBalance = availableBalance.toString(10);
    } catch (err) {
      return balance;
    }

    return (availableBalance === 'NaN' && balance) || availableBalance;
  }

  validateTransaction = (): string | null => {
    const { fee: requestedSatPerByte, transaction, wallet } = this.state;

    if (!transaction.amount || transaction.amount <= 0) {
      return i18n.send.details.amount_field_is_not_valid;
    }
    if (!requestedSatPerByte || requestedSatPerByte < 1) {
      return i18n.send.details.fee_field_is_not_valid;
    }
    if (!transaction.address) {
      return i18n.send.details.address_field_is_not_valid;
    }
    if (this.recalculateAvailableBalance(wallet.getBalance(), transaction.amount, 0) < 0) {
      // first sanity check is that sending amount is not bigger than available balance
      return i18n.send.details.total_exceeds_balance;
    }
    if (transaction.address) {
      const address = transaction.address.trim().toLowerCase();
      if (address.startsWith('lnb') || address.startsWith('lightning:lnb')) {
        return i18n.send.transaction.lightningError;
      }
    }

    try {
      bitcoin.address.toOutputScript(transaction.address, config.network);
    } catch (_) {
      return i18n.send.details.address_field_is_not_valid;
    }

    return null;
  };

  getActualSatoshi = (tx: string, feeSatoshi: any) => feeSatoshi.dividedBy(Math.round(tx.length / 2)).toNumber();

  increaseFee = ({
    feeSatoshi,
    requestedSatPerByte,
    actualSatoshiPerByte,
  }: {
    feeSatoshi: any;
    requestedSatPerByte: number;
    actualSatoshiPerByte: any;
  }) =>
    feeSatoshi
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

  isAlert = (wallet: Wallet) => {
    const { type } = wallet;
    const { vaultTxType } = this.state;
    switch (type) {
      case HDSegwitP2SHArWallet.type:
        return true;
      case HDSegwitP2SHAirWallet.type:
        return vaultTxType === bitcoin.payments.VaultTxType.Alert;
      default:
        return false;
    }
  };

  navigateToConfirm = ({
    fee,
    txDecoded,
    actualSatoshiPerByte,
  }: {
    fee: number;
    txDecoded: bitcoin.Transaction;
    actualSatoshiPerByte: number;
  }) => {
    const { transaction, wallet, memo } = this.state;

    this.props.navigation.navigate(Route.SendCoinsConfirm, {
      recipients: [transaction],
      // HD wallet's utxo is in sats, classic segwit wallet utxos are in btc
      fee,
      txDecoded,
      isAlert: this.isAlert(wallet),
      memo,
      fromWallet: wallet,
      satoshiPerByte: actualSatoshiPerByte.toFixed(2),
    });
  };

  createStandardTransaction = async (createTx: Function) => {
    const { fee: requestedSatPerByte, transaction, memo, wallet } = this.state;
    await wallet.fetchUtxos();
    const utxos = wallet.getUtxos();
    const utxosUnspent = this.getUnspentUtxos(utxos);

    let fee = 0.000001; // initial fee guess
    let actualSatoshiPerByte: any;
    let tx = '';
    const MAX_TRIES = 5;

    for (let tries = 0; tries < MAX_TRIES; tries++) {
      tx = await createTx(utxosUnspent, transaction.amount, fee, transaction.address);

      const feeSatoshi = btcToSatoshi(fee);

      actualSatoshiPerByte = this.getActualSatoshi(tx, feeSatoshi);

      if (this.isFeeEnough({ requestedSatPerByte, actualSatoshiPerByte })) {
        break;
      }

      fee = this.increaseFee({ feeSatoshi, requestedSatPerByte, actualSatoshiPerByte });
    }

    const txDecoded = bitcoin.Transaction.fromHex(tx);
    const txid = txDecoded.getId();

    BlueApp.tx_metadata = BlueApp.tx_metadata || {};
    BlueApp.tx_metadata[txid] = {
      txhex: tx,
      memo,
    };

    await BlueApp.saveToDisk();
    this.setState({ isLoading: false }, () => this.navigateToConfirm({ fee, txDecoded, actualSatoshiPerByte }));
  };

  navigateToScanInstantPrivateKey = (onBarCodeScan: (privateKey: string) => void) => {
    const { navigation } = this.props;
    navigation.navigate(Route.IntegrateKey, {
      onBarCodeScan,
      title: i18n.send.transaction.scanInstantKeyTitle,
      description: i18n.send.transaction.scanInstantKeyDesc,
      withLink: false,
      headerTitle: i18n.wallets.dashboard.send,
    });
  };

  createTransactionByWallet = async (wallet: any) => {
    const { type } = wallet;
    switch (type) {
      case HDSegwitP2SHArWallet.type:
        return this.createStandardTransaction((utxos: Utxo[], amount: number, fee: number, address: string) =>
          wallet.createTx({
            utxos,
            amount,
            fee,
            address,
            vaultTxType: bitcoin.payments.VaultTxType.Alert,
          }),
        );
      case HDSegwitP2SHAirWallet.type:
        const { vaultTxType } = this.state;
        if (vaultTxType === bitcoin.payments.VaultTxType.Alert) {
          return this.createStandardTransaction((utxos: Utxo[], amount: number, fee: number, address: string) =>
            wallet.createTx({
              utxos,
              amount,
              fee,
              address,
              vaultTxType,
            }),
          );
        }
        if (vaultTxType === bitcoin.payments.VaultTxType.Instant) {
          this.setState({ isLoading: false });
          return this.navigateToScanInstantPrivateKey(async (instantPrivateKey: string) => {
            try {
              await this.createStandardTransaction((utxos: Utxo[], amount: number, fee: number, address: string) =>
                wallet.createTx({
                  utxos,
                  amount,
                  fee,
                  address,
                  vaultTxType,
                  privateKeys: [instantPrivateKey],
                }),
              );
            } catch (error) {
              Alert.alert(error.message);
            }
          });
        }

      case WatchOnlyWallet.type:
        throw new Error(i18n.send.transaction.watchOnlyError);
      case HDSegwitBech32Wallet.type:
        return this.createHDBech32Transaction();
      default:
        return this.createStandardTransaction((utxos: Utxo[], amount: number, fee: number, address: string) =>
          wallet.createTx(utxos, amount, fee, address),
        );
    }
  };

  confirmTransaction = async () => {
    this.setState({ isLoading: true });
    const { wallet } = this.state;
    const error = this.validateTransaction();

    if (error) {
      this.setState({ isLoading: false });
      Alert.alert(error);
      return;
    }
    try {
      await this.createTransactionByWallet(wallet);
    } catch (err) {
      Alert.alert(err.message);
      this.setState({ isLoading: false });
    }
  };

  renderAmountInput = () => {
    const { transaction } = this.state;
    return (
      <InputItem
        label={i18n.transactions.details.amount}
        suffix="BTCV"
        keyboardType="numeric"
        setValue={text => {
          const amount = Number(text.replace(',', '.'));
          this.setState({ transaction: { ...transaction, amount: !Number.isNaN(amount) ? amount : undefined } });
        }}
      />
    );
  };

  renderAddressInput = () => {
    const { transaction } = this.state;
    return (
      <InputItem
        multiline
        label={i18n.contactDetails.addressLabel}
        style={styles.addressInput}
        value={transaction.address}
        setValue={text => this.processAddressData(text.trim())}
      />
    );
  };

  /**
   * TODO: refactor this mess, get rid of regexp, use https://github.com/bitcoinjs/bitcoinjs-lib/issues/890 etc etc
   *
   * @param data {String} Can be address or `bitcoin:xxxxxxx` uri scheme, or invalid garbage
   */
  processAddressData = (data: string) => {
    const { transaction } = this.state;

    const newTransaction = processAddressData(data, transaction.amount);
    this.setState({
      transaction: newTransaction,
    });
    return newTransaction;
  };

  shouldShowVaultTransaction = () => {
    const { wallet } = this.state;
    return wallet.type === HDSegwitP2SHAirWallet.type;
  };

  onVaultTranscationSelect = (index: number, vaultTxType: number) => {
    this.setState({ vaultTxType });
  };

  renderVaultTransactions = () => {
    return (
      <View>
        <Text style={styles.radioButtonsTitle}>{i18n.send.transaction.type}</Text>
        <RadioGroup
          color={palette.secondary}
          onSelect={this.onVaultTranscationSelect}
          selectedIndex={this.state.vaultTxType}
        >
          <RadioButton style={styles.radioButton} value={bitcoin.payments.VaultTxType.Alert}>
            <View style={styles.radioButtonContent}>
              <Text style={styles.radioButtonTitle}>{i18n.send.transaction.alert}</Text>
              <Text style={styles.radioButtonSubtitle}>{i18n.send.transaction.alertDesc}</Text>
            </View>
          </RadioButton>
          <RadioButton style={styles.radioButton} value={bitcoin.payments.VaultTxType.Instant}>
            <View style={styles.radioButtonContent}>
              <Text style={styles.radioButtonTitle}>{i18n.send.transaction.instant}</Text>
              <Text style={styles.radioButtonSubtitle}>{i18n.send.transaction.instantDesc}</Text>
            </View>
          </RadioButton>
        </RadioGroup>
      </View>
    );
  };

  render() {
    const { wallet, fee, isLoading } = this.state;
    return (
      <ScreenTemplate
        footer={
          <Button
            title={i18n.send.details.next}
            onPress={this.confirmTransaction}
            containerStyle={styles.buttonContainer}
            disabled={isLoading}
          />
        }
        header={<Header navigation={this.props.navigation} isBackArrow title={i18n.send.header} />}
      >
        <WalletDropdown
          onSelectPress={this.showModal}
          balance={wallet.balance}
          label={wallet.label}
          unit={wallet.preferredBalanceUnit}
        />
        <View style={styles.inputsContainer}>
          {this.renderAmountInput()}

          <View style={styles.fee}>
            <Text>{i18n.send.details.fee}</Text>
            <StyledText title={`${fee} ${i18n.send.details.feeUnit}`} onPress={this.setTransactionFee} />
          </View>
          <View style={styles.addressContainer}>
            {this.renderAddressInput()}
            <TouchableOpacity
              style={styles.addressBookIcon}
              onPress={() =>
                this.props.navigation.navigate(Route.ChooseContactList, {
                  onContactPress: this.processAddressData,
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

          <InputItem label={i18n.send.details.note} setValue={memo => this.setState({ memo })} />

          {this.shouldShowVaultTransaction() && this.renderVaultTransactions()}
        </View>
      </ScreenTemplate>
    );
  }
}

const styles = StyleSheet.create({
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
  fee: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
  },
  addressContainer: {
    marginTop: 40,
  },
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
  radioButton: {
    paddingStart: 0,
    paddingVertical: 8,
  },
  radioButtonContent: {
    paddingStart: 10,
    top: -3,
  },
  radioButtonTitle: {
    ...typography.caption,
    marginBottom: 2,
  },
  radioButtonSubtitle: {
    ...typography.overline,
    color: palette.textGrey,
  },
  radioButtonsTitle: {
    ...typography.overline,
    color: palette.textGrey,
    marginBottom: 16,
  },
});

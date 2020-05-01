import React, { Component } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert, AsyncStorage } from 'react-native';
import { NavigationScreenProps, NavigationInjectedProps } from 'react-navigation';

import { images, icons } from 'app/assets';
import { Header, ScreenTemplate, Button, InputItem, StyledText, Image } from 'app/components';
import { Transaction, Route } from 'app/consts';
import { typography, palette } from 'app/styles';

import BlueApp from '../../BlueApp';
import BitcoinBIP70TransactionDecode from '../../bip70/bip70';
import { HDLegacyP2PKHWallet, HDSegwitBech32Wallet, HDSegwitP2SHWallet, WatchOnlyWallet } from '../../class';
import { BitcoinTransaction } from '../../models/bitcoinTransactionInfo';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import NetworkTransactionFees, { NetworkTransactionFee } from '../../models/networkTransactionFees';
import { DashboardHeader } from './Dashboard/DashboardHeader';

const BigNumber = require('bignumber.js');
const bip21 = require('bip21');
const bitcoin = require('bitcoinjs-lib');

const i18n = require('../../loc');

type Props = NavigationInjectedProps<{ fromSecret: string; fromAddress: string; fromWallet: any }>;

interface State {
  isLoading: boolean;
  amount: number;
  wallets: any;
  showSendMax: boolean;
  isFeeSelectionModalVisible: boolean;
  isAdvancedTransactionOptionsVisible: boolean;
  recipientsScrollIndex: number;
  fromAddress: string;
  fromWallet: any;
  fromSecret: string;
  addresses: any;
  memo: string;
  networkTransactionFees: any;
  fee: number;
  feeSliderValue: number;
  bip70TransactionExpiration: null;
  renderWalletSelectionButtonHidden: boolean;
}

export class SendCoinsScreen extends Component<Props, State> {
  static navigationOptions = (props: NavigationScreenProps<{ transaction: Transaction }>) => {
    return {
      header: <Header navigation={props.navigation} isBackArrow title={i18n.send.header} />,
    };
  };

  constructor(props: Props) {
    super(props);

    const { navigation } = props;
    let fromAddress = navigation.getParam('fromAddress');
    let fromSecret = navigation.getParam('fromSecret');
    let fromWallet = navigation.getParam('fromWallet');
    const wallets = BlueApp.getWallets();

    if (wallets.length === 0) {
      Alert.alert('Before creating a transaction, you must first add a Bitcoin wallet.');
      props.navigation.goBack(null);
    } else {
      if (!fromWallet && wallets.length > 0) {
        fromWallet = wallets[0];
        fromAddress = fromWallet.getAddress();
        fromSecret = fromWallet.getSecret();
      }
      this.state = {
        isLoading: false,
        amount: 0,
        wallets,
        showSendMax: false,
        isFeeSelectionModalVisible: false,
        isAdvancedTransactionOptionsVisible: false,
        recipientsScrollIndex: 0,
        fromAddress,
        fromWallet,
        fromSecret,
        addresses: [],
        memo: '',
        networkTransactionFees: new NetworkTransactionFee(1, 1, 1),
        fee: 1,
        feeSliderValue: 1,
        bip70TransactionExpiration: null,
        renderWalletSelectionButtonHidden: false,
      };
    }
  }

  async componentDidMount() {
    this.setState({
      addresses: [new BitcoinTransaction()],
      isLoading: false,
    });

    try {
      const cachedNetworkTransactionFees = JSON.parse(
        (await AsyncStorage.getItem(NetworkTransactionFee.StorageKey)) as string,
      );

      if (cachedNetworkTransactionFees && cachedNetworkTransactionFees.hasOwnProperty('halfHourFee')) {
        this.setState({
          fee: cachedNetworkTransactionFees.fastestFee,
          networkTransactionFees: cachedNetworkTransactionFees,
          feeSliderValue: cachedNetworkTransactionFees.fastestFee,
        });
      }
    } catch (_) {}

    try {
      const recommendedFees = await NetworkTransactionFees.recommendedFees();
      if (recommendedFees && recommendedFees.hasOwnProperty('fastestFee')) {
        await AsyncStorage.setItem(NetworkTransactionFee.StorageKey, JSON.stringify(recommendedFees));
        this.setState({
          fee: recommendedFees.fastestFee,
          networkTransactionFees: recommendedFees,
          feeSliderValue: recommendedFees.fastestFee,
        });
      } else {
        this.setState({ isLoading: false });
      }
    } catch (_e) {}
  }

  processBIP70Invoice = async (text: string) => {
    try {
      if (BitcoinBIP70TransactionDecode.matchesPaymentURL(text)) {
        return BitcoinBIP70TransactionDecode.decode(text)
          .then(response => {
            const recipient = new BitcoinTransaction(
              response.address,
              i18n.formatBalanceWithoutSuffix(response.amount, BitcoinUnit.BTC, false),
            );
            return {
              recipient,
              memo: response.memo,
              fee: response.fee,
              feeSliderValue: response.fee,
              bip70TransactionExpiration: response.expires,
            };
          })
          .catch(error => {
            Alert.alert(error.errorMessage);
            throw error;
          });
      }
    } catch (error) {
      return false;
    }
    throw new Error('BIP70: Unable to process.');
  };

  chooseItemFromModal = async (index: number) => {
    const wallets = BlueApp.getWallets();

    const wallet = wallets[index];
    const changeWallet = () => {
      this.setState({
        fromAddress: wallet.getAddress(),
        fromSecret: wallet.getSecret(),
        fromWallet: wallet,
      });
    };
    if (this.state.addresses.length > 1 && !wallet.allowBatchSend()) {
      Alert.alert(
        'Wallet Selection',
        `The selected wallet does not support sending Bitcoin to multiple recipients. Are you sure to want to select this wallet?`,
        [
          {
            text: i18n._.ok,
            onPress: async () => {
              const firstTransaction =
                this.state.addresses.find((element: any) => {
                  const feeSatoshi = new BigNumber(element.amount).multipliedBy(100000000);
                  return element.address.length > 0 && feeSatoshi > 0;
                }) || this.state.addresses[0];
              this.setState({ addresses: [firstTransaction], recipientsScrollIndex: 0 }, () => changeWallet());
            },
            style: 'default',
          },
          { text: i18n.send.details.cancel, onPress: () => {}, style: 'cancel' },
        ],
        { cancelable: false },
      );
    } else if (
      this.state.addresses.some((element: any) => element.amount === BitcoinUnit.MAX) &&
      !wallet.allowSendMax()
    ) {
      Alert.alert(
        'Wallet Selection',
        `The selected wallet does not support automatic maximum balance calculation. Are you sure to want to select this wallet?`,
        [
          {
            text: i18n._.ok,
            onPress: async () => {
              const firstTransaction =
                this.state.addresses.find((element: any) => {
                  return element.amount === BitcoinUnit.MAX;
                }) || this.state.addresses[0];
              firstTransaction.amount = 0;
              this.setState({ addresses: [firstTransaction], recipientsScrollIndex: 0 }, () => changeWallet());
            },
            style: 'default',
          },
          { text: i18n.send.details.cancel, style: 'cancel' },
        ],
        { cancelable: false },
      );
    } else {
      changeWallet();
    }
  };

  showModal = () => {
    const { wallets, fromWallet } = this.state;
    const selectedIndex = wallets.findIndex((wallet: any) => wallet.label === fromWallet.label);
    this.props.navigation.navigate(Route.ActionSheet, {
      wallets,
      selectedIndex,
      onPress: this.chooseItemFromModal,
    });
  };

  saveTransactionFee = (fee: number) => {
    this.setState({ fee });
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
      value: this.state.amount,
      header: this.renderSetTransactionFeeHeader(),
    });
  };

  createHDBech32Transaction = async () => {
    /** @type {HDSegwitBech32Wallet} */
    const wallet = this.state.fromWallet;
    await wallet.fetchUtxo();
    const firstTransaction = this.state.addresses[0];
    const changeAddress = await wallet.getAddressForTransaction();
    const satoshis = new BigNumber(firstTransaction.amount).multipliedBy(100000000).toNumber();
    const requestedSatPerByte = +this.state.fee.toString().replace(/\D/g, '');
    console.log({ satoshis, requestedSatPerByte, utxo: wallet.getUtxo() });

    let targets: any[] = [];
    for (const transaction of this.state.addresses) {
      const amount =
        transaction.amount === BitcoinUnit.MAX
          ? BitcoinUnit.MAX
          : new BigNumber(transaction.amount).multipliedBy(100000000).toNumber();
      if (amount > 0.0 || amount === BitcoinUnit.MAX) {
        targets.push({ address: transaction.address, value: amount });
        console.warn('createHDbech: ' + transaction.address, amount);
      }
    }

    if (firstTransaction.amount === BitcoinUnit.MAX) {
      targets = [{ address: firstTransaction.address, amount: BitcoinUnit.MAX }];
    }

    const { tx, fee, psbt } = wallet.createTransaction(wallet.getUtxo(), targets, requestedSatPerByte, changeAddress);

    if (wallet.type === WatchOnlyWallet.type) {
      // watch-only wallets with enabled HW wallet support have different flow. we have to show PSBT to user as QR code
      // so he can scan it and sign it. then we have to scan it back from user (via camera and QR code), and ask
      // user whether he wants to broadcast it

      this.setState({ isLoading: false }, () =>
        this.props.navigation.navigate('PsbtWithHardwareWallet', {
          memo: this.state.memo,
          fromWallet: wallet,
          psbt,
        }),
      );
      return;
    }

    BlueApp.tx_metadata = BlueApp.tx_metadata || {};
    BlueApp.tx_metadata[tx.getId()] = {
      txhex: tx.toHex(),
      memo: this.state.memo,
    };
    await BlueApp.saveToDisk();
    this.setState({ isLoading: false }, () =>
      this.props.navigation.navigate(Route.SendCoinsConfirm, {
        fee: new BigNumber(fee).dividedBy(100000000).toNumber(),
        memo: this.state.memo,
        fromWallet: wallet,
        tx: tx.toHex(),
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
      availableBalance = availableBalance.div(100000000); // sat2btc
      availableBalance = availableBalance.minus(amount);
      availableBalance = availableBalance.minus(fee);
      availableBalance = availableBalance.toString(10);
    } catch (err) {
      return balance;
    }

    return (availableBalance === 'NaN' && balance) || availableBalance;
  }

  calculateFee(utxos: any, txhex: any, utxoIsInSatoshis: any) {
    const index = {};
    let c = 1;
    index[0] = 0;
    for (const utxo of utxos) {
      if (!utxoIsInSatoshis) {
        utxo.value = new BigNumber(utxo.value).multipliedBy(100000000).toNumber();
      }
      index[c] = utxo.value + index[c - 1];
      c++;
    }

    const tx = bitcoin.Transaction.fromHex(txhex);
    const totalInput = index[tx.ins.length];
    // ^^^ dumb way to calculate total input. we assume that signer uses utxos sequentially
    // so total input == sum of yongest used inputs (and num of used inputs is `tx.ins.length`)
    // TODO: good candidate to refactor and move to appropriate class. some day

    let totalOutput = 0;
    for (const o of tx.outs) {
      totalOutput += o.value * 1;
    }

    return new BigNumber(totalInput - totalOutput).dividedBy(100000000).toNumber();
  }

  confirmTransaction = async () => {
    this.setState({ isLoading: true });
    let error: boolean | string = false;
    const requestedSatPerByte = this.state.fee.toString().replace(/\D/g, '');
    for (const [index, transaction] of this.state.addresses.entries()) {
      if (!transaction.amount || transaction.amount < 0 || parseFloat(transaction.amount) === 0) {
        error = i18n.send.details.amount_field_is_not_valid;
        console.log('validation error');
      } else if (!this.state.fee || !requestedSatPerByte || parseFloat(requestedSatPerByte) < 1) {
        error = i18n.send.details.fee_field_is_not_valid;
        console.log('validation error');
      } else if (!transaction.address) {
        error = i18n.send.details.address_field_is_not_valid;
        console.log('validation error');
      } else if (this.recalculateAvailableBalance(this.state.fromWallet.getBalance(), transaction.amount, 0) < 0) {
        // first sanity check is that sending amount is not bigger than available balance
        error = i18n.send.details.total_exceeds_balance;
        console.log('validation error');
      } else if (BitcoinBIP70TransactionDecode.isExpired(this.state.bip70TransactionExpiration)) {
        error = 'Transaction has expired.';
        console.log('validation error');
      } else if (transaction.address) {
        const address = transaction.address.trim().toLowerCase();
        if (address.startsWith('lnb') || address.startsWith('lightning:lnb')) {
          error =
            'This address appears to be for a Lightning invoice. Please, go to your Lightning wallet in order to make a payment for this invoice.';
          console.log('validation error');
        }
      }

      if (!error) {
        try {
          bitcoin.address.toOutputScript(transaction.address);
        } catch (err) {
          console.log('validation error');
          console.log(err);
          error = i18n.send.details.address_field_is_not_valid;
        }
      }
      if (error) {
        this.setState({ isLoading: false, recipientsScrollIndex: index });
        Alert.alert(error.toString());

        break;
      }
    }

    if (error) {
      return;
    }

    if (
      this.state.fromWallet.type === HDSegwitBech32Wallet.type ||
      this.state.fromWallet.type === WatchOnlyWallet.type
    ) {
      // new send is supported by BIP84 or watchonly with HW wallet support (it uses BIP84 under the hood anyway)
      try {
        await this.createHDBech32Transaction();
      } catch (Err) {
        this.setState({ isLoading: false }, () => {
          Alert.alert(Err.message);
          // ReactNativeHapticFeedback.trigger('notificationError', {
          //   ignoreAndroidSystemSettings: false,
          // });
        });
      }
      return;
    }

    // legacy send below

    this.setState({ isLoading: true }, async () => {
      let utxo: any;
      let actualSatoshiPerByte: any;
      let tx: any, txid: any;
      let tries = 1;
      let fee = 0.000001; // initial fee guess
      const firstTransaction = this.state.addresses[0];
      try {
        await this.state.fromWallet.fetchUtxo();
        utxo = this.state.fromWallet.utxo;
        do {
          console.log('try #', tries, 'fee=', fee);
          if (this.recalculateAvailableBalance(this.state.fromWallet.getBalance(), firstTransaction.amount, fee) < 0) {
            // we could not add any fee. user is trying to send all he's got. that wont work
            Alert.alert('wtf');
            // throw new Error(loc.send.details.total_exceeds_balance);
          }

          const startTime = Date.now();
          tx = this.state.fromWallet.createTx(
            utxo,
            firstTransaction.amount,
            fee,
            firstTransaction.address,
            this.state.memo,
          );
          const endTime = Date.now();
          console.log('create tx ', (endTime - startTime) / 1000, 'sec');

          const txDecoded = bitcoin.Transaction.fromHex(tx);
          txid = txDecoded.getId();
          console.log('txid', txid);
          console.log('txhex', tx);

          const feeSatoshi = new BigNumber(fee).multipliedBy(100000000);
          actualSatoshiPerByte = feeSatoshi.dividedBy(Math.round(tx.length / 2));
          actualSatoshiPerByte = actualSatoshiPerByte.toNumber();
          console.log({ satoshiPerByte: actualSatoshiPerByte });

          if (Math.round(actualSatoshiPerByte) !== requestedSatPerByte * 1 || Math.floor(actualSatoshiPerByte) < 1) {
            console.log('fee is not correct, retrying');
            fee = feeSatoshi
              .multipliedBy(requestedSatPerByte / actualSatoshiPerByte)
              .plus(10)
              .dividedBy(100000000)
              .toNumber();
          } else {
            break;
          }
        } while (tries++ < 5);

        BlueApp.tx_metadata = BlueApp.tx_metadata || {};
        BlueApp.tx_metadata[txid] = {
          txhex: tx,
          memo: this.state.memo,
        };
        await BlueApp.saveToDisk();
      } catch (err) {
        console.log(err);
        alert(err);
        this.setState({ isLoading: false });
        return;
      }

      this.setState({ isLoading: false }, () =>
        this.props.navigation.navigate(Route.SendCoinsConfirm, {
          recipients: [firstTransaction],
          // HD wallet's utxo is in sats, classic segwit wallet utxos are in btc
          fee: this.calculateFee(
            utxo,
            tx,
            this.state.fromWallet.type === HDSegwitP2SHWallet.type ||
              this.state.fromWallet.type === HDLegacyP2PKHWallet.type,
          ),
          memo: this.state.memo,
          fromWallet: this.state.fromWallet,
          tx: tx,
          satoshiPerByte: actualSatoshiPerByte.toFixed(2),
        }),
      );
    });
  };

  decodeBitcoinUri = (uri: string) => {
    let amount = '';
    let parsedBitcoinUri = null;
    let address = uri || '';
    let memo = '';
    try {
      parsedBitcoinUri = bip21.decode(uri);
      address = parsedBitcoinUri.hasOwnProperty('address') ? parsedBitcoinUri.address : address;
      if (parsedBitcoinUri.hasOwnProperty('options')) {
        if (parsedBitcoinUri.options.hasOwnProperty('amount')) {
          amount = parsedBitcoinUri.options.amount.toString();
          amount = parsedBitcoinUri.options.amount;
        }
        if (parsedBitcoinUri.options.hasOwnProperty('label')) {
          memo = parsedBitcoinUri.options.label || memo;
        }
      }
    } catch (_) {}
    return { address, amount, memo };
  };

  renderAmountInput = () => {
    const rows = [];
    for (const [index, item] of this.state.addresses.entries()) {
      rows.push(
        <InputItem
          label="Amount"
          suffix="BTCV"
          keyboardType="numeric"
          // setValue={amount => this.setState({ amount })}
          value={item.amount ? item.amount.toString() : null}
          setValue={text => {
            item.amount = text;
            const transactions = this.state.addresses;
            transactions[index] = item;
            this.setState({ addresses: transactions });
          }}
        />,
      );
    }
    return rows;
  };

  renderAddressInput = () => {
    const rows = [];
    for (const [index, item] of this.state.addresses.entries()) {
      rows.push(
        <InputItem
          multiline
          label="Address"
          style={styles.addressInput}
          value={this.state.addresses[index].address}
          setValue={async text => {
            text = text.trim();
            const transactions = this.state.addresses;
            try {
              const { recipient, memo, fee, feeSliderValue } = await this.processBIP70Invoice(text);
              transactions[index].address = recipient.address;
              transactions[index].amount = recipient.amount;
              this.setState({
                addresses: transactions,
                memo: memo,
                fee,
                feeSliderValue,
                isLoading: false,
              });
            } catch (_e) {
              const { address, amount, memo } = this.decodeBitcoinUri(text);
              item.address = address || text;
              item.amount = amount || item.amount;
              transactions[index] = item;
              this.setState({
                addresses: transactions,
                memo: memo || this.state.memo,
                isLoading: false,
                bip70TransactionExpiration: null,
              });
            }
          }}
        />,
      );
    }
    return rows;
  };

  /**
   * TODO: refactor this mess, get rid of regexp, use https://github.com/bitcoinjs/bitcoinjs-lib/issues/890 etc etc
   *
   * @param data {String} Can be address or `bitcoin:xxxxxxx` uri scheme, or invalid garbage
   */
  processAddressData = (data: string) => {
    const newAddresses = {
      address: data,
      amount: this.state.addresses[0].amount,
    };
    this.setState({
      addresses: [newAddresses],
    });
    return;
  };

  render() {
    const { fromWallet, fee, isLoading } = this.state;
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
      >
        <DashboardHeader
          onSelectPress={this.showModal}
          balance={fromWallet.balance}
          label={fromWallet.label}
          unit={fromWallet.preferredBalanceUnit}
        />
        <View style={styles.inputsContainer}>
          {this.renderAmountInput()}

          <View style={styles.fee}>
            <Text>{i18n.send.details.fee}</Text>
            <StyledText title={`${fee} ${i18n.send.details.feeUnit}`} onPress={this.setTransactionFee} />
          </View>
          <View style={styles.addressContainer}>
            {this.renderAddressInput()}
            <TouchableOpacity style={styles.addressBookIcon}>
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

          <InputItem label="Note (optional)" setValue={memo => this.setState({ memo })} />
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
  qrCodeIcon: { position: 'absolute', right: 0, bottom: 36 },
  addressBookIcon: { position: 'absolute', right: 40, bottom: 36 },
  icon: {
    width: 24,
    height: 24,
    padding: 8,
  },
  addressInput: {
    paddingEnd: 100,
  },
});

/* global alert */
import React, { Component } from 'react';
import {
  ActivityIndicator,
  View,
  TextInput,
  Alert,
  StatusBar,
  TouchableOpacity,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
  StyleSheet,
  Dimensions,
  Platform,
  ScrollView,
  Text,
} from 'react-native';
import { Icon } from 'react-native-elements';
import AsyncStorage from '@react-native-community/async-storage';
import {
  BlueCreateTxNavigationStyle,
  BlueButton,
  BlueBitcoinAmount,
  BlueAddressInput,
  BlueDismissKeyboardInputAccessory,
  BlueLoading,
  BlueUseAllFundsButton,
  BlueListItem,
  BlueText,
} from '../../BlueComponents';
import Slider from '@react-native-community/slider';
import PropTypes from 'prop-types';
import Modal from 'react-native-modal';
import NetworkTransactionFees, { NetworkTransactionFee } from '../../models/networkTransactionFees';
import BitcoinBIP70TransactionDecode from '../../bip70/bip70';
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import { HDLegacyP2PKHWallet, HDSegwitBech32Wallet, HDSegwitP2SHWallet, LightningCustodianWallet, WatchOnlyWallet } from '../../class';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { BitcoinTransaction } from '../../models/bitcoinTransactionInfo';
const bitcoin = require('bitcoinjs-lib');
const bip21 = require('bip21');
let BigNumber = require('bignumber.js');
const { width } = Dimensions.get('window');
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');

const btcAddressRx = /^[a-zA-Z0-9]{26,35}$/;

export default class SendDetails extends Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueCreateTxNavigationStyle(
      navigation,
      navigation.state.params.withAdvancedOptionsMenuButton,
      navigation.state.params.advancedOptionsMenuButtonAction,
    ),
    title: loc.send.header,
  });

  state = { isLoading: true };

  constructor(props) {
    super(props);

    this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this._keyboardDidShow);
    this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this._keyboardDidHide);

    let fromAddress;
    if (props.navigation.state.params) fromAddress = props.navigation.state.params.fromAddress;
    let fromSecret;
    if (props.navigation.state.params) fromSecret = props.navigation.state.params.fromSecret;
    let fromWallet = null;
    if (props.navigation.state.params) fromWallet = props.navigation.state.params.fromWallet;

    const wallets = BlueApp.getWallets().filter(wallet => wallet.type !== LightningCustodianWallet.type);

    if (wallets.length === 0) {
      alert('Before creating a transaction, you must first add a Bitcoin wallet.');
      return props.navigation.goBack(null);
    } else {
      if (!fromWallet && wallets.length > 0) {
        fromWallet = wallets[0];
        fromAddress = fromWallet.getAddress();
        fromSecret = fromWallet.getSecret();
      }
      this.state = {
        isLoading: false,
        showSendMax: false,
        isFeeSelectionModalVisible: false,
        isAdvancedTransactionOptionsVisible: false,
        isTransactionReplaceable: fromWallet.type === HDSegwitBech32Wallet.type,
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

  renderNavigationHeader() {
    this.props.navigation.setParams({
      withAdvancedOptionsMenuButton: this.state.fromWallet.allowBatchSend() || this.state.fromWallet.allowSendMax(),
      advancedOptionsMenuButtonAction: () => {
        Keyboard.dismiss();
        this.setState({ isAdvancedTransactionOptionsVisible: true });
      },
    });
  }

  /**
   * TODO: refactor this mess, get rid of regexp, use https://github.com/bitcoinjs/bitcoinjs-lib/issues/890 etc etc
   *
   * @param data {String} Can be address or `bitcoin:xxxxxxx` uri scheme, or invalid garbage
   */
  processAddressData = data => {
    this.setState({ isLoading: true }, async () => {
      if (BitcoinBIP70TransactionDecode.matchesPaymentURL(data)) {
        const bip70 = await this.processBIP70Invoice(data);
        this.setState({
          addresses: [bip70.recipient],
          memo: bip70.memo,
          feeSliderValue: bip70.feeSliderValue,
          fee: bip70.fee,
          isLoading: false,
          bip70TransactionExpiration: bip70.bip70TransactionExpiration,
        });
      } else {
        let recipients = this.state.addresses;
        const dataWithoutSchema = data.replace('bitcoin:', '');
        if (btcAddressRx.test(dataWithoutSchema) || (dataWithoutSchema.indexOf('bc1') === 0 && dataWithoutSchema.indexOf('?') === -1)) {
          recipients[[this.state.recipientsScrollIndex]].address = dataWithoutSchema;
          this.setState({
            address: recipients,
            bip70TransactionExpiration: null,
            isLoading: false,
          });
        } else {
          let address = '';
          let options;
          try {
            if (!data.toLowerCase().startsWith('bitcoin:')) {
              data = `bitcoin:${data}`;
            }
            const decoded = bip21.decode(data);
            address = decoded.address;
            options = decoded.options;
          } catch (error) {
            data = data.replace(/(amount)=([^&]+)/g, '').replace(/(amount)=([^&]+)&/g, '');
            const decoded = bip21.decode(data);
            decoded.options.amount = 0;
            address = decoded.address;
            options = decoded.options;
            this.setState({ isLoading: false });
          }
          console.log(options);
          if (btcAddressRx.test(address) || address.indexOf('bc1') === 0) {
            recipients[[this.state.recipientsScrollIndex]].address = address;
            recipients[[this.state.recipientsScrollIndex]].amount = options.amount;
            this.setState({
              addresses: recipients,
              memo: options.label || options.message,
              bip70TransactionExpiration: null,
              isLoading: false,
            });
          } else {
            this.setState({ isLoading: false });
          }
        }
      }
    });
  };

  async componentDidMount() {
    this.renderNavigationHeader();
    console.log('send/details - componentDidMount');
    StatusBar.setBarStyle('dark-content');
    let addresses = [];
    let initialMemo = '';
    if (this.props.navigation.state.params.uri) {
      const uri = this.props.navigation.state.params.uri;
      if (BitcoinBIP70TransactionDecode.matchesPaymentURL(uri)) {
        const { recipient, memo, fee, feeSliderValue } = await this.processBIP70Invoice(uri);
        addresses.push(recipient);
        initialMemo = memo;
        this.setState({ addresses, memo: initialMemo, fee, feeSliderValue, isLoading: false });
      } else {
        try {
          const { address, amount, memo } = this.decodeBitcoinUri(uri);
          addresses.push(new BitcoinTransaction(address, amount));
          initialMemo = memo;
          this.setState({ addresses, memo: initialMemo, isLoading: false });
        } catch (error) {
          console.log(error);
          alert('Error: Unable to decode Bitcoin address');
        }
      }
    } else if (this.props.navigation.state.params.address) {
      addresses.push(new BitcoinTransaction(this.props.navigation.state.params.address));
      if (this.props.navigation.state.params.memo) initialMemo = this.props.navigation.state.params.memo;
      this.setState({ addresses, memo: initialMemo, isLoading: false });
    } else {
      this.setState({ addresses: [new BitcoinTransaction()], isLoading: false });
    }

    try {
      const cachedNetworkTransactionFees = JSON.parse(await AsyncStorage.getItem(NetworkTransactionFee.StorageKey));

      if (cachedNetworkTransactionFees && cachedNetworkTransactionFees.hasOwnProperty('halfHourFee')) {
        this.setState({
          fee: cachedNetworkTransactionFees.fastestFee,
          networkTransactionFees: cachedNetworkTransactionFees,
          feeSliderValue: cachedNetworkTransactionFees.fastestFee,
        });
      }
    } catch (_) {}

    try {
      let recommendedFees = await NetworkTransactionFees.recommendedFees();
      if (recommendedFees && recommendedFees.hasOwnProperty('fastestFee')) {
        await AsyncStorage.setItem(NetworkTransactionFee.StorageKey, JSON.stringify(recommendedFees));
        this.setState({
          fee: recommendedFees.fastestFee,
          networkTransactionFees: recommendedFees,
          feeSliderValue: recommendedFees.fastestFee,
        });

        if (this.props.navigation.state.params.uri) {
          if (BitcoinBIP70TransactionDecode.matchesPaymentURL(this.props.navigation.state.params.uri)) {
            this.processBIP70Invoice(this.props.navigation.state.params.uri);
          } else {
            try {
              const { address, amount, memo } = this.decodeBitcoinUri(this.props.navigation.getParam('uri'));
              this.setState({ address, amount, memo, isLoading: false });
            } catch (error) {
              console.log(error);
              this.setState({ isLoading: false });
              alert('Error: Unable to decode Bitcoin address');
            }
          }
        }
      } else {
        this.setState({ isLoading: false });
      }
    } catch (_e) {}
  }

  componentWillUnmount() {
    this.keyboardDidShowListener.remove();
    this.keyboardDidHideListener.remove();
  }

  _keyboardDidShow = () => {
    this.setState({ renderWalletSelectionButtonHidden: true });
  };

  _keyboardDidHide = () => {
    this.setState({ renderWalletSelectionButtonHidden: false });
  };

  decodeBitcoinUri(uri) {
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
  }

  recalculateAvailableBalance(balance, amount, fee) {
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

  calculateFee(utxos, txhex, utxoIsInSatoshis) {
    let index = {};
    let c = 1;
    index[0] = 0;
    for (let utxo of utxos) {
      if (!utxoIsInSatoshis) {
        utxo.amount = new BigNumber(utxo.amount).multipliedBy(100000000).toNumber();
      }
      index[c] = utxo.amount + index[c - 1];
      c++;
    }

    let tx = bitcoin.Transaction.fromHex(txhex);
    let totalInput = index[tx.ins.length];
    // ^^^ dumb way to calculate total input. we assume that signer uses utxos sequentially
    // so total input == sum of yongest used inputs (and num of used inputs is `tx.ins.length`)
    // TODO: good candidate to refactor and move to appropriate class. some day

    let totalOutput = 0;
    for (let o of tx.outs) {
      totalOutput += o.value * 1;
    }

    return new BigNumber(totalInput - totalOutput).dividedBy(100000000).toNumber();
  }

  async processBIP70Invoice(text) {
    try {
      if (BitcoinBIP70TransactionDecode.matchesPaymentURL(text)) {
        Keyboard.dismiss();
        return BitcoinBIP70TransactionDecode.decode(text)
          .then(response => {
            const recipient = new BitcoinTransaction(
              response.address,
              loc.formatBalanceWithoutSuffix(response.amount, BitcoinUnit.BTC, false),
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
            alert(error.errorMessage);
            throw error;
          });
      }
    } catch (error) {
      return false;
    }
    throw new Error('BIP70: Unable to process.');
  }

  async createTransaction() {
    Keyboard.dismiss();
    this.setState({ isLoading: true });
    let error = false;
    let requestedSatPerByte = this.state.fee.toString().replace(/\D/g, '');
    for (const [index, transaction] of this.state.addresses.entries()) {
      if (!transaction.amount || transaction.amount < 0 || parseFloat(transaction.amount) === 0) {
        error = loc.send.details.amount_field_is_not_valid;
        console.log('validation error');
      } else if (!this.state.fee || !requestedSatPerByte || parseFloat(requestedSatPerByte) < 1) {
        error = loc.send.details.fee_field_is_not_valid;
        console.log('validation error');
      } else if (!transaction.address) {
        error = loc.send.details.address_field_is_not_valid;
        console.log('validation error');
      } else if (this.recalculateAvailableBalance(this.state.fromWallet.getBalance(), transaction.amount, 0) < 0) {
        // first sanity check is that sending amount is not bigger than available balance
        error = loc.send.details.total_exceeds_balance;
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
          error = loc.send.details.address_field_is_not_valid;
        }
      }
      if (error) {
        if (index === 0) {
          this.scrollView.scrollTo();
        } else if (index === this.state.addresses.length - 1) {
          this.scrollView.scrollToEnd();
        } else {
          const page = Math.round(width * (this.state.addresses.length - 2));
          this.scrollView.scrollTo({ x: page, y: 0, animated: true });
        }
        this.setState({ isLoading: false, recipientsScrollIndex: index });
        alert(error);
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
        break;
      }
    }

    if (error) {
      return;
    }

    if (this.state.fromWallet.type === HDSegwitBech32Wallet.type || this.state.fromWallet.type === WatchOnlyWallet.type) {
      // new send is supported by BIP84 or watchonly with HW wallet support (it uses BIP84 under the hood anyway)
      try {
        await this.createHDBech32Transaction();
      } catch (Err) {
        this.setState({ isLoading: false }, () => {
          alert(Err.message);
          ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
        });
      }
      return;
    }

    // legacy send below

    this.setState({ isLoading: true }, async () => {
      let utxo;
      let actualSatoshiPerByte;
      let tx, txid;
      let tries = 1;
      let fee = 0.000001; // initial fee guess
      const firstTransaction = this.state.addresses[0];
      try {
        await this.state.fromWallet.fetchUtxo();
        if (this.state.fromWallet.getChangeAddressAsync) {
          await this.state.fromWallet.getChangeAddressAsync(); // to refresh internal pointer to next free address
        }
        if (this.state.fromWallet.getAddressAsync) {
          await this.state.fromWallet.getAddressAsync(); // to refresh internal pointer to next free address
        }

        utxo = this.state.fromWallet.utxo;

        do {
          console.log('try #', tries, 'fee=', fee);
          if (this.recalculateAvailableBalance(this.state.fromWallet.getBalance(), firstTransaction.amount, fee) < 0) {
            // we could not add any fee. user is trying to send all he's got. that wont work
            throw new Error(loc.send.details.total_exceeds_balance);
          }

          let startTime = Date.now();
          tx = this.state.fromWallet.createTx(utxo, firstTransaction.amount, fee, firstTransaction.address, this.state.memo);
          let endTime = Date.now();
          console.log('create tx ', (endTime - startTime) / 1000, 'sec');

          let txDecoded = bitcoin.Transaction.fromHex(tx);
          txid = txDecoded.getId();
          console.log('txid', txid);
          console.log('txhex', tx);

          let feeSatoshi = new BigNumber(fee).multipliedBy(100000000);
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
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
        alert(err);
        this.setState({ isLoading: false });
        return;
      }
      this.props.navigation.navigate('Confirm', {
        recipients: [firstTransaction],
        // HD wallet's utxo is in sats, classic segwit wallet utxos are in btc
        fee: this.calculateFee(
          utxo,
          tx,
          this.state.fromWallet.type === HDSegwitP2SHWallet.type || this.state.fromWallet.type === HDLegacyP2PKHWallet.type,
        ),
        memo: this.state.memo,
        fromWallet: this.state.fromWallet,
        tx: tx,
        satoshiPerByte: actualSatoshiPerByte.toFixed(2),
      });
      this.setState({ isLoading: false });
    });
  }

  async createHDBech32Transaction() {
    /** @type {HDSegwitBech32Wallet} */
    const wallet = this.state.fromWallet;
    await wallet.fetchUtxo();
    const firstTransaction = this.state.addresses[0];
    const changeAddress = await wallet.getChangeAddressAsync();
    let satoshis = new BigNumber(firstTransaction.amount).multipliedBy(100000000).toNumber();
    const requestedSatPerByte = +this.state.fee.toString().replace(/\D/g, '');
    console.log({ satoshis, requestedSatPerByte, utxo: wallet.getUtxo() });

    let targets = [];
    for (const transaction of this.state.addresses) {
      const amount =
        transaction.amount === BitcoinUnit.MAX ? BitcoinUnit.MAX : new BigNumber(transaction.amount).multipliedBy(100000000).toNumber();
      if (amount > 0.0 || amount === BitcoinUnit.MAX) {
        targets.push({ address: transaction.address, value: amount });
      }
    }

    if (firstTransaction.amount === BitcoinUnit.MAX) {
      targets = [{ address: firstTransaction.address, amount: BitcoinUnit.MAX }];
    }

    let { tx, fee, psbt } = wallet.createTransaction(
      wallet.getUtxo(),
      targets,
      requestedSatPerByte,
      changeAddress,
      this.state.isTransactionReplaceable ? HDSegwitBech32Wallet.defaultRBFSequence : HDSegwitBech32Wallet.finalRBFSequence,
    );

    if (wallet.type === WatchOnlyWallet.type) {
      // watch-only wallets with enabled HW wallet support have different flow. we have to show PSBT to user as QR code
      // so he can scan it and sign it. then we have to scan it back from user (via camera and QR code), and ask
      // user whether he wants to broadcast it
      this.props.navigation.navigate('PsbtWithHardwareWallet', {
        memo: this.state.memo,
        fromWallet: wallet,
        psbt,
      });
      this.setState({ isLoading: false });
      return;
    }

    BlueApp.tx_metadata = BlueApp.tx_metadata || {};
    BlueApp.tx_metadata[tx.getId()] = {
      txhex: tx.toHex(),
      memo: this.state.memo,
    };
    await BlueApp.saveToDisk();
    this.props.navigation.navigate('Confirm', {
      fee: new BigNumber(fee).dividedBy(100000000).toNumber(),
      memo: this.state.memo,
      fromWallet: wallet,
      tx: tx.toHex(),
      recipients: targets,
      satoshiPerByte: requestedSatPerByte,
    });
    this.setState({ isLoading: false });
  }

  onWalletSelect = wallet => {
    const changeWallet = () => {
      this.setState({ fromAddress: wallet.getAddress(), fromSecret: wallet.getSecret(), fromWallet: wallet }, () => {
        this.renderNavigationHeader();
        this.props.navigation.pop();
      });
    };
    if (this.state.addresses.length > 1 && !wallet.allowBatchSend()) {
      ReactNativeHapticFeedback.trigger('notificationWarning');
      Alert.alert(
        'Wallet Selection',
        `The selected wallet does not support sending Bitcoin to multiple recipients. Are you sure to want to select this wallet?`,
        [
          {
            text: loc._.ok,
            onPress: async () => {
              const firstTransaction =
                this.state.addresses.find(element => {
                  const feeSatoshi = new BigNumber(element.amount).multipliedBy(100000000);
                  return element.address.length > 0 && feeSatoshi > 0;
                }) || this.state.addresses[0];
              this.setState({ addresses: [firstTransaction], recipientsScrollIndex: 0 }, () => changeWallet());
            },
            style: 'default',
          },
          { text: loc.send.details.cancel, onPress: () => {}, style: 'cancel' },
        ],
        { cancelable: false },
      );
    } else if (this.state.addresses.some(element => element.amount === BitcoinUnit.MAX) && !wallet.allowSendMax()) {
      ReactNativeHapticFeedback.trigger('notificationWarning');
      Alert.alert(
        'Wallet Selection',
        `The selected wallet does not support automatic maximum balance calculation. Are you sure to want to select this wallet?`,
        [
          {
            text: loc._.ok,
            onPress: async () => {
              const firstTransaction =
                this.state.addresses.find(element => {
                  return element.amount === BitcoinUnit.MAX;
                }) || this.state.addresses[0];
              firstTransaction.amount = 0;
              this.setState({ addresses: [firstTransaction], recipientsScrollIndex: 0 }, () => changeWallet());
            },
            style: 'default',
          },
          { text: loc.send.details.cancel, onPress: () => {}, style: 'cancel' },
        ],
        { cancelable: false },
      );
    } else {
      changeWallet();
    }
  };

  renderFeeSelectionModal = () => {
    return (
      <Modal
        isVisible={this.state.isFeeSelectionModalVisible}
        style={styles.bottomModal}
        onBackdropPress={() => {
          if (this.state.fee < 1 || this.state.feeSliderValue < 1) {
            this.setState({ fee: Number(1), feeSliderValue: Number(1) });
          }
          Keyboard.dismiss();
          this.setState({ isFeeSelectionModalVisible: false });
        }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.satoshisTextInput} onPress={() => this.textInput.focus()}>
              <TextInput
                keyboardType="numeric"
                ref={ref => {
                  this.textInput = ref;
                }}
                value={this.state.fee.toString()}
                onEndEditing={() => {
                  if (this.state.fee < 1 || this.state.feeSliderValue < 1) {
                    this.setState({ fee: Number(1), feeSliderValue: Number(1) });
                  }
                }}
                onChangeText={value => {
                  let newValue = value.replace(/\D/g, '');
                  this.setState({ fee: newValue, feeSliderValue: Number(newValue) });
                }}
                maxLength={9}
                editable={!this.state.isLoading}
                placeholderTextColor="#37c0a1"
                placeholder={this.state.networkTransactionFees.halfHourFee.toString()}
                style={{ fontWeight: '600', color: '#37c0a1', marginBottom: 0, marginRight: 4, textAlign: 'right', fontSize: 36 }}
                inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
              />
              <Text
                style={{
                  fontWeight: '600',
                  color: '#37c0a1',
                  paddingRight: 4,
                  textAlign: 'left',
                  fontSize: 16,
                  alignSelf: 'flex-end',
                  marginBottom: 14,
                }}
              >
                sat/b
              </Text>
            </TouchableOpacity>
            {this.state.networkTransactionFees.fastestFee > 1 && (
              <View style={{ flex: 1, marginTop: 32, minWidth: 240, width: 240 }}>
                <Slider
                  onValueChange={value => this.setState({ feeSliderValue: value.toFixed(0), fee: value.toFixed(0) })}
                  minimumValue={1}
                  maximumValue={Number(this.state.networkTransactionFees.fastestFee)}
                  value={Number(this.state.feeSliderValue)}
                  maximumTrackTintColor="#d8d8d8"
                  minimumTrackTintColor="#37c0a1"
                  style={{ flex: 1 }}
                />
                <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }}>
                  <Text style={{ fontWeight: '500', fontSize: 13, color: '#37c0a1' }}>slow</Text>
                  <Text style={{ fontWeight: '500', fontSize: 13, color: '#37c0a1' }}>fast</Text>
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  renderAdvancedTransactionOptionsModal = () => {
    const isSendMaxUsed = this.state.addresses.some(element => element.amount === BitcoinUnit.MAX);
    return (
      <Modal
        isVisible={this.state.isAdvancedTransactionOptionsVisible}
        style={styles.bottomModal}
        onBackdropPress={() => {
          Keyboard.dismiss();
          this.setState({ isAdvancedTransactionOptionsVisible: false });
        }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={styles.advancedTransactionOptionsModalContent}>
            {this.state.fromWallet.allowSendMax() && (
              <BlueListItem
                disabled={!(this.state.fromWallet.getBalance() > 0) || isSendMaxUsed}
                title="Use Full Balance"
                hideChevron
                component={TouchableOpacity}
                onPress={this.onUseAllPressed}
              />
            )}
            {this.state.fromWallet.type === HDSegwitBech32Wallet.type && (
              <BlueListItem
                title="Allow Fee Bump"
                hideChevron
                switchButton
                switched={this.state.isTransactionReplaceable}
                onSwitch={this.onReplaceableFeeSwitchValueChanged}
              />
            )}
            {this.state.fromWallet.allowBatchSend() && (
              <>
                <BlueListItem
                  disabled={isSendMaxUsed}
                  title="Add Recipient"
                  hideChevron
                  component={TouchableOpacity}
                  onPress={() => {
                    const addresses = this.state.addresses;
                    addresses.push(new BitcoinTransaction());
                    this.setState(
                      {
                        addresses,
                        isAdvancedTransactionOptionsVisible: false,
                      },
                      () => {
                        this.scrollView.scrollToEnd();
                        if (this.state.addresses.length > 1) this.scrollView.flashScrollIndicators();
                      },
                    );
                  }}
                />
                <BlueListItem
                  title="Remove Recipient"
                  hideChevron
                  disabled={this.state.addresses.length < 2}
                  component={TouchableOpacity}
                  onPress={() => {
                    const addresses = this.state.addresses;
                    addresses.splice(this.state.recipientsScrollIndex, 1);
                    this.setState(
                      {
                        addresses,
                        isAdvancedTransactionOptionsVisible: false,
                      },
                      () => {
                        if (this.state.addresses.length > 1) this.scrollView.flashScrollIndicators();
                        this.setState({ recipientsScrollIndex: this.scrollViewCurrentIndex });
                      },
                    );
                  }}
                />
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  onReplaceableFeeSwitchValueChanged = value => {
    this.setState({ isTransactionReplaceable: value });
  };

  renderCreateButton = () => {
    return (
      <View style={{ marginHorizontal: 56, marginVertical: 16, alignContent: 'center', backgroundColor: '#FFFFFF', minHeight: 44 }}>
        {this.state.isLoading ? <ActivityIndicator /> : <BlueButton onPress={() => this.createTransaction()} title={'Next'} />}
      </View>
    );
  };

  renderWalletSelectionButton = () => {
    if (this.state.renderWalletSelectionButtonHidden) return;
    return (
      <View style={{ marginBottom: 24, alignItems: 'center' }}>
        {!this.state.isLoading && (
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center' }}
            onPress={() =>
              this.props.navigation.navigate('SelectWallet', { onWalletSelect: this.onWalletSelect, chainType: Chain.ONCHAIN })
            }
          >
            <Text style={{ color: '#9aa0aa', fontSize: 14, marginRight: 8 }}>{loc.wallets.select_wallet.toLowerCase()}</Text>
            <Icon name="angle-right" size={18} type="font-awesome" color="#9aa0aa" />
          </TouchableOpacity>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 4 }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center' }}
            onPress={() =>
              this.props.navigation.navigate('SelectWallet', { onWalletSelect: this.onWalletSelect, chainType: Chain.ONCHAIN })
            }
          >
            <Text style={{ color: '#0c2550', fontSize: 14 }}>{this.state.fromWallet.getLabel()}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  handlePageChange = e => {
    Keyboard.dismiss();
    var offset = e.nativeEvent.contentOffset;
    if (offset) {
      const page = Math.round(offset.x / width);
      if (this.state.recipientsScrollIndex !== page) {
        this.setState({ recipientsScrollIndex: page });
      }
    }
  };

  scrollViewCurrentIndex = () => {
    Keyboard.dismiss();
    var offset = this.scrollView.contentOffset;
    if (offset) {
      const page = Math.round(offset.x / width);
      return page;
    }
    return 0;
  };

  renderBitcoinTransactionInfoFields = () => {
    let rows = [];
    for (let [index, item] of this.state.addresses.entries()) {
      rows.push(
        <View style={{ minWidth: width, maxWidth: width, width: width }}>
          <BlueBitcoinAmount
            isLoading={this.state.isLoading}
            amount={item.amount ? item.amount.toString() : null}
            onChangeText={text => {
              item.amount = text;
              const transactions = this.state.addresses;
              transactions[index] = item;
              this.setState({ addresses: transactions });
            }}
            inputAccessoryViewID={this.state.fromWallet.allowSendMax() ? BlueUseAllFundsButton.InputAccessoryViewID : null}
            onFocus={() => this.setState({ isAmountToolbarVisibleForAndroid: true })}
            onBlur={() => this.setState({ isAmountToolbarVisibleForAndroid: false })}
          />
          <BlueAddressInput
            onChangeText={async text => {
              text = text.trim();
              let transactions = this.state.addresses;
              try {
                const { recipient, memo, fee, feeSliderValue } = await this.processBIP70Invoice(text);
                transactions[index].address = recipient.address;
                transactions[index].amount = recipient.amount;
                this.setState({ addresses: transactions, memo: memo, fee, feeSliderValue, isLoading: false });
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
            onBarScanned={this.processAddressData}
            address={item.address}
            isLoading={this.state.isLoading}
            inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
            launchedBy={this.props.navigation.state.routeName}
          />
          {this.state.addresses.length > 1 && (
            <BlueText style={{ alignSelf: 'flex-end', marginRight: 18, marginVertical: 8 }}>
              {index + 1} of {this.state.addresses.length}
            </BlueText>
          )}
        </View>,
      );
    }
    return rows;
  };

  onUseAllPressed = () => {
    ReactNativeHapticFeedback.trigger('notificationWarning');
    Alert.alert(
      'Use full balance',
      `Are you sure you want to use your wallet's full balance for this transaction? ${
        this.state.addresses.length > 1 ? 'Your other recipients will be removed from this transaction.' : ''
      }`,
      [
        {
          text: loc._.ok,
          onPress: async () => {
            Keyboard.dismiss();
            const recipient = this.state.addresses[this.state.recipientsScrollIndex];
            recipient.amount = BitcoinUnit.MAX;
            this.setState({ addresses: [recipient], recipientsScrollIndex: 0, isAdvancedTransactionOptionsVisible: false });
          },
          style: 'default',
        },
        { text: loc.send.details.cancel, onPress: () => {}, style: 'cancel' },
      ],
      { cancelable: false },
    );
  };

  render() {
    if (this.state.isLoading || typeof this.state.fromWallet === 'undefined') {
      return (
        <View style={{ flex: 1, paddingTop: 20 }}>
          <BlueLoading />
        </View>
      );
    }
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1, justifyContent: 'space-between' }}>
          <View>
            <KeyboardAvoidingView behavior="position">
              <ScrollView
                pagingEnabled
                horizontal
                contentContainerStyle={{ flexWrap: 'wrap', flexDirection: 'row' }}
                ref={ref => (this.scrollView = ref)}
                onContentSizeChange={() => this.scrollView.scrollToEnd()}
                onLayout={() => this.scrollView.scrollToEnd()}
                onMomentumScrollEnd={this.handlePageChange}
                scrollEnabled={this.state.addresses.length > 1}
                scrollIndicatorInsets={{ top: 0, left: 8, bottom: 0, right: 8 }}
              >
                {this.renderBitcoinTransactionInfoFields()}
              </ScrollView>
              <View
                hide={!this.state.showMemoRow}
                style={{
                  flexDirection: 'row',
                  borderColor: '#d2d2d2',
                  borderBottomColor: '#d2d2d2',
                  borderWidth: 1.0,
                  borderBottomWidth: 0.5,
                  backgroundColor: '#f5f5f5',
                  minHeight: 44,
                  height: 44,
                  marginHorizontal: 20,
                  alignItems: 'center',
                  marginVertical: 8,
                  borderRadius: 4,
                }}
              >
                <TextInput
                  onChangeText={text => this.setState({ memo: text })}
                  placeholder={loc.send.details.note_placeholder}
                  value={this.state.memo}
                  numberOfLines={1}
                  style={{ flex: 1, marginHorizontal: 8, minHeight: 33 }}
                  editable={!this.state.isLoading}
                  onSubmitEditing={Keyboard.dismiss}
                  inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
                />
              </View>
              <TouchableOpacity
                onPress={() => this.setState({ isFeeSelectionModalVisible: true })}
                disabled={this.state.isLoading}
                style={{ flexDirection: 'row', marginHorizontal: 20, justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Text style={{ color: '#81868e', fontSize: 14 }}>Fee</Text>
                <View
                  style={{
                    backgroundColor: '#d2f8d6',
                    minWidth: 40,
                    height: 25,
                    borderRadius: 4,
                    justifyContent: 'space-between',
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 10,
                  }}
                >
                  <Text style={{ color: '#37c0a1', marginBottom: 0, marginRight: 4, textAlign: 'right' }}>{this.state.fee}</Text>
                  <Text style={{ color: '#37c0a1', paddingRight: 4, textAlign: 'left' }}>sat/b</Text>
                </View>
              </TouchableOpacity>
              {this.renderCreateButton()}
              {this.renderFeeSelectionModal()}
              {this.renderAdvancedTransactionOptionsModal()}
            </KeyboardAvoidingView>
          </View>
          <BlueDismissKeyboardInputAccessory />
          {Platform.select({
            ios: <BlueUseAllFundsButton onUseAllPressed={this.onUseAllPressed} wallet={this.state.fromWallet} />,
            android: this.state.isAmountToolbarVisibleForAndroid && (
              <BlueUseAllFundsButton onUseAllPressed={this.onUseAllPressed} wallet={this.state.fromWallet} />
            ),
          })}

          {this.renderWalletSelectionButton()}
        </View>
      </TouchableWithoutFeedback>
    );
  }
}

const styles = StyleSheet.create({
  modalContent: {
    backgroundColor: '#FFFFFF',
    padding: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    minHeight: 200,
    height: 200,
  },
  advancedTransactionOptionsModalContent: {
    backgroundColor: '#FFFFFF',
    padding: 22,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    minHeight: 130,
  },
  bottomModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  satoshisTextInput: {
    backgroundColor: '#d2f8d6',
    minWidth: 127,
    height: 60,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
});

SendDetails.propTypes = {
  navigation: PropTypes.shape({
    pop: PropTypes.func,
    goBack: PropTypes.func,
    navigate: PropTypes.func,
    getParam: PropTypes.func,
    setParams: PropTypes.func,
    state: PropTypes.shape({
      routeName: PropTypes.string,
      params: PropTypes.shape({
        amount: PropTypes.number,
        address: PropTypes.string,
        fromAddress: PropTypes.string,
        satoshiPerByte: PropTypes.string,
        fromSecret: PropTypes.fromSecret,
        fromWallet: PropTypes.fromWallet,
        memo: PropTypes.string,
        uri: PropTypes.string,
      }),
    }),
  }),
};

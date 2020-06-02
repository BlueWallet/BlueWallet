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
import { AppStorage, HDSegwitBech32Wallet, LightningCustodianWallet, WatchOnlyWallet } from '../../class';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { BitcoinTransaction } from '../../models/bitcoinTransactionInfo';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
const bitcoin = require('bitcoinjs-lib');
let BigNumber = require('bignumber.js');
const { width } = Dimensions.get('window');
let BlueApp: AppStorage = require('../../BlueApp');
let loc = require('../../loc');

const btcAddressRx = /^[a-zA-Z0-9]{26,35}$/;

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    paddingTop: 20,
  },
  root: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  scrollViewContent: {
    flexWrap: 'wrap',
    flexDirection: 'row',
  },
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
  feeSliderInput: {
    backgroundColor: '#d2f8d6',
    minWidth: 127,
    height: 60,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  feeSliderText: {
    fontWeight: '600',
    color: '#37c0a1',
    marginBottom: 0,
    marginRight: 4,
    textAlign: 'right',
    fontSize: 36,
  },
  feeSliderUnit: {
    fontWeight: '600',
    color: '#37c0a1',
    paddingRight: 4,
    textAlign: 'left',
    fontSize: 16,
    alignSelf: 'flex-end',
    marginBottom: 14,
  },
  sliderContainer: {
    flex: 1,
    marginTop: 32,
    minWidth: 240,
    width: 240,
  },
  slider: {
    flex: 1,
  },
  sliderLabels: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  sliderLabel: {
    fontWeight: '500',
    fontSize: 13,
    color: '#37c0a1',
  },
  createButton: {
    marginHorizontal: 56,
    marginVertical: 16,
    alignContent: 'center',
    backgroundColor: '#FFFFFF',
    minHeight: 44,
  },
  select: {
    marginBottom: 24,
    alignItems: 'center',
  },
  selectTouch: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectText: {
    color: '#9aa0aa',
    fontSize: 14,
    marginRight: 8,
  },
  selectWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  selectLabel: {
    color: '#0c2550',
    fontSize: 14,
  },
  of: {
    alignSelf: 'flex-end',
    marginRight: 18,
    marginVertical: 8,
  },
  memo: {
    flexDirection: 'row',
    borderColor: '#d2d2d2',
    borderBottomColor: '#d2d2d2',
    borderWidth: 1,
    borderBottomWidth: 0.5,
    backgroundColor: '#f5f5f5',
    minHeight: 44,
    height: 44,
    marginHorizontal: 20,
    alignItems: 'center',
    marginVertical: 8,
    borderRadius: 4,
  },
  memoText: {
    flex: 1,
    marginHorizontal: 8,
    minHeight: 33,
  },
  fee: {
    flexDirection: 'row',
    marginHorizontal: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeLabel: {
    color: '#81868e',
    fontSize: 14,
  },
  feeRow: {
    backgroundColor: '#d2f8d6',
    minWidth: 40,
    height: 25,
    borderRadius: 4,
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  feeValue: {
    color: '#37c0a1',
    marginBottom: 0,
    marginRight: 4,
    textAlign: 'right',
  },
  feeUnit: {
    color: '#37c0a1',
    paddingRight: 4,
    textAlign: 'left',
  },
});

export default class SendDetails extends Component {
  static navigationOptions = ({ navigation, route }) => ({
    ...BlueCreateTxNavigationStyle(navigation, route.params.withAdvancedOptionsMenuButton, route.params.advancedOptionsMenuButtonAction),
    title: loc.send.header,
  });

  state = { isLoading: true };

  constructor(props) {
    super(props);

    this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this._keyboardDidShow);
    this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this._keyboardDidHide);

    /** @type {LegacyWallet} */
    let fromWallet = null;
    if (props.route.params) fromWallet = props.route.params.fromWallet;

    const wallets = BlueApp.getWallets().filter(wallet => wallet.type !== LightningCustodianWallet.type);

    if (wallets.length === 0) {
      alert('Before creating a transaction, you must first add a Bitcoin wallet.');
      return props.navigation.goBack(null);
    } else {
      if (!fromWallet && wallets.length > 0) {
        fromWallet = wallets[0];
      }
      this.state = {
        isLoading: false,
        showSendMax: false,
        isFeeSelectionModalVisible: false,
        isAdvancedTransactionOptionsVisible: false,
        isTransactionReplaceable: fromWallet.type === HDSegwitBech32Wallet.type,
        recipientsScrollIndex: 0,
        fromWallet,
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
        console.warn('2');
        let recipients = this.state.addresses;
        const dataWithoutSchema = data.replace('bitcoin:', '').replace('BITCOIN:', '');
        if (this.state.fromWallet.isAddressValid(dataWithoutSchema)) {
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
            const decoded = DeeplinkSchemaMatch.bip21decode(data);
            address = decoded.address;
            options = decoded.options;
          } catch (error) {
            data = data.replace(/(amount)=([^&]+)/g, '').replace(/(amount)=([^&]+)&/g, '');
            const decoded = DeeplinkSchemaMatch.bip21decode(data);
            decoded.options.amount = 0;
            address = decoded.address;
            options = decoded.options;
            this.setState({ isLoading: false });
          }
          console.log(options);
          if (btcAddressRx.test(address) || address.indexOf('bc1') === 0 || address.indexOf('BC1') === 0) {
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
    if (this.props.route.params.uri) {
      const uri = this.props.route.params.uri;
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
    } else if (this.props.route.params.address) {
      addresses.push(new BitcoinTransaction(this.props.route.params.address));
      if (this.props.route.params.memo) initialMemo = this.props.route.params.memo;
      this.setState({ addresses, memo: initialMemo, isLoading: false });
    } else {
      this.setState({ addresses: [new BitcoinTransaction()], isLoading: false });
    }

    try {
      const cachedNetworkTransactionFees = JSON.parse(await AsyncStorage.getItem(NetworkTransactionFee.StorageKey));

      if (cachedNetworkTransactionFees && cachedNetworkTransactionFees.hasOwnProperty('mediumFee')) {
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

        if (this.props.route.params.uri) {
          if (BitcoinBIP70TransactionDecode.matchesPaymentURL(this.props.route.params.uri)) {
            this.processBIP70Invoice(this.props.route.params.uri);
          } else {
            try {
              const { address, amount, memo } = this.decodeBitcoinUri(this.props.route.params.uri);
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
    this.setState({ renderWalletSelectionButtonHidden: true, isAmountToolbarVisibleForAndroid: true });
  };

  _keyboardDidHide = () => {
    this.setState({ renderWalletSelectionButtonHidden: false, isAmountToolbarVisibleForAndroid: false });
  };

  decodeBitcoinUri(uri) {
    let amount = '';
    let parsedBitcoinUri = null;
    let address = uri || '';
    let memo = '';
    try {
      parsedBitcoinUri = DeeplinkSchemaMatch.bip21decode(uri);
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

    try {
      await this.createPsbtTransaction();
    } catch (Err) {
      this.setState({ isLoading: false }, () => {
        alert(Err.message);
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
      });
    }
  }

  async createPsbtTransaction() {
    /** @type {HDSegwitBech32Wallet} */
    const wallet = this.state.fromWallet;
    await wallet.fetchUtxo();
    const changeAddress = await wallet.getChangeAddressAsync();
    const requestedSatPerByte = +this.state.fee.toString().replace(/\D/g, '');
    console.log({ requestedSatPerByte, utxo: wallet.getUtxo() });

    let targets = [];
    for (const transaction of this.state.addresses) {
      if (transaction.amount === BitcoinUnit.MAX) {
        // single output with MAX
        targets = [{ address: transaction.address }];
        break;
      }
      const value = new BigNumber(transaction.amount).multipliedBy(100000000).toNumber();
      if (value > 0) {
        targets.push({ address: transaction.address, value });
      }
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
      this.setState({ fromWallet: wallet }, () => {
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
            <TouchableOpacity style={styles.feeSliderInput} onPress={() => this.textInput.focus()}>
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
                placeholder={this.state.networkTransactionFees.mediumFee.toString()}
                style={styles.feeSliderText}
                inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
              />
              <Text style={styles.feeSliderUnit}>sat/b</Text>
            </TouchableOpacity>
            {this.state.networkTransactionFees.fastestFee > 1 && (
              <View style={styles.sliderContainer}>
                <Slider
                  onValueChange={value => this.setState({ feeSliderValue: value.toFixed(0), fee: value.toFixed(0) })}
                  minimumValue={1}
                  maximumValue={Number(this.state.networkTransactionFees.fastestFee)}
                  value={Number(this.state.feeSliderValue)}
                  maximumTrackTintColor="#d8d8d8"
                  minimumTrackTintColor="#37c0a1"
                  style={styles.slider}
                />
                <View style={styles.sliderLabels}>
                  <Text style={styles.sliderLabel}>slow</Text>
                  <Text style={styles.sliderLabel}>fast</Text>
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  importTransaction = async () => {
    try {
      const res = await DocumentPicker.pick({
        type: Platform.OS === 'ios' ? ['io.bluewallet.psbt', 'io.bluewallet.psbt.txn'] : [DocumentPicker.types.allFiles],
      });
      if (DeeplinkSchemaMatch.isPossiblyPSBTFile(res.uri)) {
        const file = await RNFS.readFile(res.uri, 'ascii');
        const bufferDecoded = Buffer.from(file, 'ascii').toString('base64');
        if (bufferDecoded) {
          if (this.state.fromWallet.type === WatchOnlyWallet.type) {
            // watch-only wallets with enabled HW wallet support have different flow. we have to show PSBT to user as QR code
            // so he can scan it and sign it. then we have to scan it back from user (via camera and QR code), and ask
            // user whether he wants to broadcast it.
            // alternatively, user can export psbt file, sign it externally and then import it
            this.props.navigation.navigate('PsbtWithHardwareWallet', {
              memo: this.state.memo,
              fromWallet: this.state.fromWallet,
              psbt: file,
              isFirstPSBTAlreadyBase64: true,
            });
            this.setState({ isLoading: false });
            return;
          }
        } else {
          throw new Error();
        }
      } else if (DeeplinkSchemaMatch.isTXNFile(res.uri)) {
        const file = await RNFS.readFile(res.uri, 'ascii');
        this.props.navigation.navigate('PsbtWithHardwareWallet', {
          memo: this.state.memo,
          fromWallet: this.state.fromWallet,
          txhex: file,
        });
        this.setState({ isLoading: false, isAdvancedTransactionOptionsVisible: false });
        return;
      }
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        alert('The selected file does not contain a signed transaction that can be imported.');
      }
    }
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
                Component={TouchableWithoutFeedback}
                switch={{ value: this.state.isTransactionReplaceable, onValueChange: this.onReplaceableFeeSwitchValueChanged }}
              />
            )}
            {this.state.fromWallet.type === WatchOnlyWallet.type &&
              this.state.fromWallet.isHd() &&
              this.state.fromWallet.getSecret().startsWith('zpub') && (
                <BlueListItem title="Import Transaction" hideChevron component={TouchableOpacity} onPress={this.importTransaction} />
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
      <View style={styles.createButton}>
        {this.state.isLoading ? (
          <ActivityIndicator />
        ) : (
          <BlueButton onPress={() => this.createTransaction()} title={'Next'} testID={'CreateTransactionButton'} />
        )}
      </View>
    );
  };

  renderWalletSelectionButton = () => {
    if (this.state.renderWalletSelectionButtonHidden) return;
    return (
      <View style={styles.select}>
        {!this.state.isLoading && (
          <TouchableOpacity
            style={styles.selectTouch}
            onPress={() =>
              this.props.navigation.navigate('SelectWallet', { onWalletSelect: this.onWalletSelect, chainType: Chain.ONCHAIN })
            }
          >
            <Text style={styles.selectText}>{loc.wallets.select_wallet.toLowerCase()}</Text>
            <Icon name="angle-right" size={18} type="font-awesome" color="#9aa0aa" />
          </TouchableOpacity>
        )}
        <View style={styles.selectWrap}>
          <TouchableOpacity
            style={styles.selectTouch}
            onPress={() =>
              this.props.navigation.navigate('SelectWallet', { onWalletSelect: this.onWalletSelect, chainType: Chain.ONCHAIN })
            }
          >
            <Text style={styles.selectLabel}>{this.state.fromWallet.getLabel()}</Text>
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
        <View key={index} style={{ minWidth: width, maxWidth: width, width: width }}>
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
            launchedBy={this.props.route.name}
          />
          {this.state.addresses.length > 1 && (
            <BlueText style={styles.of}>
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
        <View style={styles.loading}>
          <BlueLoading />
        </View>
      );
    }
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.root}>
          <View>
            <KeyboardAvoidingView behavior="position">
              <ScrollView
                pagingEnabled
                horizontal
                contentContainerStyle={styles.scrollViewContent}
                ref={ref => (this.scrollView = ref)}
                onContentSizeChange={() => this.scrollView.scrollToEnd()}
                onLayout={() => this.scrollView.scrollToEnd()}
                onMomentumScrollEnd={this.handlePageChange}
                scrollEnabled={this.state.addresses.length > 1}
                scrollIndicatorInsets={{ top: 0, left: 8, bottom: 0, right: 8 }}
              >
                {this.renderBitcoinTransactionInfoFields()}
              </ScrollView>
              <View hide={!this.state.showMemoRow} style={styles.memo}>
                <TextInput
                  onChangeText={text => this.setState({ memo: text })}
                  placeholder={loc.send.details.note_placeholder}
                  value={this.state.memo}
                  numberOfLines={1}
                  style={styles.memoText}
                  editable={!this.state.isLoading}
                  onSubmitEditing={Keyboard.dismiss}
                  inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
                />
              </View>
              <TouchableOpacity
                onPress={() => this.setState({ isFeeSelectionModalVisible: true })}
                disabled={this.state.isLoading}
                style={styles.fee}
              >
                <Text style={styles.feeLabel}>Fee</Text>
                <View style={styles.feeRow}>
                  <Text style={styles.feeValue}>{this.state.fee}</Text>
                  <Text style={styles.feeUnit}>sat/b</Text>
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

SendDetails.propTypes = {
  navigation: PropTypes.shape({
    pop: PropTypes.func,
    goBack: PropTypes.func,
    navigate: PropTypes.func,
    setParams: PropTypes.func,
  }),
  route: PropTypes.shape({
    name: PropTypes.string,
    params: PropTypes.shape({
      amount: PropTypes.number,
      address: PropTypes.string,
      satoshiPerByte: PropTypes.string,
      fromWallet: PropTypes.fromWallet,
      memo: PropTypes.string,
      uri: PropTypes.string,
    }),
  }),
};

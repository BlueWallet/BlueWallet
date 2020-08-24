/* global alert */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
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
import Modal from 'react-native-modal';
import RNFS from 'react-native-fs';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

import NetworkTransactionFees, { NetworkTransactionFee } from '../../models/networkTransactionFees';
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import { AppStorage, HDSegwitBech32Wallet, LightningCustodianWallet, WatchOnlyWallet } from '../../class';
import { BitcoinTransaction } from '../../models/bitcoinTransactionInfo';
import DocumentPicker from 'react-native-document-picker';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import loc from '../../loc';
import { BlueCurrentTheme } from '../../components/themes';
const bitcoin = require('bitcoinjs-lib');
const currency = require('../../blue_modules/currency');
const BigNumber = require('bignumber.js');
const { width } = Dimensions.get('window');
const BlueApp: AppStorage = require('../../BlueApp');

const btcAddressRx = /^[a-zA-Z0-9]{26,35}$/;

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    paddingTop: 20,
    backgroundColor: BlueCurrentTheme.colors.background,
  },
  root: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: BlueCurrentTheme.colors.elevated,
  },
  scrollViewContent: {
    flexWrap: 'wrap',
    flexDirection: 'row',
  },
  modalContent: {
    backgroundColor: BlueCurrentTheme.colors.modal,
    padding: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopColor: BlueCurrentTheme.colors.borderTopColor,
    borderWidth: BlueCurrentTheme.colors.borderWidth,
    minHeight: 200,
    height: 200,
  },
  advancedTransactionOptionsModalContent: {
    backgroundColor: BlueCurrentTheme.colors.modal,
    padding: 22,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopColor: BlueCurrentTheme.colors.borderTopColor,
    borderWidth: BlueCurrentTheme.colors.borderWidth,
    minHeight: 130,
  },
  bottomModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  feeSliderInput: {
    backgroundColor: BlueCurrentTheme.colors.feeLabel,
    minWidth: 127,
    height: 60,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  feeSliderText: {
    fontWeight: '600',
    color: BlueCurrentTheme.colors.feeValue,
    marginBottom: 0,
    marginRight: 4,
    textAlign: 'right',
    fontSize: 36,
  },
  feeSliderUnit: {
    fontWeight: '600',
    color: BlueCurrentTheme.colors.feeValue,
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
    color: BlueCurrentTheme.colors.buttonTextColor,
    fontSize: 14,
  },
  of: {
    alignSelf: 'flex-end',
    marginRight: 18,
    marginVertical: 8,
    color: BlueCurrentTheme.colors.feeText,
  },
  memo: {
    flexDirection: 'row',
    borderColor: BlueCurrentTheme.colors.formBorder,
    borderBottomColor: BlueCurrentTheme.colors.formBorder,
    borderWidth: 1,
    borderBottomWidth: 0.5,
    backgroundColor: BlueCurrentTheme.colors.inputBackgroundColor,
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
    color: '#81868e',
  },
  fee: {
    flexDirection: 'row',
    marginHorizontal: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeLabel: {
    color: BlueCurrentTheme.colors.feeText,
    fontSize: 14,
  },
  feeRow: {
    backgroundColor: BlueCurrentTheme.colors.feeLabel,
    minWidth: 40,
    height: 25,
    borderRadius: 4,
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  feeValue: {
    color: BlueCurrentTheme.colors.feeValue,
    marginBottom: 0,
    marginRight: 4,
    textAlign: 'right',
  },
  feeUnit: {
    color: BlueCurrentTheme.colors.feeValue,
    paddingRight: 4,
    textAlign: 'left',
  },
});

export default class SendDetails extends Component {
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
      alert(loc.send.details_wallet_before_tx);
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
        units: [],
        memo: '',
        networkTransactionFees: new NetworkTransactionFee(1, 1, 1),
        fee: 1,
        feeSliderValue: 1,
        amountUnit: fromWallet.preferredBalanceUnit, // default for whole screen
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
      const recipients = this.state.addresses;
      const dataWithoutSchema = data.replace('bitcoin:', '').replace('BITCOIN:', '');
      if (this.state.fromWallet.isAddressValid(dataWithoutSchema)) {
        recipients[[this.state.recipientsScrollIndex]].address = dataWithoutSchema;
        const units = this.state.units;
        units[this.state.recipientsScrollIndex] = BitcoinUnit.BTC; // also resetting current unit to BTC
        this.setState({
          address: recipients,
          isLoading: false,
          amountUnit: BitcoinUnit.BTC,
          units,
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
          const units = this.state.units;
          units[this.state.recipientsScrollIndex] = BitcoinUnit.BTC; // also resetting current unit to BTC
          recipients[[this.state.recipientsScrollIndex]].address = address;
          recipients[[this.state.recipientsScrollIndex]].amount = options.amount;
          this.setState({
            addresses: recipients,
            memo: options.label || options.message,
            isLoading: false,
            amountUnit: BitcoinUnit.BTC,
            units,
          });
        } else {
          this.setState({ isLoading: false });
        }
      }
    });
  };

  async componentDidMount() {
    this.renderNavigationHeader();
    console.log('send/details - componentDidMount');
    /** @type {BitcoinTransaction[]} */
    const addresses = [];
    let initialMemo = '';
    if (this.props.route.params.uri) {
      const uri = this.props.route.params.uri;
      try {
        const { address, amount, memo } = this.decodeBitcoinUri(uri);
        addresses.push(new BitcoinTransaction(address, amount, currency.btcToSatoshi(amount)));
        initialMemo = memo;
        this.setState({ addresses, memo: initialMemo, isLoading: false, amountUnit: BitcoinUnit.BTC });
      } catch (error) {
        console.log(error);
        alert(loc.send.details_error_decode);
      }
    } else if (this.props.route.params.address) {
      addresses.push(new BitcoinTransaction(this.props.route.params.address));
      if (this.props.route.params.memo) initialMemo = this.props.route.params.memo;
      this.setState({ addresses, memo: initialMemo, isLoading: false, amountUnit: BitcoinUnit.BTC });
    } else {
      this.setState({ addresses: [new BitcoinTransaction()], isLoading: false });
    }

    try {
      const cachedNetworkTransactionFees = JSON.parse(await AsyncStorage.getItem(NetworkTransactionFee.StorageKey));

      if (cachedNetworkTransactionFees && 'mediumFee' in cachedNetworkTransactionFees) {
        this.setState({
          fee: cachedNetworkTransactionFees.fastestFee,
          networkTransactionFees: cachedNetworkTransactionFees,
          feeSliderValue: cachedNetworkTransactionFees.fastestFee,
        });
      }
    } catch (_) {}

    try {
      const recommendedFees = await NetworkTransactionFees.recommendedFees();
      if (recommendedFees && 'fastestFee' in recommendedFees) {
        await AsyncStorage.setItem(NetworkTransactionFee.StorageKey, JSON.stringify(recommendedFees));
        this.setState({
          fee: recommendedFees.fastestFee,
          networkTransactionFees: recommendedFees,
          feeSliderValue: recommendedFees.fastestFee,
        });

        if (this.props.route.params.uri) {
          try {
            const { address, amount, memo } = this.decodeBitcoinUri(this.props.route.params.uri);
            this.setState({ address, amount, memo, isLoading: false });
          } catch (error) {
            console.log(error);
            this.setState({ isLoading: false });
            alert(loc.send.details_error_decode);
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
      address = 'address' in parsedBitcoinUri ? parsedBitcoinUri.address : address;
      if ('options' in parsedBitcoinUri) {
        if ('amount' in parsedBitcoinUri.options) {
          amount = parsedBitcoinUri.options.amount.toString();
          amount = parsedBitcoinUri.options.amount;
        }
        if ('label' in parsedBitcoinUri.options) {
          memo = parsedBitcoinUri.options.label || memo;
        }
      }
    } catch (_) {}
    return { address, amount, memo };
  }

  async createTransaction() {
    Keyboard.dismiss();
    this.setState({ isLoading: true });
    let error = false;
    const requestedSatPerByte = this.state.fee.toString().replace(/\D/g, '');
    for (const [index, transaction] of this.state.addresses.entries()) {
      if (!transaction.amount || transaction.amount < 0 || parseFloat(transaction.amount) === 0) {
        error = loc.send.details_amount_field_is_not_valid;
        console.log('validation error');
      } else if (!this.state.fee || !requestedSatPerByte || parseFloat(requestedSatPerByte) < 1) {
        error = loc.send.details_fee_field_is_not_valid;
        console.log('validation error');
      } else if (!transaction.address) {
        error = loc.send.details_address_field_is_not_valid;
        console.log('validation error');
      } else if (this.state.fromWallet.getBalance() - transaction.amountSats < 0) {
        // first sanity check is that sending amount is not bigger than available balance
        error = loc.send.details_total_exceeds_balance;
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
          error = loc.send.details_address_field_is_not_valid;
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
      const value = parseInt(transaction.amountSats);
      if (value > 0) {
        targets.push({ address: transaction.address, value });
      } else if (transaction.amount) {
        if (currency.btcToSatoshi(transaction.amount) > 0) {
          targets.push({ address: transaction.address, value: currency.btcToSatoshi(transaction.amount) });
        }
      }
    }

    const { tx, fee, psbt } = wallet.createTransaction(
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
        loc.send.details_wallet_selection,
        loc.send.details_no_multiple,
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
          { text: loc._.cancel, onPress: () => {}, style: 'cancel' },
        ],
        { cancelable: false },
      );
    } else if (this.state.addresses.some(element => element.amount === BitcoinUnit.MAX) && !wallet.allowSendMax()) {
      ReactNativeHapticFeedback.trigger('notificationWarning');
      Alert.alert(
        loc.send.details_wallet_selection,
        loc.send.details_no_maximum,
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
          { text: loc._.cancel, onPress: () => {}, style: 'cancel' },
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
        deviceHeight={Dimensions.get('window').height}
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
                  const newValue = value.replace(/\D/g, '');
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
        alert(loc.send.details_no_signed_tx);
      }
    }
  };

  renderAdvancedTransactionOptionsModal = () => {
    const isSendMaxUsed = this.state.addresses.some(element => element.amount === BitcoinUnit.MAX);
    return (
      <Modal
        isVisible={this.state.isAdvancedTransactionOptionsVisible}
        deviceHeight={Dimensions.get('window').height}
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
                title={loc.send.details_adv_full}
                hideChevron
                component={TouchableOpacity}
                onPress={this.onUseAllPressed}
              />
            )}
            {this.state.fromWallet.type === HDSegwitBech32Wallet.type && (
              <BlueListItem
                title={loc.send.details_adv_fee_bump}
                Component={TouchableWithoutFeedback}
                switch={{ value: this.state.isTransactionReplaceable, onValueChange: this.onReplaceableFeeSwitchValueChanged }}
              />
            )}
            {this.state.fromWallet.type === WatchOnlyWallet.type &&
              this.state.fromWallet.isHd() &&
              this.state.fromWallet.getSecret().startsWith('zpub') && (
                <BlueListItem
                  title={loc.send.details_adv_import}
                  hideChevron
                  component={TouchableOpacity}
                  onPress={this.importTransaction}
                />
              )}
            {this.state.fromWallet.allowBatchSend() && (
              <>
                <BlueListItem
                  disabled={isSendMaxUsed}
                  title={loc.send.details_add_rec_add}
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
                        // after adding recipient it automatically scrolls to the last one
                        this.setState({ recipientsScrollIndex: this.state.addresses.length - 1 });
                      },
                    );
                  }}
                />
                <BlueListItem
                  title={loc.send.details_add_rec_rem}
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
                        // after deletion it automatically scrolls to the last one
                        this.setState({ recipientsScrollIndex: this.state.addresses.length - 1 });
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
          <BlueButton onPress={() => this.createTransaction()} title={loc.send.details_next} testID="CreateTransactionButton" />
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
    const rows = [];
    for (const [index, item] of this.state.addresses.entries()) {
      rows.push(
        <View key={index} style={{ minWidth: width, maxWidth: width, width: width }}>
          <BlueBitcoinAmount
            isLoading={this.state.isLoading}
            amount={item.amount ? item.amount.toString() : null}
            onAmountUnitChange={unit => {
              const units = this.state.units;
              units[index] = unit;

              const addresses = this.state.addresses;
              const item = addresses[index];

              switch (unit) {
                case BitcoinUnit.SATS:
                  item.amountSats = parseInt(item.amount);
                  break;
                case BitcoinUnit.BTC:
                  item.amountSats = currency.btcToSatoshi(item.amount);
                  break;
                case BitcoinUnit.LOCAL_CURRENCY:
                  // also accounting for cached fiat->sat conversion to avoid rounding error
                  item.amountSats =
                    BlueBitcoinAmount.getCachedSatoshis(item.amount) || currency.btcToSatoshi(currency.fiatToBTC(item.amount));
                  break;
              }

              addresses[index] = item;
              this.setState({ units, addresses });
            }}
            onChangeText={text => {
              item.amount = text;
              switch (this.state.units[index] || this.state.amountUnit) {
                case BitcoinUnit.BTC:
                  item.amountSats = currency.btcToSatoshi(item.amount);
                  break;
                case BitcoinUnit.LOCAL_CURRENCY:
                  item.amountSats = currency.btcToSatoshi(currency.fiatToBTC(item.amount));
                  break;
                default:
                case BitcoinUnit.SATS:
                  item.amountSats = parseInt(text);
                  break;
              }
              const addresses = this.state.addresses;
              addresses[index] = item;
              this.setState({ addresses });
            }}
            unit={this.state.units[index] || this.state.amountUnit}
            inputAccessoryViewID={this.state.fromWallet.allowSendMax() ? BlueUseAllFundsButton.InputAccessoryViewID : null}
          />
          <BlueAddressInput
            onChangeText={async text => {
              text = text.trim();
              const transactions = this.state.addresses;
              const { address, amount, memo } = this.decodeBitcoinUri(text);
              item.address = address || text;
              item.amount = amount || item.amount;
              transactions[index] = item;
              this.setState({
                addresses: transactions,
                memo: memo || this.state.memo,
                isLoading: false,
              });
            }}
            onBarScanned={this.processAddressData}
            address={item.address}
            isLoading={this.state.isLoading}
            inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
            launchedBy={this.props.route.name}
          />
          {this.state.addresses.length > 1 && (
            <BlueText style={styles.of}>{loc.formatString(loc._.of, { number: index + 1, total: this.state.addresses.length })}</BlueText>
          )}
        </View>,
      );
    }
    return rows;
  };

  onUseAllPressed = () => {
    ReactNativeHapticFeedback.trigger('notificationWarning');
    Alert.alert(
      loc.send.details_adv_full,
      loc.send.details_adv_full_sure + ' ' + (this.state.addresses.length > 1 ? loc.send.details_adv_full_remove : ''),
      [
        {
          text: loc._.ok,
          onPress: async () => {
            Keyboard.dismiss();
            const recipient = this.state.addresses[this.state.recipientsScrollIndex];
            recipient.amount = BitcoinUnit.MAX;
            recipient.amountSats = BitcoinUnit.MAX;
            this.setState({
              addresses: [recipient],
              units: [BitcoinUnit.BTC],
              recipientsScrollIndex: 0,
              isAdvancedTransactionOptionsVisible: false,
            });
          },
          style: 'default',
        },
        { text: loc._.cancel, onPress: () => {}, style: 'cancel' },
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
          <StatusBar barStyle="light-content" />
          <View>
            <KeyboardAvoidingView behavior="position">
              <ScrollView
                pagingEnabled
                horizontal
                contentContainerStyle={styles.scrollViewContent}
                ref={ref => (this.scrollView = ref)}
                keyboardShouldPersistTaps="always"
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
                  placeholder={loc.send.details_note_placeholder}
                  placeholderTextColor="#81868e"
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
                <Text style={styles.feeLabel}>{loc.send.create_fee}</Text>
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
            ios: (
              <BlueUseAllFundsButton unit={this.state.amountUnit} onUseAllPressed={this.onUseAllPressed} wallet={this.state.fromWallet} />
            ),
            android: this.state.isAmountToolbarVisibleForAndroid && (
              <BlueUseAllFundsButton unit={this.state.amountUnit} onUseAllPressed={this.onUseAllPressed} wallet={this.state.fromWallet} />
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

SendDetails.navigationOptions = ({ navigation, route }) => ({
  ...BlueCreateTxNavigationStyle(navigation, route.params.withAdvancedOptionsMenuButton, route.params.advancedOptionsMenuButtonAction),
  title: loc.send.header,
});

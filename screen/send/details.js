/* global alert */
import React, { Component } from 'react';
import {
  ActivityIndicator,
  View,
  TextInput,
  StatusBar,
  TouchableOpacity,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
  StyleSheet,
  Platform,
  Slider,
  AsyncStorage,
  Text,
} from 'react-native';
import { Icon } from 'react-native-elements';
import {
  BlueNavigationStyle,
  BlueButton,
  BlueBitcoinAmount,
  BlueAddressInput,
  BlueDismissKeyboardInputAccessory,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
import Modal from 'react-native-modal';
import NetworkTransactionFees, { NetworkTransactionFee } from '../../models/networkTransactionFees';
import BitcoinBIP70TransactionDecode from '../../bip70/bip70';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { HDLegacyP2PKHWallet, HDSegwitP2SHWallet } from '../../class';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
const bip21 = require('bip21');
let BigNumber = require('bignumber.js');
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');
let bitcoin = require('bitcoinjs-lib');

const btcAddressRx = /^[a-zA-Z0-9]{26,35}$/;

export default class SendDetails extends Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(navigation, true),
    title: loc.send.header,
  });

  constructor(props) {
    super(props);
    console.log('props.navigation.state.params=', props.navigation.state.params);
    let address;
    let memo;
    if (props.navigation.state.params) address = props.navigation.state.params.address;
    if (props.navigation.state.params) memo = props.navigation.state.params.memo;
    let fromAddress;
    if (props.navigation.state.params) fromAddress = props.navigation.state.params.fromAddress;
    let fromSecret;
    if (props.navigation.state.params) fromSecret = props.navigation.state.params.fromSecret;
    let fromWallet = null;

    const wallets = BlueApp.getWallets();

    for (let w of wallets) {
      if (w.getSecret() === fromSecret) {
        fromWallet = w;
        break;
      }

      if (w.getAddress() === fromAddress) {
        fromWallet = w;
      }
    }

    // fallback to first wallet if it exists
    if (!fromWallet && wallets[0]) fromWallet = wallets[0];

    this.state = {
      isFeeSelectionModalVisible: false,
      fromAddress,
      fromWallet,
      fromSecret,
      isLoading: false,
      address,
      memo,
      fee: 1,
      networkTransactionFees: new NetworkTransactionFee(1, 1, 1),
      feeSliderValue: 1,
      bip70TransactionExpiration: null,
      renderWalletSelectionButtonHidden: false,
    };
  }

  /**
   * TODO: refactor this mess, get rid of regexp, use https://github.com/bitcoinjs/bitcoinjs-lib/issues/890 etc etc
   *
   * @param data {String} Can be address or `bitcoin:xxxxxxx` uri scheme, or invalid garbage
   */
  processAddressData = data => {
    this.setState(
      { isLoading: true },
      () => {
        if (BitcoinBIP70TransactionDecode.matchesPaymentURL(data)) {
          this.processBIP70Invoice(data);
        } else {
          const dataWithoutSchema = data.replace('bitcoin:', '');
          if (btcAddressRx.test(dataWithoutSchema) || (dataWithoutSchema.indexOf('bc1') === 0 && dataWithoutSchema.indexOf('?') === -1)) {
            this.setState({
              address: dataWithoutSchema,
              bip70TransactionExpiration: null,
              isLoading: false,
            });
          } else {
            let address, options;
            try {
              if (!data.toLowerCase().startsWith('bitcoin:')) {
                data = `bitcoin:${data}`;
              }
              const decoded = bip21.decode(data);
              address = decoded.address;
              options = decoded.options;
            } catch (error) {
              console.log(error);
              this.setState({ isLoading: false });
            }
            console.log(options);
            if (btcAddressRx.test(address) || address.indexOf('bc1') === 0) {
              this.setState({
                address,
                amount: options.amount,
                memo: options.label || options.message,
                bip70TransactionExpiration: null,
                isLoading: false,
              });
            }
          }
        }
      },
      true,
    );
  };

  async componentDidMount() {
    StatusBar.setBarStyle('dark-content');
    this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this._keyboardDidShow);
    this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this._keyboardDidHide);
    try {
      const cachedNetworkTransactionFees = JSON.parse(await AsyncStorage.getItem(NetworkTransactionFee.StorageKey));

      if (cachedNetworkTransactionFees && cachedNetworkTransactionFees.hasOwnProperty('halfHourFee')) {
        this.setState({
          fee: cachedNetworkTransactionFees.halfHourFee,
          networkTransactionFees: cachedNetworkTransactionFees,
          feeSliderValue: cachedNetworkTransactionFees.halfHourFee,
        });
      }
    } catch (_) {}

    let recommendedFees = await NetworkTransactionFees.recommendedFees();
    if (recommendedFees && recommendedFees.hasOwnProperty('halfHourFee')) {
      await AsyncStorage.setItem(NetworkTransactionFee.StorageKey, JSON.stringify(recommendedFees));
      this.setState({
        fee: recommendedFees.halfHourFee,
        networkTransactionFees: recommendedFees,
        feeSliderValue: recommendedFees.halfHourFee,
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
      } else {
        this.setState({ isLoading: false });
      }
    } else {
      this.setState({ isLoading: false });
    }
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
    try {
      let amount = '';
      let parsedBitcoinUri = null;
      let address = '';
      let memo = '';
      parsedBitcoinUri = bip21.decode(uri);
      address = parsedBitcoinUri.hasOwnProperty('address') ? parsedBitcoinUri.address : address;
      if (parsedBitcoinUri.hasOwnProperty('options')) {
        if (parsedBitcoinUri.options.hasOwnProperty('amount')) {
          amount = parsedBitcoinUri.options.amount.toString();
        }
        if (parsedBitcoinUri.options.hasOwnProperty('label')) {
          memo = parsedBitcoinUri.options.label || memo;
        }
      }
      return { address, amount, memo };
    } catch (_) {
      return undefined;
    }
  }

  recalculateAvailableBalance(balance, amount, fee) {
    if (!amount) amount = 0;
    if (!fee) fee = 0;
    let availableBalance;
    try {
      availableBalance = new BigNumber(balance);
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

  processBIP70Invoice(text) {
    try {
      if (BitcoinBIP70TransactionDecode.matchesPaymentURL(text)) {
        this.setState(
          {
            isLoading: true,
          },
          () => {
            Keyboard.dismiss();
            BitcoinBIP70TransactionDecode.decode(text)
              .then(response => {
                this.setState({
                  address: response.address,
                  amount: loc.formatBalanceWithoutSuffix(response.amount, BitcoinUnit.BTC, false),
                  memo: response.memo,
                  fee: response.fee,
                  bip70TransactionExpiration: response.expires,
                  isLoading: false,
                });
              })
              .catch(error => {
                alert(error.errorMessage);
                this.setState({ isLoading: false, bip70TransactionExpiration: null });
              });
          },
        );
      }
      return true;
    } catch (error) {
      this.setState({ address: text.replace(' ', ''), isLoading: false, bip70TransactionExpiration: null, amount: 0 });
      return false;
    }
  }

  async createTransaction() {
    Keyboard.dismiss();
    this.setState({ isLoading: true });
    let error = false;
    let requestedSatPerByte = this.state.fee.toString().replace(/\D/g, '');

    console.log({ requestedSatPerByte });

    if (!this.state.amount || this.state.amount === '0' || parseFloat(this.state.amount) === 0) {
      error = loc.send.details.amount_field_is_not_valid;
      console.log('validation error');
    } else if (!this.state.fee || !requestedSatPerByte || parseFloat(requestedSatPerByte) < 1) {
      error = loc.send.details.fee_field_is_not_valid;
      console.log('validation error');
    } else if (!this.state.address) {
      error = loc.send.details.address_field_is_not_valid;
      console.log('validation error');
    } else if (this.recalculateAvailableBalance(this.state.fromWallet.getBalance(), this.state.amount, 0) < 0) {
      // first sanity check is that sending amount is not bigger than available balance
      error = loc.send.details.total_exceeds_balance;
      console.log('validation error');
    } else if (BitcoinBIP70TransactionDecode.isExpired(this.state.bip70TransactionExpiration)) {
      error = 'Transaction has expired.';
      console.log('validation error');
    }

    try {
      bitcoin.address.toOutputScript(this.state.address);
    } catch (err) {
      console.log('validation error');
      console.log(err);
      error = loc.send.details.address_field_is_not_valid;
    }

    if (error) {
      this.setState({ isLoading: false });
      alert(error);
      ReactNativeHapticFeedback.trigger('notificationError', false);
      return;
    }

    this.setState({ isLoading: true }, async () => {
      let utxo;
      let actualSatoshiPerByte;
      let tx, txid;
      let tries = 1;
      let fee = 0.000001; // initial fee guess

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
          if (this.recalculateAvailableBalance(this.state.fromWallet.getBalance(), this.state.amount, fee) < 0) {
            // we could not add any fee. user is trying to send all he's got. that wont work
            throw new Error(loc.send.details.total_exceeds_balance);
          }

          let startTime = Date.now();
          tx = this.state.fromWallet.createTx(utxo, this.state.amount, fee, this.state.address, this.state.memo);
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
        ReactNativeHapticFeedback.trigger('notificationError', false);
        alert(err);
        this.setState({ isLoading: false });
        return;
      }

      this.setState({ isLoading: false }, () =>
        this.props.navigation.navigate('Confirm', {
          amount: this.state.amount,
          // HD wallet's utxo is in sats, classic segwit wallet utxos are in btc
          fee: this.calculateFee(
            utxo,
            tx,
            this.state.fromWallet.type === HDSegwitP2SHWallet.type || this.state.fromWallet.type === HDLegacyP2PKHWallet.type,
          ),
          address: this.state.address,
          memo: this.state.memo,
          fromWallet: this.state.fromWallet,
          tx: tx,
          satoshiPerByte: actualSatoshiPerByte.toFixed(2),
        }),
      );
    });
  }

  onWalletSelect = wallet => {
    this.setState({ fromAddress: wallet.getAddress(), fromSecret: wallet.getSecret(), fromWallet: wallet }, () => {
      this.props.navigation.pop();
    });
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
                  this.setState({ fee: Number(newValue), feeSliderValue: Number(newValue) });
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
                  maximumValue={this.state.networkTransactionFees.fastestFee}
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

  renderCreateButton = () => {
    return (
      <View style={{ paddingHorizontal: 56, paddingVertical: 16, alignContent: 'center', backgroundColor: '#FFFFFF' }}>
        {this.state.isLoading ? (
          <ActivityIndicator />
        ) : (
          <BlueButton onPress={() => this.createTransaction()} title={loc.send.details.create} />
        )}
      </View>
    );
  };

  renderWalletSelectionButton = () => {
    if (this.state.renderWalletSelectionButtonHidden) return;
    return (
      <View style={{ marginBottom: 24, alignItems: 'center' }}>
        {!this.state.isLoading && (
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 16 }}
            onPress={() => this.props.navigation.navigate('SelectWallet', { onWalletSelect: this.onWalletSelect })}
          >
            <Text style={{ color: '#9aa0aa', fontSize: 14, paddingHorizontal: 16, alignSelf: 'center' }}>
              {loc.wallets.select_wallet.toLowerCase()}
            </Text>
            <Icon name="angle-right" size={22} type="font-awesome" color="#9aa0aa" />
          </TouchableOpacity>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 4 }}>
          <Text style={{ color: '#0c2550', fontSize: 14 }}>{this.state.fromWallet.getLabel()}</Text>
          <Text style={{ color: '#0c2550', fontSize: 14, fontWeight: '600', marginLeft: 8, marginRight: 4 }}>
            {this.state.fromWallet.getBalance()}
          </Text>
          <Text style={{ color: '#0c2550', fontSize: 11, fontWeight: '600', textAlignVertical: 'bottom', marginTop: 2 }}>
            {BitcoinUnit.BTC}
          </Text>
        </View>
      </View>
    );
  };

  render() {
    if (!this.state.fromWallet.getAddress) {
      return (
        <View style={{ flex: 1, paddingTop: 20 }}>
          <Text>System error: Source wallet not found (this should never happen)</Text>
        </View>
      );
    }
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1, justifyContent: 'space-between' }}>
          <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
            <KeyboardAvoidingView behavior="position">
              <BlueBitcoinAmount
                isLoading={this.state.isLoading}
                amount={this.state.amount}
                onChangeText={text => this.setState({ amount: text })}
                inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
              />
              <BlueAddressInput
                onChangeText={text => {
                  if (!this.processBIP70Invoice(text)) {
                    this.setState({
                      address: text.trim().replace('bitcoin:', ''),
                      isLoading: false,
                      bip70TransactionExpiration: null,
                    });
                  } else {
                    try {
                      const { address, amount, memo } = this.decodeBitcoinUri(text);
                      this.setState({ address, amount, memo, isLoading: false, bip70TransactionExpiration: null });
                    } catch (_) {
                      this.setState({ address: text.trim(), isLoading: false, bip70TransactionExpiration: null });
                    }
                  }
                }}
                onBarScanned={this.processAddressData}
                address={this.state.address}
                isLoading={this.state.isLoading}
                inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
              />
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
            </KeyboardAvoidingView>
          </View>
          <BlueDismissKeyboardInputAccessory />
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
    navigate: PropTypes.func,
    getParam: PropTypes.func,
    state: PropTypes.shape({
      params: PropTypes.shape({
        address: PropTypes.string,
        fromAddress: PropTypes.string,
        satoshiPerByte: PropTypes.string,
        fromSecret: PropTypes.fromSecret,
        memo: PropTypes.string,
        uri: PropTypes.string,
      }),
    }),
  }),
};

/* global alert */
import React, { Component } from 'react';
import {
  ActivityIndicator,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
  StyleSheet,
  Slider,
} from 'react-native';
import { Text, Icon } from 'react-native-elements';
import { BlueHeaderDefaultSub, BlueButton } from '../../BlueComponents';
import PropTypes from 'prop-types';
import Modal from 'react-native-modal';
import NetworkTransactionFees, { NetworkTransactionFee } from '../../models/networkTransactionFees';
import BitcoinBIP70TransactionDecode from '../../bip70/bip70';
import { BitcoinUnit } from '../../models/bitcoinUnits';
const bip21 = require('bip21');
let EV = require('../../events');
let BigNumber = require('bignumber.js');
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');
let bitcoin = require('bitcoinjs-lib');

const btcAddressRx = /^[a-zA-Z0-9]{26,35}$/;

export default class SendDetails extends Component {
  static navigationOptions = {
    header: ({ navigation }) => {
      return <BlueHeaderDefaultSub leftText={loc.send.header.toLowerCase()} onClose={() => navigation.goBack(null)} />;
    },
  };

  constructor(props) {
    super(props);
    console.log('props.navigation.state.params=', props.navigation.state.params);
    let startTime = Date.now();
    let address;
    if (props.navigation.state.params) address = props.navigation.state.params.address;
    let memo = false;
    if (props.navigation.state.params) memo = props.navigation.state.params.memo;
    let fromAddress;
    if (props.navigation.state.params) fromAddress = props.navigation.state.params.fromAddress;
    let fromSecret;
    if (props.navigation.state.params.fromSecret) fromSecret = props.navigation.state.params.fromSecret;
    let fromWallet = {};

    let startTime2 = Date.now();
    for (let w of BlueApp.getWallets()) {
      if (w.getSecret() === fromSecret) {
        fromWallet = w;
        break;
      }

      if (w.getAddress() === fromAddress) {
        fromWallet = w;
      }
    }

    let endTime2 = Date.now();
    console.log('getAddress() took', (endTime2 - startTime2) / 1000, 'sec');
    console.log({ memo });

    this.state = {
      isFeeSelectionModalVisible: false,
      fromAddress: fromAddress,
      fromWallet: fromWallet,
      fromSecret: fromSecret,
      isLoading: true,
      address: address,
      amount: '',
      memo,
      fee: 1,
      networkTransactionFees: new NetworkTransactionFee(1, 1, 1),
      feeSliderValue: 1,
      bip70TransactionExpiration: null,
    };

    EV(EV.enum.CREATE_TRANSACTION_NEW_DESTINATION_ADDRESS, data => {
      if (btcAddressRx.test(data)) {
        this.setState({
          address: data,
          bip70TransactionExpiration: null,
        });
      } else {
        const { address, options } = bip21.decode(data);
        console.warn(data);
        if (btcAddressRx.test(address)) {
          this.setState({
            address,
            amount: options.amount,
            memo: options.label,
            bip70TransactionExpiration: null,
          });
        } else if (BitcoinBIP70TransactionDecode.matchesPaymentURL(data)) {
          BitcoinBIP70TransactionDecode.decode(data)
            .then(response => {
              this.setState({
                address: response.address,
                amount: loc.formatBalanceWithoutSuffix(response.amount, BitcoinUnit.BTC),
                memo: response.memo,
                fee: response.fee,
                bip70TransactionExpiration: response.expires,
              });
            })
            .catch(error => alert(error.errorMessage));
        }
      }
    });
    let endTime = Date.now();
    console.log('constructor took', (endTime - startTime) / 1000, 'sec');
  }

  async componentDidMount() {
    let recommendedFees = await NetworkTransactionFees.recommendedFees().catch(response => {
      this.setState({ fee: response.halfHourFee, networkTransactionFees: response, feeSliderValue: response.halfHourFee });
    });
    this.setState({
      fee: recommendedFees.halfHourFee,
      networkTransactionFees: recommendedFees,
      feeSliderValue: recommendedFees.halfHourFee,
    });
    let startTime = Date.now();
    console.log('send/details - componentDidMount');
    this.setState({
      isLoading: false,
    });
    let endTime = Date.now();
    console.log('componentDidMount took', (endTime - startTime) / 1000, 'sec');
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

  async createTransaction() {
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

    if (error) {
      alert(error);
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
        alert(err);
        this.setState({ isLoading: false });
        return;
      }

      this.setState({ isLoading: false }, () =>
        this.props.navigation.navigate('CreateTransaction', {
          amount: this.state.amount,
          fee: fee.toFixed(8),
          address: this.state.address,
          memo: this.state.memo,
          fromWallet: this.state.fromWallet,
          tx: tx,
          satoshiPerByte: actualSatoshiPerByte.toFixed(2),
        }),
      );
    });
  }

  renderFeeSelectionModal = () => {
    return (
      <Modal
        isVisible={this.state.isFeeSelectionModalVisible}
        style={styles.bottomModal}
        onBackdropPress={() => this.setState({ isFeeSelectionModalVisible: false })}
      >
        <KeyboardAvoidingView behavior="position">
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.satoshisTextInput} onPress={() => this.textInput.focus()}>
              <TextInput
                keyboardType="numeric"
                ref={ref => {
                  this.textInput = ref;
                }}
                value={this.state.fee.toString()}
                onChangeText={value => {
                  let newValue = value.replace(/\D/g, '');
                  if (newValue.length === 0) {
                    newValue = 1;
                  }
                  this.setState({ fee: newValue, feeSliderValue: newValue });
                }}
                maxLength={9}
                editable={!this.state.isLoading}
                placeholderTextColor="#37c0a1"
                placeholder={this.state.networkTransactionFees.halfHourFee.toString()}
                style={{ fontWeight: '600', color: '#37c0a1', marginBottom: 0, marginRight: 4, textAlign: 'right', fontSize: 36 }}
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
                  onValueChange={value => this.setState({ feeSliderValue: this.state.feeSliderValue, fee: value.toFixed(0) })}
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
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <KeyboardAvoidingView behavior="position">
            <View style={{ flexDirection: 'row', justifyContent: 'center', paddingTop: 16, paddingBottom: 16 }}>
              <TextInput
                keyboardType="numeric"
                onChangeText={text => this.setState({ amount: text.replace(',', '.') })}
                placeholder="0"
                maxLength={10}
                editable={!this.state.isLoading}
                value={this.state.amount + ''}
                placeholderTextColor="#0f5cc0"
                style={{
                  color: '#0f5cc0',
                  fontSize: 36,
                  fontWeight: '600',
                }}
              />
              <Text
                style={{
                  color: '#0f5cc0',
                  fontSize: 16,
                  marginHorizontal: 4,
                  paddingBottom: 6,
                  fontWeight: '600',
                  alignSelf: 'flex-end',
                }}
              >
                {' ' + BitcoinUnit.BTC}
              </Text>
            </View>
            <View
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
                onChangeText={text => {
                  if (BitcoinBIP70TransactionDecode.matchesPaymentURL(text)) {
                    this.setState(
                      {
                        isLoading: true,
                      },
                      () => {
                        BitcoinBIP70TransactionDecode.decode(text).then(response => {
                          this.setState({
                            address: response.address,
                            amount: loc.formatBalanceWithoutSuffix(response.amount, BitcoinUnit.BTC),
                            memo: response.memo,
                            fee: response.fee,
                            bip70TransactionExpiration: response.expires,
                            isLoading: false,
                          });
                        });
                      },
                    );
                  } else {
                    this.setState({ address: text.replace(' ', ''), isLoading: false, bip70TransactionExpiration: null });
                  }
                }}
                placeholder={loc.send.details.address}
                numberOfLines={1}
                value={this.state.address}
                style={{ flex: 1, marginHorizontal: 8, minHeight: 33, height: 33 }}
                editable={!this.state.isLoading}
              />
              <TouchableOpacity
                disabled={this.state.isLoading}
                onPress={() => this.props.navigation.navigate('ScanQrAddress')}
                style={{
                  width: 75,
                  height: 36,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#bebebe',
                  borderRadius: 4,
                  paddingVertical: 4,
                  paddingHorizontal: 8,
                  marginHorizontal: 4,
                }}
              >
                <Icon name="qrcode" size={22} type="font-awesome" color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF' }}>{loc.send.details.scan}</Text>
              </TouchableOpacity>
            </View>
            )}
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
                style={{ flex: 1, marginHorizontal: 8, minHeight: 33, height: 33 }}
                editable={!this.state.isLoading}
              />
            </View>
            )}
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
            )}
            {this.renderCreateButton()}
            {this.renderFeeSelectionModal()}
          </KeyboardAvoidingView>
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
    goBack: PropTypes.function,
    navigate: PropTypes.func,
    state: PropTypes.shape({
      params: PropTypes.shape({
        address: PropTypes.string,
        fromAddress: PropTypes.string,
        fromSecret: PropTypes.string,
        memo: PropTypes.string,
      }),
    }),
  }),
};

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
import { BlueHeaderDefaultSub, BlueButton, SafeBlueArea } from '../../BlueComponents';
import PropTypes from 'prop-types';
import Modal from 'react-native-modal';
import NetworkTransactionFees, { NetworkTransactionFee } from '../../models/networkTransactionFees';
const bip21 = require('bip21');
let EV = require('../../events');
let BigNumber = require('bignumber.js');
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');

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
    };

    EV(EV.enum.CREATE_TRANSACTION_NEW_DESTINATION_ADDRESS, data => {
      console.log('received event with ', data);

      if (btcAddressRx.test(data)) {
        this.setState({
          address: data,
        });
      } else {
        const { address, options } = bip21.decode(data);
        console.warn(data);
        if (btcAddressRx.test(address)) {
          this.setState({
            address,
            amount: options.amount,
            memo: options.label,
          });
        }
      }
    });
    let endTime = Date.now();
    console.log('constructor took', (endTime - startTime) / 1000, 'sec');
  }

  async componentDidMount() {
    NetworkTransactionFees.recommendedFees()
      .then(response => {
        this.setState({ fee: response.halfHourFee, networkTransactionFees: response });
      })
      .catch(response => this.setState({ fee: response.halfHourFee, networkTransactionFees: response }));
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
      availableBalance = availableBalance.sub(amount);
      availableBalance = availableBalance.sub(fee);
      availableBalance = availableBalance.toString(10);
    } catch (err) {
      return balance;
    }

    return (availableBalance === 'NaN' && balance) || availableBalance;
  }

  async createTransaction() {
    let error = false;
    let fee = this.state.fee.toString().replace(/\D/g, '');
    while (fee.length < 9) {
      fee = `0${fee}`;
    }
    fee = [fee.slice(0, 1), '.', fee.slice(1)].join('');

    if (!this.state.amount || this.state.amount === '0') {
      error = loc.send.details.amount_field_is_not_valid;
      console.log('validation error');
    } else if (!this.state.fee) {
      error = loc.send.details.fee_field_is_not_valid;
      console.log('validation error');
    } else if (!this.state.address) {
      error = loc.send.details.address_field_is_not_valid;
      console.log('validation error');
    } else if (this.recalculateAvailableBalance(this.state.fromWallet.getBalance(), this.state.amount, fee) < 0) {
      error = loc.send.details.total_exceeds_balance;
      console.log('validation error');
    }

    if (error) {
      alert(error);
      return;
    }

    this.setState({ isLoading: true }, async () => {
      let utxo;
      let satoshiPerByte;
      let tx;

      try {
        await this.state.fromWallet.fetchUtxo();
        if (this.state.fromWallet.getChangeAddressAsync) {
          await this.state.fromWallet.getChangeAddressAsync(); // to refresh internal pointer to next free address
        }
        if (this.state.fromWallet.getAddressAsync) {
          await this.state.fromWallet.getAddressAsync(); // to refresh internal pointer to next free address
        }

        utxo = this.state.fromWallet.utxo;
        let startTime = Date.now();

        tx = this.state.fromWallet.createTx(utxo, this.state.amount, fee, this.state.address, this.state.memo);
        let endTime = Date.now();
        console.log('create tx ', (endTime - startTime) / 1000, 'sec');

        let bitcoin = require('bitcoinjs-lib');
        let txDecoded = bitcoin.Transaction.fromHex(tx);
        let txid = txDecoded.getId();
        console.log('txid', txid);
        console.log('txhex', tx);

        BlueApp.tx_metadata = BlueApp.tx_metadata || {};
        BlueApp.tx_metadata[txid] = {
          txhex: tx,
          memo: this.state.memo,
        };
        BlueApp.saveToDisk();

        let feeSatoshi = new BigNumber(this.state.fee);
        satoshiPerByte = feeSatoshi.mul(100000000).toString();

        // satoshiPerByte = feeSatoshi.div(Math.round(tx.length / 2));
        // satoshiPerByte = Math.floor(satoshiPerByte.toString(10));
        // console.warn(satoshiPerByte)

        if (satoshiPerByte < 1) {
          throw new Error(loc.send.create.not_enough_fee);
        }
      } catch (err) {
        console.log(err);
        alert(err);
        this.setState({ isLoading: false });
        return;
      }

      this.setState(
        {
          isLoading: false,
        },
        () =>
          this.props.navigation.navigate('CreateTransaction', {
            amount: this.state.amount,
            fee: fee,
            address: this.state.address,
            memo: this.state.memo,
            fromWallet: this.state.fromWallet,
            tx: tx,
            satoshiPerByte: this.state.fee,
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
            <View style={styles.satoshisTextInput}>
              <TextInput
                keyboardType={'numeric'}
                value={Number(this.state.fee).toFixed(0)}
                maxLength={9}
                onEndEditing={event => this.setState({ fee: event.nativeEvent.text.replace(/\D/g, '') })}
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
            </View>
            {this.state.networkTransactionFees.fastestFee > 1 && (
              <View style={{ flex: 1, marginTop: 32, minWidth: 240, width: 240 }}>
                <Slider
                  onValueChange={value => this.setState({ fee: value.toFixed(0) })}
                  minimumValue={1}
                  maximumValue={this.state.networkTransactionFees.fastestFee}
                  value={Number(this.state.fee)}
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
        <SafeBlueArea style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'center', paddingTop: 38, paddingBottom: 76 }}>
            <TextInput
              keyboardType="numeric"
              onChangeText={text => this.setState({ amount: text.replace(',', '.') })}
              placeholder="0"
              maxLength={8}
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
              style={{ color: '#0f5cc0', fontSize: 16, marginHorizontal: 4, paddingBottom: 6, fontWeight: '600', alignSelf: 'flex-end' }}
            >
              {' '}
              BTC
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
              marginVertical: 16,
              borderRadius: 4,
            }}
          >
            <TextInput
              onChangeText={text => this.setState({ address: text.replace(' ', '') })}
              placeholder={loc.send.details.address}
              value={this.state.address}
              style={{ flex: 1, marginHorizontal: 8, minHeight: 44 }}
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
              marginVertical: 16,
              borderRadius: 4,
            }}
          >
            <TextInput
              onChangeText={text => this.setState({ memo: text })}
              placeholder={loc.send.details.note_placeholder}
              value={this.state.memo}
              style={{ flex: 1, marginHorizontal: 8, minHeight: 44 }}
              editable={!this.state.isLoading}
            />
          </View>

          <View style={{ flexDirection: 'row', marginHorizontal: 20, justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#81868e', fontSize: 14 }}>Fee</Text>
            <TouchableOpacity
              onPress={() => this.setState({ isFeeSelectionModalVisible: true })}
              style={{
                backgroundColor: '#d2f8d6',
                height: 40,
                minWidth: 40,
                borderRadius: 4,
                justifyContent: 'space-between',
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 10,
              }}
            >
              <Text style={{ color: '#37c0a1', marginBottom: 0, marginRight: 4, textAlign: 'right' }}>{this.state.fee}</Text>
              <Text style={{ color: '#37c0a1', paddingRight: 4, textAlign: 'left' }}>sat/b</Text>
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView behavior="position">
            <View style={{ paddingHorizontal: 56, alignContent: 'center', marginVertical: 24 }}>
              {this.state.isLoading ? (
                <ActivityIndicator />
              ) : (
                <BlueButton onPress={() => this.createTransaction()} title={loc.send.details.send} />
              )}
            </View>
          </KeyboardAvoidingView>
          {this.renderFeeSelectionModal()}
        </SafeBlueArea>
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
    marginBottom: 32,
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

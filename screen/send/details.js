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
} from 'react-native';
import { Text, Icon } from 'react-native-elements';
import { BlueHeaderDefaultSub, BlueButton, SafeBlueArea } from '../../BlueComponents';
import PropTypes from 'prop-types';
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
      errorMessage: false,
      fromAddress: fromAddress,
      fromWallet: fromWallet,
      fromSecret: fromSecret,
      isLoading: true,
      address: address,
      amount: 0,
      memo,
      fee: 1,
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

  createTransaction() {
    let error = false;

    // let amount = this.state.amount.toString();
    // let feeCount = this.state.fee.toString().replace(/\D/g, '').length;

    // while (amount.replace(/\D/g, '').length + feeCount < 8) {
    //   amount += '0';
    // }

    // amount = `${amount}${this.state.fee}`;

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
      error = loc.send.details.address_fiels_is_not_valid;
      console.log('validation error');
    } else if (this.recalculateAvailableBalance(this.state.fromWallet.getBalance(), this.state.amount, fee) < 0) {
      error = loc.send.details.total_exceeds_balance;
      console.log('validation error');
    }

    if (error) {
      alert(error);
      return;
    }

    this.props.navigation.navigate('CreateTransaction', {
      amount: this.state.amount,
      fee: fee,
      address: this.state.address,
      memo: this.state.memo,
      fromAddress: this.state.fromAddress,
      fromSecret: this.state.fromSecret,
    });
  }

  render() {
    if (this.state.isLoading) {
      return (
        <View style={{ flex: 1, paddingTop: 20 }}>
          <ActivityIndicator />
        </View>
      );
    }

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
              onChangeText={text => this.setState({ address: text })}
              placeholder={loc.send.details.address}
              value={this.state.address}
              style={{ flex: 1, marginHorizontal: 8 }}
            />
            <TouchableOpacity
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
              style={{ marginHorizontal: 8 }}
            />
          </View>

          <View style={{ flexDirection: 'row', marginHorizontal: 20, justifyContent: 'space-between' }}>
            <Text style={{ color: '#81868e', fontSize: 14 }}>Fee</Text>
            <View
              style={{
                backgroundColor: '#d2f8d6',
                height: 24,
                borderRadius: 4,
                justifyContent: 'space-between',
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 10,
              }}
            >
              <TextInput
                onChangeText={text => this.setState({ fee: text.replace(',', '.') })}
                keyboardType={'numeric'}
                value={this.state.fee + ''}
                maxLength={2}
                style={{ color: '#37c0a1', maxWidth: 17, width: 17, marginBottom: 0, marginRight: 4, textAlign: 'right' }}
              />
              <Text style={{ color: '#37c0a1', paddingRight: 4, textAlign: 'left' }}>sat/b</Text>
            </View>
          </View>
          <KeyboardAvoidingView behavior="position">
            <View style={{ paddingHorizontal: 56, paddingVertical: 42 }}>
              <BlueButton onPress={() => this.createTransaction()} title={loc.send.details.send} />
            </View>
          </KeyboardAvoidingView>
        </SafeBlueArea>
      </TouchableWithoutFeedback>
    );
  }
}

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

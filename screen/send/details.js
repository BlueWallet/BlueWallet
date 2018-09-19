import React, { Component } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Text, FormValidationMessage } from 'react-native-elements';
import {
  BlueSpacing20,
  BlueSpacingVariable,
  BlueHeaderDefaultSub,
  BlueButton,
  SafeBlueArea,
  BlueCard,
  BlueText,
  BlueFormInput,
  BlueFormInputAddress,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
const bip21 = require('bip21');
let EV = require('../../events');
let BigNumber = require('bignumber.js');
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');

const btcAddressRx = /^[a-zA-Z0-9]{26,35}$/;

export default class SendDetails extends Component {

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
      amount: '',
      memo,
      fee: '',
    };

    EV(EV.enum.CREATE_TRANSACTION_NEW_DESTINATION_ADDRESS, data => {
      console.log('received event with ', data);

      if (btcAddressRx.test(data)) {
        this.setState({
          address: data,
        });
      } else {
        const { address, options } = bip21.decode(data);

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
    if (!this.state.amount || this.state.amount === '0') {
      this.setState({
        errorMessage: loc.send.details.amount_fiels_is_not_valid,
      });
      console.log('validation error');
      return;
    }

    if (!this.state.fee) {
      this.setState({
        errorMessage: loc.send.details.fee_fiels_is_not_valid,
      });
      console.log('validation error');
      return;
    }

    if (!this.state.address) {
      this.setState({
        errorMessage: loc.send.details.address_fiels_is_not_valid,
      });
      console.log('validation error');
      return;
    }

    if (this.recalculateAvailableBalance(this.state.fromWallet.getBalance(), this.state.amount, this.state.fee) < 0) {
      this.setState({
        errorMessage: loc.send.details.amount_fiels_is_not_valid,
      });
      console.log('validation error');
      return;
    }

    this.setState({
      errorMessage: '',
    });

    this.props.navigation.navigate('CreateTransaction', {
      amount: this.state.amount,
      fee: this.state.fee,
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
      <SafeBlueArea style={{ flex: 1, paddingTop: 20 }}>
        <BlueSpacingVariable />
        <BlueHeaderDefaultSub leftText={loc.send.details.title} onClose={() => this.props.navigation.goBack()} />

        <BlueCard style={{ alignItems: 'center', flex: 1 }}>
          <BlueFormInputAddress
            onChangeText={text => this.setState({ address: text })}
            placeholder={loc.send.details.receiver_placeholder}
            value={this.state.address}
          />

          <BlueFormInput
            onChangeText={text => this.setState({ amount: text.replace(',', '.') })}
            keyboardType={'numeric'}
            placeholder={loc.send.details.amount_placeholder}
            value={this.state.amount + ''}
          />

          <BlueFormInput
            onChangeText={text => this.setState({ fee: text.replace(',', '.') })}
            keyboardType={'numeric'}
            placeholder={loc.send.details.fee_placeholder}
            value={this.state.fee + ''}
          />

          <BlueFormInput
            onChangeText={text => this.setState({ memo: text })}
            placeholder={loc.send.details.memo_placeholder}
            value={this.state.memo}
          />

          <BlueSpacing20 />
          <BlueText>
            {loc.send.details.remaining_balance}:{' '}
            {this.recalculateAvailableBalance(this.state.fromWallet.getBalance(), this.state.amount, this.state.fee)} BTC
          </BlueText>
        </BlueCard>

        <FormValidationMessage>{this.state.errorMessage}</FormValidationMessage>

        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 0.33 }}>
            <BlueButton onPress={() => this.props.navigation.goBack()} title={loc.send.details.cancel} />
          </View>
          <View style={{ flex: 0.33 }}>
            <BlueButton
              icon={{
                name: 'qrcode',
                type: 'font-awesome',
                color: BlueApp.settings.buttonTextColor,
              }}
              style={{}}
              title={loc.send.details.scan}
              onPress={() => this.props.navigation.navigate('ScanQrAddress')}
            />
          </View>
          <View style={{ flex: 0.33 }}>
            <BlueButton onPress={() => this.createTransaction()} title={loc.send.details.create} />
          </View>
        </View>
      </SafeBlueArea>
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

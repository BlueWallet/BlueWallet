import React, { Component } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Text, FormValidationMessage } from 'react-native-elements';
import {
  BlueSpacing20,
  BlueButton,
  SafeBlueArea,
  BlueCard,
  BlueText,
  BlueFormInput,
  BlueSpacing,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
const bip21 = require('bip21')
let EV = require('../../events');
let BigNumber = require('bignumber.js');
let BlueApp = require('../../BlueApp');

const btcAddressRx = /^[a-zA-Z0-9]{26,35}$/

export default class SendDetails extends Component {
  static navigationOptions = {
    tabBarIcon: ({ tintColor, focused }) => (
      <Ionicons
        name={focused ? 'md-paper-plane' : 'md-paper-plane'}
        size={26}
        style={{ color: tintColor }}
      />
    ),
  };

  constructor(props) {
    super(props);
    let startTime = Date.now();
    let address;
    if (props.navigation.state.params)
      address = props.navigation.state.params.address;
    let fromAddress;
    if (props.navigation.state.params)
      fromAddress = props.navigation.state.params.fromAddress;
    let fromWallet = {};

    let startTime2 = Date.now();
    for (let w of BlueApp.getWallets()) {
      if (w.getAddress() === fromAddress) {
        fromWallet = w;
      }
    }

    let endTime2 = Date.now();
    console.log('getAddress() took', (endTime2 - startTime2) / 1000, 'sec');

    this.state = {
      errorMessage: false,
      fromAddress: fromAddress,
      fromWallet: fromWallet,
      isLoading: true,
      address: address,
      amount: '',
      fee: '',
    };

    EV(EV.enum.CREATE_TRANSACTION_NEW_DESTINATION_ADDRESS, data => {
      console.log('received event with ', data);

      if (btcAddressRx.test(data)) {
        this.setState({
          address: data,
        })
      } else {
        const { address, options } = bip21.decode(data)

        if (btcAddressRx.test(address)) {
          this.setState({
            address,
            amount: options.amount,
            memo: options.label
          })
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
    console.log(typeof availableBalance, availableBalance);
    return (availableBalance === 'NaN' && balance) || availableBalance;
  }

  createTransaction() {
    if (!this.state.amount) {
      this.setState({
        errorMessage: 'Amount field is not valid',
      });
      console.log('validation error');
      return;
    }

    if (!this.state.fee) {
      this.setState({
        errorMessage: 'Fee field is not valid',
      });
      console.log('validation error');
      return;
    }

    if (!this.state.address) {
      this.setState({
        errorMessage: 'Address field is not valid',
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
          <Text>
            System error: Source wallet not found (this should never happen)
          </Text>
        </View>
      );
    }

    return (
      <SafeBlueArea style={{ flex: 1, paddingTop: 20 }}>
        <BlueSpacing />
        <BlueCard
          title={'Create Transaction'}
          style={{ alignItems: 'center', flex: 1 }}
        >
          <BlueFormInput
            style={{ width: 250 }}
            onChangeText={text => this.setState({ address: text })}
            placeholder={'receiver address here'}
            value={this.state.address}
          />

          <BlueFormInput
            onChangeText={text => this.setState({ amount: text })}
            keyboardType={'numeric'}
            placeholder={'amount to send (in BTC)'}
            value={this.state.amount + ''}
          />

          <BlueFormInput
            onChangeText={text => this.setState({ fee: text })}
            keyboardType={'numeric'}
            placeholder={'plus transaction fee (in BTC)'}
            value={this.state.fee + ''}
          />

          <BlueFormInput
            onChangeText={text => this.setState({ memo: text })}
            placeholder={'memo to self'}
            value={this.state.memo}
          />

          <BlueSpacing20 />
          <BlueText>
            Remaining balance:{' '}
            {this.recalculateAvailableBalance(
              this.state.fromWallet.getBalance(),
              this.state.amount,
              this.state.fee,
            )}{' '}
            BTC
          </BlueText>
        </BlueCard>

        <FormValidationMessage>{this.state.errorMessage}</FormValidationMessage>

        <View style={{ flex: 1, flexDirection: 'row', paddingTop: 20 }}>
          <View style={{ flex: 0.33 }}>
            <BlueButton
              onPress={() => this.props.navigation.goBack()}
              title="Cancel"
            />
          </View>
          <View style={{ flex: 0.33 }}>
            <BlueButton
              icon={{ name: 'qrcode', type: 'font-awesome' }}
              style={{}}
              title="scan"
              onPress={() => this.props.navigation.navigate('ScanQrAddress')}
            />
          </View>
          <View style={{ flex: 0.33 }}>
            <BlueButton
              onPress={() => this.createTransaction()}
              title="Create"
            />
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
      }),
    }),
  }),
};

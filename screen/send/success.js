import React, { Component } from 'react';
import { Haptic } from 'expo';
import { View } from 'react-native';
import { Text, Icon } from 'react-native-elements';
import { BlueButton, SafeBlueArea, BlueCard } from '../../BlueComponents';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import PropTypes from 'prop-types';
let loc = require('../../loc');

export default class Success extends Component {
  constructor(props) {
    super(props);
    console.log('send/create constructor');

    this.state = {
      amount: props.navigation.getParam('amount'),
      address: props.navigation.getParam('address'),
      fee: props.navigation.getParam('fee'),
    };
  }

  async componentDidMount() {
    console.log('send/create - componentDidMount');
    console.log('address = ', this.state.address);
    Haptic.notification(Haptic.NotificationTypes.Success);
  }

  render() {
    return (
      <SafeBlueArea style={{ flex: 1, paddingTop: 19 }}>
        <BlueCard style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'center', paddingTop: 76, paddingBottom: 16 }}>
            <Text
              style={{
                color: '#0f5cc0',
                fontSize: 36,
                fontWeight: '600',
              }}
            >
              {this.state.amount}
            </Text>
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
          <Text
            style={{
              color: '#37c0a1',
              fontSize: 14,
              marginHorizontal: 4,
              paddingBottom: 6,
              fontWeight: '500',
              alignSelf: 'center',
            }}
          >
            {loc.send.create.fee}: {loc.formatBalance(this.state.fee, BitcoinUnit.SATS)}
          </Text>
        </BlueCard>
        <View
          style={{
            backgroundColor: '#ccddf9',
            width: 120,
            height: 120,
            borderRadius: 60,
            alignSelf: 'center',
            justifyContent: 'center',
            marginTop: 43,
            marginBottom: 53,
          }}
        >
          <Icon name="check" size={50} type="font-awesome" color="#0f5cc0" />
        </View>
        <BlueCard>
          <BlueButton
            onPress={() => {
              this.props.navigation.getParam('dismissModal')();
            }}
            title={loc.send.success.done}
            style={{ maxWidth: 263, paddingHorizontal: 56 }}
          />
        </BlueCard>
      </SafeBlueArea>
    );
  }
}

Success.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.function,
    getParam: PropTypes.function,
    navigate: PropTypes.function,
    state: PropTypes.shape({
      params: PropTypes.shape({
        amount: PropTypes.string,
        fee: PropTypes.number,
        address: PropTypes.string,
      }),
    }),
  }),
};

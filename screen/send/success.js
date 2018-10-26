import React, { Component } from 'react';
import { Haptic } from 'expo';
import { Image, View } from 'react-native';
import { Text } from 'react-native-elements';
import { BlueButton, SafeBlueArea, BlueCard } from '../../BlueComponents';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import PropTypes from 'prop-types';
/** @type {AppStorage} */
// let BlueApp = require('../../BlueApp');
let loc = require('../../loc');

export default class Success extends Component {
  constructor(props) {
    super(props);
    console.log('send/create constructor');

    this.state = {
      amount: props.navigation.state.params.amount,
      address: props.navigation.state.params.address,
      satoshiPerByte: props.navigation.getParam('satoshiPerByte'),
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
            {Number(this.state.satoshiPerByte).toFixed(0)} {BitcoinUnit.SATS}
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
          <Image style={{ alignSelf: 'center' }} source={require('../../img/baseline-check-24-px.png')} />
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
        satoshiPerByte: PropTypes.number,
        address: PropTypes.string,
      }),
    }),
  }),
};

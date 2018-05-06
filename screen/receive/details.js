import React, { Component } from 'react';
import { TextInput } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import QRCode from 'react-native-qrcode';
import {
  BlueLoading,
  BlueButton,
  SafeBlueArea,
  BlueCard,
  BlueSpacing,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
let BlueApp = require('../../BlueApp');

export default class ReceiveDetails extends Component {
  static navigationOptions = {
    tabBarLabel: 'Receive',
    tabBarIcon: ({ tintColor, focused }) => (
      <Ionicons
        name={focused ? 'ios-cash' : 'ios-cash-outline'}
        size={26}
        style={{ color: tintColor }}
      />
    ),
  };

  constructor(props) {
    super(props);
    let address = props.navigation.state.params.address;
    this.state = {
      isLoading: true,
      address: address,
    };
    console.log(JSON.stringify(address));
  }

  async componentDidMount() {
    console.log('wallets/details - componentDidMount');
    this.setState({
      isLoading: false,
    });
  }

  render() {
    if (this.state.isLoading) {
      return <BlueLoading />;
    }

    return (
      <SafeBlueArea
        forceInset={{ horizontal: 'always' }}
        style={{ flex: 1, paddingTop: 20 }}
      >
        <BlueSpacing />
        <BlueCard
          title={'Share this address with payer'}
          style={{ alignItems: 'center', flex: 1 }}
        >
          <TextInput
            style={{ marginBottom: 20, color: 'white' }}
            editable
            value={this.state.address}
          />
          <QRCode
            value={this.state.address}
            size={312}
            bgColor="white"
            fgColor={BlueApp.settings.brandingColor}
          />
        </BlueCard>

        <BlueButton
          icon={{ name: 'arrow-left', type: 'octicon' }}
          backgroundColor={BlueApp.settings.brandingColor}
          onPress={() => this.props.navigation.goBack()}
          title="Go back"
        />
      </SafeBlueArea>
    );
  }
}

ReceiveDetails.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.function,
    state: PropTypes.shape({
      params: PropTypes.shape({
        address: PropTypes.string,
      }),
    }),
  }),
};

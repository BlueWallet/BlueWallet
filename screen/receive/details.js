import React, { Component } from 'react';
import { Dimensions, Text, TouchableOpacity } from 'react-native';
import { Icon } from 'react-native-elements';
import Ionicons from 'react-native-vector-icons/Ionicons';
import QRCode from 'react-native-qrcode';
import {
  BlueLoading,
  BlueHeader,
  BlueFormInputAddress,
  SafeBlueArea,
  BlueCard,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');
let EV = require('../../events');
const { height, width } = Dimensions.get('window');
const aspectRatio = height / width;
let isIpad;
if (aspectRatio > 1.6) {
  isIpad = false;
} else {
  isIpad = true;
}

export default class ReceiveDetails extends Component {
  static navigationOptions = {
    tabBarVisible: false,
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

    EV(EV.enum.RECEIVE_ADDRESS_CHANGED, this.refreshFunction.bind(this));
  }

  refreshFunction(newAddress) {
    console.log('newAddress =', newAddress);
    this.setState({
      address: newAddress,
    });
  }

  async componentDidMount() {
    console.log('receive/details - componentDidMount');
    this.setState({
      isLoading: false,
    });
  }

  render() {
    console.log('render() receive/details, address=', this.state.address);
    if (this.state.isLoading) {
      return <BlueLoading />;
    }

    return (
      <SafeBlueArea style={{ flex: 1 }}>
        <BlueHeader
          leftComponent={
            <Text
              style={{
                fontWeight: 'bold',
                fontSize: 34,
                color: BlueApp.settings.foregroundColor,
              }}
            >
              {loc.receive.list.header}
            </Text>
          }
          rightComponent={
            <TouchableOpacity onPress={() => this.props.navigation.goBack()}>
              <Icon
                name="times"
                size={16}
                type="font-awesome"
                color={BlueApp.settings.foregroundColor}
              />
            </TouchableOpacity>
          }
        />

        <BlueCard style={{ alignItems: 'center', flex: 1 }}>
          <QRCode
            value={this.state.address}
            size={(isIpad && 250) || 312}
            bgColor={BlueApp.settings.foregroundColor}
            fgColor={BlueApp.settings.brandingColor}
          />
          <BlueFormInputAddress editable value={this.state.address} />
        </BlueCard>
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

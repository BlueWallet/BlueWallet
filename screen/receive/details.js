import React, { Component } from 'react';
import { Dimensions } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import QRCode from 'react-native-qrcode';
import {
  BlueLoading,
  BlueSpacing40,
  BlueFormInputAddress,
  SafeBlueArea,
  BlueCard,
  BlueSpacing,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');
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
    console.log('receive/details - componentDidMount');
    this.setState({
      isLoading: false,
    });
  }

  render() {
    if (this.state.isLoading) {
      return <BlueLoading />;
    }

    return (
      <SafeBlueArea style={{ flex: 1 }}>
        {(() => {
          if (isIpad) {
            return <BlueSpacing40 />;
          } else {
            return <BlueSpacing />;
          }
        })()}

        <BlueCard
          title={loc.receive.details.title}
          style={{ alignItems: 'center', flex: 1 }}
        >
          <BlueFormInputAddress editable value={this.state.address} />
          <QRCode
            value={this.state.address}
            size={(isIpad && 250) || 312}
            bgColor={BlueApp.settings.foregroundColor}
            fgColor={BlueApp.settings.brandingColor}
          />
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

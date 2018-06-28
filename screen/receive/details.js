import React, { Component } from 'react';
import { Dimensions, View } from 'react-native';
import QRCode from 'react-native-qrcode';
import {
  BlueLoading,
  BlueFormInputAddress,
  SafeBlueArea,
  BlueCard,
  BlueHeaderDefaultSub,
  BlueSpacing,
  BlueSpacing40,
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
        {(() => {
          if (isIpad) {
            return <BlueSpacing40 />;
          } else {
            return <BlueSpacing />;
          }
        })()}
        <BlueHeaderDefaultSub
          leftText={loc.receive.list.header}
          onClose={() => this.props.navigation.goBack()}
        />

        <View
          style={{
            left: (width - ((isIpad && 250) || 312)) / 2,
          }}
        >
          <QRCode
            value={this.state.address}
            size={(isIpad && 250) || 312}
            bgColor={BlueApp.settings.foregroundColor}
            fgColor={BlueApp.settings.brandingColor}
          />
        </View>

        <BlueCard
          containerStyle={{
            alignItems: 'center',
            flex: 1,
            borderColor: 'red',
            borderWidth: 7,
          }}
        >
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

import React, { Component } from 'react';
import { Dimensions, View } from 'react-native';
import QRCode from 'react-native-qrcode';
import { BlueLoading, BlueFormInputAddress, SafeBlueArea, BlueCard, BlueHeaderDefaultSub, is } from '../../BlueComponents';
import PropTypes from 'prop-types';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');
// let EV = require('../../events');
const { width } = Dimensions.get('window');

export default class ReceiveDetails extends Component {
  static navigationOptions = {
    header: ({ navigation }) => {
      return <BlueHeaderDefaultSub leftText={loc.receive.header} onClose={() => navigation.goBack(null)} />;
    },
  };

  constructor(props) {
    super(props);
    let address = props.navigation.state.params.address;
    let secret = props.navigation.state.params.secret;

    this.state = {
      isLoading: true,
      address: address,
      secret: secret,
    };

    // EV(EV.enum.RECEIVE_ADDRESS_CHANGED, this.refreshFunction.bind(this));
  }

  /*  refreshFunction(newAddress) {
    console.log('newAddress =', newAddress);
    this.setState({
      address: newAddress,
    });
  } */

  async componentDidMount() {
    console.log('receive/details - componentDidMount');

    /**  @type {AbstractWallet}   */
    let wallet;
    let address = this.state.address;
    for (let w of BlueApp.getWallets()) {
      if ((address && w.getAddress() === this.state.address) || w.getSecret() === this.state.secret) {
        // found our wallet
        wallet = w;
      }
    }

    if (wallet && wallet.getAddressAsync) {
      setTimeout(async () => {
        address = await wallet.getAddressAsync();
        BlueApp.saveToDisk(); // caching whatever getAddressAsync() generated internally
        this.setState({
          address: address,
          isLoading: false,
        });
      }, 1);
    } else {
      this.setState({
        isLoading: false,
        address,
      });
    }
  }

  render() {
    console.log('render() receive/details, address,secret=', this.state.address, ',', this.state.secret);
    if (this.state.isLoading) {
      return <BlueLoading />;
    }

    return (
      <SafeBlueArea style={{ flex: 1 }}>
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

        <View
          style={{
            left: (width - ((is.ipad() && 250) || 312)) / 2,
          }}
        >
          <QRCode
            value={this.state.address}
            size={(is.ipad() && 250) || 312}
            bgColor={BlueApp.settings.foregroundColor}
            fgColor={BlueApp.settings.brandingColor}
          />
        </View>
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
        secret: PropTypes.string,
      }),
    }),
  }),
};

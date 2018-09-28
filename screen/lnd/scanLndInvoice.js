/* global alert */
import React from 'react';
import { Text, Dimensions, ActivityIndicator, Button, View, TouchableOpacity } from 'react-native';
import { BarCodeScanner, Permissions } from 'expo';
import PropTypes from 'prop-types';
import {
  BlueSpacingVariable,
  BlueFormInput,
  BlueSpacing20,
  BlueButton,
  SafeBlueArea,
  BlueCard,
  BlueHeaderDefaultSub,
} from '../../BlueComponents';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let currency = require('../../currency');
const { width } = Dimensions.get('window');

export default class ScanLndInvoice extends React.Component {
  static navigationOptions = {
    header: ({ navigation }) => {
      return <View />;
    },
  };

  state = {
    isLoading: false,
    hasCameraPermission: null,
    type: BarCodeScanner.Constants.Type.back,
    barCodeTypes: [BarCodeScanner.Constants.BarCodeType.qr],
  };

  constructor(props) {
    super(props);
    let fromSecret;
    if (props.navigation.state.params.fromSecret) fromSecret = props.navigation.state.params.fromSecret;
    let fromWallet = {};

    for (let w of BlueApp.getWallets()) {
      if (w.getSecret() === fromSecret) {
        fromWallet = w;
        break;
      }
    }

    this.state = {
      fromWallet,
      fromSecret,
    };
  }

  async onBarCodeScanned(ret) {
    if (this.ignoreRead) return;
    this.ignoreRead = true;
    setTimeout(() => {
      this.ignoreRead = false;
    }, 6000);

    if (!this.state.fromWallet) {
      alert('Error: cant find source wallet (this should never happen)');
      return this.props.navigation.goBack();
    }

    ret.data = ret.data.replace('LIGHTNING:', '').replace('lightning:', '');
    console.log(ret.data);

    /**
     * @type {LightningCustodianWallet}
     */
    let w = this.state.fromWallet;
    let decoded = false;
    try {
      decoded = await w.decodeInvoice(ret.data);

      let expiresIn = (decoded.timestamp * 1 + decoded.expiry * 1) * 1000; // ms
      if (+new Date() > expiresIn) {
        expiresIn = 'expired';
      } else {
        expiresIn = Math.round((expiresIn - +new Date()) / (60 * 1000)) + ' min';
      }

      this.setState({
        isPaying: true,
        invoice: ret.data,
        decoded,
        expiresIn,
      });
    } catch (Err) {
      alert(Err.message);
    }
  } // end

  async componentWillMount() {
    const { status } = await Permissions.askAsync(Permissions.CAMERA);
    this.setState({
      hasCameraPermission: status === 'granted',
      onCameraReady: function() {
        alert('onCameraReady');
      },
      barCodeTypes: [BarCodeScanner.Constants.BarCodeType.qr],
    });
  }

  async pay() {
    let decoded = this.state.decoded;

    /** @type {LightningCustodianWallet} */
    let fromWallet = this.state.fromWallet;

    let expiresIn = (decoded.timestamp * 1 + decoded.expiry * 1) * 1000; // ms
    if (+new Date() > expiresIn) {
      return alert('Invoice expired');
    }

    this.setState({
      isPayingInProgress: true,
    });

    let start = +new Date();
    let end;
    try {
      await fromWallet.payInvoice(this.state.invoice);
      end = +new Date();
    } catch (Err) {
      console.log(Err.message);
      return alert('Error');
    }

    console.log('payInvoice took', (end - start) / 1000, 'sec');

    alert('Success');
    this.props.navigation.goBack();
  }

  render() {
    if (this.state.isLoading) {
      return (
        <View style={{ flex: 1, paddingTop: 20 }}>
          <ActivityIndicator />
        </View>
      );
    }

    if (this.state.isPaying) {
      return (
        <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1 }}>
          <BlueSpacingVariable />
          <BlueHeaderDefaultSub leftText={'Pay invoice'} onClose={() => this.props.navigation.goBack()} />
          <BlueSpacing20 />

          <Text style={{ textAlign: 'center', fontSize: 50, fontWeight: '700', color: '#2f5fb3' }}>
            {currency.satoshiToLocalCurrency(this.state.decoded.num_satoshis)}
          </Text>
          <Text style={{ textAlign: 'center', fontSize: 25, fontWeight: '600', color: '#d4d4d4' }}>
            {currency.satoshiToBTC(this.state.decoded.num_satoshis)}
          </Text>
          <BlueSpacing20 />

          <BlueCard>
            <BlueFormInput value={this.state.decoded.destination} />
            <BlueFormInput value={this.state.decoded.description} />
            <Text style={{ color: '#81868e', fontSize: 12, left: 20, top: 10 }}>Expires in: {this.state.expiresIn}</Text>
          </BlueCard>

          <BlueSpacing20 />

          {(() => {
            if (this.state.isPayingInProgress) {
              return (
                <View>
                  <ActivityIndicator />
                </View>
              );
            } else {
              return (
                <BlueButton
                  icon={{
                    name: 'bolt',
                    type: 'font-awesome',
                    color: BlueApp.settings.buttonTextColor,
                  }}
                  title={'Pay'}
                  buttonStyle={{ width: 150, left: (width - 150) / 2 - 20 }}
                  onPress={() => {
                    this.pay();
                  }}
                />
              );
            }
          })()}
        </SafeBlueArea>
      );
    }

    const { hasCameraPermission } = this.state;
    if (hasCameraPermission === null) {
      return <View />;
    } else if (hasCameraPermission === false) {
      return <Text>No access to camera</Text>;
    } else {
      return (
        <View style={{ flex: 1 }}>
          <BarCodeScanner
            style={{ flex: 1 }}
            barCodeTypes={this.state.barCodeTypes}
            type={this.state.type}
            onBarCodeScanned={ret => this.onBarCodeScanned(ret)}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                flexDirection: 'row',
              }}
            >
              <TouchableOpacity
                style={{
                  flex: 0.2,
                  alignSelf: 'flex-end',
                  alignItems: 'center',
                }}
                onPress={() => {
                  this.setState({
                    type:
                      this.state.type === BarCodeScanner.Constants.Type.back
                        ? BarCodeScanner.Constants.Type.front
                        : BarCodeScanner.Constants.Type.back,
                  });
                }}
              >
                <Button style={{ fontSize: 18, marginBottom: 10 }} title="Go back" onPress={() => this.props.navigation.goBack()} />
              </TouchableOpacity>
            </View>
          </BarCodeScanner>
        </View>
      );
    }
  }
}

ScanLndInvoice.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.function,
    state: PropTypes.shape({
      params: PropTypes.shape({
        fromSecret: PropTypes.string,
      }),
    }),
  }),
};

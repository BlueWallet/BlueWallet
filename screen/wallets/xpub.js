import React, { Component } from 'react';
import { Dimensions, TouchableOpacity, ActivityIndicator, View, Image } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {
  BlueSpacing20,
  SafeBlueArea,
  BlueText,
  BlueNavigationStyle,
  BlueCopyTextToClipboard,
  BlueNFCSelectionModal,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
import Privacy from '../../Privacy';
import Biometric from '../../class/biometrics';
import NFC from '../../class/nfc';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');
const { height, width } = Dimensions.get('window');

export default class WalletXpub extends Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(navigation, true),
    title: loc.wallets.xpub.title,
    headerLeft:
      navigation.getParam('isNFCSupported') === true ? (
        <TouchableOpacity
          style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' }}
          onPress={navigation.state.params.onNFCScanPress}
        >
          <Image source={require('../../img/cellphone-nfc.png')} />
        </TouchableOpacity>
      ) : null,
  });

  constructor(props) {
    super(props);

    let secret = props.navigation.state.params.secret;
    let wallet;

    for (let w of BlueApp.getWallets()) {
      if (w.getSecret() === secret) {
        // found our wallet
        wallet = w;
      }
    }

    this.state = {
      isLoading: true,
      wallet,
      xpub: wallet.getXpub(),
      xpubText: wallet.getXpub(),
      isNFCModalVisible: false,
      qrCodeHeight: height > width ? width - 40 : width / 2,
    };
  }

  async componentDidMount() {
    Privacy.enableBlur();
    const isBiometricsEnabled = await Biometric.isBiometricUseCapableAndEnabled();

    if (isBiometricsEnabled) {
      if (!(await Biometric.unlockWithBiometrics())) {
        return this.props.navigation.goBack();
      }
    }

    this.setState({
      isLoading: false,
    });

    NFC.isSupported()
      .then(value => {
        if (value) {
          NFC.start();
          this.props.navigation.setParams({ isNFCSupported: true, onNFCScanPress: this.onNFCScanPress });
        }
      })
      .catch(_error => this.props.navigation.setParams({ isNFCSupported: false }));
  }

  async componentWillUnmount() {
    Privacy.disableBlur();
  }

  onLayout = () => {
    const { height } = Dimensions.get('window');
    this.setState({ qrCodeHeight: height > width ? width - 40 : width / 2 });
  };

  onNFCScanPress = () => {
    this.setState({ isNFCModalVisible: true });
  };

  onNFCModalCancelPressed = () => {
    this.setState({ isNFCModalVisible: false });
  };

  render() {
    if (this.state.isLoading) {
      return (
        <View style={{ flex: 1, paddingTop: 20 }}>
          <ActivityIndicator />
        </View>
      );
    }

    return (
      <SafeBlueArea style={{ flex: 1, paddingTop: 20 }}>
        <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }} onLayout={this.onLayout}>
          <View>
            <BlueText>{this.state.wallet.typeReadable}</BlueText>
          </View>
          <BlueSpacing20 />

          <QRCode
            value={this.state.xpub}
            logo={require('../../img/qr-code.png')}
            size={this.state.qrCodeHeight}
            logoSize={90}
            color={BlueApp.settings.foregroundColor}
            logoBackgroundColor={BlueApp.settings.brandingColor}
            ecl={'H'}
          />
          <BlueNFCSelectionModal
            isVisible={this.state.isNFCModalVisible}
            onCancelPressed={this.onNFCModalCancelPressed}
            textToWrite={this.state.xpub}
            onWriteSucceed={this.onNFCModalCancelPressed}
          />
          <BlueSpacing20 />
          <BlueCopyTextToClipboard text={this.state.xpubText} />
        </View>
      </SafeBlueArea>
    );
  }
}

WalletXpub.propTypes = {
  navigation: PropTypes.shape({
    setParams: PropTypes.func,
    state: PropTypes.shape({
      params: PropTypes.shape({
        secret: PropTypes.string,
      }),
    }),
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
};

/* global alert */
import React, { Component } from 'react';
import { Dimensions, ScrollView, ActivityIndicator, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {
  BlueSpacing20,
  SafeBlueArea,
  BlueNavigationStyle,
  BlueText,
  BlueCopyTextToClipboard,
  BlueCard,
  BlueNFCSelectionModal,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
import Privacy from '../../Privacy';
import Biometric from '../../class/biometrics';
import { LightningCustodianWallet } from '../../class';
import NFC from '../../class/nfc';
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');
const prompt = require('../../prompt');
const { height, width } = Dimensions.get('window');

export default class WalletExport extends Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(navigation, true),
    title: loc.wallets.export.title,
    headerLeft:
      navigation.getParam('isNFCSupported') === true ? (
        <TouchableOpacity style={{ width: 40, height: 40, padding: 14 }} onPress={navigation.state.params.onNFCScanPress}>
          <Image source={require('../../img/cellphone-nfc.png')} />
        </TouchableOpacity>
      ) : null,
  });

  constructor(props) {
    super(props);
    let address = props.navigation.state.params.address;
    let secret = props.navigation.state.params.secret;
    let wallet;
    for (let w of BlueApp.getWallets()) {
      if ((address && w.getAddress() === address) || w.getSecret() === secret) {
        // found our wallet
        wallet = w;
      }
    }

    this.state = {
      isLoading: true,
      isNFCModalVisible: false,
      qrCodeHeight: height > width ? width - 40 : width / 2,
      wallet,
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

    this.setState(
      {
        isLoading: false,
      },
      () => {
        this.state.wallet.setUserHasSavedExport(true);
        BlueApp.saveToDisk();
      },
    );
    NFC.isSupported()
      .then(value => {
        if (value) {
          NFC.start();
          this.props.navigation.setParams({ isNFCSupported: true, onNFCScanPress: this.onNFCScanPress });
        }
      })
      .catch(_error => this.props.navigation.setParams({ isNFCSupported: false }));
  }

  componentWillUnmount() {
    Privacy.disableBlur();
  }

  onNFCScanPress = () => {
    this.setState({ isNFCModalVisible: true });
  };

  onLayout = () => {
    const { height } = Dimensions.get('window');
    this.setState({ qrCodeHeight: height > width ? width - 40 : width / 2 });
  };

  onNFCModalCancelPressed = () => {
    this.setState({ isNFCModalVisible: false });
  };

  encryptSecret = async retry => {
    let p1 = false;
    do {
      p1 = await prompt(
        (retry && loc._.bad_password) || loc._.enter_password,
        'Please provide a password to protect your exported backup. This password will be required when trying to import your backup.',
      );
    } while (!p1);

    let p2 = await prompt(loc.plausibledeniability.retype_password);
    if (p1 !== p2) {
      return alert(loc.plausibledeniability.passwords_do_not_match);
    }
    const encryptedSecret = NFC.encryptData(this.state.wallet.getSecret(), p1);
    if (encryptedSecret) {
      await NFC.writeNFCData(encryptedSecret);
      this.setState({ isNFCModalVisible: false });
    }
  };

  render() {
    if (this.state.isLoading) {
      return (
        <View style={{ flex: 1, paddingTop: 20 }} onLayout={this.onLayout}>
          <ActivityIndicator />
        </View>
      );
    }

    return (
      <SafeBlueArea style={{ flex: 1, paddingTop: 20 }}>
        <ScrollView
          centerContent
          contentContainerStyle={{ alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}
          onLayout={this.onLayout}
        >
          <View>
            <BlueText>{this.state.wallet.typeReadable}</BlueText>
          </View>

          {(() => {
            if (this.state.wallet.getAddress()) {
              return (
                <BlueCard>
                  <BlueText>{this.state.wallet.getAddress()}</BlueText>
                </BlueCard>
              );
            }
          })()}
          <BlueSpacing20 />

          <QRCode
            value={this.state.wallet.getSecret()}
            logo={require('../../img/qr-code.png')}
            size={this.state.qrCodeHeight}
            logoSize={70}
            color={BlueApp.settings.foregroundColor}
            logoBackgroundColor={BlueApp.settings.brandingColor}
            ecl={'H'}
          />

          <BlueSpacing20 />
          {this.state.wallet.type === LightningCustodianWallet.type ? (
            <BlueCopyTextToClipboard text={this.state.wallet.getSecret()} />
          ) : (
            <BlueText style={{ alignItems: 'center', paddingHorizontal: 8 }}>{this.state.wallet.getSecret()}</BlueText>
          )}
          <BlueNFCSelectionModal
            isVisible={this.state.isNFCModalVisible}
            onCancelPressed={this.onNFCModalCancelPressed}
            onSaveNearMePressed={this.encryptSecret}
            onWriteSucceed={this.onNFCModalCancelPressed}
            allowShare={false}
          />
        </ScrollView>
      </SafeBlueArea>
    );
  }
}

WalletExport.propTypes = {
  navigation: PropTypes.shape({
    setParams: PropTypes.func,
    state: PropTypes.shape({
      params: PropTypes.shape({
        address: PropTypes.string,
        secret: PropTypes.string,
      }),
    }),
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
};

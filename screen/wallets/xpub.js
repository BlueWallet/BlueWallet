import React, { Component } from 'react';
import { Dimensions, ActivityIndicator, View, StatusBar, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { BlueSpacing20, SafeBlueArea, BlueText, BlueNavigationStyle, BlueCopyTextToClipboard } from '../../BlueComponents';
import PropTypes from 'prop-types';
import Privacy from '../../Privacy';
import Biometric from '../../class/biometrics';
import loc from '../../loc';
import { BlueCurrentTheme } from '../../components/themes';
/** @type {AppStorage} */
const BlueApp = require('../../BlueApp');
const { height, width } = Dimensions.get('window');

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 20,
    backgroundColor: BlueCurrentTheme.colors.elevated,
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});

export default class WalletXpub extends Component {
  constructor(props) {
    super(props);

    const secret = props.route.params.secret;
    let wallet;

    for (const w of BlueApp.getWallets()) {
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
  }

  async componentWillUnmount() {
    Privacy.disableBlur();
  }

  onLayout = () => {
    const { height } = Dimensions.get('window');
    this.setState({ qrCodeHeight: height > width ? width - 40 : width / 2 });
  };

  render() {
    if (this.state.isLoading) {
      return (
        <View style={styles.root}>
          <ActivityIndicator />
        </View>
      );
    }

    return (
      <SafeBlueArea style={styles.root}>
        <StatusBar barStyle="light-content" />
        <View style={styles.container} onLayout={this.onLayout}>
          <View>
            <BlueText>{this.state.wallet.typeReadable}</BlueText>
          </View>
          <BlueSpacing20 />

          <QRCode
            value={this.state.xpub}
            logo={require('../../img/qr-code.png')}
            size={this.state.qrCodeHeight}
            logoSize={90}
            color={BlueCurrentTheme.colors.foregroundColor}
            logoBackgroundColor={BlueCurrentTheme.colors.brandingColor}
            backgroundColor={BlueCurrentTheme.colors.background}
            ecl="H"
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
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
  route: PropTypes.shape({
    name: PropTypes.string,
    params: PropTypes.shape({
      secret: PropTypes.string,
    }),
  }),
};

WalletXpub.navigationOptions = ({ navigation }) => ({
  ...BlueNavigationStyle(navigation, true),
  title: loc.wallets.xpub_title,
  headerLeft: null,
});

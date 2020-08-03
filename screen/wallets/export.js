import React, { Component } from 'react';
import { Dimensions, ScrollView, ActivityIndicator, StatusBar, View, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { BlueSpacing20, SafeBlueArea, BlueNavigationStyle, BlueText, BlueCopyTextToClipboard, BlueCard } from '../../BlueComponents';
import PropTypes from 'prop-types';
import Privacy from '../../Privacy';
import Biometric from '../../class/biometrics';
import { LegacyWallet, LightningCustodianWallet, SegwitBech32Wallet, SegwitP2SHWallet, WatchOnlyWallet } from '../../class';
import loc from '../../loc';
import { BlueCurrentTheme } from '../../components/themes';
/** @type {AppStorage} */
const BlueApp = require('../../BlueApp');
const { height, width } = Dimensions.get('window');

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    paddingTop: 20,
  },
  root: {
    flex: 1,
    backgroundColor: BlueCurrentTheme.colors.elevated,
  },
  scrollViewContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  activeQrcode: { borderWidth: 6, borderRadius: 8, borderColor: '#FFFFFF' },
  type: {
    fontSize: 17,
    fontWeight: '700',
    color: BlueCurrentTheme.colors.foregroundColor,
  },
  secret: {
    alignItems: 'center',
    paddingHorizontal: 16,
    fontSize: 16,
    color: BlueCurrentTheme.colors.foregroundColor,
    lineHeight: 24,
  },
});

export default class WalletExport extends Component {
  constructor(props) {
    super(props);
    const wallet = props.route.params.wallet;
    this.state = {
      isLoading: true,
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
        <View style={styles.loading} onLayout={this.onLayout}>
          <ActivityIndicator />
        </View>
      );
    }

    return (
      <SafeBlueArea style={styles.root}>
        <StatusBar barStyle="light-content" />
        <ScrollView contentContainerStyle={styles.scrollViewContent} onLayout={this.onLayout}>
          <View>
            <BlueText style={styles.type}>{this.state.wallet.typeReadable}</BlueText>
          </View>

          {(() => {
            if ([LegacyWallet.type, SegwitBech32Wallet.type, SegwitP2SHWallet.type].includes(this.state.wallet.type)) {
              return (
                <BlueCard>
                  <BlueText>{this.state.wallet.getAddress()}</BlueText>
                </BlueCard>
              );
            }
          })()}
          <BlueSpacing20 />
          <View style={styles.activeQrcode}>
            <QRCode
              value={this.state.wallet.getSecret()}
              logo={require('../../img/qr-code.png')}
              size={this.state.qrCodeHeight}
              logoSize={70}
              color="#000000"
              logoBackgroundColor={BlueCurrentTheme.colors.brandingColor}
              backgroundColor="#FFFFFF"
              ecl="H"
            />
          </View>
          <BlueSpacing20 />
          {this.state.wallet.type === LightningCustodianWallet.type || this.state.wallet.type === WatchOnlyWallet.type ? (
            <BlueCopyTextToClipboard text={this.state.wallet.getSecret()} />
          ) : (
            <BlueText style={styles.secret}>{this.state.wallet.getSecret()}</BlueText>
          )}
        </ScrollView>
      </SafeBlueArea>
    );
  }
}

WalletExport.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
  route: PropTypes.shape({
    name: PropTypes.string,
    params: PropTypes.shape({
      wallet: PropTypes.object.isRequired,
    }),
  }),
};
WalletExport.navigationOptions = ({ navigation }) => ({
  ...BlueNavigationStyle(navigation, true),
  title: loc.wallets.export_title,
  headerLeft: null,
});

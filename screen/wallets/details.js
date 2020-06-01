/* global alert */
import React, { Component } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
  Switch,
  Platform,
  Linking,
  StyleSheet,
} from 'react-native';
import { BlueButton, SafeBlueArea, BlueCard, BlueSpacing20, BlueNavigationStyle, BlueText } from '../../BlueComponents';
import PropTypes from 'prop-types';
import { LightningCustodianWallet } from '../../class/wallets/lightning-custodian-wallet';
import { HDLegacyBreadwalletWallet } from '../../class/wallets/hd-legacy-breadwallet-wallet';
import { HDLegacyP2PKHWallet } from '../../class/wallets/hd-legacy-p2pkh-wallet';
import { HDSegwitP2SHWallet } from '../../class/wallets/hd-segwit-p2sh-wallet';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Biometric from '../../class/biometrics';
import { HDSegwitBech32Wallet, SegwitP2SHWallet, LegacyWallet, SegwitBech32Wallet, WatchOnlyWallet } from '../../class';
import { ScrollView } from 'react-native-gesture-handler';
const EV = require('../../events');
const prompt = require('../../prompt');
/** @type {AppStorage} */
const BlueApp = require('../../BlueApp');
const loc = require('../../loc');

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  save: {
    marginHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveText: {
    color: '#0c2550',
  },
  address: {
    alignItems: 'center',
    flex: 1,
  },
  textLabel1: {
    color: '#0c2550',
    fontWeight: '500',
    fontSize: 14,
    marginVertical: 12,
  },
  textLabel2: {
    color: '#0c2550',
    fontWeight: '500',
    fontSize: 14,
    marginVertical: 16,
  },
  textValue: {
    color: '#81868e',
    fontWeight: '500',
    fontSize: 14,
  },
  input: {
    flexDirection: 'row',
    borderColor: '#d2d2d2',
    borderBottomColor: '#d2d2d2',
    borderWidth: 1,
    borderBottomWidth: 0.5,
    backgroundColor: '#f5f5f5',
    minHeight: 44,
    height: 44,
    alignItems: 'center',
    borderRadius: 4,
  },
  inputText: {
    flex: 1,
    marginHorizontal: 8,
    minHeight: 33,
  },
  hardware: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: {
    alignItems: 'center',
  },
  delete: {
    color: '#d0021b',
    fontSize: 15,
    fontWeight: '500',
  },
});

export default class WalletDetails extends Component {
  static navigationOptions = ({ navigation, route }) => ({
    ...BlueNavigationStyle(),
    title: loc.wallets.details.title,
    headerRight: () => (
      <TouchableOpacity
        disabled={route.params.isLoading === true}
        style={styles.save}
        onPress={() => {
          if (route.params.saveAction) {
            route.params.saveAction();
          }
        }}
      >
        <Text style={styles.saveText}>{loc.wallets.details.save}</Text>
      </TouchableOpacity>
    ),
  });

  constructor(props) {
    super(props);

    const wallet = props.route.params.wallet;
    const isLoading = true;
    this.state = {
      isLoading,
      walletName: wallet.getLabel(),
      wallet,
      useWithHardwareWallet: wallet.useWithHardwareWalletEnabled(),
    };
    this.props.navigation.setParams({ isLoading, saveAction: () => this.setLabel() });
  }

  componentDidMount() {
    console.log('wallets/details componentDidMount');
    this.setState({
      isLoading: false,
    });
    this.props.navigation.setParams({ isLoading: false, saveAction: () => this.setLabel() });
  }

  setLabel() {
    this.props.navigation.setParams({ isLoading: true });
    this.setState({ isLoading: true }, async () => {
      if (this.state.walletName.trim().length > 0) {
        this.state.wallet.setLabel(this.state.walletName);
      }
      BlueApp.saveToDisk();
      alert('Wallet updated.');
      this.props.navigation.goBack(null);
    });
  }

  async presentWalletHasBalanceAlert() {
    ReactNativeHapticFeedback.trigger('notificationWarning', { ignoreAndroidSystemSettings: false });
    const walletBalanceConfirmation = await prompt(
      'Wallet Balance',
      `This wallet has a balance. Before proceeding, please be aware that you will not be able to recover the funds without this wallet's seed phrase. In order to avoid accidental removal this wallet, please enter your wallet's balance of ${this.state.wallet.getBalance()} satoshis.`,
      true,
      'plain-text',
    );
    if (Number(walletBalanceConfirmation) === this.state.wallet.getBalance()) {
      this.props.navigation.setParams({ isLoading: true });
      this.setState({ isLoading: true }, async () => {
        BlueApp.deleteWallet(this.state.wallet);
        ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
        await BlueApp.saveToDisk();
        EV(EV.enum.TRANSACTIONS_COUNT_CHANGED);
        EV(EV.enum.WALLETS_COUNT_CHANGED);
        this.props.navigation.popToTop();
      });
    } else {
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
      this.setState({ isLoading: false }, async () => {
        alert("The provided balance amount does not match this wallet's balance. Please, try again");
      });
    }
  }

  async onUseWithHardwareWalletSwitch(value) {
    this.setState((state, props) => {
      let wallet = state.wallet;
      wallet.setUseWithHardwareWalletEnabled(value);
      return { useWithHardwareWallet: !!value, wallet };
    });
  }

  renderMarketplaceButton = () => {
    return Platform.select({
      android: (
        <BlueButton
          onPress={() =>
            this.props.navigation.navigate('Marketplace', {
              fromWallet: this.state.wallet,
            })
          }
          title="Marketplace"
        />
      ),
      ios: (
        <BlueButton
          onPress={async () => {
            Linking.openURL('https://bluewallet.io/marketplace-btc/');
          }}
          title="Marketplace"
        />
      ),
    });
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
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <KeyboardAvoidingView behavior="position">
            <ScrollView contentContainerStyle={styles.scrollViewContent}>
              <BlueCard style={styles.address}>
                {(() => {
                  if (
                    [LegacyWallet.type, SegwitBech32Wallet.type, SegwitP2SHWallet.type].includes(this.state.wallet.type) ||
                    (this.state.wallet.type === WatchOnlyWallet.type && !this.state.wallet.isHd())
                  ) {
                    return (
                      <React.Fragment>
                        <Text style={styles.textLabel1}>{loc.wallets.details.address.toLowerCase()}</Text>
                        <Text style={styles.textValue}>{this.state.wallet.getAddress()}</Text>
                      </React.Fragment>
                    );
                  }
                })()}
                <Text style={styles.textLabel2}>{loc.wallets.add.wallet_name.toLowerCase()}</Text>

                <View style={styles.input}>
                  <TextInput
                    placeholder={loc.send.details.note_placeholder}
                    value={this.state.walletName}
                    onChangeText={text => {
                      this.setState({ walletName: text });
                    }}
                    onBlur={() => {
                      if (this.state.walletName.trim().length === 0) {
                        const walletLabel = this.state.wallet.getLabel();
                        this.setState({ walletName: walletLabel });
                      }
                    }}
                    numberOfLines={1}
                    style={styles.inputText}
                    editable={!this.state.isLoading}
                    underlineColorAndroid="transparent"
                  />
                </View>
                <BlueSpacing20 />
                <Text style={styles.textLabel1}>{loc.wallets.details.type.toLowerCase()}</Text>
                <Text style={styles.textValue}>{this.state.wallet.typeReadable}</Text>
                {this.state.wallet.type === LightningCustodianWallet.type && (
                  <React.Fragment>
                    <Text style={styles.textLabel1}>{loc.wallets.details.connected_to.toLowerCase()}</Text>
                    <BlueText>{this.state.wallet.getBaseURI()}</BlueText>
                  </React.Fragment>
                )}
                <View>
                  <BlueSpacing20 />
                  {this.state.wallet.type === WatchOnlyWallet.type && this.state.wallet.getSecret().startsWith('zpub') && (
                    <>
                      <Text style={styles.textLabel2}>{loc.wallets.details.advanced.toLowerCase()}</Text>
                      <View style={styles.hardware}>
                        <BlueText>{loc.wallets.details.use_with_hardware_wallet}</BlueText>
                        <Switch
                          value={this.state.useWithHardwareWallet}
                          onValueChange={value => this.onUseWithHardwareWalletSwitch(value)}
                        />
                      </View>
                      <React.Fragment>
                        <Text style={styles.textLabel1}>{loc.wallets.details.master_fingerprint.toLowerCase()}</Text>
                        <Text style={styles.textValue}>{this.state.wallet.getMasterFingerprintHex()}</Text>
                      </React.Fragment>
                      <BlueSpacing20 />
                    </>
                  )}

                  <BlueButton
                    onPress={() =>
                      this.props.navigation.navigate('WalletExport', {
                        wallet: this.state.wallet,
                      })
                    }
                    title={loc.wallets.details.export_backup}
                  />

                  <BlueSpacing20 />

                  {(this.state.wallet.type === HDLegacyBreadwalletWallet.type ||
                    this.state.wallet.type === HDLegacyP2PKHWallet.type ||
                    this.state.wallet.type === HDSegwitBech32Wallet.type ||
                    this.state.wallet.type === HDSegwitP2SHWallet.type) && (
                    <React.Fragment>
                      <BlueButton
                        onPress={() =>
                          this.props.navigation.navigate('WalletXpub', {
                            secret: this.state.wallet.getSecret(),
                          })
                        }
                        title={loc.wallets.details.show_xpub}
                      />

                      <BlueSpacing20 />
                      {this.renderMarketplaceButton()}
                    </React.Fragment>
                  )}
                  {this.state.wallet.type !== LightningCustodianWallet.type && (
                    <React.Fragment>
                      <BlueSpacing20 />
                      <BlueButton onPress={() => this.props.navigation.navigate('Broadcast')} title="Broadcast transaction" />
                    </React.Fragment>
                  )}
                  <BlueSpacing20 />
                  <TouchableOpacity
                    style={styles.center}
                    onPress={() => {
                      ReactNativeHapticFeedback.trigger('notificationWarning', { ignoreAndroidSystemSettings: false });
                      Alert.alert(
                        loc.wallets.details.delete + ' ' + loc.wallets.details.title,
                        loc.wallets.details.are_you_sure,
                        [
                          {
                            text: loc.wallets.details.yes_delete,
                            onPress: async () => {
                              const isBiometricsEnabled = await Biometric.isBiometricUseCapableAndEnabled();

                              if (isBiometricsEnabled) {
                                if (!(await Biometric.unlockWithBiometrics())) {
                                  return;
                                }
                              }
                              if (this.state.wallet.getBalance() > 0 && this.state.wallet.allowSend()) {
                                this.presentWalletHasBalanceAlert();
                              } else {
                                this.props.navigation.setParams({ isLoading: true });
                                this.setState({ isLoading: true }, async () => {
                                  BlueApp.deleteWallet(this.state.wallet);
                                  ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
                                  await BlueApp.saveToDisk();
                                  EV(EV.enum.TRANSACTIONS_COUNT_CHANGED);
                                  EV(EV.enum.WALLETS_COUNT_CHANGED);
                                  this.props.navigation.popToTop();
                                });
                              }
                            },
                            style: 'destructive',
                          },
                          { text: loc.wallets.details.no_cancel, onPress: () => {}, style: 'cancel' },
                        ],
                        { cancelable: false },
                      );
                    }}
                  >
                    <Text style={styles.delete}>{loc.wallets.details.delete}</Text>
                  </TouchableOpacity>
                </View>
              </BlueCard>
            </ScrollView>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </SafeBlueArea>
    );
  }
}

WalletDetails.propTypes = {
  navigation: PropTypes.shape({
    state: PropTypes.shape({
      params: PropTypes.shape({
        secret: PropTypes.string,
      }),
    }),
    navigate: PropTypes.func,
    goBack: PropTypes.func,
    popToTop: PropTypes.func,
    setParams: PropTypes.func,
  }),
  route: PropTypes.shape({
    params: PropTypes.object,
  }),
};

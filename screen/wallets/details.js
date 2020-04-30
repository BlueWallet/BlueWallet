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
} from 'react-native';
import { BlueButton, SafeBlueArea, BlueCard, BlueSpacing20, BlueNavigationStyle, BlueText } from '../../BlueComponents';
import PropTypes from 'prop-types';
import { LightningCustodianWallet } from '../../class/lightning-custodian-wallet';
import { HDLegacyBreadwalletWallet } from '../../class/hd-legacy-breadwallet-wallet';
import { HDLegacyP2PKHWallet } from '../../class/hd-legacy-p2pkh-wallet';
import { HDSegwitP2SHWallet } from '../../class/hd-segwit-p2sh-wallet';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Biometric from '../../class/biometrics';
import { HDSegwitBech32Wallet, SegwitP2SHWallet, LegacyWallet, SegwitBech32Wallet, WatchOnlyWallet } from '../../class';
import { ScrollView } from 'react-native-gesture-handler';
const EV = require('../../events');
const prompt = require('../../prompt');
/** @type {AppStorage} */
const BlueApp = require('../../BlueApp');
const loc = require('../../loc');

export default class WalletDetails extends Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(),
    title: loc.wallets.details.title,
    headerRight: (
      <TouchableOpacity
        disabled={navigation.getParam('isLoading') === true}
        style={{ marginHorizontal: 16, justifyContent: 'center', alignItems: 'center' }}
        onPress={() => {
          if (navigation.state.params.saveAction) {
            navigation.getParam('saveAction')();
          }
        }}
      >
        <Text style={{ color: '#0c2550' }}>{loc.wallets.details.save}</Text>
      </TouchableOpacity>
    ),
  });

  constructor(props) {
    super(props);

    const wallet = props.navigation.getParam('wallet');
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
        this.props.navigation.navigate('Wallets');
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
        <View style={{ flex: 1 }}>
          <ActivityIndicator />
        </View>
      );
    }
    return (
      <SafeBlueArea style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <KeyboardAvoidingView behavior="position">
            <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
              <BlueCard style={{ alignItems: 'center', flex: 1 }}>
                {(() => {
                  if (
                    [LegacyWallet.type, SegwitBech32Wallet.type, SegwitP2SHWallet.type].includes(this.state.wallet.type) ||
                    (this.state.wallet.type === WatchOnlyWallet.type && !this.state.wallet.isHd())
                  ) {
                    return (
                      <React.Fragment>
                        <Text style={{ color: '#0c2550', fontWeight: '500', fontSize: 14, marginVertical: 12 }}>
                          {loc.wallets.details.address.toLowerCase()}
                        </Text>
                        <Text style={{ color: '#81868e', fontWeight: '500', fontSize: 14 }}>{this.state.wallet.getAddress()}</Text>
                      </React.Fragment>
                    );
                  }
                })()}
                <Text style={{ color: '#0c2550', fontWeight: '500', fontSize: 14, marginVertical: 16 }}>
                  {loc.wallets.add.wallet_name.toLowerCase()}
                </Text>

                <View
                  style={{
                    flexDirection: 'row',
                    borderColor: '#d2d2d2',
                    borderBottomColor: '#d2d2d2',
                    borderWidth: 1.0,
                    borderBottomWidth: 0.5,
                    backgroundColor: '#f5f5f5',
                    minHeight: 44,
                    height: 44,
                    alignItems: 'center',
                    borderRadius: 4,
                  }}
                >
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
                    style={{ flex: 1, marginHorizontal: 8, minHeight: 33 }}
                    editable={!this.state.isLoading}
                    underlineColorAndroid="transparent"
                  />
                </View>
                <BlueSpacing20 />
                <Text style={{ color: '#0c2550', fontWeight: '500', fontSize: 14, marginVertical: 12 }}>
                  {loc.wallets.details.type.toLowerCase()}
                </Text>
                <Text style={{ color: '#81868e', fontWeight: '500', fontSize: 14 }}>{this.state.wallet.typeReadable}</Text>
                {this.state.wallet.type === LightningCustodianWallet.type && (
                  <React.Fragment>
                    <Text style={{ color: '#0c2550', fontWeight: '500', fontSize: 14, marginVertical: 12 }}>{'connected to'}</Text>
                    <BlueText>{this.state.wallet.getBaseURI()}</BlueText>
                  </React.Fragment>
                )}
                <View>
                  <BlueSpacing20 />
                  {this.state.wallet.type === WatchOnlyWallet.type && this.state.wallet.getSecret().startsWith('zpub') && (
                    <>
                      <Text style={{ color: '#0c2550', fontWeight: '500', fontSize: 14, marginVertical: 16 }}>{'advanced'}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <BlueText>{'Use with hardware wallet'}</BlueText>
                        <Switch
                          value={this.state.useWithHardwareWallet}
                          onValueChange={value => this.onUseWithHardwareWalletSwitch(value)}
                        />
                      </View>
                      <React.Fragment>
                        <Text style={{ color: '#0c2550', fontWeight: '500', fontSize: 14, marginVertical: 12 }}>
                          {loc.wallets.details.master_fingerprint.toLowerCase()}
                        </Text>
                        <Text style={{ color: '#81868e', fontWeight: '500', fontSize: 14 }}>
                          {this.state.wallet.getMasterFingerprintHex()}
                        </Text>
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
                    style={{ alignItems: 'center' }}
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
                                  this.props.navigation.navigate('Wallets');
                                });
                              }
                            },
                          },
                          { text: loc.wallets.details.no_cancel, onPress: () => {}, style: 'cancel' },
                        ],
                        { cancelable: false },
                      );
                    }}
                  >
                    <Text style={{ color: '#d0021b', fontSize: 15, fontWeight: '500' }}>{loc.wallets.details.delete}</Text>
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
    getParam: PropTypes.func,
    state: PropTypes.shape({
      params: PropTypes.shape({
        secret: PropTypes.string,
      }),
    }),
    navigate: PropTypes.func,
    goBack: PropTypes.func,
    setParams: PropTypes.func,
  }),
};

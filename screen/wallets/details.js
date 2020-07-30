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
  StatusBar,
} from 'react-native';
import { SecondButton, SafeBlueArea, BlueCard, BlueSpacing20, BlueNavigationStyle, BlueText } from '../../BlueComponents';
import PropTypes from 'prop-types';
import { LightningCustodianWallet } from '../../class/wallets/lightning-custodian-wallet';
import { HDLegacyBreadwalletWallet } from '../../class/wallets/hd-legacy-breadwallet-wallet';
import { HDLegacyP2PKHWallet } from '../../class/wallets/hd-legacy-p2pkh-wallet';
import { HDSegwitP2SHWallet } from '../../class/wallets/hd-segwit-p2sh-wallet';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Biometric from '../../class/biometrics';
import { HDSegwitBech32Wallet, SegwitP2SHWallet, LegacyWallet, SegwitBech32Wallet, WatchOnlyWallet } from '../../class';
import { ScrollView } from 'react-native-gesture-handler';
import loc from '../../loc';
import { BlueCurrentTheme } from '../../components/themes';
const EV = require('../../blue_modules/events');
const prompt = require('../../blue_modules/prompt');
const BlueApp = require('../../BlueApp');
const notifications = require('../../blue_modules/notifications');

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
    color: BlueCurrentTheme.colors.outputValue,
  },
  address: {
    alignItems: 'center',
    flex: 1,
  },
  textLabel1: {
    color: BlueCurrentTheme.colors.feeText,
    fontWeight: '500',
    fontSize: 14,
    marginVertical: 12,
  },
  textLabel2: {
    color: BlueCurrentTheme.colors.feeText,
    fontWeight: '500',
    fontSize: 14,
    marginVertical: 16,
  },
  textValue: {
    color: BlueCurrentTheme.colors.outputValue,
    fontWeight: '500',
    fontSize: 14,
  },
  input: {
    flexDirection: 'row',
    borderColor: BlueCurrentTheme.colors.formBorder,
    borderBottomColor: BlueCurrentTheme.colors.formBorder,
    borderWidth: 1,
    borderBottomWidth: 0.5,
    backgroundColor: BlueCurrentTheme.colors.inputBackgroundColor,
    minHeight: 44,
    height: 44,
    alignItems: 'center',
    borderRadius: 4,
  },
  inputText: {
    flex: 1,
    marginHorizontal: 8,
    minHeight: 33,
    color: '#81868e',
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
      await BlueApp.saveToDisk();
      EV(EV.enum.TRANSACTIONS_COUNT_CHANGED);
      alert(loc.wallets.details_wallet_updated);
      this.props.navigation.goBack(null);
    });
  }

  async presentWalletHasBalanceAlert() {
    ReactNativeHapticFeedback.trigger('notificationWarning', { ignoreAndroidSystemSettings: false });
    const walletBalanceConfirmation = await prompt(
      loc.wallets.details_del_wb,
      loc.formatString(loc.wallets.details_del_wb_q, { balance: this.state.wallet.getBalance() }),
      true,
      'plain-text',
    );
    if (Number(walletBalanceConfirmation) === this.state.wallet.getBalance()) {
      this.props.navigation.setParams({ isLoading: true });
      this.setState({ isLoading: true }, async () => {
        notifications.unsubscribe(this.state.wallet.getAllExternalAddresses(), [], []);
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
        alert(loc.wallets.details_del_wb_err);
      });
    }
  }

  async onUseWithHardwareWalletSwitch(value) {
    this.setState((state, props) => {
      const wallet = state.wallet;
      wallet.setUseWithHardwareWalletEnabled(value);
      return { useWithHardwareWallet: !!value, wallet };
    });
  }

  onHideTransactionsInWalletsListSwitch = value => {
    this.setState(state => {
      const wallet = state.wallet;
      wallet.setHideTransactionsInWalletsList(!value);
      return { wallet };
    });
  };

  renderMarketplaceButton = () => {
    return Platform.select({
      android: (
        <SecondButton
          onPress={() =>
            this.props.navigation.navigate('Marketplace', {
              fromWallet: this.state.wallet,
            })
          }
          title={loc.wallets.details_marketplace}
        />
      ),
      ios: (
        <SecondButton
          onPress={async () => {
            Linking.openURL('https://bluewallet.io/marketplace-btc/');
          }}
          title={loc.wallets.details_marketplace}
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
        <StatusBar barStyle="default" />
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : null}>
            <ScrollView contentContainerStyle={styles.scrollViewContent}>
              <BlueCard style={styles.address}>
                {(() => {
                  if (
                    [LegacyWallet.type, SegwitBech32Wallet.type, SegwitP2SHWallet.type].includes(this.state.wallet.type) ||
                    (this.state.wallet.type === WatchOnlyWallet.type && !this.state.wallet.isHd())
                  ) {
                    return (
                      <>
                        <Text style={styles.textLabel1}>{loc.wallets.details_address.toLowerCase()}</Text>
                        <Text style={styles.textValue}>{this.state.wallet.getAddress()}</Text>
                      </>
                    );
                  }
                })()}
                <Text style={styles.textLabel2}>{loc.wallets.add_wallet_name.toLowerCase()}</Text>

                <View style={styles.input}>
                  <TextInput
                    placeholder={loc.send.details_note_placeholder}
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
                    placeholderTextColor="#81868e"
                    style={styles.inputText}
                    editable={!this.state.isLoading}
                    underlineColorAndroid="transparent"
                  />
                </View>
                <BlueSpacing20 />
                <Text style={styles.textLabel1}>{loc.wallets.details_type.toLowerCase()}</Text>
                <Text style={styles.textValue}>{this.state.wallet.typeReadable}</Text>
                {this.state.wallet.type === LightningCustodianWallet.type && (
                  <>
                    <Text style={styles.textLabel1}>{loc.wallets.details_connected_to.toLowerCase()}</Text>
                    <BlueText>{this.state.wallet.getBaseURI()}</BlueText>
                  </>
                )}
                <>
                  <Text style={styles.textLabel2}>{loc.transactions.list_title.toLowerCase()}</Text>
                  <View style={styles.hardware}>
                    <BlueText>{loc.wallets.details_display}</BlueText>
                    <Switch
                      value={!this.state.wallet.getHideTransactionsInWalletsList()}
                      onValueChange={this.onHideTransactionsInWalletsListSwitch}
                    />
                  </View>
                </>
                <>
                  <Text style={styles.textLabel2}>{loc.transactions.transactions_count.toLowerCase()}</Text>
                  <BlueText>{this.state.wallet.getTransactions().length}</BlueText>
                </>
                <View>
                  <BlueSpacing20 />
                  {this.state.wallet.type === WatchOnlyWallet.type && this.state.wallet.getSecret().startsWith('zpub') && (
                    <>
                      <Text style={styles.textLabel2}>{loc.wallets.details_advanced.toLowerCase()}</Text>
                      <View style={styles.hardware}>
                        <BlueText>{loc.wallets.details_use_with_hardware_wallet}</BlueText>
                        <Switch
                          value={this.state.useWithHardwareWallet}
                          onValueChange={value => this.onUseWithHardwareWalletSwitch(value)}
                        />
                      </View>
                      <>
                        <Text style={styles.textLabel1}>{loc.wallets.details_master_fingerprint.toLowerCase()}</Text>
                        <Text style={styles.textValue}>{this.state.wallet.getMasterFingerprintHex()}</Text>
                      </>
                      <BlueSpacing20 />
                    </>
                  )}

                  <SecondButton
                    onPress={() =>
                      this.props.navigation.navigate('WalletExport', {
                        wallet: this.state.wallet,
                      })
                    }
                    title={loc.wallets.details_export_backup}
                  />

                  <BlueSpacing20 />

                  {(this.state.wallet.type === HDLegacyBreadwalletWallet.type ||
                    this.state.wallet.type === HDLegacyP2PKHWallet.type ||
                    this.state.wallet.type === HDSegwitBech32Wallet.type ||
                    this.state.wallet.type === HDSegwitP2SHWallet.type) && (
                    <>
                      <SecondButton
                        onPress={() =>
                          this.props.navigation.navigate('WalletXpub', {
                            secret: this.state.wallet.getSecret(),
                          })
                        }
                        title={loc.wallets.details_show_xpub}
                      />

                      <BlueSpacing20 />
                      {this.renderMarketplaceButton()}
                    </>
                  )}
                  {this.state.wallet.type !== LightningCustodianWallet.type && (
                    <>
                      <BlueSpacing20 />
                      <SecondButton onPress={() => this.props.navigation.navigate('Broadcast')} title={loc.settings.network_broadcast} />
                    </>
                  )}
                  <BlueSpacing20 />
                  <TouchableOpacity
                    style={styles.center}
                    onPress={() => {
                      ReactNativeHapticFeedback.trigger('notificationWarning', { ignoreAndroidSystemSettings: false });
                      Alert.alert(
                        loc.wallets.details_delete_wallet,
                        loc.wallets.details_are_you_sure,
                        [
                          {
                            text: loc.wallets.details_yes_delete,
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
                                  notifications.unsubscribe(this.state.wallet.getAllExternalAddresses(), [], []);
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
                          { text: loc.wallets.details_no_cancel, onPress: () => {}, style: 'cancel' },
                        ],
                        { cancelable: false },
                      );
                    }}
                  >
                    <Text style={styles.delete}>{loc.wallets.details_delete}</Text>
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

WalletDetails.navigationOptions = ({ navigation, route }) => ({
  ...BlueNavigationStyle(),
  title: loc.wallets.details_title,
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
      <Text style={styles.saveText}>{loc.wallets.details_save}</Text>
    </TouchableOpacity>
  ),
});

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

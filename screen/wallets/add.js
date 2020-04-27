/* global alert */
import React, { Component } from 'react';
import {
  Text,
  ScrollView,
  LayoutAnimation,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  View,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import {
  BlueTextCentered,
  BlueText,
  LightningButton,
  BitcoinButton,
  BlueFormLabel,
  BlueButton,
  SafeBlueArea,
  BlueNavigationStyle,
  BlueButtonLink,
  BlueSpacing20,
} from '../../BlueComponents';
import { RadioGroup, RadioButton } from 'react-native-flexi-radio-button';
import PropTypes from 'prop-types';
import { HDSegwitP2SHWallet } from '../../class/hd-segwit-p2sh-wallet';
import { LightningCustodianWallet } from '../../class/lightning-custodian-wallet';
import { AppStorage, HDSegwitBech32Wallet, SegwitP2SHWallet } from '../../class';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
let EV = require('../../events');
let A = require('../../analytics');
let BlueApp: AppStorage = require('../../BlueApp');
let loc = require('../../loc');
export default class WalletsAdd extends Component {
  static navigationOptions = ({ navigation }) => ({
    ...BlueNavigationStyle(navigation, true),
    title: loc.wallets.add.title,
    headerLeft: null,
  });

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      walletBaseURI: '',
    };
  }

  async componentDidMount() {
    let walletBaseURI = await AsyncStorage.getItem(AppStorage.LNDHUB);
    let isAdvancedOptionsEnabled = await BlueApp.isAdancedModeEnabled();
    walletBaseURI = walletBaseURI || '';

    this.setState({
      isLoading: false,
      activeBitcoin: undefined,
      label: '',
      isAdvancedOptionsEnabled,
      walletBaseURI,
    });
  }

  setLabel(text) {
    this.setState({
      label: text,
    }); /* also, a hack to make screen update new typed text */
  }

  onSelect(index, value) {
    this.setState({
      selectedIndex: index,
      selectedValue: value,
    });
  }

  showAdvancedOptions = () => {
    Keyboard.dismiss();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    this.setState({ isAdvancedOptionsEnabled: true });
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
      <SafeBlueArea>
        <ScrollView>
          <KeyboardAvoidingView enabled behavior={Platform.OS === 'ios' ? 'padding' : null} keyboardVerticalOffset={62}>
            <BlueFormLabel>{loc.wallets.add.wallet_name}</BlueFormLabel>
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
                marginHorizontal: 20,
                alignItems: 'center',
                marginVertical: 16,
                borderRadius: 4,
              }}
            >
              <TextInput
                testID="WalletNameInput"
                value={this.state.label}
                placeholderTextColor="#81868e"
                placeholder="my first wallet"
                onChangeText={text => {
                  this.setLabel(text);
                }}
                style={{ flex: 1, marginHorizontal: 8, color: '#81868e' }}
                editable={!this.state.isLoading}
                underlineColorAndroid="transparent"
              />
            </View>
            <BlueFormLabel>{loc.wallets.add.wallet_type}</BlueFormLabel>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingTop: 10,
                marginHorizontal: 20,
                borderWidth: 0,
                minHeight: 100,
              }}
            >
              <BitcoinButton
                testID="ActivateBitcoinButton"
                active={this.state.activeBitcoin}
                onPress={() => {
                  Keyboard.dismiss();
                  this.setState({
                    activeBitcoin: true,
                    activeLightning: false,
                  });
                }}
                style={{
                  width: '45%',
                  height: 88,
                }}
              />
              <View style={{ borderWidth: 0, justifyContent: 'center', marginHorizontal: 8, alignSelf: 'center' }}>
                <BlueTextCentered style={{ color: '#0c2550' }}>{loc.wallets.add.or}</BlueTextCentered>
              </View>
              <LightningButton
                active={this.state.activeLightning}
                onPress={() => {
                  Keyboard.dismiss();
                  this.setState({
                    activeBitcoin: false,
                    activeLightning: true,
                  });
                }}
                style={{
                  width: '45%',
                  height: 88,
                }}
              />
            </View>

            <View style={{ marginHorizontal: 20 }}>
              {(() => {
                if (this.state.activeBitcoin && this.state.isAdvancedOptionsEnabled) {
                  return (
                    <View>
                      <BlueSpacing20 />
                      <Text style={{ color: '#0c2550', fontWeight: '500' }}>{loc.settings.advanced_options}</Text>
                      <RadioGroup onSelect={(index, value) => this.onSelect(index, value)} selectedIndex={0}>
                        <RadioButton value={HDSegwitBech32Wallet.type}>
                          <BlueText>{HDSegwitBech32Wallet.typeReadable} - Multiple addresses</BlueText>
                        </RadioButton>
                        <RadioButton value={SegwitP2SHWallet.type}>
                          <BlueText>{SegwitP2SHWallet.typeReadable} - Single address</BlueText>
                        </RadioButton>
                        <RadioButton value={HDSegwitP2SHWallet.type}>
                          <BlueText>{HDSegwitP2SHWallet.typeReadable} - Multiple addresses</BlueText>
                        </RadioButton>
                      </RadioGroup>
                    </View>
                  );
                } else if (this.state.activeLightning && this.state.isAdvancedOptionsEnabled) {
                  return (
                    <React.Fragment>
                      <BlueSpacing20 />
                      <Text style={{ color: '#0c2550', fontWeight: '500' }}>{loc.settings.advanced_options}</Text>
                      <BlueSpacing20 />
                      <BlueText>Connect to your LNDHub</BlueText>
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
                          marginVertical: 16,
                          borderRadius: 4,
                        }}
                      >
                        <TextInput
                          value={this.state.walletBaseURI}
                          onChangeText={text => {
                            this.setState({ walletBaseURI: text });
                          }}
                          onSubmitEditing={Keyboard.dismiss}
                          placeholder="your node address"
                          clearButtonMode="while-editing"
                          autoCapitalize="none"
                          placeholderTextColor="#81868e"
                          style={{ flex: 1, marginHorizontal: 8, color: '#81868e' }}
                          editable={!this.state.isLoading}
                          underlineColorAndroid="transparent"
                        />
                      </View>
                    </React.Fragment>
                  );
                } else if (this.state.activeBitcoin === undefined && this.state.isAdvancedOptionsEnabled) {
                  return <View />;
                }
              })()}
              <View
                style={{
                  alignItems: 'center',
                  flex: 1,
                  marginTop: 32,
                }}
              >
                {!this.state.isLoading ? (
                  <BlueButton
                    testID="Create"
                    title={loc.wallets.add.create}
                    disabled={this.state.activeBitcoin === undefined}
                    onPress={() => {
                      this.setState({ isLoading: true }, async () => {
                        let w;

                        if (this.state.activeLightning) {
                          // eslint-disable-next-line

                          this.createLightningWallet = async () => {
                            w = new LightningCustodianWallet();
                            w.setLabel(this.state.label || loc.wallets.details.title);

                            try {
                              let lndhub =
                                this.state.walletBaseURI.trim().length > 0
                                  ? this.state.walletBaseURI
                                  : LightningCustodianWallet.defaultBaseUri;
                              if (lndhub) {
                                const isValidNodeAddress = await LightningCustodianWallet.isValidNodeAddress(lndhub);
                                if (isValidNodeAddress) {
                                  w.setBaseURI(lndhub);
                                  w.init();
                                } else {
                                  throw new Error('The provided node address is not valid LNDHub node.');
                                }
                              }
                              await w.createAccount();
                              await w.authorize();
                            } catch (Err) {
                              this.setState({ isLoading: false });
                              console.warn('lnd create failure', Err);
                              return alert(Err);
                              // giving app, not adding anything
                            }
                            A(A.ENUM.CREATED_LIGHTNING_WALLET);
                            await w.generate();
                            BlueApp.wallets.push(w);
                            await BlueApp.saveToDisk();
                            EV(EV.enum.WALLETS_COUNT_CHANGED);
                            A(A.ENUM.CREATED_WALLET);
                            ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
                            this.props.navigation.navigate('PleaseBackupLNDHub', {
                              wallet: w,
                            });
                          };
                          this.createLightningWallet();
                        } else if (this.state.selectedIndex === 2) {
                          // zero index radio - HD segwit
                          w = new HDSegwitP2SHWallet();
                          w.setLabel(this.state.label || loc.wallets.details.title);
                        } else if (this.state.selectedIndex === 1) {
                          // btc was selected
                          // index 1 radio - segwit single address
                          w = new SegwitP2SHWallet();
                          w.setLabel(this.state.label || loc.wallets.details.title);
                        } else {
                          // btc was selected
                          // index 2 radio - hd bip84
                          w = new HDSegwitBech32Wallet();
                          w.setLabel(this.state.label || loc.wallets.details.title);
                        }
                        if (this.state.activeBitcoin) {
                          await w.generate();
                          BlueApp.wallets.push(w);
                          await BlueApp.saveToDisk();
                          EV(EV.enum.WALLETS_COUNT_CHANGED);
                          A(A.ENUM.CREATED_WALLET);
                          ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
                          if (w.type === HDSegwitP2SHWallet.type || w.type === HDSegwitBech32Wallet.type) {
                            this.props.navigation.navigate('PleaseBackup', {
                              secret: w.getSecret(),
                            });
                          } else {
                            this.props.navigation.dismiss();
                          }
                        }
                      });
                    }}
                  />
                ) : (
                  <ActivityIndicator />
                )}
              </View>
              <BlueButtonLink
                testID="ImportWallet"
                style={{ marginBottom: 0, marginTop: 24 }}
                title={loc.wallets.add.import_wallet}
                onPress={() => {
                  this.props.navigation.navigate('ImportWallet');
                }}
              />
            </View>
          </KeyboardAvoidingView>
        </ScrollView>
      </SafeBlueArea>
    );
  }
}

WalletsAdd.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
    dismiss: PropTypes.func,
  }),
};

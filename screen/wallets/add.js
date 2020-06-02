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
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import {
  BlueTextCentered,
  BlueText,
  BlueListItem,
  LightningButton,
  BitcoinButton,
  BlueFormLabel,
  BlueButton,
  SafeBlueArea,
  BlueNavigationStyle,
  BlueButtonLink,
  BlueSpacing20,
} from '../../BlueComponents';
import PropTypes from 'prop-types';
import { HDSegwitBech32Wallet, SegwitP2SHWallet, HDSegwitP2SHWallet, LightningCustodianWallet, AppStorage } from '../../class';

import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Icon } from 'react-native-elements';
let EV = require('../../events');
let A = require('../../analytics');
let BlueApp: AppStorage = require('../../BlueApp');
let loc = require('../../loc');

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    paddingTop: 20,
  },
  label: {
    flexDirection: 'row',
    borderColor: '#d2d2d2',
    borderBottomColor: '#d2d2d2',
    borderWidth: 1,
    borderBottomWidth: 0.5,
    backgroundColor: '#f5f5f5',
    minHeight: 44,
    height: 44,
    marginHorizontal: 20,
    alignItems: 'center',
    marginVertical: 16,
    borderRadius: 4,
  },
  textInputCommon: {
    flex: 1,
    marginHorizontal: 8,
    color: '#81868e',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginHorizontal: 20,
    borderWidth: 0,
    minHeight: 100,
  },
  button: {
    width: '45%',
    height: 88,
  },
  or: {
    borderWidth: 0,
    justifyContent: 'center',
    marginHorizontal: 8,
    alignSelf: 'center',
  },
  orCenter: {
    color: '#0c2550',
  },
  advanced: {
    marginHorizontal: 20,
  },
  advancedText: {
    color: '#0c2550',
    fontWeight: '500',
  },
  lndUri: {
    flexDirection: 'row',
    borderColor: '#d2d2d2',
    borderBottomColor: '#d2d2d2',
    borderWidth: 1,
    borderBottomWidth: 0.5,
    backgroundColor: '#f5f5f5',
    minHeight: 44,
    height: 44,
    alignItems: 'center',
    marginVertical: 16,
    borderRadius: 4,
  },
  createButton: {
    alignItems: 'center',
    flex: 1,
    marginTop: 32,
  },
  import: {
    marginBottom: 0,
    marginTop: 24,
  },
  noPadding: {
    paddingHorizontal: 0,
  },
});

export default class WalletsAdd extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      walletBaseURI: '',
      selectedIndex: 0,
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

  onSelect(index) {
    this.setState({
      selectedIndex: index,
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
        <View style={styles.loading}>
          <ActivityIndicator />
        </View>
      );
    }

    return (
      <SafeBlueArea>
        <ScrollView>
          <KeyboardAvoidingView enabled behavior={Platform.OS === 'ios' ? 'padding' : null} keyboardVerticalOffset={62}>
            <BlueFormLabel>{loc.wallets.add.wallet_name}</BlueFormLabel>
            <View style={styles.label}>
              <TextInput
                testID="WalletNameInput"
                value={this.state.label}
                placeholderTextColor="#81868e"
                placeholder="my first wallet"
                onChangeText={text => {
                  this.setLabel(text);
                }}
                style={styles.textInputCommon}
                editable={!this.state.isLoading}
                underlineColorAndroid="transparent"
              />
            </View>
            <BlueFormLabel>{loc.wallets.add.wallet_type}</BlueFormLabel>

            <View style={styles.buttons}>
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
                style={styles.button}
              />
              <View style={styles.or}>
                <BlueTextCentered style={styles.orCenter}>{loc.wallets.add.or}</BlueTextCentered>
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
                style={styles.button}
              />
            </View>

            <View style={styles.advanced}>
              {(() => {
                if (this.state.activeBitcoin && this.state.isAdvancedOptionsEnabled) {
                  return (
                    <View>
                      <BlueSpacing20 />
                      <Text style={styles.advancedText}>{loc.settings.advanced_options}</Text>
                      <BlueListItem
                        containerStyle={styles.noPadding}
                        bottomDivider={false}
                        onPress={() => {
                          this.onSelect(0, HDSegwitBech32Wallet.type);
                        }}
                        title={HDSegwitBech32Wallet.typeReadable}
                        {...(this.state.selectedIndex === 0
                          ? {
                              rightIcon: <Icon name="check" type="octaicon" color="#0070FF" />,
                            }
                          : { hideChevron: true })}
                      />
                      <BlueListItem
                        containerStyle={styles.noPadding}
                        bottomDivider={false}
                        onPress={() => {
                          this.onSelect(1, SegwitP2SHWallet.type);
                        }}
                        title={SegwitP2SHWallet.typeReadable}
                        {...(this.state.selectedIndex === 1
                          ? {
                              rightIcon: <Icon name="check" type="octaicon" color="#0070FF" />,
                            }
                          : { hideChevron: true })}
                      />
                      <BlueListItem
                        containerStyle={styles.noPadding}
                        bottomDivider={false}
                        onPress={() => {
                          this.onSelect(2, HDSegwitP2SHWallet.typeReadable.type);
                        }}
                        title={HDSegwitP2SHWallet.typeReadable}
                        {...(this.state.selectedIndex === 2
                          ? {
                              rightIcon: <Icon name="check" type="octaicon" color="#0070FF" />,
                            }
                          : { hideChevron: true })}
                      />
                    </View>
                  );
                } else if (this.state.activeLightning && this.state.isAdvancedOptionsEnabled) {
                  return (
                    <React.Fragment>
                      <BlueSpacing20 />
                      <Text style={styles.advancedText}>{loc.settings.advanced_options}</Text>
                      <BlueSpacing20 />
                      <BlueText>Connect to your LNDHub</BlueText>
                      <View style={styles.lndUri}>
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
                          style={styles.textInputCommon}
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
              <View style={styles.createButton}>
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
                            this.props.navigation.goBack();
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
                style={styles.import}
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

WalletsAdd.navigationOptions = ({ navigation }) => ({
  ...BlueNavigationStyle(navigation, true),
  title: loc.wallets.add.title,
  headerLeft: null,
});

WalletsAdd.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
};

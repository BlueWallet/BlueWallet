/* global alert */
import React, { useEffect, useState, useCallback, useContext, useRef } from 'react';
import {
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
  ScrollView,
  PermissionsAndroid,
  InteractionManager,
  ActivityIndicator,
  I18nManager,
} from 'react-native';
import { BlueCard, BlueLoading, BlueSpacing10, BlueSpacing20, BlueText, SecondButton, BlueListItem } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import { LightningCustodianWallet } from '../../class/wallets/lightning-custodian-wallet';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Biometric from '../../class/biometrics';
import {
  HDSegwitBech32Wallet,
  SegwitP2SHWallet,
  LegacyWallet,
  SegwitBech32Wallet,
  WatchOnlyWallet,
  MultisigHDWallet,
  HDAezeedWallet,
  LightningLdkWallet,
} from '../../class';
import loc from '../../loc';
import { useTheme, useRoute, useNavigation } from '@react-navigation/native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import Notifications from '../../blue_modules/notifications';
import { isDesktop } from '../../blue_modules/environment';
import { AbstractHDElectrumWallet } from '../../class/wallets/abstract-hd-electrum-wallet';
import { Chain } from '../../models/bitcoinUnits';

const prompt = require('../../blue_modules/prompt');

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
  address: {
    alignItems: 'center',
    flex: 1,
  },
  textLabel1: {
    fontWeight: '500',
    fontSize: 14,
    marginVertical: 12,
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
  },
  textLabel2: {
    fontWeight: '500',
    fontSize: 14,
    marginVertical: 16,
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
  },
  textValue: {
    fontWeight: '500',
    fontSize: 14,
  },
  input: {
    flexDirection: 'row',
    borderWidth: 1,
    borderBottomWidth: 0.5,
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
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
  },
  hardware: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  delete: {
    color: '#d0021b',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  marginRight16: {
    marginRight: 16,
  },
});

const WalletDetails = () => {
  const { saveToDisk, wallets, deleteWallet, setSelectedWallet } = useContext(BlueStorageContext);
  const { walletID } = useRoute().params;
  const [isLoading, setIsLoading] = useState(false);
  const [backdoorPressed, setBackdoorPressed] = useState(0);
  const wallet = useRef(wallets.find(w => w.getID() === walletID)).current;
  const [walletName, setWalletName] = useState(wallet.getLabel());
  const [useWithHardwareWallet, setUseWithHardwareWallet] = useState(wallet.useWithHardwareWalletEnabled());
  const { isAdancedModeEnabled } = useContext(BlueStorageContext);
  const [isAdvancedModeEnabledRender, setIsAdvancedModeEnabledRender] = useState(false);
  const [hideTransactionsInWalletsList, setHideTransactionsInWalletsList] = useState(!wallet.getHideTransactionsInWalletsList());
  const { goBack, navigate, setOptions, popToTop } = useNavigation();
  const { colors } = useTheme();
  const [masterFingerprint, setMasterFingerprint] = useState();
  const [lightningWalletInfo, setLightningWalletInfo] = useState({});

  useEffect(() => {
    if (isAdvancedModeEnabledRender && wallet.allowMasterFingerprint()) {
      InteractionManager.runAfterInteractions(() => {
        setMasterFingerprint(wallet.getMasterFingerprintHex());
      });
    }
  }, [isAdvancedModeEnabledRender, wallet]);
  const stylesHook = StyleSheet.create({
    textLabel1: {
      color: colors.feeText,
    },
    textLabel2: {
      color: colors.feeText,
    },
    saveText: {
      color: colors.outputValue,
    },
    textValue: {
      color: colors.outputValue,
    },
    input: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,

      backgroundColor: colors.inputBackgroundColor,
    },
  });
  useEffect(() => {
    if (wallet.type === LightningLdkWallet.type) {
      wallet.getInfo().then(setLightningWalletInfo);
    }
  }, [wallet]);

  const setLabel = () => {
    setIsLoading(true);
    if (walletName.trim().length > 0) {
      wallet.setLabel(walletName.trim());
      if (wallet.type === WatchOnlyWallet.type && wallet.isHd()) {
        wallet.setUseWithHardwareWalletEnabled(useWithHardwareWallet);
      }
      wallet.setHideTransactionsInWalletsList(!hideTransactionsInWalletsList);
    }
    saveToDisk()
      .then(() => {
        alert(loc.wallets.details_wallet_updated);
        goBack();
      })
      .catch(error => {
        console.log(error.message);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    isAdancedModeEnabled().then(setIsAdvancedModeEnabledRender);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setOptions({
      headerRight: () => (
        <TouchableOpacity accessibilityRole="button" testID="Save" disabled={isLoading} style={styles.save} onPress={setLabel}>
          <Text style={stylesHook.saveText}>{loc.wallets.details_save}</Text>
        </TouchableOpacity>
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, colors.outputValue, walletName, useWithHardwareWallet, hideTransactionsInWalletsList]);

  useEffect(() => {
    if (wallets.some(wallet => wallet.getID() === walletID)) {
      setSelectedWallet(walletID);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletID]);

  const navigateToOverviewAndDeleteWallet = () => {
    setIsLoading(true);
    Notifications.unsubscribe(wallet.getAllExternalAddresses(), [], []);
    popToTop();
    deleteWallet(wallet);
    saveToDisk(true);
    ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
  };

  const presentWalletHasBalanceAlert = useCallback(async () => {
    ReactNativeHapticFeedback.trigger('notificationWarning', { ignoreAndroidSystemSettings: false });
    try {
      const walletBalanceConfirmation = await prompt(
        loc.wallets.details_del_wb,
        loc.formatString(loc.wallets.details_del_wb_q, { balance: wallet.getBalance() }),
        true,
        'plain-text',
        true,
      );
      if (Number(walletBalanceConfirmation) === wallet.getBalance()) {
        navigateToOverviewAndDeleteWallet();
      } else {
        ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
        setIsLoading(false);
        alert(loc.wallets.details_del_wb_err);
      }
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigateToWalletExport = () => {
    navigate('WalletExportRoot', {
      screen: 'WalletExport',
      params: {
        walletID: wallet.getID(),
      },
    });
  };
  const navigateToMultisigCoordinationSetup = () => {
    navigate('ExportMultisigCoordinationSetupRoot', {
      screen: 'ExportMultisigCoordinationSetup',
      params: {
        walletId: wallet.getID(),
      },
    });
  };
  const navigateToViewEditCosigners = () => {
    navigate('ViewEditMultisigCosignersRoot', {
      screen: 'ViewEditMultisigCosigners',
      params: {
        walletId: wallet.getID(),
      },
    });
  };
  const navigateToXPub = () =>
    navigate('WalletXpubRoot', {
      screen: 'WalletXpub',
      params: {
        walletID,
      },
    });
  const navigateToSignVerify = () =>
    navigate('SignVerifyRoot', {
      screen: 'SignVerify',
      params: {
        walletID: wallet.getID(),
        address: wallet.getAllExternalAddresses()[0], // works for both single address and HD wallets
      },
    });
  const navigateToLdkViewLogs = () => {
    navigate('LdkViewLogs', {
      walletID,
    });
  };

  const navigateToAddresses = () =>
    navigate('WalletAddresses', {
      walletID: wallet.getID(),
    });

  const renderMarketplaceButton = () => {
    return (
      wallet.chain === Chain.OFFCHAIN &&
      Platform.select({
        android: (
          <>
            <BlueSpacing20 />
            <SecondButton
              testID="Marketplace"
              onPress={() =>
                navigate('Marketplace', {
                  walletID,
                })
              }
              title={loc.wallets.details_marketplace}
            />
          </>
        ),
        ios: (
          <>
            <BlueSpacing20 />
            <SecondButton
              testID="Marketplace"
              onPress={async () => {
                Linking.openURL('https://bluewallet.io/marketplace-btc/');
              }}
              title={loc.wallets.details_marketplace}
            />
          </>
        ),
      })
    );
  };

  const exportInternals = async () => {
    if (backdoorPressed < 10) return setBackdoorPressed(backdoorPressed + 1);
    setBackdoorPressed(0);
    if (wallet.type !== HDSegwitBech32Wallet.type) return;
    const fileName = 'wallet-externals.json';
    const contents = JSON.stringify(
      {
        _balances_by_external_index: wallet._balances_by_external_index,
        _balances_by_internal_index: wallet._balances_by_internal_index,
        _txs_by_external_index: wallet._txs_by_external_index,
        _txs_by_internal_index: wallet._txs_by_internal_index,
        _utxo: wallet._utxo,
        next_free_address_index: wallet.next_free_address_index,
        next_free_change_address_index: wallet.next_free_change_address_index,
        internal_addresses_cache: wallet.internal_addresses_cache,
        external_addresses_cache: wallet.external_addresses_cache,
        _xpub: wallet._xpub,
        gap_limit: wallet.gap_limit,
        label: wallet.label,
        _lastTxFetch: wallet._lastTxFetch,
        _lastBalanceFetch: wallet._lastBalanceFetch,
      },
      null,
      2,
    );
    if (Platform.OS === 'ios') {
      const filePath = RNFS.TemporaryDirectoryPath + `/${fileName}`;
      await RNFS.writeFile(filePath, contents);
      Share.open({
        url: 'file://' + filePath,
        saveToFiles: isDesktop,
      })
        .catch(error => {
          console.log(error);
          alert(error.message);
        })
        .finally(() => {
          RNFS.unlink(filePath);
        });
    } else if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE, {
        title: loc.send.permission_storage_title,
        message: loc.send.permission_storage_message,
        buttonNeutral: loc.send.permission_storage_later,
        buttonNegative: loc._.cancel,
        buttonPositive: loc._.ok,
      });

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Storage Permission: Granted');
        const filePath = RNFS.DownloadDirectoryPath + `/${fileName}`;
        try {
          await RNFS.writeFile(filePath, contents);
          alert(loc.formatString(loc.send.txSaved, { filePath: fileName }));
        } catch (e) {
          console.log(e);
          alert(e.message);
        }
      } else {
        console.log('Storage Permission: Denied');
        Alert.alert(loc.send.permission_storage_title, loc.send.permission_storage_denied_message, [
          {
            text: loc.send.open_settings,
            onPress: () => {
              Linking.openSettings();
            },
            style: 'default',
          },
          { text: loc._.cancel, onPress: () => {}, style: 'cancel' },
        ]);
      }
    }
  };

  const purgeTransactions = async () => {
    if (backdoorPressed < 10) return setBackdoorPressed(backdoorPressed + 1);
    setBackdoorPressed(0);
    const msg = 'Transactions purged. Pls go to main screen and back to rerender screen';

    if (wallet.type === HDSegwitBech32Wallet.type) {
      wallet._txs_by_external_index = {};
      wallet._txs_by_internal_index = {};
      alert(msg);
    }

    if (wallet._hdWalletInstance) {
      wallet._hdWalletInstance._txs_by_external_index = {};
      wallet._hdWalletInstance._txs_by_internal_index = {};
      alert(msg);
    }
  };

  const walletNameTextInputOnBlur = () => {
    if (walletName.trim().length === 0) {
      const walletLabel = wallet.getLabel();
      setWalletName(walletLabel);
    }
  };

  const handleDeleteButtonTapped = () => {
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
            if (wallet.getBalance() > 0 && wallet.allowSend()) {
              presentWalletHasBalanceAlert();
            } else {
              navigateToOverviewAndDeleteWallet();
            }
          },
          style: 'destructive',
        },
        { text: loc.wallets.details_no_cancel, onPress: () => {}, style: 'cancel' },
      ],
      { cancelable: false },
    );
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      centerContent={isLoading}
      contentContainerStyle={styles.scrollViewContent}
      testID="WalletDetailsScroll"
    >
      {isLoading ? (
        <BlueLoading />
      ) : (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View>
            <BlueCard style={styles.address}>
              <StatusBar barStyle="default" />

              {(() => {
                if (
                  [LegacyWallet.type, SegwitBech32Wallet.type, SegwitP2SHWallet.type].includes(wallet.type) ||
                  (wallet.type === WatchOnlyWallet.type && !wallet.isHd())
                ) {
                  return (
                    <>
                      <Text style={[styles.textLabel1, stylesHook.textLabel1]}>{loc.wallets.details_address.toLowerCase()}</Text>
                      <Text style={[styles.textValue, stylesHook.textValue]}>{wallet.getAddress()}</Text>
                    </>
                  );
                }
              })()}
              <Text style={[styles.textLabel2, stylesHook.textLabel2]}>{loc.wallets.add_wallet_name.toLowerCase()}</Text>
              <KeyboardAvoidingView enabled={!Platform.isPad} behavior={Platform.OS === 'ios' ? 'position' : null}>
                <View style={[styles.input, stylesHook.input]}>
                  <TextInput
                    placeholder={loc.send.details_note_placeholder}
                    value={walletName}
                    onChangeText={setWalletName}
                    onBlur={walletNameTextInputOnBlur}
                    numberOfLines={1}
                    placeholderTextColor="#81868e"
                    style={styles.inputText}
                    editable={!isLoading}
                    underlineColorAndroid="transparent"
                    testID="WalletNameInput"
                  />
                </View>
              </KeyboardAvoidingView>
              <BlueSpacing20 />
              <Text style={[styles.textLabel1, stylesHook.textLabel1]}>{loc.wallets.details_type.toLowerCase()}</Text>
              <Text style={[styles.textValue, stylesHook.textValue]}>{wallet.typeReadable}</Text>

              {wallet.type === LightningLdkWallet.type && (
                <>
                  <Text style={[styles.textLabel2, stylesHook.textLabel2]}>{loc.wallets.identity_pubkey}</Text>
                  {lightningWalletInfo?.identityPubkey ? (
                    <>
                      <BlueText>{lightningWalletInfo.identityPubkey}</BlueText>
                    </>
                  ) : (
                    <ActivityIndicator />
                  )}
                </>
              )}
              {wallet.type === MultisigHDWallet.type && (
                <>
                  <Text style={[styles.textLabel2, stylesHook.textLabel2]}>{loc.wallets.details_multisig_type}</Text>
                  <BlueText>
                    {loc.formatString(loc.wallets[`details_ms_${wallet.isNativeSegwit() ? 'ns' : wallet.isWrappedSegwit() ? 'ws' : 'l'}`], {
                      m: wallet.getM(),
                      n: wallet.getN(),
                    })}
                  </BlueText>
                </>
              )}
              {wallet.type === MultisigHDWallet.type && (
                <>
                  <Text style={[styles.textLabel2, stylesHook.textLabel2]}>{loc.multisig.how_many_signatures_can_bluewallet_make}</Text>
                  <BlueText>{wallet.howManySignaturesCanWeMake()}</BlueText>
                </>
              )}

              {wallet.type === LightningCustodianWallet.type && (
                <>
                  <Text style={[styles.textLabel1, stylesHook.textLabel1]}>{loc.wallets.details_connected_to.toLowerCase()}</Text>
                  <BlueText>{wallet.getBaseURI()}</BlueText>
                </>
              )}

              {wallet.type === HDAezeedWallet.type && (
                <>
                  <Text style={[styles.textLabel1, stylesHook.textLabel1]}>{loc.wallets.identity_pubkey.toLowerCase()}</Text>
                  <BlueText>{wallet.getIdentityPubkey()}</BlueText>
                </>
              )}
              <BlueSpacing20 />
              <>
                <Text onPress={exportInternals} style={[styles.textLabel2, stylesHook.textLabel2]}>
                  {loc.transactions.list_title.toLowerCase()}
                </Text>
                <View style={styles.hardware}>
                  <BlueText>{loc.wallets.details_display}</BlueText>
                  <Switch value={hideTransactionsInWalletsList} onValueChange={setHideTransactionsInWalletsList} />
                </View>
              </>
              <>
                <Text onPress={purgeTransactions} style={[styles.textLabel2, stylesHook.textLabel2]}>
                  {loc.transactions.transactions_count.toLowerCase()}
                </Text>
                <BlueText>{wallet.getTransactions().length}</BlueText>
              </>

              <View>
                {wallet.type === WatchOnlyWallet.type && wallet.isHd() && (
                  <>
                    <BlueSpacing10 />
                    <Text style={[styles.textLabel2, stylesHook.textLabel2]}>{loc.wallets.details_advanced.toLowerCase()}</Text>
                    <View style={styles.hardware}>
                      <BlueText>{loc.wallets.details_use_with_hardware_wallet}</BlueText>
                      <Switch value={useWithHardwareWallet} onValueChange={setUseWithHardwareWallet} />
                    </View>
                  </>
                )}
                {isAdvancedModeEnabledRender && (
                  <View style={styles.row}>
                    {wallet.allowMasterFingerprint() && (
                      <View style={styles.marginRight16}>
                        <Text style={[styles.textLabel2, stylesHook.textLabel2]}>
                          {loc.wallets.details_master_fingerprint.toLowerCase()}
                        </Text>
                        <BlueText>{masterFingerprint ?? <ActivityIndicator />}</BlueText>
                      </View>
                    )}

                    {!!wallet.getDerivationPath() && (
                      <View>
                        <Text style={[styles.textLabel2, stylesHook.textLabel2]}>{loc.wallets.details_derivation_path}</Text>
                        <BlueText>{wallet.getDerivationPath()}</BlueText>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </BlueCard>
            {(wallet instanceof AbstractHDElectrumWallet || (wallet.type === WatchOnlyWallet.type && wallet.isHd())) && (
              <BlueListItem onPress={navigateToAddresses} title={loc.wallets.details_show_addresses} chevron />
            )}
            <BlueCard style={styles.address}>
              <View>
                <BlueSpacing20 />
                <SecondButton onPress={navigateToWalletExport} testID="WalletExport" title={loc.wallets.details_export_backup} />

                {wallet.type === MultisigHDWallet.type && (
                  <>
                    <BlueSpacing20 />
                    <SecondButton
                      onPress={navigateToMultisigCoordinationSetup}
                      testID="MultisigCoordinationSetup"
                      title={loc.multisig.export_coordination_setup.replace(/^\w/, c => c.toUpperCase())}
                    />
                  </>
                )}

                {wallet.type === MultisigHDWallet.type && (
                  <>
                    <BlueSpacing20 />
                    <SecondButton
                      onPress={navigateToViewEditCosigners}
                      testID="ViewEditCosigners"
                      title={loc.multisig.view_edit_cosigners}
                    />
                  </>
                )}

                {wallet.allowXpub() && (
                  <>
                    <BlueSpacing20 />
                    <SecondButton onPress={navigateToXPub} testID="XPub" title={loc.wallets.details_show_xpub} />
                    {renderMarketplaceButton()}
                  </>
                )}
                {wallet.allowSignVerifyMessage() && (
                  <>
                    <BlueSpacing20 />
                    <SecondButton onPress={navigateToSignVerify} testID="SignVerify" title={loc.addresses.sign_title} />
                  </>
                )}
                {wallet.type === LightningLdkWallet.type && (
                  <>
                    <BlueSpacing20 />
                    <SecondButton onPress={navigateToLdkViewLogs} testID="LdkLogs" title={loc.lnd.view_logs} />
                  </>
                )}
                <BlueSpacing20 />
                <BlueSpacing20 />
                <TouchableOpacity accessibilityRole="button" onPress={handleDeleteButtonTapped} testID="DeleteButton">
                  <Text textBreakStrategy="simple" style={styles.delete}>{`${loc.wallets.details_delete}${'  '}`}</Text>
                </TouchableOpacity>
              </View>
            </BlueCard>
          </View>
        </TouchableWithoutFeedback>
      )}
    </ScrollView>
  );
};

WalletDetails.navigationOptions = navigationStyle({}, opts => ({ ...opts, headerTitle: loc.wallets.details_title }));

export default WalletDetails;

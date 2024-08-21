import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  I18nManager,
  InteractionManager,
  Keyboard,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { writeFileAndExport } from '../../blue_modules/fs';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import Notifications from '../../blue_modules/notifications';
import { BlueCard, BlueLoading, BlueSpacing10, BlueSpacing20, BlueText } from '../../BlueComponents';
import {
  HDAezeedWallet,
  HDSegwitBech32Wallet,
  LegacyWallet,
  MultisigHDWallet,
  SegwitBech32Wallet,
  SegwitP2SHWallet,
  WatchOnlyWallet,
} from '../../class';
import { AbstractHDElectrumWallet } from '../../class/wallets/abstract-hd-electrum-wallet';
import { LightningCustodianWallet } from '../../class/wallets/lightning-custodian-wallet';
import presentAlert from '../../components/Alert';
import Button from '../../components/Button';
import HeaderRightButton from '../../components/HeaderRightButton';
import ListItem from '../../components/ListItem';
import SaveFileButton from '../../components/SaveFileButton';
import { SecondButton } from '../../components/SecondButton';
import { useTheme } from '../../components/themes';
import prompt from '../../helpers/prompt';
import { unlockWithBiometrics, useBiometrics } from '../../hooks/useBiometrics';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc, { formatBalanceWithoutSuffix } from '../../loc';
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import { useSettings } from '../../hooks/context/useSettings';
import { useStorage } from '../../hooks/context/useStorage';
import { popToTop } from '../../NavigationService';
import { useRoute } from '@react-navigation/native';

const styles = StyleSheet.create({
  scrollViewContent: {
    flexGrow: 1,
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
  const { saveToDisk, wallets, deleteWallet, setSelectedWalletID, txMetadata } = useStorage();
  const { isBiometricUseCapableAndEnabled } = useBiometrics();
  const { walletID } = useRoute().params;
  const [isLoading, setIsLoading] = useState(false);
  const [backdoorPressed, setBackdoorPressed] = useState(0);
  const wallet = useRef(wallets.find(w => w.getID() === walletID)).current;
  const [walletName, setWalletName] = useState(wallet.getLabel());
  const [useWithHardwareWallet, setUseWithHardwareWallet] = useState(wallet.useWithHardwareWalletEnabled());
  const { isAdvancedModeEnabled } = useSettings();
  const [isBIP47Enabled, setIsBIP47Enabled] = useState(wallet.isBIP47Enabled());
  const [isContactsVisible, setIsContactsVisible] = useState(wallet.allowBIP47() && wallet.isBIP47Enabled());
  const [hideTransactionsInWalletsList, setHideTransactionsInWalletsList] = useState(!wallet.getHideTransactionsInWalletsList());
  const { goBack, setOptions, navigate } = useExtendedNavigation();
  const { colors } = useTheme();
  const [masterFingerprint, setMasterFingerprint] = useState();
  const walletTransactionsLength = useMemo(() => wallet.getTransactions().length, [wallet]);
  const derivationPath = useMemo(() => {
    try {
      const path = wallet.getDerivationPath();
      return path.length > 0 ? path : null;
    } catch (e) {
      return null;
    }
  }, [wallet]);
  const [isToolTipMenuVisible, setIsToolTipMenuVisible] = useState(false);

  const onMenuWillShow = () => setIsToolTipMenuVisible(true);
  const onMenuWillHide = () => setIsToolTipMenuVisible(false);

  useEffect(() => {
    setIsContactsVisible(isBIP47Enabled);
  }, [isBIP47Enabled]);

  useEffect(() => {
    if (isAdvancedModeEnabled && wallet.allowMasterFingerprint()) {
      InteractionManager.runAfterInteractions(() => {
        setMasterFingerprint(wallet.getMasterFingerprintHex());
      });
    }
  }, [isAdvancedModeEnabled, wallet]);
  const stylesHook = StyleSheet.create({
    textLabel1: {
      color: colors.feeText,
    },
    textLabel2: {
      color: colors.feeText,
    },
    textValue: {
      color: colors.outputValue,
    },
    input: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,

      backgroundColor: colors.inputBackgroundColor,
    },
    delete: {
      color: isToolTipMenuVisible ? colors.buttonDisabledTextColor : '#d0021b',
    },
  });

  const handleSave = useCallback(() => {
    setIsLoading(true);
    if (walletName.trim().length > 0) {
      wallet.setLabel(walletName.trim());
      if (wallet.type === WatchOnlyWallet.type && wallet.isHd()) {
        wallet.setUseWithHardwareWalletEnabled(useWithHardwareWallet);
      }
      wallet.setHideTransactionsInWalletsList(!hideTransactionsInWalletsList);
      if (wallet.allowBIP47()) {
        wallet.switchBIP47(isBIP47Enabled);
      }
    }
    saveToDisk()
      .then(() => {
        presentAlert({ message: loc.wallets.details_wallet_updated });
        goBack();
      })
      .catch(error => {
        console.log(error.message);
        setIsLoading(false);
      });
  }, [walletName, saveToDisk, wallet, hideTransactionsInWalletsList, useWithHardwareWallet, isBIP47Enabled, goBack]);

  const SaveButton = useMemo(
    () => <HeaderRightButton title={loc.wallets.details_save} onPress={handleSave} disabled={isLoading} testID="Save" />,
    [isLoading, handleSave],
  );

  useEffect(() => {
    setOptions({
      headerRight: () => SaveButton,
      headerBackTitleVisible: true,
    });
  }, [SaveButton, setOptions]);

  useEffect(() => {
    if (wallets.some(w => w.getID() === walletID)) {
      setSelectedWalletID(walletID);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletID]);

  const navigateToOverviewAndDeleteWallet = () => {
    setIsLoading(true);
    let externalAddresses = [];
    try {
      externalAddresses = wallet.getAllExternalAddresses();
    } catch (_) {}
    Notifications.unsubscribe(externalAddresses, [], []);
    popToTop();
    deleteWallet(wallet);
    saveToDisk(true);
    triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
  };

  const presentWalletHasBalanceAlert = useCallback(async () => {
    triggerHapticFeedback(HapticFeedbackTypes.NotificationWarning);
    try {
      const walletBalanceConfirmation = await prompt(
        loc.wallets.details_delete_wallet,
        loc.formatString(loc.wallets.details_del_wb_q, { balance: wallet.getBalance() }),
        true,
        'plain-text',
        true,
        loc.wallets.details_delete,
      );
      if (Number(walletBalanceConfirmation) === wallet.getBalance()) {
        navigateToOverviewAndDeleteWallet();
      } else {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        setIsLoading(false);
        presentAlert({ message: loc.wallets.details_del_wb_err });
      }
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigateToWalletExport = () => {
    navigate('WalletExportRoot', {
      screen: 'WalletExport',
      params: {
        walletID,
      },
    });
  };
  const navigateToMultisigCoordinationSetup = () => {
    navigate('ExportMultisigCoordinationSetupRoot', {
      screen: 'ExportMultisigCoordinationSetup',
      params: {
        walletID,
      },
    });
  };
  const navigateToViewEditCosigners = () => {
    navigate('ViewEditMultisigCosignersRoot', {
      screen: 'ViewEditMultisigCosigners',
      params: {
        walletID,
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
        walletID,
        address: wallet.getAllExternalAddresses()[0], // works for both single address and HD wallets
      },
    });

  const navigateToAddresses = () =>
    navigate('WalletAddresses', {
      walletID,
    });

  const navigateToContacts = () => navigate('PaymentCodeList', { walletID });

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

    await writeFileAndExport(fileName, contents, false);
  };

  const purgeTransactions = async () => {
    if (backdoorPressed < 10) return setBackdoorPressed(backdoorPressed + 1);
    setBackdoorPressed(0);
    const msg = 'Transactions purged. Pls go to main screen and back to rerender screen';

    if (wallet.type === HDSegwitBech32Wallet.type) {
      wallet._txs_by_external_index = {};
      wallet._txs_by_internal_index = {};
      presentAlert({ message: msg });
    }

    if (wallet._hdWalletInstance) {
      wallet._hdWalletInstance._txs_by_external_index = {};
      wallet._hdWalletInstance._txs_by_internal_index = {};
      presentAlert({ message: msg });
    }
  };

  const walletNameTextInputOnBlur = () => {
    if (walletName.trim().length === 0) {
      const walletLabel = wallet.getLabel();
      setWalletName(walletLabel);
    }
  };

  const exportHistoryContent = useCallback(() => {
    const headers = [loc.transactions.date, loc.transactions.txid, `${loc.send.create_amount} (${BitcoinUnit.BTC})`, loc.send.create_memo];
    if (wallet.chain === Chain.OFFCHAIN) {
      headers.push(loc.lnd.payment);
    }

    const rows = [headers.join(',')];
    const transactions = wallet.getTransactions();

    transactions.forEach(transaction => {
      const value = formatBalanceWithoutSuffix(transaction.value, BitcoinUnit.BTC, true);
      let hash = transaction.hash;
      let memo = txMetadata[transaction.hash]?.memo?.trim() ?? '';
      let status;

      if (wallet.chain === Chain.OFFCHAIN) {
        hash = transaction.payment_hash;
        memo = transaction.description;
        status = transaction.ispaid ? loc._.success : loc.lnd.expired;
        if (hash?.type === 'Buffer' && hash?.data) {
          hash = Buffer.from(hash.data).toString('hex');
        }
      }

      const data = [new Date(transaction.received).toString(), hash, value, memo];

      if (wallet.chain === Chain.OFFCHAIN) {
        data.push(status);
      }

      rows.push(data.join(','));
    });

    return rows.join('\n');
  }, [wallet, txMetadata]);

  const handleDeleteButtonTapped = () => {
    triggerHapticFeedback(HapticFeedbackTypes.NotificationWarning);
    Alert.alert(
      loc.wallets.details_delete_wallet,
      loc.wallets.details_are_you_sure,
      [
        {
          text: loc.wallets.details_yes_delete,
          onPress: async () => {
            const isBiometricsEnabled = await isBiometricUseCapableAndEnabled();

            if (isBiometricsEnabled) {
              if (!(await unlockWithBiometrics())) {
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

  const fileName = useMemo(() => {
    const label = wallet.getLabel().replace(' ', '-');
    return `${label}-history.csv`;
  }, [wallet]);

  return (
    <ScrollView
      automaticallyAdjustKeyboardInsets
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
              {(() => {
                if (
                  [LegacyWallet.type, SegwitBech32Wallet.type, SegwitP2SHWallet.type].includes(wallet.type) ||
                  (wallet.type === WatchOnlyWallet.type && !wallet.isHd())
                ) {
                  return (
                    <>
                      <Text style={[styles.textLabel1, stylesHook.textLabel1]}>{loc.wallets.details_address.toLowerCase()}</Text>
                      <Text style={[styles.textValue, stylesHook.textValue]}>
                        {(() => {
                          // gracefully handling faulty wallets, so at least user has an option to delete the wallet
                          try {
                            return wallet.getAddress();
                          } catch (error) {
                            return error.message;
                          }
                        })()}
                      </Text>
                    </>
                  );
                }
              })()}
              <Text style={[styles.textLabel2, stylesHook.textLabel2]}>{loc.wallets.add_wallet_name.toLowerCase()}</Text>
              <View style={[styles.input, stylesHook.input]}>
                <TextInput
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
              <BlueSpacing20 />
              <Text style={[styles.textLabel1, stylesHook.textLabel1]}>{loc.wallets.details_type.toLowerCase()}</Text>
              <Text style={[styles.textValue, stylesHook.textValue]}>{wallet.typeReadable}</Text>

              {wallet.type === MultisigHDWallet.type && (
                <>
                  <Text style={[styles.textLabel2, stylesHook.textLabel2]}>{loc.wallets.details_multisig_type}</Text>
                  <BlueText>
                    {`${wallet.getM()} / ${wallet.getN()} (${
                      wallet.isNativeSegwit() ? 'native segwit' : wallet.isWrappedSegwit() ? 'wrapped segwit' : 'legacy'
                    })`}
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
                  <Switch
                    disabled={isToolTipMenuVisible}
                    value={hideTransactionsInWalletsList}
                    onValueChange={setHideTransactionsInWalletsList}
                  />
                </View>
              </>
              <>
                <Text onPress={purgeTransactions} style={[styles.textLabel2, stylesHook.textLabel2]}>
                  {loc.transactions.transactions_count.toLowerCase()}
                </Text>
                <BlueText>{wallet.getTransactions().length}</BlueText>
              </>

              {wallet.allowBIP47() ? (
                <>
                  <Text style={[styles.textLabel2, stylesHook.textLabel2]}>{loc.bip47.payment_code}</Text>
                  <View style={styles.hardware}>
                    <BlueText>{loc.bip47.purpose}</BlueText>
                    <Switch value={isBIP47Enabled} onValueChange={setIsBIP47Enabled} testID="BIP47Switch" />
                  </View>
                </>
              ) : null}

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
                {isAdvancedModeEnabled && (
                  <View style={styles.row}>
                    {wallet.allowMasterFingerprint() && (
                      <View style={styles.marginRight16}>
                        <Text style={[styles.textLabel2, stylesHook.textLabel2]}>
                          {loc.wallets.details_master_fingerprint.toLowerCase()}
                        </Text>
                        <BlueText>{masterFingerprint ?? <ActivityIndicator />}</BlueText>
                      </View>
                    )}

                    {derivationPath && (
                      <View>
                        <Text style={[styles.textLabel2, stylesHook.textLabel2]}>{loc.wallets.details_derivation_path}</Text>
                        <BlueText testID="DerivationPath">{derivationPath}</BlueText>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </BlueCard>
            {(wallet instanceof AbstractHDElectrumWallet || (wallet.type === WatchOnlyWallet.type && wallet.isHd())) && (
              <ListItem disabled={isToolTipMenuVisible} onPress={navigateToAddresses} title={loc.wallets.details_show_addresses} chevron />
            )}
            {isContactsVisible ? (
              <ListItem disabled={isToolTipMenuVisible} onPress={navigateToContacts} title={loc.bip47.contacts} chevron />
            ) : null}
            <BlueCard style={styles.address}>
              <View>
                <BlueSpacing20 />
                <Button
                  disabled={isToolTipMenuVisible}
                  onPress={navigateToWalletExport}
                  testID="WalletExport"
                  title={loc.wallets.details_export_backup}
                />
                {walletTransactionsLength > 0 && (
                  <>
                    <BlueSpacing20 />
                    <SaveFileButton
                      onMenuWillHide={onMenuWillHide}
                      onMenuWillShow={onMenuWillShow}
                      fileName={fileName}
                      fileContent={exportHistoryContent()}
                    >
                      <SecondButton title={loc.wallets.details_export_history} />
                    </SaveFileButton>
                  </>
                )}
                {wallet.type === MultisigHDWallet.type && (
                  <>
                    <BlueSpacing20 />
                    <SecondButton
                      disabled={isToolTipMenuVisible}
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
                      disabled={isToolTipMenuVisible}
                      onPress={navigateToViewEditCosigners}
                      testID="ViewEditCosigners"
                      title={loc.multisig.view_edit_cosigners}
                    />
                  </>
                )}

                {wallet.allowXpub() && (
                  <>
                    <BlueSpacing20 />
                    <SecondButton
                      disabled={isToolTipMenuVisible}
                      onPress={navigateToXPub}
                      testID="XPub"
                      title={loc.wallets.details_show_xpub}
                    />
                  </>
                )}
                {wallet.allowSignVerifyMessage() && (
                  <>
                    <BlueSpacing20 />
                    <SecondButton
                      disabled={isToolTipMenuVisible}
                      onPress={navigateToSignVerify}
                      testID="SignVerify"
                      title={loc.addresses.sign_title}
                    />
                  </>
                )}
                <BlueSpacing20 />
                <BlueSpacing20 />
                <TouchableOpacity
                  disabled={isToolTipMenuVisible}
                  accessibilityRole="button"
                  onPress={handleDeleteButtonTapped}
                  testID="DeleteButton"
                >
                  <Text
                    textBreakStrategy="simple"
                    style={[styles.delete, stylesHook.delete]}
                  >{`${loc.wallets.details_delete}${'  '}`}</Text>
                </TouchableOpacity>
                <BlueSpacing20 />
                <BlueSpacing20 />
              </View>
            </BlueCard>
          </View>
        </TouchableWithoutFeedback>
      )}
    </ScrollView>
  );
};

export default WalletDetails;

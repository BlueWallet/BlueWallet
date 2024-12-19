import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  I18nManager,
  InteractionManager,
  LayoutAnimation,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { writeFileAndExport } from '../../blue_modules/fs';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
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
import ListItem from '../../components/ListItem';
import { SecondButton } from '../../components/SecondButton';
import { useTheme } from '../../components/themes';
import prompt from '../../helpers/prompt';
import { unlockWithBiometrics, useBiometrics } from '../../hooks/useBiometrics';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc, { formatBalanceWithoutSuffix } from '../../loc';
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import { useStorage } from '../../hooks/context/useStorage';
import { popToTop } from '../../NavigationService';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { LightningTransaction, Transaction, TWallet } from '../../class/wallets/types';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { unsubscribe } from '../../blue_modules/notifications';
import HeaderMenuButton from '../../components/HeaderMenuButton';
import { Action } from '../../components/types';
import { CommonToolTipActions } from '../../typings/CommonToolTipActions';

type RouteProps = RouteProp<DetailViewStackParamList, 'WalletDetails'>;
const WalletDetails: React.FC = () => {
  const { saveToDisk, wallets, deleteWallet, setSelectedWalletID, txMetadata } = useStorage();
  const { isBiometricUseCapableAndEnabled } = useBiometrics();
  const { walletID } = useRoute<RouteProps>().params;
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [backdoorPressed, setBackdoorPressed] = useState<number>(0);
  const walletRef = useRef<TWallet | undefined>(wallets.find(w => w.getID() === walletID));
  const wallet = walletRef.current as TWallet;
  const [walletUseWithHardwareWallet, setWalletUseWithHardwareWallet] = useState<boolean>(
    wallet.useWithHardwareWalletEnabled ? wallet.useWithHardwareWalletEnabled() : false,
  );
  const [isBIP47Enabled, setIsBIP47Enabled] = useState<boolean>(wallet.isBIP47Enabled ? wallet.isBIP47Enabled() : false);

  const [isContactsVisible, setIsContactsVisible] = useState<boolean>(
    (wallet.allowBIP47 && wallet.allowBIP47() && wallet.isBIP47Enabled && wallet.isBIP47Enabled()) || false,
  );

  const [hideTransactionsInWalletsList, setHideTransactionsInWalletsList] = useState<boolean>(
    wallet.getHideTransactionsInWalletsList ? !wallet.getHideTransactionsInWalletsList() : true,
  );
  const { setOptions, navigate, addListener } = useExtendedNavigation();
  const { colors } = useTheme();
  const [walletName, setWalletName] = useState<string>(wallet.getLabel());

  const [masterFingerprint, setMasterFingerprint] = useState<string | undefined>();
  const walletTransactionsLength = useMemo<number>(() => wallet.getTransactions().length, [wallet]);
  const derivationPath = useMemo<string | null>(() => {
    try {
      // @ts-expect-error: Need to fix later
      if (wallet.getDerivationPath) {
        // @ts-expect-error: Need to fix later
        const path = wallet.getDerivationPath();
        return path.length > 0 ? path : null;
      }
      return null;
    } catch (e) {
      return null;
    }
  }, [wallet]);
  const [isMasterFingerPrintVisible, setIsMasterFingerPrintVisible] = useState<boolean>(false);

  const navigateToOverviewAndDeleteWallet = useCallback(async () => {
    setIsLoading(true);

    try {
      const externalAddresses = wallet.getAllExternalAddresses();
      if (externalAddresses.length > 0) {
        await unsubscribe(externalAddresses, [], []);
      }
      deleteWallet(wallet);
      saveToDisk(true);
      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
      popToTop();
    } catch (e: unknown) {
      console.error(e);
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      presentAlert({ message: (e as Error).message });
      setIsLoading(false);
    }
  }, [deleteWallet, saveToDisk, wallet]);

  const presentWalletHasBalanceAlert = useCallback(async () => {
    triggerHapticFeedback(HapticFeedbackTypes.NotificationWarning);
    try {
      const balance = formatBalanceWithoutSuffix(wallet.getBalance(), BitcoinUnit.SATS, true);
      const walletBalanceConfirmation = await prompt(
        loc.wallets.details_delete_wallet,
        loc.formatString(loc.wallets.details_del_wb_q, { balance }),
        true,
        'numeric',
        true,
        loc.wallets.details_delete,
      );
      // Remove any non-numeric characters before comparison
      const cleanedConfirmation = (walletBalanceConfirmation || '').replace(/[^0-9]/g, '');

      if (Number(cleanedConfirmation) === wallet.getBalance()) {
        await navigateToOverviewAndDeleteWallet();
        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
      } else {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        setIsLoading(false);
        presentAlert({ message: loc.wallets.details_del_wb_err });
      }
    } catch (_) {}
  }, [navigateToOverviewAndDeleteWallet, wallet]);

  const handleDeleteButtonTapped = useCallback(() => {
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
            if (wallet.getBalance && wallet.getBalance() > 0 && wallet.allowSend && wallet.allowSend()) {
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
  }, [isBiometricUseCapableAndEnabled, navigateToOverviewAndDeleteWallet, presentWalletHasBalanceAlert, wallet]);

  const exportHistoryContent = useCallback(() => {
    const headers = [loc.transactions.date, loc.transactions.txid, `${loc.send.create_amount} (${BitcoinUnit.BTC})`, loc.send.create_memo];
    if (wallet.chain === Chain.OFFCHAIN) {
      headers.push(loc.lnd.payment);
    }

    const rows = [headers.join(',')];
    const transactions = wallet.getTransactions();

    transactions.forEach((transaction: Transaction & LightningTransaction) => {
      const value = formatBalanceWithoutSuffix(transaction.value || 0, BitcoinUnit.BTC, true);
      let hash: string = transaction.hash || '';
      let memo = (transaction.hash && txMetadata[transaction.hash]?.memo?.trim()) || '';
      let status = '';

      if (wallet.chain === Chain.OFFCHAIN) {
        hash = transaction.payment_hash ? transaction.payment_hash.toString() : '';
        memo = transaction.memo || '';
        status = transaction.ispaid ? loc._.success : loc.lnd.expired;
        if (typeof hash !== 'string' && (hash as any)?.type === 'Buffer' && (hash as any)?.data) {
          hash = Buffer.from((hash as any).data).toString('hex');
        }
      }

      const date = transaction.received ? new Date(transaction.received).toString() : '';
      const data = [date, hash, value, memo];

      if (wallet.chain === Chain.OFFCHAIN) {
        data.push(status);
      }

      rows.push(data.join(','));
    });

    return rows.join('\n');
  }, [wallet, txMetadata]);

  const fileName = useMemo(() => {
    const label = wallet.getLabel().replace(' ', '-');
    return `${label}-history.csv`;
  }, [wallet]);

  const toolTipOnPressMenuItem = useCallback(
    async (id: string) => {
      if (id === CommonToolTipActions.Delete.id) {
        handleDeleteButtonTapped();
      } else if (id === CommonToolTipActions.Share.id) {
        await writeFileAndExport(fileName, exportHistoryContent(), true);
      } else if (id === CommonToolTipActions.SaveFile.id) {
        await writeFileAndExport(fileName, exportHistoryContent(), false);
      }
    },
    [exportHistoryContent, fileName, handleDeleteButtonTapped],
  );

  const toolTipActions = useMemo(() => {
    const actions: Action[] = [
      {
        id: loc.wallets.details_export_history,
        text: loc.wallets.details_export_history,
        displayInline: true,
        hidden: walletTransactionsLength === 0,
        subactions: [CommonToolTipActions.Share, CommonToolTipActions.SaveFile],
      },
      CommonToolTipActions.Delete,
    ];

    return actions;
  }, [walletTransactionsLength]);

  const HeaderRight = useMemo(
    () => <HeaderMenuButton disabled={isLoading} onPressMenuItem={toolTipOnPressMenuItem} actions={toolTipActions} />,
    [toolTipOnPressMenuItem, toolTipActions, isLoading],
  );

  // Adding the ToolTipMenu to the header
  useEffect(() => {
    setOptions({
      headerRight: () => HeaderRight,
    });
  }, [HeaderRight, setOptions]);

  useEffect(() => {
    setIsContactsVisible(wallet.allowBIP47 && wallet.allowBIP47() && isBIP47Enabled);
  }, [isBIP47Enabled, wallet]);

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        if (isMasterFingerPrintVisible && wallet.allowMasterFingerprint && wallet.allowMasterFingerprint()) {
          // @ts-expect-error: Need to fix later
          if (wallet.getMasterFingerprintHex) {
            // @ts-expect-error: Need to fix later
            setMasterFingerprint(wallet.getMasterFingerprintHex());
          }
        } else {
          setMasterFingerprint(undefined);
        }
      });

      return () => task.cancel();
    }, [isMasterFingerPrintVisible, wallet]),
  );

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
  });

  useEffect(() => {
    setOptions({
      headerBackTitleVisible: true,
    });
  }, [setOptions]);

  useEffect(() => {
    if (wallets.some(w => w.getID() === walletID)) {
      setSelectedWalletID(walletID);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletID]);

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
    const fileNameExternals = 'wallet-externals.json';
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

    await writeFileAndExport(fileNameExternals, contents, false);
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

    // @ts-expect-error: Need to fix later
    if (wallet._hdWalletInstance) {
      // @ts-expect-error: Need to fix later
      wallet._hdWalletInstance._txs_by_external_index = {};
      // @ts-expect-error: Need to fix later
      wallet._hdWalletInstance._txs_by_internal_index = {};
      presentAlert({ message: msg });
    }
  };

  const walletNameTextInputOnBlur = useCallback(async () => {
    const trimmedWalletName = walletName.trim();
    if (trimmedWalletName.length === 0) {
      const walletLabel = wallet.getLabel();
      setWalletName(walletLabel);
    } else if (wallet.getLabel() !== trimmedWalletName) {
      // Only save if the name has changed
      wallet.setLabel(trimmedWalletName);
      try {
        console.warn('saving wallet name:', trimmedWalletName);
        await saveToDisk();
      } catch (error) {
        console.error((error as Error).message);
      }
    }
  }, [wallet, walletName, saveToDisk]);

  useEffect(() => {
    const subscribe = addListener('beforeRemove', () => {
      walletNameTextInputOnBlur();
    });

    return subscribe;
  }, [addListener, walletName, walletNameTextInputOnBlur]);

  const onViewMasterFingerPrintPress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsMasterFingerPrintVisible(true);
  };

  return (
    <ScrollView
      automaticallyAdjustKeyboardInsets
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets
      centerContent={isLoading}
      testID="WalletDetailsScroll"
    >
      {isLoading ? (
        <BlueLoading />
      ) : (
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
                          return wallet.getAddress ? wallet.getAddress() : '';
                        } catch (error: any) {
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
                onChangeText={(text: string) => {
                  setWalletName(text);
                }}
                onChange={event => {
                  const text = event.nativeEvent.text;
                  setWalletName(text);
                }}
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
            <Text style={[styles.textValue, stylesHook.textValue]} selectable>
              {wallet.typeReadable}
            </Text>

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
                  value={hideTransactionsInWalletsList}
                  onValueChange={async (value: boolean) => {
                    if (wallet.setHideTransactionsInWalletsList) {
                      wallet.setHideTransactionsInWalletsList(!value);
                      triggerHapticFeedback(HapticFeedbackTypes.ImpactLight);
                      setHideTransactionsInWalletsList(!wallet.getHideTransactionsInWalletsList());
                    }
                    try {
                      await saveToDisk();
                    } catch (error: any) {
                      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
                      console.error(error.message);
                    }
                  }}
                />
              </View>
            </>
            <>
              <Text onPress={purgeTransactions} style={[styles.textLabel2, stylesHook.textLabel2]}>
                {loc.transactions.transactions_count.toLowerCase()}
              </Text>
              <BlueText>{wallet.getTransactions().length}</BlueText>
            </>

            {wallet.allowBIP47 && wallet.allowBIP47() ? (
              <>
                <Text style={[styles.textLabel2, stylesHook.textLabel2]}>{loc.bip47.payment_code}</Text>
                <View style={styles.hardware}>
                  <BlueText>{loc.bip47.purpose}</BlueText>
                  <Switch
                    value={isBIP47Enabled}
                    onValueChange={async (value: boolean) => {
                      setIsBIP47Enabled(value);
                      if (wallet.switchBIP47) {
                        wallet.switchBIP47(value);
                        triggerHapticFeedback(HapticFeedbackTypes.ImpactLight);
                      }
                      try {
                        await saveToDisk();
                      } catch (error: unknown) {
                        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
                        console.error((error as Error).message);
                      }
                    }}
                    testID="BIP47Switch"
                  />
                </View>
              </>
            ) : null}

            <View>
              {wallet.type === WatchOnlyWallet.type && wallet.isHd && wallet.isHd() && (
                <>
                  <BlueSpacing10 />
                  <Text style={[styles.textLabel2, stylesHook.textLabel2]}>{loc.wallets.details_advanced.toLowerCase()}</Text>
                  <View style={styles.hardware}>
                    <BlueText>{loc.wallets.details_use_with_hardware_wallet}</BlueText>
                    <Switch
                      value={walletUseWithHardwareWallet}
                      onValueChange={async (value: boolean) => {
                        setWalletUseWithHardwareWallet(value);
                        if (wallet.setUseWithHardwareWalletEnabled) {
                          wallet.setUseWithHardwareWalletEnabled(value);
                          triggerHapticFeedback(HapticFeedbackTypes.ImpactLight);
                        }
                        try {
                          await saveToDisk();
                        } catch (error: unknown) {
                          triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
                          console.error((error as Error).message);
                        }
                      }}
                    />
                  </View>
                </>
              )}
              <View style={styles.row}>
                {wallet.allowMasterFingerprint && wallet.allowMasterFingerprint() && (
                  <View style={styles.marginRight16}>
                    <Text style={[styles.textLabel2, stylesHook.textLabel2]}>{loc.wallets.details_master_fingerprint.toLowerCase()}</Text>
                    {isMasterFingerPrintVisible ? (
                      <BlueText selectable>{masterFingerprint ?? <ActivityIndicator />}</BlueText>
                    ) : (
                      <TouchableOpacity onPress={onViewMasterFingerPrintPress}>
                        <BlueText>{loc.multisig.view}</BlueText>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {derivationPath && (
                  <View>
                    <Text style={[styles.textLabel2, stylesHook.textLabel2]}>{loc.wallets.details_derivation_path}</Text>
                    <BlueText selectable testID="DerivationPath">
                      {derivationPath}
                    </BlueText>
                  </View>
                )}
              </View>
            </View>
          </BlueCard>
          {(wallet instanceof AbstractHDElectrumWallet || (wallet.type === WatchOnlyWallet.type && wallet.isHd && wallet.isHd())) && (
            <ListItem onPress={navigateToAddresses} title={loc.wallets.details_show_addresses} chevron />
          )}
          {isContactsVisible ? <ListItem onPress={navigateToContacts} title={loc.bip47.contacts} chevron /> : null}
          <BlueCard style={styles.address}>
            <View>
              <BlueSpacing20 />
              <Button onPress={navigateToWalletExport} testID="WalletExport" title={loc.wallets.details_export_backup} />
              {wallet.type === MultisigHDWallet.type && (
                <>
                  <BlueSpacing20 />
                  <SecondButton
                    onPress={navigateToMultisigCoordinationSetup}
                    testID="MultisigCoordinationSetup"
                    title={loc.multisig.export_coordination_setup.replace(/^\w/, (c: string) => c.toUpperCase())}
                  />
                </>
              )}

              {wallet.type === MultisigHDWallet.type && (
                <>
                  <BlueSpacing20 />
                  <SecondButton onPress={navigateToViewEditCosigners} testID="ViewEditCosigners" title={loc.multisig.view_edit_cosigners} />
                </>
              )}

              {wallet.allowXpub && wallet.allowXpub() && (
                <>
                  <BlueSpacing20 />
                  <SecondButton onPress={navigateToXPub} testID="XPub" title={loc.wallets.details_show_xpub} />
                </>
              )}
              {wallet.allowSignVerifyMessage && wallet.allowSignVerifyMessage() && (
                <>
                  <BlueSpacing20 />
                  <SecondButton onPress={navigateToSignVerify} testID="SignVerify" title={loc.addresses.sign_title} />
                </>
              )}
              <BlueSpacing20 />
              <BlueSpacing20 />
            </View>
          </BlueCard>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
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
  row: {
    flexDirection: 'row',
  },
  marginRight16: {
    marginRight: 16,
  },
});

export default WalletDetails;

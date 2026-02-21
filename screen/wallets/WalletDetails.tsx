import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager, LayoutAnimation, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { writeFileAndExport } from '../../blue_modules/fs';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { uint8ArrayToHex } from '../../blue_modules/uint8array-extras';
import { BlueCard, BlueText } from '../../BlueComponents';
import {
  HDAezeedWallet,
  HDSegwitBech32Wallet,
  LegacyWallet,
  LightningArkWallet,
  MultisigHDWallet,
  SegwitBech32Wallet,
  SegwitP2SHWallet,
  WatchOnlyWallet,
} from '../../class';
import { AbstractHDElectrumWallet } from '../../class/wallets/abstract-hd-electrum-wallet';
import { LightningCustodianWallet } from '../../class/wallets/lightning-custodian-wallet';
import presentAlert from '../../components/Alert';
import CopyTextToClipboard from '../../components/CopyTextToClipboard';
import ListItem from '../../components/ListItem';
import { SecondButton } from '../../components/SecondButton';
import { useTheme } from '../../components/themes';
import prompt from '../../helpers/prompt';
import { unlockWithBiometrics, useBiometrics } from '../../hooks/useBiometrics';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc, { formatBalanceWithoutSuffix } from '../../loc';
import { BitcoinUnit, Chain } from '../../models/bitcoinUnits';
import { useStorage } from '../../hooks/context/useStorage';
import { useFocusEffect, useRoute, RouteProp, usePreventRemove, useLocale } from '@react-navigation/native';
import { LightningTransaction, Transaction, TWallet } from '../../class/wallets/types';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import ToolTipMenu from '../../components/TooltipMenu';
import { Action } from '../../components/types';
import { CommonToolTipActions } from '../../typings/CommonToolTipActions';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { BlueSpacing20 } from '../../components/BlueSpacing';
import { BlueLoading } from '../../components/BlueLoading';
import { Icon } from '@rneui/themed';

type RouteProps = RouteProp<DetailViewStackParamList, 'WalletDetails'>;
const WalletDetails: React.FC = () => {
  const { saveToDisk, wallets, txMetadata, handleWalletDeletion } = useStorage();
  const { isBiometricUseCapableAndEnabled } = useBiometrics();
  const { walletID } = useRoute<RouteProps>().params;
  const { direction } = useLocale();
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
  const { setOptions, navigate, navigateToWalletsList } = useExtendedNavigation();
  const { colors } = useTheme();

  const [masterFingerprint, setMasterFingerprint] = useState<string | undefined>();
  const [arkAddress, setArkAddress] = useState<string>('');
  const walletTransactionsLength = useMemo<number>(() => wallet.getTransactions().length, [wallet]);
  const { hasCoinControl, utxoCount } = useMemo(() => {
    if (typeof wallet.getUtxo !== 'function') return { hasCoinControl: false, utxoCount: null as number | null };
    try {
      const count = wallet.getUtxo().length;
      return { hasCoinControl: true, utxoCount: count };
    } catch {
      return { hasCoinControl: false, utxoCount: null };
    }
  }, [wallet]);
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
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState<boolean>(false);

  // Fetch ark address when wallet is a LightningArkWallet
  useEffect(() => {
    const fetchArkAddress = async () => {
      if (wallet.type === LightningArkWallet.type && wallet.getArkAddress) {
        try {
          const address = await wallet.getArkAddress();
          console.log('ark address:', address);
          setArkAddress(address);
        } catch (error: any) {
          setArkAddress(error.message);
        }
      }
    };

    fetchArkAddress();
  }, [wallet]);

  const navigateToOverviewAndDeleteWallet = useCallback(async () => {
    setIsLoading(true);
    const deletionSucceeded = await handleWalletDeletion(wallet.getID());
    if (deletionSucceeded) {
      navigateToWalletsList();
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        navigateToOverviewAndDeleteWallet();
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
    presentAlert({
      title: loc.wallets.details_delete_wallet,
      message: loc.wallets.details_are_you_sure,
      buttons: [
        {
          text: loc.wallets.details_yes_delete,
          onPress: async () => {
            const isBiometricsEnabled = await isBiometricUseCapableAndEnabled();
            if (isBiometricsEnabled) {
              if (!(await unlockWithBiometrics())) {
                setIsLoading(false);
                return false;
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
        {
          text: loc._.cancel,
          onPress: () => {
            setIsLoading(false);
            return false;
          },
          style: 'cancel',
        },
      ],
      options: { cancelable: false },
    });
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
          hash = uint8ArrayToHex(new Uint8Array((hash as any).data));
        }
      }

      const date = transaction.timestamp ? new Date(transaction.timestamp * 1000).toString() : '';
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
      if (id === CommonToolTipActions.Share.id) {
        await writeFileAndExport(fileName, exportHistoryContent(), true);
      } else if (id === CommonToolTipActions.SaveFile.id) {
        await writeFileAndExport(fileName, exportHistoryContent(), false);
      }
    },
    [exportHistoryContent, fileName],
  );

  const transactionsBoxMenuActions = useMemo(
    (): Action[] => [
      {
        id: loc.wallets.details_export_history,
        text: loc.wallets.details_export_history,
        displayInline: true,
        hidden: walletTransactionsLength === 0,
        subactions: [CommonToolTipActions.Share, CommonToolTipActions.SaveFile],
      },
    ],
    [walletTransactionsLength],
  );

  useEffect(() => {
    setOptions({
      headerRight: undefined,
    });
  }, [setOptions]);

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
      writingDirection: direction,
    },
    textLabel2: {
      color: colors.feeText,
      writingDirection: direction,
    },
    textValue: {
      color: colors.outputValue,
    },
    nameRow: {
      flexDirection: direction === 'rtl' ? 'row-reverse' : 'row',
      alignItems: 'center',
    },
    editButton: {
      backgroundColor: colors.lightButton,
      marginLeft: direction === 'rtl' ? 0 : 12,
      marginRight: direction === 'rtl' ? 12 : 0,
    },
    editButtonText: {
      color: colors.buttonTextColor,
    },
    detailsCard: {
      borderColor: colors.cardBorderColor,
    },
    sectionTitle: {
      backgroundColor: colors.cardSectionHeaderBackground,
    },
    sectionTitleText: {
      color: colors.foregroundColor,
    },
    optionsContent: {
      backgroundColor: colors.cardSectionBackground,
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
      overflow: 'hidden',
    },
    advancedContent: {
      backgroundColor: colors.cardSectionBackground,
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
      overflow: 'hidden',
    },
    advancedListItemTitle: {
      color: colors.feeText,
      writingDirection: direction,
    },
    advancedListItemRightTitle: {
      color: colors.foregroundColor,
    },
    statsBox: {
      backgroundColor: colors.cardSectionHeaderBackground,
    },
    listItemContainerBorder: {
      backgroundColor: 'transparent',
      borderBottomColor: colors.cardBorderColor,
    },
  });

  const navigateToWalletExport = () => {
    navigate('WalletExport', {
      walletID,
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
    navigate('ViewEditMultisigCosigners', {
      walletID,
    });
  };
  const navigateToXPub = () =>
    navigate('WalletXpub', {
      walletID,
      xpub: wallet.getXpub(),
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
    const msg = 'Transactions & balances purged. Pls go to main screen and back to rerender screen';

    if (wallet.type === HDSegwitBech32Wallet.type) {
      wallet._txs_by_external_index = {};
      wallet._txs_by_internal_index = {};
      presentAlert({ message: msg });

      wallet._balances_by_external_index = {};
      wallet._balances_by_internal_index = {};
      wallet._lastTxFetch = 0;
      wallet._lastBalanceFetch = 0;
    }

    // @ts-expect-error: Need to fix later
    if (wallet._hdWalletInstance) {
      // @ts-expect-error: Need to fix later
      wallet._hdWalletInstance._txs_by_external_index = {};
      // @ts-expect-error: Need to fix later
      wallet._hdWalletInstance._txs_by_internal_index = {};

      // @ts-expect-error: Need to fix later
      wallet._hdWalletInstance._balances_by_external_index = {};
      // @ts-expect-error: Need to fix later
      wallet._hdWalletInstance._balances_by_internal_index = {};
      // @ts-expect-error: Need to fix later
      wallet._hdWalletInstance._lastTxFetch = 0;
      // @ts-expect-error: Need to fix later
      wallet._hdWalletInstance._lastBalanceFetch = 0;
      presentAlert({ message: msg });
    }
  };

  const handleEditWalletName = useCallback(async () => {
    try {
      const newName = await prompt(loc.wallets.add_wallet_name, '', true, 'plain-text', false, undefined, wallet.getLabel());
      const trimmed = newName.trim();
      if (trimmed.length === 0) return;
      if (wallet.getLabel() === trimmed) return;
      wallet.setLabel(trimmed);
      await saveToDisk();
    } catch (_) {
      // User cancelled
    }
  }, [wallet, saveToDisk]);

  usePreventRemove(false, () => {});

  const onViewMasterFingerPrintPress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsMasterFingerPrintVisible(true);
  };

  return (
    <SafeAreaScrollView centerContent={isLoading} testID="WalletDetailsScroll">
      <>
        {isLoading ? (
          <BlueLoading />
        ) : (
          <>
            <BlueCard style={styles.address}>
              <Text style={[styles.textLabel2, stylesHook.textLabel2]}>{loc.wallets.add_wallet_name}</Text>
              <View style={[styles.nameRow, stylesHook.nameRow]}>
                <Text
                  style={[styles.nameValue, stylesHook.textValue, { writingDirection: direction }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  testID="WalletNameDisplay"
                >
                  {wallet.getLabel()}
                </Text>
                <TouchableOpacity
                  style={[styles.editButton, stylesHook.editButton]}
                  onPress={handleEditWalletName}
                  disabled={isLoading}
                  accessibilityRole="button"
                  testID="WalletNameEditButton"
                >
                  <BlueText style={[styles.editButtonText, stylesHook.editButtonText]}>{loc.wallets.details_edit}</BlueText>
                </TouchableOpacity>
              </View>
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
            </BlueCard>

            {/* Address (watch-address wallets only) */}
            {([LegacyWallet.type, SegwitBech32Wallet.type, SegwitP2SHWallet.type].includes(wallet.type) ||
              (wallet.type === WatchOnlyWallet.type && !wallet.isHd())) && (
              <View style={[styles.detailsCard, stylesHook.detailsCard]}>
                <View style={stylesHook.optionsContent}>
                  <Text style={[styles.textLabel2, stylesHook.textLabel2, styles.optionsSubheader]}>{loc.wallets.details_address}</Text>
                  <Text style={[styles.textValue, stylesHook.textValue, styles.addressSectionContent]} selectable>
                    {(() => {
                      try {
                        return wallet.getAddress ? wallet.getAddress() : '';
                      } catch (error: unknown) {
                        return (error as Error).message;
                      }
                    })()}
                  </Text>
                </View>
              </View>
            )}

            {/* Stats */}
            <View style={[styles.detailsCard, stylesHook.detailsCard]}>
              <View style={styles.statsRow}>
                <View style={[styles.statsBox, stylesHook.statsBox]}>
                  <View style={styles.statsBoxTitleRow}>
                    <Text onPress={purgeTransactions} style={[styles.textLabel2, stylesHook.textLabel2]} testID="PurgeBackdoorButton">
                      {loc.transactions.list_title}
                    </Text>
                    {walletTransactionsLength > 0 && (
                      <ToolTipMenu
                        isButton
                        isMenuPrimaryAction
                        onPressMenuItem={toolTipOnPressMenuItem}
                        actions={transactionsBoxMenuActions}
                      >
                        <Icon name="more-horiz" type="material" size={20} color={colors.feeText} />
                      </ToolTipMenu>
                    )}
                  </View>
                  <BlueText style={styles.statsBoxNumber}>{wallet.getTransactions().length}</BlueText>
                </View>
                {hasCoinControl && utxoCount !== null && utxoCount > 0 ? (
                  <TouchableOpacity
                    style={[styles.statsBox, stylesHook.statsBox]}
                    onPress={() => navigate('SendDetailsRoot', { screen: 'CoinControl', params: { walletID } })}
                    activeOpacity={0.8}
                    testID="CoinsStatsBox"
                  >
                    <Text style={[styles.textLabel2, stylesHook.textLabel2]}>{loc.wallets.details_stats_coins}</Text>
                    <BlueText style={styles.statsBoxNumber}>{utxoCount}</BlueText>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.statsBox, stylesHook.statsBox]} testID="CoinsStatsBox">
                    <Text style={[styles.textLabel2, stylesHook.textLabel2]}>{loc.wallets.details_stats_coins}</Text>
                    <BlueText style={styles.statsBoxNumber}>{hasCoinControl && utxoCount !== null ? utxoCount : '—'}</BlueText>
                  </View>
                )}
              </View>
            </View>

            {/* Ark Address (Ark wallets only) */}
            {wallet.type === LightningArkWallet.type && (
              <View style={[styles.detailsCard, stylesHook.detailsCard]}>
                <View style={stylesHook.optionsContent}>
                  <Text style={[styles.textLabel2, stylesHook.textLabel2, styles.optionsSubheader]}>
                    {`Ark ${loc.wallets.details_address}`}
                  </Text>
                  <CopyTextToClipboard
                    text={arkAddress}
                    style={[styles.textValue, stylesHook.textValue, styles.addressSectionContent]}
                    selectable
                  />
                </View>
              </View>
            )}

            {/* Show addresses & Contacts */}
            {(wallet instanceof AbstractHDElectrumWallet ||
              (wallet.type === WatchOnlyWallet.type && wallet.isHd && wallet.isHd()) ||
              isContactsVisible) && (
              <View style={[styles.detailsCard, stylesHook.detailsCard]}>
                <View style={stylesHook.optionsContent}>
                  {(wallet instanceof AbstractHDElectrumWallet ||
                    (wallet.type === WatchOnlyWallet.type && wallet.isHd && wallet.isHd())) && (
                    <ListItem
                      containerStyle={stylesHook.listItemContainerBorder}
                      onPress={navigateToAddresses}
                      title={loc.wallets.details_show_addresses}
                      chevron
                      bottomDivider={!!isContactsVisible}
                    />
                  )}
                  {isContactsVisible ? (
                    <ListItem
                      containerStyle={stylesHook.listItemContainerBorder}
                      onPress={navigateToContacts}
                      title={loc.bip47.contacts}
                      chevron
                      bottomDivider={false}
                    />
                  ) : null}
                </View>
              </View>
            )}

            {/* Options container */}
            <View style={[styles.detailsCard, stylesHook.detailsCard]}>
              <View style={[styles.sectionTitle, stylesHook.sectionTitle]}>
                <BlueText style={[styles.sectionTitleText, stylesHook.sectionTitleText]}>{loc.wallets.details_options}</BlueText>
              </View>
              <View style={stylesHook.optionsContent}>
                {wallet.type === WatchOnlyWallet.type && wallet.isHd && wallet.isHd() && (
                  <>
                    <Text style={[styles.textLabel2, stylesHook.textLabel2, styles.optionsSubheader]}>{loc.wallets.details_advanced}</Text>
                    <ListItem
                      Component={View}
                      containerStyle={styles.listItemContainerBorderLight}
                      title={loc.wallets.details_use_with_hardware_wallet}
                      switch={{
                        value: walletUseWithHardwareWallet,
                        onValueChange: async (value: boolean) => {
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
                        },
                      }}
                      bottomDivider
                    />
                  </>
                )}
                <Text onPress={exportInternals} style={[styles.textLabel2, stylesHook.textLabel2, styles.optionsSubheader]}>
                  {loc.transactions.list_title}
                </Text>
                <ListItem
                  Component={View}
                  containerStyle={stylesHook.listItemContainerBorder}
                  title={loc.wallets.details_display}
                  switch={{
                    value: hideTransactionsInWalletsList,
                    onValueChange: async (value: boolean) => {
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
                    },
                  }}
                  bottomDivider
                />
                {wallet.allowBIP47 && wallet.allowBIP47() && (
                  <>
                    <Text style={[styles.textLabel2, stylesHook.textLabel2, styles.optionsSubheader]}>{loc.bip47.payment_code}</Text>
                    <ListItem
                      Component={View}
                      containerStyle={stylesHook.listItemContainerBorder}
                      title={loc.bip47.purpose}
                      switch={{
                        value: isBIP47Enabled,
                        onValueChange: async (value: boolean) => {
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
                        },
                      }}
                      switchTestID="BIP47Switch"
                      bottomDivider
                    />
                  </>
                )}
                {wallet.allowXpub && wallet.allowXpub() && (
                  <ListItem
                    containerStyle={stylesHook.listItemContainerBorder}
                    onPress={navigateToXPub}
                    title={loc.wallets.details_show_xpub}
                    chevron
                    testID="XpubButton"
                    bottomDivider
                  />
                )}
                {wallet.allowSignVerifyMessage && wallet.allowSignVerifyMessage() && (
                  <ListItem
                    containerStyle={stylesHook.listItemContainerBorder}
                    onPress={navigateToSignVerify}
                    title={loc.addresses.sign_title}
                    chevron
                    testID="SignVerify"
                    bottomDivider={!!(wallet.type === MultisigHDWallet.type)}
                  />
                )}
                {wallet.type === MultisigHDWallet.type && (
                  <>
                    <ListItem
                      containerStyle={stylesHook.listItemContainerBorder}
                      onPress={navigateToMultisigCoordinationSetup}
                      title={loc.multisig.export_coordination_setup.replace(/^\w/, (c: string) => c.toUpperCase())}
                      chevron
                      testID="MultisigCoordinationSetup"
                      bottomDivider
                    />
                    <ListItem
                      containerStyle={stylesHook.listItemContainerBorder}
                      onPress={navigateToViewEditCosigners}
                      title={loc.multisig.view_edit_cosigners}
                      chevron
                      testID="ViewEditCosigners"
                      bottomDivider={false}
                    />
                  </>
                )}
              </View>
            </View>

            {/* Advanced */}
            <View style={[styles.detailsCard, stylesHook.detailsCard]}>
              <TouchableOpacity
                onPress={() => setIsAdvancedExpanded(prev => !prev)}
                style={[styles.sectionTitle, stylesHook.sectionTitle, styles.sectionTitleRowContainer]}
                activeOpacity={0.8}
              >
                <BlueText style={[styles.sectionTitleText, stylesHook.sectionTitleText]}>{loc.wallets.details_advanced}</BlueText>
                <Icon name={isAdvancedExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={24} color={colors.foregroundColor} />
              </TouchableOpacity>
              {isAdvancedExpanded && (
                <View style={[styles.advancedContent, stylesHook.advancedContent]}>
                  <ListItem
                    Component={View}
                    containerStyle={stylesHook.listItemContainerBorder}
                    title={loc.wallets.details_type}
                    titleStyle={stylesHook.advancedListItemTitle}
                    rightTitle={wallet.typeReadable}
                    rightTitleStyle={stylesHook.advancedListItemRightTitle}
                    bottomDivider={
                      !!(
                        wallet.type === MultisigHDWallet.type ||
                        derivationPath ||
                        (wallet.allowMasterFingerprint && wallet.allowMasterFingerprint())
                      )
                    }
                  />
                  {wallet.type === MultisigHDWallet.type && (
                    <>
                      <ListItem
                        Component={View}
                        containerStyle={stylesHook.listItemContainerBorder}
                        title={loc.wallets.details_multisig_type}
                        titleStyle={stylesHook.advancedListItemTitle}
                        rightTitle={`${wallet.getM()} / ${wallet.getN()} (${
                          wallet.isNativeSegwit() ? 'native segwit' : wallet.isWrappedSegwit() ? 'wrapped segwit' : 'legacy'
                        })`}
                        rightTitleStyle={stylesHook.advancedListItemRightTitle}
                        bottomDivider={!!(derivationPath || (wallet.allowMasterFingerprint && wallet.allowMasterFingerprint()))}
                      />
                      <ListItem
                        Component={View}
                        containerStyle={stylesHook.listItemContainerBorder}
                        title={loc.multisig.how_many_signatures_can_bluewallet_make}
                        titleStyle={stylesHook.advancedListItemTitle}
                        rightTitle={String(wallet.howManySignaturesCanWeMake())}
                        rightTitleStyle={stylesHook.advancedListItemRightTitle}
                        bottomDivider={!!(derivationPath || (wallet.allowMasterFingerprint && wallet.allowMasterFingerprint()))}
                      />
                    </>
                  )}
                  {wallet.allowMasterFingerprint && wallet.allowMasterFingerprint() && (
                    <ListItem
                      containerStyle={stylesHook.listItemContainerBorder}
                      onPress={isMasterFingerPrintVisible ? undefined : onViewMasterFingerPrintPress}
                      Component={isMasterFingerPrintVisible ? View : undefined}
                      title={loc.wallets.details_master_fingerprint}
                      titleStyle={stylesHook.advancedListItemTitle}
                      rightTitle={
                        isMasterFingerPrintVisible ? (masterFingerprint ?? loc.wallets.import_derivation_loading) : loc.multisig.view
                      }
                      rightTitleStyle={stylesHook.advancedListItemRightTitle}
                      bottomDivider={!!derivationPath}
                    />
                  )}
                  {derivationPath && (
                    <ListItem
                      Component={View}
                      containerStyle={stylesHook.listItemContainerBorder}
                      title={loc.wallets.details_derivation_path}
                      titleStyle={stylesHook.advancedListItemTitle}
                      rightTitle={derivationPath}
                      rightTitleStyle={stylesHook.advancedListItemRightTitle}
                      bottomDivider={false}
                      testID="DerivationPath"
                    />
                  )}
                </View>
              )}
            </View>

            <BlueCard style={styles.address}>
              <View>
                <SecondButton
                  onPress={navigateToWalletExport}
                  testID="WalletExport"
                  title={loc.wallets.details_export_backup}
                  backgroundColor={colors.mainColor}
                  textColor={colors.buttonTextColor}
                />
                <BlueSpacing20 />
                <SecondButton
                  onPress={handleDeleteButtonTapped}
                  testID="DeleteWallet"
                  title={loc.wallets.details_delete_wallet}
                  backgroundColor={colors.redBG}
                  textColor={colors.redText}
                />
              </View>
            </BlueCard>
          </>
        )}
      </>
    </SafeAreaScrollView>
  );
};

const styles = StyleSheet.create({
  address: {
    alignItems: 'center',
    flex: 1,
  },
  addressSectionContent: {
    paddingTop: 4,
    paddingBottom: 16,
    paddingHorizontal: 12,
  },
  textLabel1: {
    fontWeight: '500',
    fontSize: 14,
    marginVertical: 12,
  },
  textLabel2: {
    fontWeight: '500',
    fontSize: 14,
    marginVertical: 8,
  },
  textValue: {
    fontWeight: '500',
    fontSize: 14,
  },
  nameRow: {
    marginBottom: 32,
  },
  nameValue: {
    flex: 1,
    fontWeight: '500',
    fontSize: 18,
  },
  editButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  detailsCard: {
    marginHorizontal: 16,
    marginBottom: 40,
    padding: 0,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionTitle: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  sectionTitleRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleText: {
    fontSize: 17,
    fontWeight: '600',
  },
  optionsSubheader: {
    paddingTop: 8,
    paddingHorizontal: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statsBox: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
  },
  statsBoxTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsBoxNumber: {
    fontSize: 32,
    fontWeight: '700',
  },
  advancedContent: {
    marginTop: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  listItemContainerBorderLight: {
    backgroundColor: 'transparent',
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
});

export default WalletDetails;

/**
 * A wallet's own settings, in the settings style: its name and type on top,
 * the switches that apply to it, what identifies it (fingerprint, derivation
 * path), the screens it opens (addresses, backup, XPUB) and, last and apart,
 * deleting it. Exporting the history and deleting used to sit in a menu behind
 * "⋯"; they are rows now, where they can be seen.
 *
 * Two support shortcuts stay hidden: ten taps on the type export the wallet's
 * internals, ten on the transaction count purge its cache.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, LayoutAnimation, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { writeFileAndExport } from '../../blue_modules/fs';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import presentAlert from '../../components/Alert';
import Icon, { MaterialIconName } from '../../components/Icon';
import {
  SettingsBadge,
  SettingsCard,
  SettingsRow,
  SettingsScreenHeader,
  SettingsSectionLabel,
  SettingsSwitchRow,
  useSettingsPalette,
} from '../../components/settings/SettingsUI';
import prompt from '../../helpers/prompt';
import { unlockWithBiometrics, useBiometrics } from '../../hooks/useBiometrics';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc, { formatBalanceWithoutSuffix } from '../../loc';
import { XnaUnit } from '../../models/xnaUnits';
import { useStorage } from '../../hooks/context/useStorage';
import { useFocusEffect, useRoute, RouteProp, usePreventRemove, useLocale } from '@react-navigation/native';
import { Transaction, TWallet } from '../../class/wallets/types';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { useSettings } from '../../hooks/context/useSettings';
import { isNeuraiWallet } from '../../class/wallets/is-neurai-wallet';
import { NeuraiHardwareWallet } from '../../class/wallets/neurai-hardware-wallet';
import NeuraiLoader from '../../components/NeuraiLoader';
import { appAlert } from '../../components/AppDialog';

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
  // BIP47 (Bitcoin-only) and hardware-wallet flags don't apply to Neurai
  // wallets; the screens that consumed these states are gone.

  const { navigate, navigateToWalletsList, goBack } = useExtendedNavigation();
  const p = useSettingsPalette();
  const insets = useSafeAreaInsets();
  const [walletName, setWalletName] = useState<string>(wallet.getLabel());
  // Legacy and ECDSA software wallets can use only their first address; PQ
  // wallets always do, and the hardware wallet has a single address.
  const { isSingleAddressEnabled } = useSettings();
  const addressWallet = isNeuraiWallet(wallet) && wallet.type !== NeuraiHardwareWallet.type && wallet.walletKind !== 'pq' ? wallet : null;
  const [singleAddress, setSingleAddress] = useState<boolean>(addressWallet?.singleAddress ?? false);

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
      const balance = formatBalanceWithoutSuffix(wallet.getBalance(), XnaUnit.SATS, true);
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

      if (cleanedConfirmation.length > 0 && BigInt(cleanedConfirmation) === wallet.getBalance()) {
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
    const headers = [loc.transactions.date, loc.transactions.txid, `${loc.send.create_amount} (${XnaUnit.XNA})`, loc.send.create_memo];

    const rows = [headers.join(',')];
    const transactions = wallet.getTransactions();

    transactions.forEach((transaction: Transaction) => {
      const value = formatBalanceWithoutSuffix(transaction.value || 0, XnaUnit.XNA, true);
      const hash: string = transaction.hash || '';
      const memo = (transaction.hash && txMetadata[transaction.hash]?.memo?.trim()) || '';
      const date = transaction.timestamp ? new Date(transaction.timestamp * 1000).toString() : '';
      rows.push([date, hash, value, memo].join(','));
    });

    return rows.join('\n');
  }, [wallet, txMetadata]);

  const fileName = useMemo(() => {
    const label = wallet.getLabel().replace(' ', '-');
    return `${label}-history.csv`;
  }, [wallet]);

  const onExportHistory = useCallback(() => {
    appAlert(loc.wallets.details_export_history, undefined, [
      { text: loc._.cancel, style: 'cancel' },
      { text: loc.wallets.details_export_save, onPress: () => writeFileAndExport(fileName, exportHistoryContent(), false) },
      { text: loc.wallets.details_export_share, onPress: () => writeFileAndExport(fileName, exportHistoryContent(), true) },
    ]);
  }, [exportHistoryContent, fileName]);

  // BIP47 contacts panel is no longer reachable on Neurai wallets.

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (isMasterFingerPrintVisible && wallet.allowMasterFingerprint && wallet.allowMasterFingerprint()) {
        // @ts-expect-error: Need to fix later
        if (wallet.getMasterFingerprintHex && !cancelled) {
          // @ts-expect-error: Need to fix later
          setMasterFingerprint(wallet.getMasterFingerprintHex());
        }
      } else {
        setMasterFingerprint(undefined);
      }

      return () => {
        cancelled = true;
      };
    }, [isMasterFingerPrintVisible, wallet]),
  );

  // A hardware wallet's words never reach the app: its backup screen explains where they are.
  const navigateToWalletExport = () => {
    if (wallet.type === NeuraiHardwareWallet.type) navigate('HardwareBackupInfo', { walletID });
    else navigate('WalletExport', { walletID });
  };

  const navigateToXPub = () =>
    navigate('WalletXpub', {
      walletID,
      xpub: wallet.getXpub(),
    });

  const navigateToAddresses = () =>
    navigate('WalletAddresses', {
      walletID,
    });

  const exportInternals = async () => {
    if (backdoorPressed < 10) return setBackdoorPressed(backdoorPressed + 1);
    setBackdoorPressed(0);
    const fileNameExternals = 'wallet-externals.json';
    const contents = JSON.stringify(
      {
        type: wallet.type,
        label: wallet.label,
        _utxo: wallet._utxo,
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
    wallet._utxo = [];
    wallet._lastTxFetch = 0;
    wallet._lastBalanceFetch = 0;
    presentAlert({ message: 'Cache purged. Go to the main screen and back to rerender.' });
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

  usePreventRemove(false, () => {
    walletNameTextInputOnBlur();
  });

  const onViewMasterFingerPrintPress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsMasterFingerPrintVisible(true);
  };

  const neurai = isNeuraiWallet(wallet) ? wallet : null;
  const networkLabel = neurai
    ? neurai.getNeuraiNetwork() === 'testnet'
      ? loc.wallets.neurai_network_testnet
      : loc.wallets.neurai_network_mainnet
    : undefined;
  const typeIcon: MaterialIconName =
    wallet.type === NeuraiHardwareWallet.type ? 'usb' : neurai?.walletKind === 'pq' ? 'security' : 'account-balance-wallet';
  const showFingerprint = !!(wallet.allowMasterFingerprint && wallet.allowMasterFingerprint());
  const divider = { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: p.divider };

  if (isLoading) {
    return (
      <View style={[styles.root, styles.centered, { backgroundColor: p.ground }]}>
        <NeuraiLoader />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: p.ground }]}>
      <SettingsScreenHeader title={loc.wallets.details_title} onBack={goBack} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        testID="WalletDetailsScroll"
      >
        <SettingsCard style={styles.hero}>
          <View style={styles.heroHead}>
            <View style={[styles.heroIcon, { backgroundColor: p.accentSoft }]}>
              <Icon name={typeIcon} type="material" size={28} color={p.accentText} />
            </View>
            <View style={styles.texts}>
              <View style={[styles.nameBox, { backgroundColor: p.ground }]}>
                <TextInput
                  value={walletName}
                  onChangeText={setWalletName}
                  onBlur={walletNameTextInputOnBlur}
                  numberOfLines={1}
                  placeholder={loc.wallets.add_wallet_name}
                  placeholderTextColor={p.mutedOnCard}
                  accessibilityLabel={loc.wallets.add_wallet_name}
                  style={[styles.nameInput, { color: p.ink, writingDirection: direction }]}
                  editable={!isLoading}
                  underlineColorAndroid="transparent"
                  testID="WalletNameInput"
                />
                <Icon name="edit" type="material" size={18} color={p.mutedOnCard} />
              </View>
              <Text onPress={exportInternals} style={[styles.subtitle, { color: p.mutedOnCard }]} selectable>
                {wallet.typeReadable}
              </Text>
            </View>
            {networkLabel && <SettingsBadge label={networkLabel} />}
          </View>
        </SettingsCard>

        {addressWallet && (
          <View>
            <SettingsSectionLabel>{loc.wallets.details_section_options}</SettingsSectionLabel>
            <SettingsCard>
              <SettingsSwitchRow
                icon="place"
                title={loc.settings.single_address}
                subtitle={isSingleAddressEnabled ? loc.wallets.details_single_address_all : loc.wallets.details_single_address_explanation}
                value={singleAddress || isSingleAddressEnabled}
                disabled={isSingleAddressEnabled}
                switchTestID="WalletSingleAddressSwitch"
                onValueChange={async (value: boolean) => {
                  addressWallet.singleAddress = value;
                  setSingleAddress(value);
                  triggerHapticFeedback(HapticFeedbackTypes.ImpactLight);
                  try {
                    await saveToDisk();
                  } catch (error: any) {
                    triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
                    console.error(error.message);
                  }
                }}
              />
            </SettingsCard>
          </View>
        )}

        <View>
          <SettingsSectionLabel>{loc.wallets.details_section_info}</SettingsSectionLabel>
          <SettingsCard>
            <Pressable onPress={purgeTransactions} testID="PurgeBackdoorButton" style={styles.info}>
              <Text style={[styles.infoLabel, styles.texts, { color: p.mutedOnCard }]}>{loc.transactions.transactions_count}</Text>
              <Text style={[styles.infoValue, { color: p.ink }]}>{walletTransactionsLength}</Text>
            </Pressable>
            {showFingerprint && (
              <View style={[styles.info, divider]}>
                <Text style={[styles.infoLabel, styles.texts, { color: p.mutedOnCard }]}>{loc.wallets.details_master_fingerprint}</Text>
                {isMasterFingerPrintVisible ? (
                  masterFingerprint ? (
                    <Text style={[styles.infoValue, styles.mono, { color: p.ink }]} selectable>
                      {masterFingerprint}
                    </Text>
                  ) : (
                    <ActivityIndicator color={p.accent} />
                  )
                ) : (
                  <Pressable onPress={onViewMasterFingerPrintPress} accessibilityRole="button" hitSlop={8}>
                    <Text style={[styles.infoValue, { color: p.accentText }]}>{loc.multisig.view}</Text>
                  </Pressable>
                )}
              </View>
            )}
            {derivationPath && (
              <View style={[styles.info, divider]}>
                <Text style={[styles.infoLabel, styles.texts, { color: p.mutedOnCard }]}>{loc.wallets.details_derivation_path}</Text>
                <Text style={[styles.infoValue, styles.mono, { color: p.ink }]} selectable testID="DerivationPath">
                  {derivationPath}
                </Text>
              </View>
            )}
          </SettingsCard>
        </View>

        <SettingsCard>
          <SettingsRow icon="format-list-bulleted" title={loc.wallets.details_show_addresses} onPress={navigateToAddresses} />
          <SettingsRow
            divider
            icon="key"
            title={loc.wallets.details_export_backup}
            onPress={navigateToWalletExport}
            testID="WalletExport"
          />
          {wallet.allowXpub && wallet.allowXpub() && (
            <SettingsRow divider icon="vpn-key" title={loc.wallets.details_show_xpub} onPress={navigateToXPub} testID="XpubButton" />
          )}
          {walletTransactionsLength > 0 && (
            <SettingsRow
              divider
              icon="file-download"
              title={loc.wallets.details_export_history}
              onPress={onExportHistory}
              testID="ExportHistoryButton"
            />
          )}
        </SettingsCard>

        <SettingsCard>
          <Pressable
            onPress={handleDeleteButtonTapped}
            accessibilityRole="button"
            testID="DeleteWalletButton"
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={[styles.round, { backgroundColor: p.fail.bg }]}>
              <Icon name="delete-outline" type="material" size={20} color={p.fail.dot} />
            </View>
            <Text style={[styles.title, styles.texts, { color: p.fail.fg }]}>{loc.wallets.details_delete_wallet}</Text>
          </Pressable>
        </SettingsCard>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 16, paddingTop: 8, rowGap: 20 },
  pressed: { opacity: 0.6 },
  hero: { paddingVertical: 16 },
  heroHead: { flexDirection: 'row', alignItems: 'center', columnGap: 14 },
  heroIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, rowGap: 4 },
  nameBox: { flexDirection: 'row', alignItems: 'center', columnGap: 6, borderRadius: 12, paddingHorizontal: 12, height: 44 },
  nameInput: { flex: 1, fontSize: 18, fontWeight: '700', paddingVertical: 0 },
  subtitle: { fontSize: 13, lineHeight: 18 },
  info: { flexDirection: 'row', alignItems: 'center', columnGap: 12, minHeight: 52, paddingVertical: 10 },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 15, fontWeight: '600' },
  mono: { fontFamily: 'monospace', fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', columnGap: 12, minHeight: 64, paddingVertical: 10 },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '600' },
});

export default WalletDetails;

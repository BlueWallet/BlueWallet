/**
 * Import a Neurai wallet from its recovery words, in the settings style: the
 * words, the passphrase if one was used, the network and the kind of wallet
 * (ECDSA and PQ are testnet only for now). There is exactly one derivation
 * path per kind, defined in `neurai-key`, so nothing else is asked. The words
 * are kept out of screenshots and recordings.
 */

import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Keyboard, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { chainFor, isKindAvailable, NeuraiNetwork, WalletKind } from '../../blue_modules/neurai';
import { NeuraiECDSAWallet } from '../../class/wallets/neurai-ecdsa-wallet';
import { NeuraiHDWallet } from '../../class/wallets/neurai-hd-wallet';
import { NeuraiPQWallet } from '../../class/wallets/neurai-pq-wallet';
import presentAlert from '../../components/Alert';
import { isReportedSaveError } from '../../class/storage-errors';
import { ConnectFooter, ConnectOption } from '../../components/ConnectUI';
import { HomeWalletKind, walletKindIconOf } from '../../components/home/homeTheme';
import NeuraiLoader, { untilLoaderPainted } from '../../components/NeuraiLoader';
import ScreenProtectionGate from '../../components/ScreenProtectionGate';
import { secretTextInputProps } from '../../components/secretInputProps';
import {
  SettingsCard,
  SettingsScreenHeader,
  SettingsSectionLabel,
  SettingsSegment,
  SettingsSegmented,
  useSettingsPalette,
} from '../../components/settings/SettingsUI';
import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { useScreenProtect } from '../../hooks/useScreenProtect';
import loc from '../../loc';

const NETWORKS: SettingsSegment<NeuraiNetwork>[] = [
  { value: 'mainnet', label: loc.wallets.neurai_network_mainnet, icon: 'public', testID: 'ImportNeuraiMainnet' },
  { value: 'testnet', label: loc.wallets.neurai_network_testnet, icon: 'science', testID: 'ImportNeuraiTestnet' },
];

const KINDS: { kind: WalletKind; icon: HomeWalletKind; title: string; explain: string }[] = [
  { kind: 'legacy', icon: 'hd', title: loc.wallets.add_neurai_legacy, explain: loc.wallets.add_neurai_legacy_explain },
  { kind: 'ecdsa', icon: 'ecdsa', title: loc.wallets.add_neurai_ecdsa, explain: loc.wallets.add_neurai_ecdsa_explain },
  { kind: 'pq', icon: 'pq', title: loc.wallets.add_neurai_pq, explain: loc.wallets.add_neurai_pq_explain },
];

const ImportNeurai: React.FC = () => {
  const p = useSettingsPalette();
  const { wallets, addWalletAndSave } = useStorage();
  const navigation = useExtendedNavigation();

  const [mnemonic, setMnemonic] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [kind, setKind] = useState<WalletKind>('legacy');
  const [network, setNetwork] = useState<NeuraiNetwork>('mainnet');
  const [isImporting, setIsImporting] = useState(false);
  const { enableScreenProtect, disableScreenProtect, isProtectionReady, isProtectionFailed } = useScreenProtect();

  // The words typed here are recovery material: keep them out of screenshots, recordings and the
  // recents thumbnail, whatever the "Allow Screen Capture" setting says.
  useFocusEffect(
    useCallback(() => {
      enableScreenProtect();
      return () => {
        disableScreenProtect();
      };
    }, [enableScreenProtect, disableScreenProtect]),
  );

  const importWallet = useCallback(async () => {
    Keyboard.dismiss();
    const mnemonicTrimmed = mnemonic.trim().replace(/\s+/g, ' ');
    if (!mnemonicTrimmed) {
      presentAlert({ message: loc.wallets.import_error });
      return;
    }
    setIsImporting(true);
    // Let the loader paint before the CPU-heavy key derivation (PQ ML-DSA is
    // ~2s and synchronous) blocks the JS thread; it keeps moving meanwhile.
    await untilLoaderPainted();
    try {
      const wallet = kind === 'pq' ? new NeuraiPQWallet() : kind === 'ecdsa' ? new NeuraiECDSAWallet() : new NeuraiHDWallet();
      wallet.setNetwork(chainFor(network, kind));
      wallet.setSecret(mnemonicTrimmed);
      if (passphrase) wallet.setPassphrase(passphrase);

      // Refuse to import the same wallet twice. Identity = type + network +
      // mnemonic + passphrase (same seed on the same chain/kind = same wallet).
      // The same words on the other network are another wallet and are
      // accepted: testnet wallet IDs include the network (H02). The ID check
      // also catches a record the case-insensitive comparison would miss.
      const normalizedSecret = mnemonicTrimmed.toLowerCase();
      const walletID = wallet.getID();
      const alreadyLoaded = wallets.some(
        w =>
          w.getID() === walletID ||
          (w.type === wallet.type &&
            w.network === wallet.network &&
            (w.secret || '').trim().replace(/\s+/g, ' ').toLowerCase() === normalizedSecret &&
            (w.passphrase || '') === (passphrase || '')),
      );
      if (alreadyLoaded) {
        presentAlert({ message: loc.wallets.import_already_loaded });
        return;
      }

      // Derive at least one address eagerly so subsequent screens have data.
      try {
        await wallet.getReceiveAddressAsync();
      } catch {
        // engine could not initialise — surface a useful error
        throw new Error(loc.wallets.import_error);
      }
      // Rejects, and drops the wallet again, when it was not saved: success is
      // only announced for a wallet that is on disk (H03).
      await addWalletAndSave(wallet);
      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
      presentAlert({
        tone: 'success',
        message: loc.wallets.import_success,
        buttons: [{ text: loc._.ok, style: 'default', onPress: () => navigation.getParent()?.goBack() }],
        // Keep the dialog up until the user taps OK so the success is noticed.
        options: { cancelable: false },
      });
    } catch (err: any) {
      if (!isReportedSaveError(err)) presentAlert({ message: err?.message ?? String(err) });
    } finally {
      setIsImporting(false);
    }
  }, [mnemonic, passphrase, kind, network, wallets, addWalletAndSave, navigation]);

  const onNetworkChange = useCallback((next: NeuraiNetwork) => {
    setNetwork(next);
    // ECDSA and PQ are not available on mainnet yet: back to legacy if one of them was picked.
    setKind(current => (isKindAvailable(next, current) ? current : 'legacy'));
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: p.ground }]}>
      <SettingsScreenHeader title={loc.wallets.import_title} onBack={() => navigation.goBack()} />
      {isImporting ? (
        <View style={styles.busy}>
          <NeuraiLoader label={loc.wallets.import_importing} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
          testID="ImportNeuraiScroll"
        >
          {/* The words and the passphrase are typed only on a protected window (H09). */}
          <ScreenProtectionGate ready={isProtectionReady} failed={isProtectionFailed} onRetry={enableScreenProtect}>
            <View>
              <SettingsSectionLabel>{loc.wallets.import_words}</SettingsSectionLabel>
              <SettingsCard>
                <TextInput
                  testID="ImportNeuraiMnemonic"
                  value={mnemonic}
                  onChangeText={setMnemonic}
                  placeholder={loc.wallets.import_words_placeholder}
                  placeholderTextColor={p.mutedOnCard}
                  selectionColor={p.accent}
                  multiline
                  {...secretTextInputProps}
                  style={[styles.words, { color: p.ink }]}
                  underlineColorAndroid="transparent"
                />
              </SettingsCard>
            </View>

            <View>
              <SettingsSectionLabel>{loc.wallets.import_passphrase_optional}</SettingsSectionLabel>
              <SettingsCard>
                <TextInput
                  testID="ImportNeuraiPassphrase"
                  value={passphrase}
                  onChangeText={setPassphrase}
                  placeholder={loc.wallets.import_passphrase_message}
                  placeholderTextColor={p.mutedOnCard}
                  selectionColor={p.accent}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  importantForAutofill="no"
                  secureTextEntry
                  style={[styles.passphrase, { color: p.ink }]}
                  underlineColorAndroid="transparent"
                />
              </SettingsCard>
            </View>
          </ScreenProtectionGate>

          <View>
            <SettingsSectionLabel>{loc.wallets.neurai_network_label}</SettingsSectionLabel>
            <SettingsCard style={styles.padded}>
              <SettingsSegmented segments={NETWORKS} value={network} onChange={onNetworkChange} testID="ImportNeuraiNetwork" />
            </SettingsCard>
          </View>

          <View>
            <SettingsSectionLabel>{loc.wallets.add_wallet_type}</SettingsSectionLabel>
            <SettingsCard>
              {KINDS.map((k, index) => {
                const available = isKindAvailable(network, k.kind);
                return (
                  <ConnectOption
                    key={k.kind}
                    icon={walletKindIconOf(k.icon)}
                    title={k.title}
                    subtitle={available ? k.explain : loc.wallets.add_testnet_only}
                    selected={kind === k.kind}
                    disabled={!available}
                    onPress={() => setKind(k.kind)}
                    divider={index > 0}
                    testID={`ImportNeuraiKind-${k.kind}`}
                  />
                );
              })}
            </SettingsCard>
          </View>
        </ScrollView>
      )}
      <ConnectFooter
        primary={{ title: loc.wallets.import_do_import, onPress: importWallet, disabled: isImporting, testID: 'ImportNeuraiSubmit' }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, rowGap: 20 },
  padded: { paddingVertical: 12 },
  words: { fontSize: 16, lineHeight: 24, minHeight: 112, paddingVertical: 14, paddingHorizontal: 0, textAlignVertical: 'top' },
  passphrase: { fontSize: 16, minHeight: 56, paddingVertical: 14, paddingHorizontal: 0 },
  busy: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

export default ImportNeurai;

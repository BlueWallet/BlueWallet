/**
 * Add a wallet, in the settings style: its name, the network, the kind of
 * wallet (ECDSA and PQ are testnet only for now) and, apart, the other ways to
 * add one: import it from its words or connect a hardware wallet. Creating
 * runs behind the Neurai loader, then the words are shown to back them up.
 */
import React, { useCallback, useState } from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
import {
  SettingsCard,
  SettingsRow,
  SettingsScreenHeader,
  SettingsSectionLabel,
  SettingsSegment,
  SettingsSegmented,
  useSettingsPalette,
} from '../../components/settings/SettingsUI';
import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { AddWalletStackParamList } from '../../navigation/AddWalletStack';

type NavigationProps = NativeStackNavigationProp<AddWalletStackParamList, 'AddWallet'>;

const NETWORKS: SettingsSegment<NeuraiNetwork>[] = [
  { value: 'mainnet', label: loc.wallets.neurai_network_mainnet, icon: 'public', testID: 'AddWalletMainnet' },
  { value: 'testnet', label: loc.wallets.neurai_network_testnet, icon: 'science', testID: 'AddWalletTestnet' },
];

const KINDS: { kind: WalletKind; icon: HomeWalletKind; title: string; explain: string; testID: string }[] = [
  {
    kind: 'legacy',
    icon: 'hd',
    title: loc.wallets.add_neurai_legacy,
    explain: loc.wallets.add_neurai_legacy_explain,
    testID: 'ActivateNeuraiHDButton',
  },
  {
    kind: 'ecdsa',
    icon: 'ecdsa',
    title: loc.wallets.add_neurai_ecdsa,
    explain: loc.wallets.add_neurai_ecdsa_explain,
    testID: 'ActivateNeuraiECDSAButton',
  },
  {
    kind: 'pq',
    icon: 'pq',
    title: loc.wallets.add_neurai_pq,
    explain: loc.wallets.add_neurai_pq_explain,
    testID: 'ActivateNeuraiPQButton',
  },
];

const WalletsAdd: React.FC = () => {
  const p = useSettingsPalette();
  const { addWalletAndSave } = useStorage();
  const { navigate, goBack } = useExtendedNavigation<NavigationProps>();

  const [label, setLabel] = useState('');
  const [walletKind, setWalletKind] = useState<WalletKind>('legacy');
  // Always mainnet by default, whatever network the home screen is showing:
  // creating real-money wallets is the common case and testnet is a deliberate
  // choice.
  const [network, setNetwork] = useState<NeuraiNetwork>('mainnet');
  const [isLoading, setIsLoading] = useState(false);

  const createWallet = useCallback(async () => {
    Keyboard.dismiss();
    setIsLoading(true);
    try {
      // Generating and deriving hold the JS thread: let the loader show first.
      await untilLoaderPainted();
      const wallet = walletKind === 'pq' ? new NeuraiPQWallet() : walletKind === 'ecdsa' ? new NeuraiECDSAWallet() : new NeuraiHDWallet();
      wallet.setNetwork(chainFor(network, walletKind));
      wallet.setLabel(label.trim() || loc.wallets.details_title);
      wallet.generate();
      await wallet.prewarmEngine();
      // Rejects (and drops the wallet again) when it was not saved: the backup
      // screen is only reached for a wallet that is on disk.
      await addWalletAndSave(wallet);
      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
      navigate('PleaseBackup', { walletID: wallet.getID() });
    } catch (err: any) {
      if (!isReportedSaveError(err)) presentAlert({ message: err?.message ?? String(err) });
    } finally {
      setIsLoading(false);
    }
  }, [walletKind, network, label, addWalletAndSave, navigate]);

  const onNetworkChange = useCallback((next: NeuraiNetwork) => {
    setNetwork(next);
    // ECDSA and PQ are not available on mainnet yet: back to legacy if one of them was picked.
    setWalletKind(kind => (isKindAvailable(next, kind) ? kind : 'legacy'));
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: p.ground }]}>
      <SettingsScreenHeader title={loc.wallets.add_title} onBack={goBack} icon="close" iconLabel={loc._.close} />
      {isLoading ? (
        <View style={styles.creating}>
          <NeuraiLoader label={loc.wallets.add_creating} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
          testID="ScrollView"
        >
          <View>
            <SettingsSectionLabel>{loc.wallets.add_wallet_name}</SettingsSectionLabel>
            <SettingsCard>
              <TextInput
                testID="WalletNameInput"
                value={label}
                onChangeText={setLabel}
                placeholder={loc.wallets.add_placeholder}
                placeholderTextColor={p.mutedOnCard}
                selectionColor={p.accent}
                returnKeyType="done"
                style={[styles.nameInput, { color: p.ink }]}
                underlineColorAndroid="transparent"
              />
            </SettingsCard>
          </View>

          <View>
            <SettingsSectionLabel>{loc.wallets.neurai_network_label}</SettingsSectionLabel>
            <SettingsCard style={styles.padded}>
              <SettingsSegmented segments={NETWORKS} value={network} onChange={onNetworkChange} testID="AddWalletNetwork" />
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
                    selected={walletKind === k.kind}
                    disabled={!available}
                    onPress={() => setWalletKind(k.kind)}
                    divider={index > 0}
                    testID={k.testID}
                  />
                );
              })}
            </SettingsCard>
          </View>

          <View>
            <SettingsSectionLabel>{loc.wallets.add_other}</SettingsSectionLabel>
            <SettingsCard>
              <SettingsRow
                icon="download"
                title={loc.wallets.add_import_wallet}
                subtitle={loc.wallets.add_import_explain}
                onPress={() => navigate('ImportNeurai')}
                testID="ImportWallet"
              />
              <SettingsRow
                icon={walletKindIconOf('hardware')}
                title={loc.wallets.add_neurai_hardware}
                subtitle={loc.wallets.add_neurai_hardware_explain}
                onPress={() => navigate('AddHardwareWallet')}
                divider
                testID="ConnectHardwareWallet"
              />
            </SettingsCard>
          </View>
        </ScrollView>
      )}
      <ConnectFooter primary={{ title: loc.wallets.add_create, onPress: createWallet, disabled: isLoading, testID: 'Create' }} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, rowGap: 20 },
  padded: { paddingVertical: 12 },
  nameInput: { fontSize: 16, minHeight: 56, paddingVertical: 14, paddingHorizontal: 0 },
  creating: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

export default WalletsAdd;

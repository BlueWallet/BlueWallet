import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NeuraiESP32 } from '@neuraiproject/neurai-sign-esp32/react-native';

import presentAlert from '../../components/Alert';
import { isReportedSaveError } from '../../class/storage-errors';
import { ConnectFooter, ConnectInfoRow, ConnectNoticeCard, ConnectOption } from '../../components/ConnectUI';
import { walletKindIconOf } from '../../components/home/homeTheme';
import Icon from '../../components/Icon';
import RecoveryWords from '../../components/RecoveryWords';
import { secretTextInputProps } from '../../components/secretInputProps';
import {
  SettingsCard,
  SettingsRow,
  SettingsScreenHeader,
  SettingsSectionLabel,
  SettingsSegment,
  SettingsSegmented,
  useSettingsPalette,
} from '../../components/settings/SettingsUI';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { useScreenProtect } from '../../hooks/useScreenProtect';
import { NeuraiHardwareWallet } from '../../class/wallets/neurai-hardware-wallet';
import { deriveLegacyAddress } from '../../blue_modules/neurai-hw/xpubDerivation';
import { useNeuraiHwDevice } from '../../blue_modules/neurai-hw/useNeuraiHwDevice';
import { defaultHardwareWalletLabel } from '../../blue_modules/neurai-hw/walletLabel';
import {
  generateSetupMnemonic,
  validateSetupMnemonic,
  type SetupKeyType,
  type SetupNetwork,
  type SetupWordCount,
} from '../../blue_modules/neurai-hw/setupSeed';
import loc from '../../loc';
import NeuraiLoader from '../../components/NeuraiLoader';
import ScreenProtectionGate from '../../components/ScreenProtectionGate';

const networkLabel = (chain: string): string => (chain.includes('test') ? 'Neurai Testnet' : 'Neurai');

const NETWORKS: SettingsSegment<SetupNetwork>[] = [
  { value: 'mainnet', label: loc.wallets.neurai_network_mainnet, icon: 'public', testID: 'HardwareMainnet' },
  { value: 'testnet', label: loc.wallets.neurai_network_testnet, icon: 'science', testID: 'HardwareTestnet' },
];

const WORD_COUNTS: SettingsSegment<'12' | '24'>[] = [
  { value: '12', label: loc.wallets.hardware_words_12, icon: 'notes', testID: 'HardwareWords12' },
  { value: '24', label: loc.wallets.hardware_words_24, icon: 'subject', testID: 'HardwareWords24' },
];

/** What a step is about: a title and, if needed, a line or two under it. */
const StepIntro: React.FC<{ title: string; text?: string }> = ({ title, text }) => {
  const p = useSettingsPalette();
  return (
    <View style={styles.intro}>
      <Text style={[styles.introTitle, { color: p.ink }]} accessibilityRole="header">
        {title}
      </Text>
      {text ? <Text style={[styles.introText, { color: p.muted }]}>{text}</Text> : null}
    </View>
  );
};

/**
 * Steps of the screen:
 * - `idle`         — instructions + Connect button.
 * - `connecting`   — discovering / opening the USB device.
 * - `choose`       — the device is UNCONFIGURED: create a new wallet or restore an existing phrase.
 * - `setup`        — pick network / key type (and, for a new wallet, word count).
 * - `backup`       — show the generated recovery phrase so the owner can write it down (new only).
 * - `restore`      — type an existing recovery phrase to load onto the device (restore only).
 * - `provisioning` — `setup_seed` sent; the owner approves + creates the PIN on the device.
 * - `review`       — wallet read back from the device, ready to add.
 */
type Phase = 'idle' | 'connecting' | 'choose' | 'setup' | 'backup' | 'restore' | 'provisioning' | 'review';

/** Whether the unconfigured device gets a freshly generated seed or the user's existing one. */
type SetupMode = 'new' | 'restore';

/**
 * Add a NeuraiHW (ESP32) hardware wallet over USB.
 *
 * Two paths once connected, branched on `device.getDeviceState()`:
 *  - `ready`        → read the wallet and stage it for review (the original flow).
 *  - `unconfigured` → run the on-phone setup wizard: generate a seed, let the
 *                     owner back it up, push it with `setup_seed`, wait until the
 *                     owner finishes the PIN on the device, then read it back.
 *  - `locked`       → ask the owner to enter the PIN on the device and retry.
 *
 * NOTE: an unconfigured device answers `ping` with an error, so we MUST probe
 * with `getDeviceState()` (which tolerates that) before any other command.
 */
const AddHardwareWallet: React.FC = () => {
  const p = useSettingsPalette();
  const { status, error, connect, disconnect } = useNeuraiHwDevice();
  const { wallets, addWalletAndSave } = useStorage();
  const navigation = useExtendedNavigation();
  const [phase, setPhase] = useState<Phase>('idle');
  const [pending, setPending] = useState<NeuraiHardwareWallet | null>(null);
  const [walletName, setWalletName] = useState('');

  // Setup wizard selections + the seed we generated (kept only until it is on the device).
  const [mode, setMode] = useState<SetupMode>('new');
  const [wordCount, setWordCount] = useState<SetupWordCount>(12);
  const [network, setNetwork] = useState<SetupNetwork>('mainnet');
  const [keyType, setKeyType] = useState<SetupKeyType>('legacy');
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [restoreInput, setRestoreInput] = useState('');

  // The live connection has to survive across the wizard, so hold it here
  // instead of disconnecting after `connect()`.
  const deviceRef = useRef<NeuraiESP32 | null>(null);

  const isUnsupported = status === 'unsupported';

  // The backup step shows the seed and the restore step takes it: keep both out of screenshots,
  // recordings and the recents thumbnail, whatever the "Allow Screen Capture" setting says.
  const { enableScreenProtect, disableScreenProtect, isProtectionReady, isProtectionFailed } = useScreenProtect();
  const handlesSeed = phase === 'backup' || phase === 'restore';
  useEffect(() => {
    if (!handlesSeed) return;
    enableScreenProtect();
    return () => {
      disableScreenProtect();
    };
  }, [handlesSeed, enableScreenProtect, disableScreenProtect]);

  const closeConnection = useCallback(async () => {
    deviceRef.current = null;
    await disconnect().catch(() => {});
  }, [disconnect]);

  // Read the configured device and build the watch-only wallet from it. Shared
  // by the `ready` path and the end of the setup flow.
  const buildWalletFromDevice = useCallback(async (device: NeuraiESP32): Promise<NeuraiHardwareWallet> => {
    // Verify it's genuine NeuraiHW firmware. `ping` needs no on-device
    // confirmation, so a non-NeuraiHW ESP32 is rejected without prompting.
    const probe = await device.ping();
    if (probe.device !== 'NeuraiHW') {
      throw new Error(loc.wallets.hardware_not_neuraihw);
    }

    const info = await device.getInfo(); // requires on-device approval
    const isPQ = (info.key_type ?? 'legacy') === 'pq';
    const wallet = new NeuraiHardwareWallet();

    if (isPQ) {
      // PQ: a single address. `get_address` carries the pubkey + commitment.
      const addr = await device.getAddress(); // user confirms on the device
      wallet.setFromDeviceInfo(info, addr);
    } else {
      // Legacy: import the account xpub and manage addresses with HD derivation.
      const bip32 = await device.getBip32Pubkey(); // user confirms on the device
      const addr = {
        status: 'success',
        type: 'legacy' as const,
        address: info.address,
        pubkey: info.pubkey,
        path: info.path,
      };
      wallet.setFromDeviceInfo(info, addr, bip32);
      // Validate the whole derivation pipeline against the device: the address
      // derived from the xpub at 0/0 must equal the device's own address.
      const check = deriveLegacyAddress(wallet.xpub, wallet.network, 0, 0);
      if (check.address !== info.address) {
        throw new Error(loc.wallets.hardware_derivation_mismatch);
      }
    }

    if (!wallet.address) throw new Error(loc.wallets.hardware_no_address);
    return wallet;
  }, []);

  // Stage a wallet read from the device for review, with a name the user can
  // still change before it is added.
  const stageForReview = useCallback(
    (wallet: NeuraiHardwareWallet) => {
      setWalletName(
        defaultHardwareWalletLabel(
          wallet.hwFingerprint,
          wallets.map(w => w.getLabel()),
        ),
      );
      setPending(wallet);
      setPhase('review');
    },
    [wallets],
  );

  const onConnect = useCallback(async () => {
    if (phase === 'connecting') return;
    setPhase('connecting');
    try {
      const device = await connect();
      if (!device) throw new Error(error || loc.errors.error);
      deviceRef.current = device;

      // Probe the state FIRST — an unconfigured device errors on `ping`.
      const state = await device.getDeviceState();

      if (state === 'unconfigured') {
        // Keep the connection open; first ask new-vs-restore, then configure.
        setPhase('choose');
        return;
      }
      if (state === 'locked') {
        await closeConnection();
        presentAlert({ message: loc.wallets.hardware_locked });
        setPhase('idle');
        return;
      }

      // `ready`: read the wallet and stage it for review.
      const wallet = await buildWalletFromDevice(device);
      await closeConnection();
      stageForReview(wallet);
    } catch (e: unknown) {
      await closeConnection();
      presentAlert({ message: e instanceof Error ? e.message : String(e) });
      setPhase('idle');
    }
  }, [phase, connect, error, closeConnection, buildWalletFromDevice, stageForReview]);

  // Wizard selectors. PQ keys are testnet-only (the firmware enforces it): on
  // mainnet the PQ option is off, and going back to mainnet picks Legacy, so an
  // invalid combination never reaches the device.
  const onChangeNetwork = useCallback((next: SetupNetwork) => {
    setNetwork(next);
    if (next === 'mainnet') setKeyType('legacy');
  }, []);
  const onChangeKeyType = useCallback((next: SetupKeyType) => setKeyType(next), []);

  // New-vs-restore choice for an unconfigured device; both then go to the config step.
  const onChooseNew = useCallback(() => {
    setMode('new');
    setPhase('setup');
  }, []);
  const onChooseRestore = useCallback(() => {
    setMode('restore');
    setPhase('setup');
  }, []);

  // Push a mnemonic to the device, then wait for the owner to approve the summary
  // and create the PIN on the device. Shared by the new and restore paths.
  const provisionWith = useCallback(
    async (phrase: string) => {
      const device = deviceRef.current;
      if (!device || !phrase) return;
      setPhase('provisioning');
      try {
        await device.setupSeed({ mnemonic: phrase, network, keyType }); // owner approves a summary on the device
        await device.waitUntilReady({ timeoutMs: 300000 }); // owner creates the PIN on the device

        const wallet = await buildWalletFromDevice(device);
        setMnemonic(null); // it now lives on the device; drop our copies
        setRestoreInput('');
        await closeConnection();
        stageForReview(wallet);
      } catch (e: unknown) {
        setMnemonic(null);
        setRestoreInput('');
        await closeConnection();
        presentAlert({ message: e instanceof Error ? e.message : String(e) });
        setPhase('idle');
      }
    },
    [network, keyType, buildWalletFromDevice, closeConnection, stageForReview],
  );

  // NEW: generate the seed and move to the mandatory backup step.
  const onGenerate = useCallback(async () => {
    try {
      const phrase = await generateSetupMnemonic(wordCount);
      setMnemonic(phrase);
      setPhase('backup');
    } catch (e: unknown) {
      presentAlert({ message: e instanceof Error ? e.message : String(e) });
    }
  }, [wordCount]);

  // NEW: confirm the owner actually wrote the phrase down — it is the only copy.
  const onBackupContinue = useCallback(() => {
    presentAlert({
      title: loc.wallets.hardware_backup_title,
      message: loc.wallets.hardware_backup_confirm,
      buttons: [
        { text: loc._.cancel, style: 'cancel', onPress: () => {} },
        { text: loc.wallets.hardware_backup_continue, style: 'default', onPress: () => provisionWith(mnemonic ?? '') },
      ],
      options: { cancelable: true },
    });
  }, [provisionWith, mnemonic]);

  // RESTORE: validate the typed phrase locally, then confirm before sending it.
  const onRestoreContinue = useCallback(() => {
    const { valid, normalized } = validateSetupMnemonic(restoreInput);
    if (!valid) {
      presentAlert({ message: loc.wallets.hardware_restore_invalid });
      return;
    }
    presentAlert({
      title: loc.wallets.hardware_restore_title,
      message: loc.wallets.hardware_restore_confirm,
      buttons: [
        { text: loc._.cancel, style: 'cancel', onPress: () => {} },
        { text: loc.wallets.hardware_restore_send, style: 'default', onPress: () => provisionWith(normalized) },
      ],
      options: { cancelable: true },
    });
  }, [restoreInput, provisionWith]);

  const onAdd = useCallback(async () => {
    if (!pending) return;
    // Refuse to add the same device twice (match by pubkey, falling back to
    // address), and anything with the same wallet ID: network + key type +
    // fingerprint + path name one wallet (H02).
    const pendingID = pending.getID();
    const duplicate = wallets.some(
      w =>
        w.getID() === pendingID ||
        (w.type === NeuraiHardwareWallet.type &&
          ((w as NeuraiHardwareWallet).pubkey === pending.pubkey || (w as NeuraiHardwareWallet).address === pending.address)),
    );
    if (duplicate) {
      presentAlert({ message: loc.wallets.hardware_already_added });
      return;
    }
    // An empty name falls back to the proposed one (base + fingerprint) rather
    // than to the shared type name that caused the confusion in the first place.
    pending.setLabel(
      walletName.trim() ||
        defaultHardwareWalletLabel(
          pending.hwFingerprint,
          wallets.map(w => w.getLabel()),
        ),
    );
    try {
      // Rejects, and drops the wallet again, when it was not saved (H03).
      await addWalletAndSave(pending);
    } catch (saveError) {
      if (!isReportedSaveError(saveError)) presentAlert({ message: (saveError as Error)?.message ?? String(saveError) });
      return;
    }
    triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
    // Close the whole "Add wallet" modal and land on the wallet list.
    navigation.getParent()?.goBack();
  }, [pending, walletName, wallets, addWalletAndSave, navigation]);

  const onCancel = useCallback(async () => {
    setMnemonic(null);
    setRestoreInput('');
    setMode('new');
    setPending(null);
    setWalletName('');
    await closeConnection();
    setPhase('idle');
    navigation.goBack();
  }, [closeConnection, navigation]);

  const renderChoose = () => (
    <>
      <StepIntro title={loc.wallets.hardware_setup_title} text={loc.wallets.hardware_choose_subtitle} />
      <SettingsCard>
        <SettingsRow
          icon="add-circle-outline"
          title={loc.wallets.hardware_choose_new}
          subtitle={loc.wallets.hardware_choose_new_explain}
          onPress={onChooseNew}
          testID="HardwareChooseNewButton"
        />
        <SettingsRow
          icon="restore"
          title={loc.wallets.hardware_choose_restore}
          subtitle={loc.wallets.hardware_choose_restore_explain}
          onPress={onChooseRestore}
          divider
          testID="HardwareChooseRestoreButton"
        />
      </SettingsCard>
    </>
  );

  const renderSetup = () => (
    <>
      <StepIntro
        title={mode === 'restore' ? loc.wallets.hardware_restore_title : loc.wallets.hardware_setup_title}
        text={mode === 'restore' ? loc.wallets.hardware_setup_subtitle_restore : loc.wallets.hardware_setup_subtitle}
      />
      {mode === 'new' && (
        <View>
          <SettingsSectionLabel>{loc.wallets.hardware_setup_words}</SettingsSectionLabel>
          <SettingsCard style={styles.padded}>
            <SettingsSegmented
              segments={WORD_COUNTS}
              value={wordCount === 24 ? '24' : '12'}
              onChange={value => setWordCount(value === '24' ? 24 : 12)}
              testID="HardwareWordCount"
            />
          </SettingsCard>
        </View>
      )}
      <View>
        <SettingsSectionLabel>{loc.wallets.neurai_network_label}</SettingsSectionLabel>
        <SettingsCard style={styles.padded}>
          <SettingsSegmented segments={NETWORKS} value={network} onChange={onChangeNetwork} testID="HardwareNetwork" />
        </SettingsCard>
      </View>
      <View>
        <SettingsSectionLabel>{loc.wallets.hardware_field_type}</SettingsSectionLabel>
        <SettingsCard>
          <ConnectOption
            icon={walletKindIconOf('hd')}
            title={loc.wallets.hardware_keytype_legacy}
            subtitle={loc.wallets.hardware_keytype_legacy_explain}
            selected={keyType === 'legacy'}
            onPress={() => onChangeKeyType('legacy')}
            testID="HardwareKeyLegacy"
          />
          <ConnectOption
            icon={walletKindIconOf('pq')}
            title={loc.wallets.hardware_keytype_pq}
            subtitle={network === 'mainnet' ? loc.wallets.add_testnet_only : loc.wallets.hardware_keytype_pq_explain}
            selected={keyType === 'pq'}
            disabled={network === 'mainnet'}
            onPress={() => onChangeKeyType('pq')}
            divider
            testID="HardwareKeyPQ"
          />
        </SettingsCard>
      </View>
    </>
  );

  const renderRestore = () => (
    <>
      <StepIntro title={loc.wallets.hardware_restore_title} text={loc.wallets.hardware_restore_subtitle} />
      <ScreenProtectionGate ready={isProtectionReady} failed={isProtectionFailed} onRetry={enableScreenProtect} loaderStyle={styles.loader}>
        <SettingsCard>
          <TextInput
            testID="HardwareRestoreInput"
            value={restoreInput}
            onChangeText={setRestoreInput}
            placeholder={loc.wallets.hardware_restore_placeholder}
            placeholderTextColor={p.mutedOnCard}
            selectionColor={p.accent}
            multiline
            {...secretTextInputProps}
            style={[styles.words, { color: p.ink }]}
            underlineColorAndroid="transparent"
          />
        </SettingsCard>
      </ScreenProtectionGate>
    </>
  );

  const renderBackup = () => (
    <>
      <StepIntro title={loc.wallets.hardware_backup_title} />
      <ConnectNoticeCard tone="warn" text={loc.wallets.hardware_backup_warning} />
      <ScreenProtectionGate ready={isProtectionReady} failed={isProtectionFailed} onRetry={enableScreenProtect} loaderStyle={styles.loader}>
        <RecoveryWords words={mnemonic ?? ''} testID="HardwareSecret" />
      </ScreenProtectionGate>
    </>
  );

  const renderReview = () =>
    pending && (
      <>
        <StepIntro title={loc.wallets.hardware_review_title} />
        <View>
          <SettingsSectionLabel>{loc.wallets.add_wallet_name}</SettingsSectionLabel>
          <SettingsCard>
            <TextInput
              testID="HardwareWalletNameInput"
              value={walletName}
              onChangeText={setWalletName}
              placeholder={loc.wallets.add_wallet_name}
              placeholderTextColor={p.mutedOnCard}
              selectionColor={p.accent}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={40}
              numberOfLines={1}
              style={[styles.name, { color: p.ink }]}
              underlineColorAndroid="transparent"
            />
          </SettingsCard>
          <Text style={[styles.hint, { color: p.muted }]}>{loc.wallets.hardware_name_hint}</Text>
        </View>
        <SettingsCard>
          <ConnectInfoRow icon="public" title={loc.wallets.hardware_field_network} subtitle={networkLabel(pending.network)} />
          <ConnectInfoRow
            icon={walletKindIconOf(pending.keyType === 'pq' ? 'pq' : 'hd')}
            title={loc.wallets.hardware_field_type}
            subtitle={pending.keyType === 'pq' ? 'Post-Quantum (ML-DSA-44)' : 'Legacy (ECDSA P2PKH)'}
            divider
          />
          <ConnectInfoRow icon="qr-code-2" title={loc.wallets.hardware_field_address} detail={pending.address} detailFull divider />
          <ConnectInfoRow icon="account-tree" title={loc.wallets.hardware_field_path} detail={pending.hwPath} divider />
          <ConnectInfoRow icon="fingerprint" title={loc.wallets.hardware_field_fingerprint} detail={pending.hwFingerprint} divider />
        </SettingsCard>
      </>
    );

  const renderIdle = () => (
    <SettingsCard style={styles.hero}>
      <View style={[styles.heroIcon, { backgroundColor: p.accentSoft }]}>
        <Icon name="usb" type="material" size={30} color={p.accentText} />
      </View>
      <Text style={[styles.heroTitle, { color: p.ink }]}>NeuraiHW</Text>
      <Text style={[styles.heroText, { color: p.mutedOnCard }]}>{loc.wallets.hardware_connect_instructions}</Text>
    </SettingsCard>
  );

  // What the step shows, and the one button that moves it on (none while waiting).
  let content: React.ReactNode = null;
  let next: { title: string; onPress: () => void; testID: string } | null = null;
  let busyText = '';
  if (isUnsupported) {
    content = <ConnectNoticeCard tone="quiet" text={loc.wallets.hardware_only_android} />;
  } else if (phase === 'review') {
    content = renderReview();
    next = { title: loc.wallets.hardware_add, onPress: onAdd, testID: 'HardwareAddButton' };
  } else if (phase === 'connecting') {
    busyText = loc.wallets.hardware_connecting;
  } else if (phase === 'provisioning') {
    busyText = loc.wallets.hardware_setup_waiting;
  } else if (phase === 'choose') {
    content = renderChoose();
  } else if (phase === 'setup') {
    content = renderSetup();
    next =
      mode === 'restore'
        ? { title: loc.wallets.hardware_restore_enter, onPress: () => setPhase('restore'), testID: 'HardwareRestoreNextButton' }
        : { title: loc.wallets.hardware_setup_generate, onPress: onGenerate, testID: 'HardwareGenerateButton' };
  } else if (phase === 'backup') {
    content = renderBackup();
    next = { title: loc.wallets.hardware_backup_continue, onPress: onBackupContinue, testID: 'HardwareBackupContinueButton' };
  } else if (phase === 'restore') {
    content = renderRestore();
    next = { title: loc.wallets.hardware_restore_send, onPress: onRestoreContinue, testID: 'HardwareRestoreSendButton' };
  } else {
    content = renderIdle();
    next = { title: loc.wallets.hardware_connect_button, onPress: onConnect, testID: 'ConnectHardwareWalletButton' };
  }

  return (
    <View style={[styles.root, { backgroundColor: p.ground }]}>
      {/* Back cancels at any step: the connection is closed and a phrase not yet on the device is dropped. */}
      <SettingsScreenHeader title={loc.wallets.hardware_connect_title} onBack={onCancel} />
      {busyText ? (
        <View style={styles.busy}>
          <NeuraiLoader label={busyText} style={styles.busyLoader} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
        >
          {content}
        </ScrollView>
      )}
      {next ? <ConnectFooter primary={next} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, rowGap: 20 },
  padded: { paddingVertical: 12 },
  intro: { rowGap: 6, paddingHorizontal: 4 },
  introTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  introText: { fontSize: 14, lineHeight: 20 },
  hero: { alignItems: 'center', rowGap: 10, paddingVertical: 28, paddingHorizontal: 24 },
  heroIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroTitle: { fontSize: 20, fontWeight: '700' },
  heroText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  words: { fontSize: 16, lineHeight: 24, minHeight: 120, paddingVertical: 14, paddingHorizontal: 0, textAlignVertical: 'top' },
  name: { fontSize: 16, minHeight: 56, paddingVertical: 14, paddingHorizontal: 0 },
  hint: { fontSize: 12, lineHeight: 17, marginTop: 8, marginHorizontal: 4 },
  loader: { paddingVertical: 40 },
  busy: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  busyLoader: { maxWidth: 320 },
});

export default AddHardwareWallet;

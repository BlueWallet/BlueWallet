import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NeuraiESP32 } from '@neuraiproject/neurai-sign-esp32/react-native';

import { BlueFormLabel } from '../../BlueComponents';
import Button from '../../components/Button';
import SegmentedControl from '../../components/SegmentedControl';
import { BlueSpacing20, BlueSpacing40 } from '../../components/BlueSpacing';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { secretTextInputProps } from '../../components/secretInputProps';
import presentAlert from '../../components/Alert';
import { useTheme } from '../../components/themes';
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

const networkLabel = (chain: string): string => (chain.includes('test') ? 'Neurai Testnet' : 'Neurai');

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
  const { colors } = useTheme();
  const { status, error, connect, disconnect } = useNeuraiHwDevice();
  const { wallets, addWallet, saveToDisk } = useStorage();
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

  const stylesHook = {
    root: { backgroundColor: colors.elevated },
    status: { color: colors.alternativeTextColor },
    fieldLabel: { color: colors.alternativeTextColor },
    fieldValue: { color: colors.foregroundColor },
    card: { backgroundColor: colors.inputBackgroundColor, borderColor: colors.formBorder },
    warning: { backgroundColor: colors.inputBackgroundColor, borderColor: colors.redBG },
    warningText: { color: colors.foregroundColor },
    restoreInput: { backgroundColor: colors.inputBackgroundColor, borderColor: colors.formBorder, color: colors.foregroundColor },
    nameInput: { backgroundColor: colors.inputBackgroundColor, borderColor: colors.formBorder, color: colors.foregroundColor },
    wordChip: { backgroundColor: colors.elevated, borderColor: colors.formBorder },
    wordIndex: { color: colors.alternativeTextColor },
    wordText: { color: colors.foregroundColor },
  };

  const isUnsupported = status === 'unsupported';

  // The backup step shows the seed and the restore step takes it: keep both out of screenshots,
  // recordings and the recents thumbnail, whatever the "Allow Screen Capture" setting says.
  const { enableScreenProtect, disableScreenProtect, isProtectionReady } = useScreenProtect();
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

  // Wizard selectors. PQ keys are testnet-only (the firmware enforces it), so
  // keep network/key-type mutually consistent instead of letting an invalid
  // combination reach the device.
  const onChangeWordCount = useCallback((index: number) => setWordCount(index === 1 ? 24 : 12), []);
  const onChangeNetwork = useCallback((index: number) => {
    const next: SetupNetwork = index === 1 ? 'testnet' : 'mainnet';
    setNetwork(next);
    if (next === 'mainnet') setKeyType('legacy');
  }, []);
  const onChangeKeyType = useCallback((index: number) => {
    const next: SetupKeyType = index === 1 ? 'pq' : 'legacy';
    setKeyType(next);
    if (next === 'pq') setNetwork('testnet');
  }, []);

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
    // Refuse to add the same device twice (match by pubkey, falling back to address).
    const duplicate = wallets.some(
      w =>
        w.type === NeuraiHardwareWallet.type &&
        ((w as NeuraiHardwareWallet).pubkey === pending.pubkey || (w as NeuraiHardwareWallet).address === pending.address),
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
    addWallet(pending);
    await saveToDisk();
    triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
    // Close the whole "Add wallet" modal and land on the wallet list.
    navigation.getParent()?.goBack();
  }, [pending, walletName, wallets, addWallet, saveToDisk, navigation]);

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

  const renderField = (label: string, value: string) => (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, stylesHook.fieldLabel]}>{label}</Text>
      <Text style={[styles.fieldValue, stylesHook.fieldValue]} selectable>
        {value}
      </Text>
    </View>
  );

  const renderBusy = (message: string) => (
    <View style={styles.action}>
      <NeuraiLoader />
      <BlueSpacing20 />
      <Text style={[styles.statusText, stylesHook.status]}>{message}</Text>
    </View>
  );

  const renderChoose = () => (
    <>
      <BlueFormLabel>{loc.wallets.hardware_setup_title}</BlueFormLabel>
      <Text style={[styles.statusText, stylesHook.status, styles.setupSubtitle]}>{loc.wallets.hardware_choose_subtitle}</Text>
      <BlueSpacing20 />
      <View style={styles.action}>
        <Button testID="HardwareChooseNewButton" title={loc.wallets.hardware_choose_new} onPress={onChooseNew} />
        <BlueSpacing20 />
        <Button testID="HardwareChooseRestoreButton" title={loc.wallets.hardware_choose_restore} onPress={onChooseRestore} />
        <BlueSpacing20 />
        <Button testID="HardwareCancelButton" title={loc._.cancel} onPress={onCancel} />
      </View>
      <BlueSpacing40 />
    </>
  );

  const renderSetup = () => (
    <>
      <BlueFormLabel>{mode === 'restore' ? loc.wallets.hardware_restore_title : loc.wallets.hardware_setup_title}</BlueFormLabel>
      <Text style={[styles.statusText, stylesHook.status, styles.setupSubtitle]}>
        {mode === 'restore' ? loc.wallets.hardware_setup_subtitle_restore : loc.wallets.hardware_setup_subtitle}
      </Text>
      <View style={styles.setupForm}>
        {mode === 'new' && (
          <>
            <Text style={[styles.fieldLabel, stylesHook.fieldLabel]}>{loc.wallets.hardware_setup_words}</Text>
            <SegmentedControl values={['12', '24']} selectedIndex={wordCount === 24 ? 1 : 0} onChange={onChangeWordCount} />
          </>
        )}

        <Text style={[styles.fieldLabel, stylesHook.fieldLabel]}>{loc.wallets.hardware_field_network}</Text>
        <SegmentedControl
          values={[loc.wallets.neurai_network_mainnet, loc.wallets.neurai_network_testnet]}
          selectedIndex={network === 'testnet' ? 1 : 0}
          onChange={onChangeNetwork}
        />

        <Text style={[styles.fieldLabel, stylesHook.fieldLabel]}>{loc.wallets.hardware_field_type}</Text>
        <SegmentedControl
          values={[loc.wallets.hardware_keytype_legacy, loc.wallets.hardware_keytype_pq]}
          selectedIndex={keyType === 'pq' ? 1 : 0}
          onChange={onChangeKeyType}
        />
        <Text style={[styles.noteText, stylesHook.status]}>{loc.wallets.hardware_setup_pq_note}</Text>
      </View>
      <View style={styles.action}>
        {mode === 'restore' ? (
          <Button testID="HardwareRestoreNextButton" title={loc.wallets.hardware_restore_enter} onPress={() => setPhase('restore')} />
        ) : (
          <Button testID="HardwareGenerateButton" title={loc.wallets.hardware_setup_generate} onPress={onGenerate} />
        )}
        <BlueSpacing20 />
        <Button testID="HardwareCancelButton" title={loc._.cancel} onPress={onCancel} />
      </View>
      <BlueSpacing40 />
    </>
  );

  const renderRestore = () => (
    <>
      <BlueFormLabel>{loc.wallets.hardware_restore_title}</BlueFormLabel>
      <Text style={[styles.statusText, stylesHook.status, styles.setupSubtitle]}>{loc.wallets.hardware_restore_subtitle}</Text>
      <TextInput
        testID="HardwareRestoreInput"
        style={[styles.restoreInput, stylesHook.restoreInput]}
        value={restoreInput}
        onChangeText={setRestoreInput}
        placeholder={loc.wallets.hardware_restore_placeholder}
        placeholderTextColor={colors.alternativeTextColor}
        multiline
        {...secretTextInputProps}
        textAlignVertical="top"
      />
      <View style={styles.action}>
        <Button testID="HardwareRestoreSendButton" title={loc.wallets.hardware_restore_send} onPress={onRestoreContinue} />
        <BlueSpacing20 />
        <Button testID="HardwareCancelButton" title={loc._.cancel} onPress={onCancel} />
      </View>
      <BlueSpacing40 />
    </>
  );

  const renderBackup = () => {
    const words = (mnemonic ?? '').split(' ');
    return (
      <>
        <BlueFormLabel>{loc.wallets.hardware_backup_title}</BlueFormLabel>
        <View style={[styles.warning, stylesHook.warning]}>
          <Text style={[styles.warningText, stylesHook.warningText]}>{loc.wallets.hardware_backup_warning}</Text>
        </View>
        {isProtectionReady ? (
          <View style={styles.wordsGrid}>
            {words.map((word, i) => (
              <View key={`${i}-${word}`} style={[styles.wordChip, stylesHook.wordChip]}>
                <Text style={[styles.wordIndex, stylesHook.wordIndex]}>{i + 1}</Text>
                <Text style={[styles.wordText, stylesHook.wordText]}>{word}</Text>
              </View>
            ))}
          </View>
        ) : (
          <ActivityIndicator />
        )}
        <BlueSpacing20 />
        <View style={styles.action}>
          <Button testID="HardwareBackupContinueButton" title={loc.wallets.hardware_backup_continue} onPress={onBackupContinue} />
          <BlueSpacing20 />
          <Button testID="HardwareCancelButton" title={loc._.cancel} onPress={onCancel} />
        </View>
        <BlueSpacing40 />
      </>
    );
  };

  const renderReview = () =>
    pending && (
      <>
        <BlueFormLabel>{loc.wallets.hardware_review_title}</BlueFormLabel>
        <BlueFormLabel>{loc.wallets.hardware_name_hint}</BlueFormLabel>
        <TextInput
          testID="HardwareWalletNameInput"
          style={[styles.nameInput, stylesHook.nameInput]}
          value={walletName}
          onChangeText={setWalletName}
          placeholder={loc.wallets.add_wallet_name}
          placeholderTextColor="#81868e"
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={40}
          numberOfLines={1}
          underlineColorAndroid="transparent"
        />
        <View style={[styles.card, stylesHook.card]}>
          {renderField(loc.wallets.hardware_field_network, networkLabel(pending.network))}
          {renderField(loc.wallets.hardware_field_type, pending.keyType === 'pq' ? 'Post-Quantum (ML-DSA-44)' : 'Legacy (ECDSA P2PKH)')}
          {renderField(loc.wallets.hardware_field_address, pending.address)}
          {renderField(loc.wallets.hardware_field_path, pending.hwPath)}
          {renderField(loc.wallets.hardware_field_fingerprint, pending.hwFingerprint)}
        </View>
        <View style={styles.action}>
          <Button testID="HardwareAddButton" title={loc.wallets.hardware_add} onPress={onAdd} />
          <BlueSpacing20 />
          <Button testID="HardwareCancelButton" title={loc._.cancel} onPress={onCancel} />
        </View>
        <BlueSpacing40 />
      </>
    );

  const renderIdle = () => (
    <>
      <BlueFormLabel>{loc.wallets.hardware_connect_instructions}</BlueFormLabel>
      <BlueSpacing40 />
      <View style={styles.action}>
        <Button testID="ConnectHardwareWalletButton" title={loc.wallets.hardware_connect_button} onPress={onConnect} />
      </View>
    </>
  );

  let content: React.ReactNode;
  if (isUnsupported) {
    content = (
      <View style={styles.action}>
        <Text style={[styles.statusText, stylesHook.status]}>{loc.wallets.hardware_only_android}</Text>
      </View>
    );
  } else if (phase === 'review') {
    content = renderReview();
  } else if (phase === 'connecting') {
    content = renderBusy(loc.wallets.hardware_connecting);
  } else if (phase === 'provisioning') {
    content = renderBusy(loc.wallets.hardware_setup_waiting);
  } else if (phase === 'choose') {
    content = renderChoose();
  } else if (phase === 'setup') {
    content = renderSetup();
  } else if (phase === 'backup') {
    content = renderBackup();
  } else if (phase === 'restore') {
    content = renderRestore();
  } else {
    content = renderIdle();
  }

  return (
    <SafeAreaScrollView style={stylesHook.root}>
      <BlueSpacing20 />
      {content}
    </SafeAreaScrollView>
  );
};

const styles = StyleSheet.create({
  action: {
    marginHorizontal: 20,
  },
  statusText: {
    textAlign: 'center',
    fontSize: 13,
  },
  setupSubtitle: {
    marginHorizontal: 20,
    marginTop: 8,
  },
  setupForm: {
    marginHorizontal: 20,
    marginTop: 16,
  },
  noteText: {
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
  },
  card: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 20,
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
  },
  warning: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 14,
    borderWidth: 1,
    borderRadius: 8,
  },
  warningText: {
    fontSize: 13,
    fontWeight: '500',
  },
  nameInput: {
    marginHorizontal: 20,
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  restoreInput: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 20,
    minHeight: 110,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  wordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 14,
    marginTop: 16,
  },
  wordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '46%',
    marginHorizontal: '2%',
    marginVertical: 5,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  wordIndex: {
    fontSize: 12,
    width: 22,
  },
  wordText: {
    fontSize: 15,
    fontWeight: '600',
  },
  field: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default AddHardwareWallet;

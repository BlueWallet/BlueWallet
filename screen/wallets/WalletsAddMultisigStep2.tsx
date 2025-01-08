import React, { useCallback, useEffect, useMemo, useRef, useState, ReactElement } from 'react';
import {
  ActivityIndicator,
  FlatList,
  I18nManager,
  Keyboard,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
} from 'react-native';
import { Icon } from '@rneui/themed';
import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';

import A from '../../blue_modules/analytics';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { encodeUR } from '../../blue_modules/ur';
import { BlueButtonLink, BlueFormMultiInput, BlueSpacing10, BlueSpacing20, BlueTextCentered } from '../../BlueComponents';
import { HDSegwitBech32Wallet, MultisigCosigner, MultisigHDWallet } from '../../class';
import presentAlert from '../../components/Alert';
import BottomModal, { BottomModalHandle } from '../../components/BottomModal';
import Button from '../../components/Button';
import MultipleStepsListItem, {
  MultipleStepsListItemButtohType,
  MultipleStepsListItemDashType,
} from '../../components/MultipleStepsListItem';
import QRCodeComponent from '../../components/QRCodeComponent';
import { useTheme } from '../../components/themes';
import confirm from '../../helpers/confirm';
import prompt from '../../helpers/prompt';
import { disallowScreenshot } from 'react-native-screen-capture';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import ToolTipMenu from '../../components/TooltipMenu';
import { CommonToolTipActions } from '../../typings/CommonToolTipActions';
import { useSettings } from '../../hooks/context/useSettings';
import { isDesktop } from '../../blue_modules/environment';
import { useKeyboard } from '../../hooks/useKeyboard';
import {
  DoneAndDismissKeyboardInputAccessory,
  DoneAndDismissKeyboardInputAccessoryViewID,
} from '../../components/DoneAndDismissKeyboardInputAccessory';import Clipboard from '@react-native-clipboard/clipboard';
\
type Cosigner = [string, string | false, string | false, string?];

type WalletsAddMultisigStep2RouteParams = {
  m: number;
  n: number;
  format: string;
  walletLabel: string;
  onBarScanned?: string; // or some other shape depending on usage
};

// For React Navigation usage, adjust your RootStackParamList & key if needed
type RouteProps = RouteProp<{ WalletsAddMultisigStep2: WalletsAddMultisigStep2RouteParams }, 'WalletsAddMultisigStep2'>;

const staticCache: Record<string, string> = {};

const WalletsAddMultisigStep2 = (): ReactElement => {
  const { addWallet, saveToDisk, sleep, currentSharedCosigner, setSharedCosigner } = useStorage();
  const { isElectrumDisabled } = useSettings();
  const { colors } = useTheme();
  const { navigate, goBack, setParams } = useExtendedNavigation();

  const route = useRoute<RouteProps>();
  const { m, n, format, walletLabel, onBarScanned } = route.params;

  const [cosigners, setCosigners] = useState<Cosigner[]>([]); // array of cosigners user provided
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const mnemonicsModalRef = useRef<BottomModalHandle>(null);
  const provideMnemonicsModalRef = useRef<BottomModalHandle>(null);
  const renderCosignersXpubModalRef = useRef<BottomModalHandle>(null);
  const [cosignerXpub, setCosignerXpub] = useState<string>(''); // string used in exportCosigner()
  const [cosignerXpubURv2, setCosignerXpubURv2] = useState<string>(''); // string displayed in renderCosignersXpubModal()
  const [cosignerXpubFilename, setCosignerXpubFilename] = useState<string>('bw-cosigner.bwcosigner');
  const [vaultKeyData, setVaultKeyData] = useState<{
    keyIndex: number;
    xpub: string;
    seed: string;
    isLoading: boolean;
  }>({ keyIndex: 1, xpub: '', seed: '', isLoading: false });
  const [importText, setImportText] = useState<string>('');
  const [askPassphrase, setAskPassphrase] = useState<boolean>(false);
  const openScannerButton = useRef<TouchableOpacityProps>(null);
  const { isPrivacyBlurEnabled } = useSettings();
  const data = useRef<number[]>(Array.from({ length: n }, (_, i) => i)); // just array of length n
  const { isVisible } = useKeyboard();

  useFocusEffect(
    useCallback(() => {
      if (!isDesktop) disallowScreenshot(isPrivacyBlurEnabled);
      return () => {
        if (!isDesktop) disallowScreenshot(false);
      };
    }, [isPrivacyBlurEnabled]),
  );

  useEffect(() => {
    if (currentSharedCosigner) {
      (async function () {
        if (await confirm(loc.multisig.shared_key_detected, loc.multisig.shared_key_detected_question)) {
          setImportText(currentSharedCosigner);
          provideMnemonicsModalRef.current?.present();
          setSharedCosigner('');
        }
      })();
    }
  }, [currentSharedCosigner, setSharedCosigner]);

  useEffect(() => {
    // If the param onBarScanned is provided, handle it
    if (onBarScanned) {
      onBarScannedHandler(onBarScanned);
      // remove it so subsequent re-renders don't fire again
      setParams({ onBarScanned: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onBarScanned]);

  const onBarScannedHandler = useCallback(
    (scannedValue: string) => {
      // Reuse the same logic from onBarScanned
      onBarScannedInternal({ data: scannedValue });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cosigners, format],
  );

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
    askPassphrase: {
      backgroundColor: colors.lightButton,
    },
    textDestination: {
      color: colors.foregroundColor,
    },
    vaultKeyText: {
      color: colors.alternativeTextColor,
    },
    vaultKeyCircleSuccess: {
      backgroundColor: colors.msSuccessBG,
    },
    word: {
      backgroundColor: colors.inputBackgroundColor,
    },
    wordText: {
      color: colors.labelText,
    },
    helpButton: {
      backgroundColor: colors.buttonDisabledBackgroundColor,
    },
    helpButtonText: {
      color: colors.foregroundColor,
    },
  });

  const handleOnHelpPress = async (): Promise<void> => {
    await dismissAllModals();
    navigate('WalletsAddMultisigHelp');
  };

  const dismissAllModals = async (): Promise<void> => {
    try {
      await mnemonicsModalRef.current?.dismiss();
      await provideMnemonicsModalRef.current?.dismiss();
      await renderCosignersXpubModalRef.current?.dismiss();
    } catch (e) {
      console.debug('dismissAllModals error', e);
    }
  };

  const onCreate = async (): Promise<void> => {
    setIsLoading(true);
    await sleep(100);
    try {
      await _onCreate();
    } catch (e: any) {
      setIsLoading(false);
      presentAlert({ message: e.message });
      console.log('create MS wallet error', e);
    }
  };

  const _onCreate = async (): Promise<void> => {
    const w = new MultisigHDWallet();
    w.setM(m);
    switch (format) {
      case MultisigHDWallet.FORMAT_P2WSH:
        w.setNativeSegwit();
        w.setDerivationPath(MultisigHDWallet.PATH_NATIVE_SEGWIT);
        break;
      case MultisigHDWallet.FORMAT_P2SH_P2WSH:
      case MultisigHDWallet.FORMAT_P2SH_P2WSH_ALT:
        w.setWrappedSegwit();
        w.setDerivationPath(MultisigHDWallet.PATH_WRAPPED_SEGWIT);
        break;
      case MultisigHDWallet.FORMAT_P2SH:
        w.setLegacy();
        w.setDerivationPath(MultisigHDWallet.PATH_LEGACY);
        break;
      default:
        console.error('Unexpected format:', format);
        throw new Error('This should never happen');
    }
    for (const cc of cosigners) {
      const fp = cc[1] || getFpCacheForMnemonics(cc[0], cc[3]);
      w.addCosigner(cc[0], fp, cc[2], cc[3]);
    }
    w.setLabel(walletLabel);
    if (!isElectrumDisabled) {
      await w.fetchBalance();
    }

    addWallet(w);
    await saveToDisk();
    A(A.ENUM.CREATED_WALLET);
    triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
    goBack();
  };

  const generateNewKey = (): void => {
    const w = new HDSegwitBech32Wallet();
    w.generate().then(() => {
      const cosignersCopy = [...cosigners];
      cosignersCopy.push([w.getSecret(), false, false]);
      if (Platform.OS !== 'android') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCosigners(cosignersCopy);
      setVaultKeyData({ keyIndex: cosignersCopy.length, seed: w.getSecret(), xpub: w.getXpub(), isLoading: false });
      setIsLoading(true);
      mnemonicsModalRef.current?.present();
      setTimeout(() => {
        // fill caches
        setXpubCacheForMnemonics(w.getSecret());
        setFpCacheForMnemonics(w.getSecret());
        setIsLoading(false);
      }, 500);
    });
  };

  const getPath = useCallback((): string => {
    let path = '';
    switch (format) {
      case MultisigHDWallet.FORMAT_P2WSH:
        path = MultisigHDWallet.PATH_NATIVE_SEGWIT;
        break;
      case MultisigHDWallet.FORMAT_P2SH_P2WSH:
      case MultisigHDWallet.FORMAT_P2SH_P2WSH_ALT:
        path = MultisigHDWallet.PATH_WRAPPED_SEGWIT;
        break;
      case MultisigHDWallet.FORMAT_P2SH:
        path = MultisigHDWallet.PATH_LEGACY;
        break;
      default:
        console.error('Unexpected format:', format);
        throw new Error('This should never happen');
    }
    return path;
  }, [format]);

  const viewKey = (cosigner: Cosigner): void => {
    if (MultisigHDWallet.isXpubValid(cosigner[0])) {
      // cosigner is an xpub
      setCosignerXpub(MultisigCosigner.exportToJson(cosigner[1], cosigner[0], cosigner[2]));
      setCosignerXpubURv2(encodeUR(MultisigCosigner.exportToJson(cosigner[1], cosigner[0], cosigner[2]))[0]);
      setCosignerXpubFilename('bw-cosigner-' + cosigner[1] + '.bwcosigner');
      renderCosignersXpubModalRef.current?.present();
    } else {
      // cosigner is a seed
      const path = getPath();
      const xpub = getXpubCacheForMnemonics(cosigner[0], cosigner[3]);
      const fp = getFpCacheForMnemonics(cosigner[0], cosigner[3]);
      setCosignerXpub(MultisigCosigner.exportToJson(fp, xpub, path));
      setCosignerXpubURv2(encodeUR(MultisigCosigner.exportToJson(fp, xpub, path))[0]);
      setCosignerXpubFilename('bw-cosigner-' + fp + '.bwcosigner');
      renderCosignersXpubModalRef.current?.present();
    }
  };

  const getXpubCacheForMnemonics = (seed: string, passphrase?: string): string => {
    const path = getPath();
    const cacheKey = seed + path + (passphrase ?? '');
    if (staticCache[cacheKey]) {
      return staticCache[cacheKey];
    } else {
      return setXpubCacheForMnemonics(seed, passphrase);
    }
  };

  const setXpubCacheForMnemonics = (seed: string, passphrase?: string): string => {
    const path = getPath();
    const w = new MultisigHDWallet();
    w.setDerivationPath(path);
    const xpub = w.convertXpubToMultisignatureXpub(MultisigHDWallet.seedToXpub(seed, path, passphrase));
    staticCache[seed + path + (passphrase ?? '')] = xpub;
    return xpub;
  };

  const getFpCacheForMnemonics = (seed: string, passphrase?: string): string => {
    const cacheKey = seed + (passphrase ?? '');
    if (staticCache[cacheKey]) {
      return staticCache[cacheKey];
    } else {
      return setFpCacheForMnemonics(seed, passphrase);
    }
  };

  const setFpCacheForMnemonics = (seed: string, passphrase?: string): string => {
    const fp = MultisigHDWallet.mnemonicToFingerprint(seed, passphrase);
    staticCache[seed + (passphrase ?? '')] = fp;
    return fp;
  };

  const iHaveMnemonics = (): void => {
    provideMnemonicsModalRef.current?.present();
  };

  const tryUsingXpub = useCallback(
    async (xpub: string, fp?: string, path?: string) => {
      if (!MultisigHDWallet.isXpubForMultisig(xpub)) {
        provideMnemonicsModalRef.current?.dismiss();
        setIsLoading(false);
        setImportText('');
        setAskPassphrase(false);
        presentAlert({ message: loc.multisig.not_a_multisignature_xpub });
        return;
      }
      if (!fp) {
        try {
          fp = await prompt(loc.multisig.input_fp, loc.multisig.input_fp_explain, true, 'plain-text');
          fp = (fp + '').toUpperCase();
          if (!MultisigHDWallet.isFpValid(fp)) fp = '00000000';
        } catch (e) {
          return setIsLoading(false);
        }
      }
      if (!path) {
        try {
          path = await prompt(
            loc.multisig.input_path,
            loc.formatString(loc.multisig.input_path_explain, { default: getPath() }),
            true,
            'plain-text',
          );
          if (!MultisigHDWallet.isPathValid(path)) path = getPath();
        } catch {
          return setIsLoading(false);
        }
      }

      provideMnemonicsModalRef.current?.dismiss();
      setIsLoading(false);
      setImportText('');
      setAskPassphrase(false);

      const cosignersCopy = [...cosigners];
      cosignersCopy.push([xpub, fp || false, path || false]);
      if (Platform.OS !== 'android') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCosigners(cosignersCopy);
    },
    [cosigners, getPath],
  );

  const useMnemonicPhrase = async (): Promise<void> => {
    setIsLoading(true);

    // Check if the user typed an xpub
    if (MultisigHDWallet.isXpubValid(importText)) {
      return tryUsingXpub(importText);
    }

    // Check if the user typed JSON
    try {
      const jsonText = JSON.parse(importText);
      if (jsonText.xpub) {
        let fp;
        let path;
        if (jsonText.xfp) {
          fp = jsonText.xfp;
        }
        if (jsonText.path) {
          path = jsonText.path;
        }
        return tryUsingXpub(jsonText.xpub, fp, path);
      }
    } catch {
      // ignore JSON parse errors
    }

    // Otherwise, treat it like a mnemonic
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(importText);
    if (!hd.validateMnemonic()) {
      setIsLoading(false);
      presentAlert({ message: loc.multisig.invalid_mnemonics });
      return;
    }

    let passphrase: string | undefined;
    if (askPassphrase) {
      try {
        passphrase = await prompt(loc.wallets.import_passphrase_title, loc.wallets.import_passphrase_message);
      } catch (e: any) {
        if (e.message === 'Cancel Pressed') {
          setIsLoading(false);
          return;
        }
        throw e;
      }
    }

    const cosignersCopy = [...cosigners];
    cosignersCopy.push([hd.getSecret(), false, false, passphrase]);
    if (Platform.OS !== 'android') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCosigners(cosignersCopy);

    provideMnemonicsModalRef.current?.dismiss();
    setIsLoading(false);
    setImportText('');
    setAskPassphrase(false);
  };

  const isValidMnemonicSeed = (mnemonicSeed: string): boolean => {
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(mnemonicSeed);
    return hd.validateMnemonic();
  };

  const onBarScannedInternal = useCallback(
    (ret: { data: string }): void => {
      if (!ret.data) return;

      try {
        let retData = JSON.parse(ret.data);
        // If UR:CRYPTO-ACCOUNT or similar, might parse as array
        if (Array.isArray(retData) && retData.length === 1) {
          retData = retData.pop();
          ret.data = JSON.stringify(retData);
        }
      } catch {
        // Not JSON, so ignore
      }

      if (ret.data.toUpperCase().startsWith('UR')) {
        presentAlert({ message: 'BC-UR not decoded. This should never happen' });
      } else if (isValidMnemonicSeed(ret.data)) {
        setImportText(ret.data);
        setTimeout(() => {
          provideMnemonicsModalRef.current?.present();
        }, 100);
      } else {
        if (MultisigHDWallet.isXpubValid(ret.data) && !MultisigHDWallet.isXpubForMultisig(ret.data)) {
          presentAlert({ message: loc.multisig.not_a_multisignature_xpub });
          return;
        }
        if (MultisigHDWallet.isXpubValid(ret.data)) {
          tryUsingXpub(ret.data);
          return;
        }
        let cosigner = new MultisigCosigner(ret.data);
        if (!cosigner.isValid()) {
          presentAlert({ message: loc.multisig.invalid_cosigner });
          return;
        }
        provideMnemonicsModalRef.current?.dismiss();

        // If cosigner has multiple cosigners inside, attempt to pick the correct format
        if (cosigner.howManyCosignersWeHave() > 1) {
          for (const cc of cosigner.getAllCosigners()) {
            switch (format) {
              case MultisigHDWallet.FORMAT_P2WSH:
                if (cc.getPath().startsWith('m/48') && cc.getPath().endsWith("/2'")) {
                  cosigner = cc;
                }
                break;
              case MultisigHDWallet.FORMAT_P2SH_P2WSH:
              case MultisigHDWallet.FORMAT_P2SH_P2WSH_ALT:
                if (cc.getPath().startsWith('m/48') && cc.getPath().endsWith("/1'")) {
                  cosigner = cc;
                }
                break;
              case MultisigHDWallet.FORMAT_P2SH:
                if (cc.getPath().startsWith('m/45')) {
                  cosigner = cc;
                }
                break;
              default:
                console.error('Unexpected format:', format);
                throw new Error('This should never happen');
            }
          }
        }

        // Check duplicates
        for (const existingCosigner of cosigners) {
          if (existingCosigner[0] === cosigner.getXpub()) {
            presentAlert({ message: loc.multisig.this_cosigner_is_already_imported });
            return;
          }
        }

        // Validate cosigner's path
        let correctFormat = false;
        switch (format) {
          case MultisigHDWallet.FORMAT_P2WSH:
            if (cosigner.getPath().startsWith('m/48') && cosigner.getPath().endsWith("/2'")) {
              correctFormat = true;
            }
            break;
          case MultisigHDWallet.FORMAT_P2SH_P2WSH:
          case MultisigHDWallet.FORMAT_P2SH_P2WSH_ALT:
            if (cosigner.getPath().startsWith('m/48') && cosigner.getPath().endsWith("/1'")) {
              correctFormat = true;
            }
            break;
          case MultisigHDWallet.FORMAT_P2SH:
            if (cosigner.getPath().startsWith('m/45')) {
              correctFormat = true;
            }
            break;
          default:
            console.error('Unexpected format:', format);
            throw new Error('This should never happen');
        }

        if (!correctFormat) {
          presentAlert({ message: loc.formatString(loc.multisig.invalid_cosigner_format, { format }) });
          return;
        }

        const cosignersCopy = [...cosigners];
        cosignersCopy.push([cosigner.getXpub(), cosigner.getFp(), cosigner.getPath()]);
        if (Platform.OS !== 'android') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setCosigners(cosignersCopy);
      }
    },
    [cosigners, format, tryUsingXpub],
  );

  const scanOrOpenFile = async (): Promise<void> => {
    await provideMnemonicsModalRef.current?.dismiss();
    navigate('ScanQRCode');
  };

  const dashType = ({
    index,
    lastIndex,
    isChecked,
    isFocus,
  }: {
    index: number;
    lastIndex: number;
    isChecked: boolean;
    isFocus: boolean;
  }): MultipleStepsListItemDashType => {
    if (isChecked) {
      if (index === lastIndex) {
        return MultipleStepsListItemDashType.top;
      } else {
        return MultipleStepsListItemDashType.topAndBottom;
      }
    } else {
      if (index === lastIndex) {
        return isFocus ? MultipleStepsListItemDashType.topAndBottom : MultipleStepsListItemDashType.top;
      } else {
        return MultipleStepsListItemDashType.topAndBottom;
      }
    }
  };

  const _renderKeyItem = ({ item, index }: { item: number; index: number }): ReactElement => {
    const renderProvideKeyButtons = index === cosigners.length;
    const isChecked = index < cosigners.length;
    return (
      <View>
        <MultipleStepsListItem
          circledText={String(index + 1)}
          leftText={loc.formatString(loc.multisig.vault_key, { number: index + 1 })}
          dashes={dashType({
            index,
            lastIndex: data.current.length - 1,
            isChecked,
            isFocus: renderProvideKeyButtons,
          })}
          checked={isChecked}
          rightButton={
            isChecked
              ? {
                  disabled: vaultKeyData.isLoading,
                  text: loc.multisig.share,
                  onPress: () => {
                    viewKey(cosigners[index]);
                  },
                }
              : undefined
          }
        />
        {renderProvideKeyButtons && (
          <>
            <MultipleStepsListItem
              showActivityIndicator={vaultKeyData.keyIndex === index && vaultKeyData.isLoading}
              button={{
                buttonType: MultipleStepsListItemButtohType.full,
                onPress: () => {
                  setVaultKeyData({ keyIndex: index, xpub: '', seed: '', isLoading: true });
                  generateNewKey();
                },
                text: loc.multisig.create_new_key,
                disabled: vaultKeyData.isLoading,
              }}
              dashes={MultipleStepsListItemDashType.topAndBottom}
              checked={isChecked}
            />
            <MultipleStepsListItem
              button={{
                testID: 'VaultCosignerImport' + String(index + 1),
                onPress: iHaveMnemonics,
                buttonType: MultipleStepsListItemButtohType.full,
                text: loc.wallets.import_do_import,
                disabled: vaultKeyData.isLoading,
              }}
              dashes={index === data.current.length - 1 ? MultipleStepsListItemDashType.top : MultipleStepsListItemDashType.topAndBottom}
              checked={isChecked}
            />
          </>
        )}
      </View>
    );
  };

  const renderSecret = (entries: string[]): ReactElement[] => {
    return entries.map((secret: string, index: number) => {
      const text = entries.length > 1 ? `${index + 1}. ${secret}  ` : `${secret}  `;
      return (
        <View style={[styles.word, stylesHook.word]} key={`${secret}${index}`}>
          <Text style={[styles.wordText, stylesHook.wordText]} textBreakStrategy="simple">
            {text}
          </Text>
        </View>
      );
    });
  };

  const renderMnemonicsModal = (): ReactElement => {
    return (
      <BottomModal
        ref={mnemonicsModalRef}
        isGrabberVisible={false}
        dismissible={false}
        showCloseButton={!isLoading}
        sizes={[Platform.OS === 'ios' ? 'auto' : '80%']}
        backgroundColor={colors.modal}
        footer={
          <View style={styles.modalFooterBottomPadding}>
            {isLoading ? (
              <ActivityIndicator />
            ) : (
              <Button title={loc.send.success_done} onPress={() => mnemonicsModalRef.current?.dismiss()} />
            )}
          </View>
        }
      >
        <View style={styles.itemKeyUnprovidedWrapper}>
          <View style={[styles.vaultKeyCircleSuccess, stylesHook.vaultKeyCircleSuccess]}>
            <Icon size={24} name="check" type="ionicons" color={colors.msSuccessCheck} />
          </View>
          <View style={styles.vaultKeyTextWrapper}>
            <Text style={[styles.vaultKeyText, stylesHook.vaultKeyText]}>
              {loc.formatString(loc.multisig.vault_key, { number: vaultKeyData.keyIndex })}
            </Text>
          </View>
        </View>
        <BlueSpacing20 />
        <Text style={[styles.headerText, stylesHook.textDestination]}>{loc.multisig.wallet_key_created}</Text>
        <BlueSpacing20 />
        <Text style={[styles.textDestination, stylesHook.textDestination]}>{loc._.seed}</Text>
        <BlueSpacing10 />
        <View style={styles.secretContainer}>{renderSecret(vaultKeyData.seed.split(' '))}</View>
        <BlueSpacing20 />
      </BottomModal>
    );
  };

  const toolTipActions = useMemo(() => {
    const passphrase = { ...CommonToolTipActions.Passphrase };
    passphrase.menuState = askPassphrase;
    return [passphrase];
  }, [askPassphrase]);

  const renderProvideMnemonicsModal = (): ReactElement => {
    return (
      <BottomModal
        footer={
          !isVisible && (
            <View style={styles.modalFooterBottomPadding}>
              {isLoading ? (
                <ActivityIndicator />
              ) : (
                <>
                  <Button
                    testID="DoImportKeyButton"
                    disabled={importText.trim().length === 0}
                    title={loc.wallets.import_do_import}
                    onPress={useMnemonicPhrase}
                  />
                  <BlueButtonLink
                    testID="ScanOrOpenFile"
                    ref={openScannerButton}
                    disabled={isLoading}
                    onPress={scanOrOpenFile}
                    title={loc.wallets.import_scan_qr}
                  />
                </>
              )}
            </View>
          )
        }
        ref={provideMnemonicsModalRef}
        backgroundColor={colors.modal}
        isGrabberVisible={false}
        showCloseButton={true}
        sizes={[Platform.OS === 'ios' ? 'auto' : '80%']}
        onDismiss={() => {
          Keyboard.dismiss();
          setImportText('');
          setAskPassphrase(false);
        }}
        header={
          <ToolTipMenu
            isButton
            isMenuPrimaryAction
            onPressMenuItem={_id => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setAskPassphrase(!askPassphrase);
            }}
            actions={toolTipActions}
            style={[styles.askPassprase, stylesHook.askPassphrase]}
          >
            <Icon size={22} name="more-horiz" type="material" color={colors.foregroundColor} />
          </ToolTipMenu>
        }
      >
        <BlueTextCentered>{loc.multisig.type_your_mnemonics}</BlueTextCentered>
        <BlueSpacing20 />
        <View style={styles.multiLineTextInput}>
          <BlueFormMultiInput
            value={importText}
            onChangeText={setImportText}
            inputAccessoryViewID={DoneAndDismissKeyboardInputAccessoryViewID}
          />
          {Platform.select({
            ios: <DoneAndDismissKeyboardInputAccessory 
            onClearTapped={() => setImportText('')}
             onPasteTapped={
              async () => {
                const paste = await Clipboard.getString();
                setImportText(paste);
              }
            }/>,
            android: isVisible && <DoneAndDismissKeyboardInputAccessory 
            onClearTapped={() => setImportText('')}
            onPasteTapped={
              async () => {
                const paste = await Clipboard.getString();
                setImportText(paste);
              }
            } />,
          })}
          <BlueSpacing20 />
        </View>
      </BottomModal>
    );
  };

  const hideCosignersXpubModal = (): void => {
    Keyboard.dismiss();
    renderCosignersXpubModalRef.current?.dismiss();
  };

  const renderCosignersXpubModal = (): ReactElement => {
    return (
      <BottomModal
        onClose={hideCosignersXpubModal}
        ref={renderCosignersXpubModalRef}
        backgroundColor={colors.modal}
        shareContent={{ fileContent: cosignerXpub, fileName: cosignerXpubFilename }}
        footerDefaultMargins
        contentContainerStyle={styles.modalContent}
        footer={<View style={styles.modalFooterBottomPadding}>{isLoading ? <ActivityIndicator /> : null}</View>}
      >
        <Text style={[styles.headerText, stylesHook.textDestination]}>
          {loc.multisig.this_is_cosigners_xpub} {Platform.OS === 'ios' ? loc.multisig.this_is_cosigners_xpub_airdrop : ''}
        </Text>
        <BlueSpacing20 />
        <View style={styles.qrContainer}>
          <QRCodeComponent value={cosignerXpubURv2} size={260} />
        </View>
        <BlueSpacing20 />
      </BottomModal>
    );
  };

  const renderHelp = (): ReactElement => {
    return (
      <View style={styles.helpButtonWrapper}>
        <TouchableOpacity accessibilityRole="button" style={[styles.helpButton, stylesHook.helpButton]} onPress={handleOnHelpPress}>
          <Icon size={20} name="help" type="octaicon" color={colors.foregroundColor} />
          <Text style={[styles.helpButtonText, stylesHook.helpButtonText]}>{loc.multisig.ms_help}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const footer = (
    <View style={styles.buttonBottom}>
      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <Button testID="CreateButton" title={loc.multisig.create} onPress={onCreate} disabled={cosigners.length !== n} />
      )}
    </View>
  );

  return (
    <View style={[styles.root, stylesHook.root]}>
      {renderHelp()}
      <View style={styles.wrapBox}>
        <FlatList data={data.current} renderItem={_renderKeyItem} keyExtractor={(_item, index) => `${index}`} />
      </View>

      {renderMnemonicsModal()}
      {renderProvideMnemonicsModal()}
      {renderCosignersXpubModal()}

      {footer}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 20,
  },
  wrapBox: {
    flex: 1,
    marginVertical: 24,
  },
  buttonBottom: {
    marginHorizontal: 20,
    flex: 0.12,
    marginBottom: 40,
    justifyContent: 'flex-end',
  },
  itemKeyUnprovidedWrapper: { flexDirection: 'row' },
  vaultKeyText: { fontSize: 18, fontWeight: 'bold' },
  vaultKeyTextWrapper: { justifyContent: 'center', alignItems: 'center', paddingLeft: 16 },
  textDestination: { fontWeight: '600' },
  modalContent: {
    paddingHorizontal: 22,
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
  },
  multiLineTextInput: {
    minHeight: 200,
  },
  modalFooterBottomPadding: { padding: 26 },
  vaultKeyCircleSuccess: {
    width: 42,
    height: 42,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  word: {
    width: 'auto',
    marginRight: 8,
    marginBottom: 8,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 8,
    paddingRight: 8,
    borderRadius: 4,
  },
  askPassprase: {
    marginLeft: 32,
    justifyContent: 'center',
    width: 33,
    height: 33,
    borderRadius: 33 / 2,
  },
  secretContainer: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
  },
  wordText: {
    fontWeight: 'bold',
  },
  headerText: { fontSize: 15, color: '#13244D' },
  qrContainer: {
    alignItems: 'center',
  },
  helpButtonWrapper: {
    alignItems: 'flex-end',
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
  },
  helpButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 50,
    flexDirection: 'row',
  },
  helpButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default WalletsAddMultisigStep2;

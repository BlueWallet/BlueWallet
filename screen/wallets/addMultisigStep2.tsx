import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RouteProp, useFocusEffect, useLocale, useRoute } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  InteractionManager,
  Keyboard,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon } from '@rneui/themed';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { encodeUR } from '../../blue_modules/ur';
import { BlueFormMultiInput, BlueTextCentered } from '../../BlueComponents';
import { HDSegwitBech32Wallet, MultisigCosigner, MultisigHDWallet } from '../../class';
import presentAlert from '../../components/Alert';
import BottomModal, { BottomModalHandle } from '../../components/BottomModal';
import Button from '../../components/Button';
import QRCodeComponent from '../../components/QRCodeComponent';
import { useTheme } from '../../components/themes';
import confirm from '../../helpers/confirm';
import prompt from '../../helpers/prompt';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import ToolTipMenu from '../../components/TooltipMenu';
import { CommonToolTipActions } from '../../typings/CommonToolTipActions';
import { useSettings } from '../../hooks/context/useSettings';
import { useKeyboard } from '../../hooks/useKeyboard';
import {
  DoneAndDismissKeyboardInputAccessory,
  DoneAndDismissKeyboardInputAccessoryViewID,
} from '../../components/DoneAndDismissKeyboardInputAccessory';
import Clipboard from '@react-native-clipboard/clipboard';
import MultipleStepsListItem, {
  MultipleStepsListItemButtonType,
  MultipleStepsListItemDashType,
} from '../../components/MultipleStepsListItem';
import { AddressInputScanButton } from '../../components/AddressInputScanButton';
import { useScreenProtect } from '../../hooks/useScreenProtect';
import { BlueSpacing10, BlueSpacing20 } from '../../components/BlueSpacing';
import { AddWalletStackParamList } from '../../navigation/AddWalletStack';

const staticCache: Record<string, string> = {};
type CosignerEntry = [key: string, fingerprint?: string, path?: string, passphrase?: string];

const WalletsAddMultisigStep2 = () => {
  const { addAndSaveWallet, sleep, currentSharedCosigner, setSharedCosigner } = useStorage();
  const { enableScreenProtect, disableScreenProtect } = useScreenProtect();
  const { colors } = useTheme();

  const navigation = useExtendedNavigation();
  const params = useRoute<RouteProp<AddWalletStackParamList, 'WalletsAddMultisigStep2'>>().params;
  const { m, n, format, walletLabel } = params;
  const [cosigners, setCosigners] = useState<CosignerEntry[]>([]); // array of cosigners user provided. if format [cosigner, fp, path]
  const [isLoading, setIsLoading] = useState(false);
  const mnemonicsModalRef = useRef<BottomModalHandle | null>(null);
  const provideMnemonicsModalRef = useRef<BottomModalHandle | null>(null);
  const renderCosignersXpubModalRef = useRef<BottomModalHandle | null>(null);
  const [cosignerXpub, setCosignerXpub] = useState(''); // string used in exportCosigner()
  const [cosignerXpubURv2, setCosignerXpubURv2] = useState(''); // string displayed in renderCosignersXpubModal()
  const [cosignerXpubFilename, setCosignerXpubFilename] = useState('bw-cosigner.bwcosigner');
  const [vaultKeyData, setVaultKeyData] = useState({ keyIndex: 1, xpub: '', seed: '', isLoading: false }); // string rendered in modal
  const [importText, setImportText] = useState('');
  const [askPassphrase, setAskPassphrase] = useState(false);
  const { isPrivacyBlurEnabled, isElectrumDisabled } = useSettings();
  const data = useRef(new Array(n));
  const { isVisible } = useKeyboard();
  const { direction } = useLocale();

  useFocusEffect(
    useCallback(() => {
      if (isPrivacyBlurEnabled) {
        enableScreenProtect();
      }
      return () => {
        disableScreenProtect();
      };
    }, [isPrivacyBlurEnabled, enableScreenProtect, disableScreenProtect]),
  );

  useEffect(() => {
    console.log(currentSharedCosigner);
    if (currentSharedCosigner) {
      (async function () {
        if (await confirm(loc.multisig.shared_key_detected, loc.multisig.shared_key_detected_question)) {
          setImportText(currentSharedCosigner);
          provideMnemonicsModalRef.current?.present();
          setSharedCosigner('');
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSharedCosigner]);

  const handleOnHelpPress = async () => {
    navigation.navigate('WalletsAddMultisigHelp');
  };

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
    helpButtonWrapper: {
      flexDirection: direction === 'rtl' ? 'row' : 'row-reverse',
    },
    secretContainer: {
      flexDirection: direction === 'rtl' ? 'row-reverse' : 'row',
    },
  });

  const onCreate = async () => {
    setIsLoading(true);
    navigation.setOptions({ headerBackVisible: false });
    await sleep(100);
    try {
      await _onCreate(); // this can fail with "Duplicate fingerprint" error or other
    } catch (e: any) {
      setIsLoading(false);
      navigation.setOptions({ headerBackVisible: true });
      presentAlert({ message: e.message });
      console.log('create MS wallet error', e);
    }
  };

  const _onCreate = async () => {
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

    addAndSaveWallet(w);

    triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
    navigation.getParent()?.goBack();
  };

  const getPath = useCallback(() => {
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

  const setXpubCacheForMnemonics = useCallback(
    (seed: string, passphrase?: string) => {
      const path = getPath();
      const w = new MultisigHDWallet();
      w.setDerivationPath(path);
      staticCache[seed + path + passphrase] = w.convertXpubToMultisignatureXpub(MultisigHDWallet.seedToXpub(seed, path, passphrase));
      return staticCache[seed + path + passphrase];
    },
    [getPath],
  );

  const generateNewKey = () => {
    const w = new HDSegwitBech32Wallet();
    w.generate().then(() => {
      const cosignersCopy = [...cosigners];
      cosignersCopy.push([w.getSecret()]);
      if (Platform.OS !== 'android') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCosigners(cosignersCopy);
      setVaultKeyData({ keyIndex: cosignersCopy.length, seed: w.getSecret(), xpub: w.getXpub(), isLoading: false });
      setIsLoading(true);
      mnemonicsModalRef.current?.present();
      setTimeout(() => {
        // filling cache
        setXpubCacheForMnemonics(w.getSecret());
        setFpCacheForMnemonics(w.getSecret());
        setIsLoading(false);
      }, 500);
    });
  };

  const viewKey = (cosigner: CosignerEntry) => {
    if (MultisigHDWallet.isXpubValid(cosigner[0])) {
      const fingerprint = cosigner[1];
      const path = cosigner[2];

      if (!fingerprint || !path) {
        presentAlert({ message: 'Cosigner data incomplete. Cannot display Xpub.' });
        return;
      }

      setCosignerXpub(MultisigCosigner.exportToJson(fingerprint, cosigner[0], path));
      setCosignerXpubURv2(encodeUR(MultisigCosigner.exportToJson(fingerprint, cosigner[0], path), 175, null)[0]);
      setCosignerXpubFilename('bw-cosigner-' + cosigner[1] + '.bwcosigner');
      renderCosignersXpubModalRef.current?.present();
    } else {
      const path = getPath();

      const xpub = getXpubCacheForMnemonics(cosigner[0], cosigner[3]);
      const fp = getFpCacheForMnemonics(cosigner[0], cosigner[3]);
      setCosignerXpub(MultisigCosigner.exportToJson(fp, xpub, path));
      setCosignerXpubURv2(encodeUR(MultisigCosigner.exportToJson(fp, xpub, path), 175, null)[0]);
      setCosignerXpubFilename('bw-cosigner-' + fp + '.bwcosigner');
      renderCosignersXpubModalRef.current?.present();
    }
  };

  const getXpubCacheForMnemonics = useCallback(
    (seed: string, passphrase?: string) => {
      const path = getPath();
      return staticCache[seed + path + passphrase] || setXpubCacheForMnemonics(seed, passphrase);
    },
    [getPath, setXpubCacheForMnemonics],
  );

  const getFpCacheForMnemonics = (seed: string, passphrase?: string) => {
    return staticCache[seed + (passphrase ?? '')] || setFpCacheForMnemonics(seed, passphrase);
  };

  const setFpCacheForMnemonics = (seed: string, passphrase?: string) => {
    staticCache[seed + (passphrase ?? '')] = MultisigHDWallet.mnemonicToFingerprint(seed, passphrase);
    return staticCache[seed + (passphrase ?? '')];
  };

  const iHaveMnemonics = () => {
    provideMnemonicsModalRef.current?.present();
  };

  const tryUsingXpub = useCallback(
    async (xpub: string, fp?: string, path?: string) => {
      if (!MultisigHDWallet.isXpubForMultisig(xpub)) {
        setIsLoading(false);
        setImportText('');
        setAskPassphrase(false);
        presentAlert({ message: loc.multisig.not_a_multisignature_xpub });
        return;
      }
      if (fp) {
        //  do nothing, it's already set
      } else {
        try {
          fp = await prompt(loc.multisig.input_fp, loc.multisig.input_fp_explain, true, 'plain-text');
          fp = (fp + '').toUpperCase();
          if (!MultisigHDWallet.isFpValid(fp)) fp = '00000000';
        } catch (e) {
          return setIsLoading(false);
        }
      }
      if (path) {
        //  do nothing, it's already set
      } else {
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

      setIsLoading(false);
      setImportText('');
      setAskPassphrase(false);

      const cosignersCopy = [...cosigners];
      cosignersCopy.push([xpub, fp, path]);
      if (Platform.OS !== 'android') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCosigners(cosignersCopy);
    },
    [cosigners, getPath],
  );

  const isValidMnemonicSeed = (mnemonicSeed: string) => {
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(mnemonicSeed);
    return hd.validateMnemonic();
  };

  const onBarScanned = useCallback(
    async (ret: string | { data: string }) => {
      let returnedData = typeof ret === 'string' ? ret : ret.data;

      try {
        let retData = JSON.parse(returnedData);
        if (Array.isArray(retData) && retData.length === 1) {
          // UR:CRYPTO-ACCOUNT now parses as an array of accounts, even if it is just one,
          // so in case of cosigner data its gona be an array of 1 cosigner account. lets pop it for
          // the code that expects it
          retData = retData.pop();
          returnedData = JSON.stringify(retData);
        }
      } catch (e) {
        console.debug('JSON parsing failed for returnedData:', e);
      }

      if (returnedData.toUpperCase().startsWith('UR')) {
        presentAlert({ message: 'BC-UR not decoded. This should never happen' });
      } else if (isValidMnemonicSeed(returnedData)) {
        setImportText(returnedData);
        setTimeout(async () => {
          await provideMnemonicsModalRef.current?.present();
        }, 100);
      } else {
        if (MultisigHDWallet.isXpubValid(returnedData) && !MultisigHDWallet.isXpubForMultisig(returnedData)) {
          return presentAlert({ message: loc.multisig.not_a_multisignature_xpub });
        }
        if (MultisigHDWallet.isXpubValid(returnedData)) {
          return tryUsingXpub(returnedData);
        }
        let cosigner = new MultisigCosigner(returnedData);
        if (!cosigner.isValid()) {
          return presentAlert({ message: loc.multisig.invalid_cosigner });
        }

        if (cosigner.howManyCosignersWeHave() > 1) {
          // lets look for the correct cosigner. thats probably gona be the one with specific corresponding path,
          // for example m/48'/0'/0'/2' if user chose to setup native segwit in BW
          for (const cc of cosigner.getAllCosigners()) {
            switch (format) {
              case MultisigHDWallet.FORMAT_P2WSH:
                if (cc.getPath().startsWith('m/48') && cc.getPath().endsWith("/2'")) {
                  // found it
                  cosigner = cc;
                }
                break;
              case MultisigHDWallet.FORMAT_P2SH_P2WSH:
              case MultisigHDWallet.FORMAT_P2SH_P2WSH_ALT:
                if (cc.getPath().startsWith('m/48') && cc.getPath().endsWith("/1'")) {
                  // found it
                  cosigner = cc;
                }
                break;
              case MultisigHDWallet.FORMAT_P2SH:
                if (cc.getPath().startsWith('m/45')) {
                  // found it
                  cosigner = cc;
                }
                break;
              default:
                console.error('Unexpected format:', format);
                throw new Error('This should never happen');
            }
          }
        }

        for (const existingCosigner of cosigners) {
          let existingXpub = existingCosigner[0];
          if (!MultisigHDWallet.isXpubValid(existingXpub)) {
            // derive the xpub from mnemonic-based cosigner
            existingXpub = getXpubCacheForMnemonics(existingCosigner[0], existingCosigner[3]);
          }
          if (existingXpub === cosigner.getXpub()) {
            return presentAlert({ message: loc.multisig.this_cosigner_is_already_imported });
          }
        }
        // now, validating that cosigner is in correct format:

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
          return presentAlert({ message: loc.formatString(loc.multisig.invalid_cosigner_format, { format }) });
        }
        const cosignersCopy = [...cosigners];
        cosignersCopy.push([cosigner.getXpub(), cosigner.getFp(), cosigner.getPath()]);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setCosigners(cosignersCopy);
      }
    },
    [cosigners, format, getXpubCacheForMnemonics, tryUsingXpub],
  );

  const utilizeMnemonicPhrase = useCallback(async () => {
    try {
      await provideMnemonicsModalRef.current?.dismiss();
    } catch {}
    setIsLoading(true);

    if (MultisigHDWallet.isXpubValid(importText)) {
      return tryUsingXpub(importText);
    }
    try {
      const jsonText = JSON.parse(importText);
      let fp;
      let path;
      if (jsonText.xpub) {
        if (jsonText.xfp) {
          fp = jsonText.xfp;
        }
        if (jsonText.path) {
          path = jsonText.path;
        }
        return tryUsingXpub(jsonText.xpub, fp, path);
      }
    } catch {}
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(importText);
    if (!hd.validateMnemonic()) {
      setIsLoading(false);
      return presentAlert({ message: loc.multisig.invalid_mnemonics });
    }

    let passphrase;
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
    cosignersCopy.push([hd.getSecret(), undefined, undefined, passphrase]);
    if (Platform.OS !== 'android') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCosigners(cosignersCopy);

    setIsLoading(false);
    setImportText('');
    setAskPassphrase(false);
  }, [askPassphrase, cosigners, importText, tryUsingXpub]);

  useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
      const scannedData = params.onBarScanned;
      if (scannedData) {
        onBarScanned(scannedData);
        navigation.setParams({ onBarScanned: undefined });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, params.onBarScanned]);

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
  }) => {
    if (isChecked) {
      if (index === lastIndex) {
        return MultipleStepsListItemDashType.None;
      } else {
        return MultipleStepsListItemDashType.TopAndBottom;
      }
    } else {
      if (index === lastIndex) {
        return isFocus ? MultipleStepsListItemDashType.TopAndBottom : MultipleStepsListItemDashType.Top;
      } else {
        return MultipleStepsListItemDashType.TopAndBottom;
      }
    }
  };

  const _renderKeyItem = (el: { index: number }) => {
    const renderProvideKeyButtons = el.index === cosigners.length;
    const isChecked = el.index < cosigners.length;
    return (
      <View>
        <MultipleStepsListItem
          circledText={String(el.index + 1)}
          leftText={loc.formatString(loc.multisig.vault_key, { number: el.index + 1 })}
          dashes={dashType({ index: el.index, lastIndex: data.current.length - 1, isChecked, isFocus: renderProvideKeyButtons })}
          checked={isChecked}
          rightButton={{
            disabled: vaultKeyData.isLoading,
            text: loc.multisig.share,
            onPress: () => {
              viewKey(cosigners[el.index]);
            },
          }}
        />
        {renderProvideKeyButtons && (
          <>
            <MultipleStepsListItem
              showActivityIndicator={vaultKeyData.keyIndex === el.index && vaultKeyData.isLoading}
              button={{
                buttonType: MultipleStepsListItemButtonType.Full,
                onPress: () => {
                  setVaultKeyData({ keyIndex: el.index, xpub: '', seed: '', isLoading: true });
                  generateNewKey();
                },
                text: loc.multisig.create_new_key,
                disabled: vaultKeyData.isLoading,
              }}
              dashes={MultipleStepsListItemDashType.TopAndBottom}
              checked={isChecked}
            />
            <MultipleStepsListItem
              button={{
                testID: 'VaultCosignerImport' + String(el.index + 1),
                onPress: iHaveMnemonics,
                buttonType: MultipleStepsListItemButtonType.Full,
                text: loc.wallets.import_do_import,
                disabled: vaultKeyData.isLoading,
              }}
              dashes={el.index === data.current.length - 1 ? MultipleStepsListItemDashType.Top : MultipleStepsListItemDashType.TopAndBottom}
              checked={isChecked}
            />
          </>
        )}
      </View>
    );
  };

  const renderSecret = (entries: string[]) => {
    const component = [];
    const entriesObject = entries.entries();
    for (const [index, secret] of entriesObject) {
      if (entries.length > 1) {
        const text = `${index + 1}. ${secret}  `;
        component.push(
          <View style={[styles.word, stylesHook.word]} key={`${secret}${index}`}>
            <Text style={[styles.wordText, stylesHook.wordText]} textBreakStrategy="simple">
              {text}
            </Text>
          </View>,
        );
      } else {
        const text = `${secret}  `;
        component.push(
          <View style={[styles.word, stylesHook.word]} key={`${secret}${index}`}>
            <Text style={[styles.wordText, stylesHook.wordText]} textBreakStrategy="simple">
              {text}
            </Text>
          </View>,
        );
      }
    }
    return component;
  };

  const dismissMnemonicsModal = async () => {
    await mnemonicsModalRef.current?.dismiss();
  };

  const renderMnemonicsModal = () => {
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
            {isLoading ? <ActivityIndicator /> : <Button title={loc.send.success_done} onPress={dismissMnemonicsModal} />}
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
        <View style={[styles.secretContainer, stylesHook.secretContainer]}>{renderSecret(vaultKeyData.seed.split(' '))}</View>
        <BlueSpacing20 />
      </BottomModal>
    );
  };

  const toolTipActions = useMemo(() => {
    const passphrase = CommonToolTipActions.Passphrase;
    passphrase.menuState = askPassphrase;
    return [passphrase];
  }, [askPassphrase]);

  const renderProvideMnemonicsModal = () => {
    const opacity = isVisible ? 0 : 1;
    return (
      <BottomModal
        footer={
          <View style={[styles.modalFooterBottomPadding, { opacity }]}>
            {isLoading ? (
              <ActivityIndicator />
            ) : (
              <>
                <Button
                  testID="DoImportKeyButton"
                  disabled={importText.trim().length === 0}
                  title={loc.wallets.import_do_import}
                  onPress={utilizeMnemonicPhrase}
                />
                <View style={styles.height16} />

                <AddressInputScanButton
                  beforePress={async () => {
                    await provideMnemonicsModalRef.current?.dismiss();
                  }}
                  testID="ScanOrOpenFile"
                  type="link"
                  isLoading={isLoading}
                  onChangeText={setImportText}
                />
              </>
            )}
          </View>
        }
        ref={provideMnemonicsModalRef}
        backgroundColor={colors.modal}
        contentContainerStyle={styles.provideMnemonicsModalStyle}
        isGrabberVisible={false}
        showCloseButton={true}
        sizes={['auto']}
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
            ios: (
              <DoneAndDismissKeyboardInputAccessory
                onClearTapped={() => setImportText('')}
                onPasteTapped={async () => {
                  const paste = await Clipboard.getString();
                  setImportText(paste);
                }}
              />
            ),
          })}

          <BlueSpacing20 />
        </View>
      </BottomModal>
    );
  };

  const hideCosignersXpubModal = () => {
    Keyboard.dismiss();
    renderCosignersXpubModalRef.current?.dismiss();
  };

  const renderCosignersXpubModal = () => {
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

  const renderHelp = () => {
    const opacity = isLoading ? 0.5 : 1;
    return (
      <View style={[styles.helpButtonWrapper, stylesHook.helpButtonWrapper]}>
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.helpButton, stylesHook.helpButton, { opacity }]}
          onPress={handleOnHelpPress}
          disabled={isLoading}
        >
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
        <FlatList data={data.current} renderItem={_renderKeyItem} keyExtractor={(_item, index) => `${index}`} extraData={cosigners} />
      </View>
      {renderMnemonicsModal()}

      {renderProvideMnemonicsModal()}

      {renderCosignersXpubModal()}
      {footer}
      <BlueSpacing20 />
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
  height16: {
    height: 16,
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
  modalFooterBottomPadding: { padding: 38 },
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
  askPassprase: { marginLeft: 32, justifyContent: 'center', width: 33, height: 33, borderRadius: 33 / 2 },

  secretContainer: {
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
  provideMnemonicsModalStyle: {
    minHeight: 420,
  },
});

export default WalletsAddMultisigStep2;

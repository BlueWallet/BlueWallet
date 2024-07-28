import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  I18nManager,
  Keyboard,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon } from '@rneui/themed';
import A from '../../blue_modules/analytics';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { encodeUR } from '../../blue_modules/ur';
import { BlueButtonLink, BlueFormMultiInput, BlueSpacing10, BlueSpacing20, BlueText, BlueTextCentered } from '../../BlueComponents';
import { HDSegwitBech32Wallet, MultisigCosigner, MultisigHDWallet } from '../../class';
import presentAlert from '../../components/Alert';
import BottomModal from '../../components/BottomModal';
import Button from '../../components/Button';
import MultipleStepsListItem, {
  MultipleStepsListItemButtohType,
  MultipleStepsListItemDashType,
} from '../../components/MultipleStepsListItem';
import QRCodeComponent from '../../components/QRCodeComponent';
import SaveFileButton from '../../components/SaveFileButton';
import { SquareButton } from '../../components/SquareButton';
import { useTheme } from '../../components/themes';
import confirm from '../../helpers/confirm';
import prompt from '../../helpers/prompt';
import usePrivacy from '../../hooks/usePrivacy';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { useSettings } from '../../hooks/context/useSettings';
import { scanQrHelper } from '../../helpers/scan-qr';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';

const staticCache = {};

const WalletsAddMultisigStep2 = () => {
  const { addWallet, saveToDisk, isElectrumDisabled, sleep, currentSharedCosigner, setSharedCosigner } = useStorage();
  const { isAdvancedModeEnabled } = useSettings();
  const { colors } = useTheme();

  const { navigate, navigateToWalletsList } = useExtendedNavigation();
  const { m, n, format, walletLabel } = useRoute().params;
  const { name } = useRoute();

  const [cosigners, setCosigners] = useState([]); // array of cosigners user provided. if format [cosigner, fp, path]
  const [isLoading, setIsLoading] = useState(false);
  const mnemonicsModalRef = useRef(null);
  const provideMnemonicsModalRef = useRef(null);
  const renderCosignersXpubModalRef = useRef(null);
  const [cosignerXpub, setCosignerXpub] = useState(''); // string used in exportCosigner()
  const [cosignerXpubURv2, setCosignerXpubURv2] = useState(''); // string displayed in renderCosignersXpubModal()
  const [cosignerXpubFilename, setCosignerXpubFilename] = useState('bw-cosigner.bwcosigner');
  const [vaultKeyData, setVaultKeyData] = useState({ keyIndex: 1, xpub: '', seed: '', isLoading: false }); // string rendered in modal
  const [importText, setImportText] = useState('');
  const [askPassphrase, setAskPassphrase] = useState(false);
  const openScannerButton = useRef();
  const data = useRef(new Array(n));
  const { enableBlur, disableBlur } = usePrivacy();

  useFocusEffect(
    useCallback(() => {
      enableBlur();
      return () => {
        disableBlur();
      };
    }, [disableBlur, enableBlur]),
  );

  useEffect(() => {
    console.log(currentSharedCosigner);
    if (currentSharedCosigner) {
      (async function () {
        if (await confirm(loc.multisig.shared_key_detected, loc.multisig.shared_key_detected_question)) {
          setImportText(currentSharedCosigner);
          provideMnemonicsModalRef.current.present();
          setSharedCosigner('');
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSharedCosigner]);

  const handleOnHelpPress = async () => {
    await dismissAllModals();
    navigate('WalletsAddMultisigHelp');
  };

  const dismissAllModals = async () => {
    try {
      await mnemonicsModalRef.current?.dismiss();
      await provideMnemonicsModalRef.current?.dismiss();
      await renderCosignersXpubModalRef.current?.dismiss();
    } catch (e) {
      // in rare occasions trying to dismiss non visible modals can error out
      console.debug('dismissAllModals error', e);
    }
  };

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
    textDestination: {
      color: colors.foregroundColor,
    },
    exportButton: {
      backgroundColor: colors.buttonDisabledBackgroundColor,
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

  const onCreate = async () => {
    setIsLoading(true);
    await sleep(100);
    try {
      await _onCreate(); // this can fail with "Duplicate fingerprint" error or other
    } catch (e) {
      setIsLoading(false);
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

    addWallet(w);
    await saveToDisk();
    A(A.ENUM.CREATED_WALLET);
    triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
    navigateToWalletsList();
  };

  const generateNewKey = () => {
    const w = new HDSegwitBech32Wallet();
    w.generate().then(() => {
      const cosignersCopy = [...cosigners];
      cosignersCopy.push([w.getSecret(), false, false]);
      if (Platform.OS !== 'android') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCosigners(cosignersCopy);
      setVaultKeyData({ keyIndex: cosignersCopy.length, seed: w.getSecret(), xpub: w.getXpub(), isLoading: false });
      setIsLoading(true);
      mnemonicsModalRef.current.present();
      setTimeout(() => {
        // filling cache
        setXpubCacheForMnemonics(w.getSecret());
        setFpCacheForMnemonics(w.getSecret());
        setIsLoading(false);
      }, 500);
    });
  };

  const getPath = () => {
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
  };

  const viewKey = cosigner => {
    if (MultisigHDWallet.isXpubValid(cosigner[0])) {
      setCosignerXpub(MultisigCosigner.exportToJson(cosigner[1], cosigner[0], cosigner[2]));
      setCosignerXpubURv2(encodeUR(MultisigCosigner.exportToJson(cosigner[1], cosigner[0], cosigner[2]))[0]);
      setCosignerXpubFilename('bw-cosigner-' + cosigner[1] + '.bwcosigner');
      renderCosignersXpubModalRef.current.present();
    } else {
      const path = getPath();

      const xpub = getXpubCacheForMnemonics(cosigner[0], cosigner[3]);
      const fp = getFpCacheForMnemonics(cosigner[0], cosigner[3]);
      setCosignerXpub(MultisigCosigner.exportToJson(fp, xpub, path));
      setCosignerXpubURv2(encodeUR(MultisigCosigner.exportToJson(fp, xpub, path))[0]);
      setCosignerXpubFilename('bw-cosigner-' + fp + '.bwcosigner');
      renderCosignersXpubModalRef.current.present();
    }
  };

  const getXpubCacheForMnemonics = (seed, passphrase) => {
    const path = getPath();
    return staticCache[seed + path + passphrase] || setXpubCacheForMnemonics(seed, passphrase);
  };

  const setXpubCacheForMnemonics = (seed, passphrase) => {
    const path = getPath();
    const w = new MultisigHDWallet();
    w.setDerivationPath(path);
    staticCache[seed + path + passphrase] = w.convertXpubToMultisignatureXpub(MultisigHDWallet.seedToXpub(seed, path, passphrase));
    return staticCache[seed + path + passphrase];
  };

  const getFpCacheForMnemonics = (seed, passphrase) => {
    return staticCache[seed + (passphrase ?? '')] || setFpCacheForMnemonics(seed, passphrase);
  };

  const setFpCacheForMnemonics = (seed, passphrase) => {
    staticCache[seed + (passphrase ?? '')] = MultisigHDWallet.mnemonicToFingerprint(seed, passphrase);
    return staticCache[seed + (passphrase ?? '')];
  };

  const iHaveMnemonics = () => {
    provideMnemonicsModalRef.current.present();
  };

  const tryUsingXpub = async (xpub, fp, path) => {
    if (!MultisigHDWallet.isXpubForMultisig(xpub)) {
      provideMnemonicsModalRef.current.dismiss();
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

    provideMnemonicsModalRef.current.dismiss();
    setIsLoading(false);
    setImportText('');
    setAskPassphrase(false);

    const cosignersCopy = [...cosigners];
    cosignersCopy.push([xpub, fp, path]);
    if (Platform.OS !== 'android') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCosigners(cosignersCopy);
  };

  const useMnemonicPhrase = async () => {
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
      } catch (e) {
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

    provideMnemonicsModalRef.current.dismiss();
    setIsLoading(false);
    setImportText('');
    setAskPassphrase(false);
  };

  const isValidMnemonicSeed = mnemonicSeed => {
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(mnemonicSeed);
    return hd.validateMnemonic();
  };

  const onBarScanned = ret => {
    if (!ret.data) ret = { data: ret };

    try {
      let retData = JSON.parse(ret.data);
      if (Array.isArray(retData) && retData.length === 1) {
        // UR:CRYPTO-ACCOUNT now parses as an array of accounts, even if it is just one,
        // so in case of cosigner data its gona be an array of 1 cosigner account. lets pop it for
        // the code that expects it
        retData = retData.pop();
        ret.data = JSON.stringify(retData);
      }
    } catch (_) {}

    if (ret.data.toUpperCase().startsWith('UR')) {
      presentAlert({ message: 'BC-UR not decoded. This should never happen' });
    } else if (isValidMnemonicSeed(ret.data)) {
      setImportText(ret.data);
      setTimeout(() => {
        provideMnemonicsModalRef.current.present().then(() => {});
      }, 100);
    } else {
      if (MultisigHDWallet.isXpubValid(ret.data) && !MultisigHDWallet.isXpubForMultisig(ret.data)) {
        return presentAlert({ message: loc.multisig.not_a_multisignature_xpub });
      }
      if (MultisigHDWallet.isXpubValid(ret.data)) {
        return tryUsingXpub(ret.data);
      }
      let cosigner = new MultisigCosigner(ret.data);
      if (!cosigner.isValid()) return presentAlert({ message: loc.multisig.invalid_cosigner });
      provideMnemonicsModalRef.current.dismiss();
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
        if (existingCosigner[0] === cosigner.getXpub()) return presentAlert({ message: loc.multisig.this_cosigner_is_already_imported });
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

      if (!correctFormat) return presentAlert({ message: loc.formatString(loc.multisig.invalid_cosigner_format, { format }) });

      const cosignersCopy = [...cosigners];
      cosignersCopy.push([cosigner.getXpub(), cosigner.getFp(), cosigner.getPath()]);
      if (Platform.OS !== 'android') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCosigners(cosignersCopy);
    }
  };

  const scanOrOpenFile = async () => {
    await provideMnemonicsModalRef.current.dismiss();
    const scanned = await scanQrHelper(name, true, undefined);
    onBarScanned({ data: scanned });
  };

  const dashType = ({ index, lastIndex, isChecked, isFocus }) => {
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

  const _renderKeyItem = el => {
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
                buttonType: MultipleStepsListItemButtohType.full,
                onPress: () => {
                  setVaultKeyData({ keyIndex: el.index, xpub: '', seed: '', isLoading: true });
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
                testID: 'VaultCosignerImport' + String(el.index + 1),
                onPress: iHaveMnemonics,
                buttonType: MultipleStepsListItemButtohType.full,
                text: loc.wallets.import_do_import,
                disabled: vaultKeyData.isLoading,
              }}
              dashes={el.index === data.current.length - 1 ? MultipleStepsListItemDashType.top : MultipleStepsListItemDashType.topAndBottom}
              checked={isChecked}
            />
          </>
        )}
      </View>
    );
  };

  const renderSecret = entries => {
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

  const renderMnemonicsModal = () => {
    return (
      <BottomModal
        ref={mnemonicsModalRef}
        isGrabberVisible={false}
        dismissible={false}
        showCloseButton={!isLoading}
        footerDefaultMargins
        backgroundColor={colors.modal}
        contentContainerStyle={styles.newKeyModalContent}
        footer={
          <View style={styles.modalFooterBottomPadding}>
            {isLoading ? (
              <ActivityIndicator />
            ) : (
              <Button title={loc.send.success_done} onPress={() => mnemonicsModalRef.current.dismiss()} />
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

  const renderProvideMnemonicsModal = () => {
    return (
      <BottomModal
        footerDefaultMargins
        footer={
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
        }
        ref={provideMnemonicsModalRef}
        backgroundColor={colors.modal}
        isGrabberVisible={false}
        contentContainerStyle={styles.modalContent}
        onDismiss={() => {
          Keyboard.dismiss();
          setImportText('');
          setAskPassphrase(false);
        }}
      >
        <BlueTextCentered>{loc.multisig.type_your_mnemonics}</BlueTextCentered>
        <BlueSpacing20 />
        <BlueFormMultiInput value={importText} onChangeText={setImportText} />
        {isAdvancedModeEnabled && (
          <>
            <BlueSpacing10 />
            <View style={styles.row}>
              <BlueText>{loc.wallets.import_passphrase}</BlueText>
              <Switch testID="AskPassphrase" value={askPassphrase} onValueChange={setAskPassphrase} />
            </View>
          </>
        )}
      </BottomModal>
    );
  };

  const exportCosignerBeforeOnPress = () => {
    setIsLoading(true);
  };

  const exportCosignerAfterOnPress = () => {
    setIsLoading(false);
  };

  const hideCosignersXpubModal = () => {
    Keyboard.dismiss();
    renderCosignersXpubModalRef.current.dismiss();
  };

  const renderCosignersXpubModal = () => {
    return (
      <BottomModal
        onClose={hideCosignersXpubModal}
        ref={renderCosignersXpubModalRef}
        backgroundColor={colors.modal}
        footerDefaultMargins
        contentContainerStyle={[styles.modalContent, styles.alignItemsCenter]}
        footer={
          <View style={styles.modalFooterBottomPadding}>
            {isLoading ? (
              <ActivityIndicator />
            ) : (
              <SaveFileButton
                style={[styles.exportButton, stylesHook.exportButton]}
                fileName={cosignerXpubFilename}
                fileContent={cosignerXpub}
                beforeOnPress={exportCosignerBeforeOnPress}
                afterOnPress={exportCosignerAfterOnPress}
              >
                <SquareButton title={loc.multisig.share} />
              </SaveFileButton>
            )}
          </View>
        }
      >
        <Text style={[styles.headerText, stylesHook.textDestination]}>
          {loc.multisig.this_is_cosigners_xpub} {Platform.OS === 'ios' ? loc.multisig.this_is_cosigners_xpub_airdrop : ''}
        </Text>
        <BlueSpacing20 />
        <QRCodeComponent value={cosignerXpubURv2} size={260} />
        <BlueSpacing20 />
      </BottomModal>
    );
  };

  const renderHelp = () => {
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
    justifyContent: 'center',
    minHeight: 450,
  },
  newKeyModalContent: {
    paddingHorizontal: 22,
    justifyContent: 'center',
    minHeight: 450,
  },
  modalFooterBottomPadding: { paddingBottom: 26 },
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
  secretContainer: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
  },
  wordText: {
    fontWeight: 'bold',
  },
  exportButton: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  headerText: { fontSize: 15, color: '#13244D' },
  alignItemsCenter: { alignItems: 'center' },
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    justifyContent: 'space-between',
  },
});

export default WalletsAddMultisigStep2;

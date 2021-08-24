/* global alert */
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  I18nManager,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  findNodeHandle,
} from 'react-native';
import { Icon } from 'react-native-elements';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import { getSystemName } from 'react-native-device-info';
import QRCode from 'react-native-qrcode-svg';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

import {
  BlueButton,
  BlueButtonLink,
  BlueFormMultiInput,
  BlueSpacing10,
  BlueSpacing20,
  BlueSpacing40,
  BlueTextCentered,
} from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import { HDSegwitBech32Wallet, MultisigCosigner, MultisigHDWallet } from '../../class';
import loc from '../../loc';
import { SquareButton } from '../../components/SquareButton';
import BottomModal from '../../components/BottomModal';
import MultipleStepsListItem, {
  MultipleStepsListItemButtohType,
  MultipleStepsListItemDashType,
} from '../../components/MultipleStepsListItem';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { encodeUR } from '../../blue_modules/ur';

const prompt = require('../../blue_modules/prompt');
const A = require('../../blue_modules/analytics');
const fs = require('../../blue_modules/fs');
const isDesktop = getSystemName() === 'Mac OS X';
const staticCache = {};
const BlueElectrum = require('../../blue_modules/BlueElectrum');

const WalletsAddMultisigStep2 = () => {
  const { addWallet, saveToDisk } = useContext(BlueStorageContext);
  const { colors } = useTheme();

  const navigation = useNavigation();
  const { m, n, format, walletLabel } = useRoute().params;

  const [cosigners, setCosigners] = useState([]); // array of cosigners user provided. if format [cosigner, fp, path]
  const [isLoading, setIsLoading] = useState(false);
  const [isMnemonicsModalVisible, setIsMnemonicsModalVisible] = useState(false);
  const [isProvideMnemonicsModalVisible, setIsProvideMnemonicsModalVisible] = useState(false);
  const [isRenderCosignersXpubModalVisible, setIsRenderCosignersXpubModalVisible] = useState(false);
  const [cosignerXpub, setCosignerXpub] = useState(''); // string used in exportCosigner()
  const [cosignerXpubURv2, setCosignerXpubURv2] = useState(''); // string displayed in renderCosignersXpubModal()
  const [cosignerXpubFilename, setCosignerXpubFilename] = useState('bw-cosigner.json');
  const [vaultKeyData, setVaultKeyData] = useState({ keyIndex: 1, xpub: '', seed: '', isLoading: false }); // string rendered in modal
  const [importText, setImportText] = useState('');
  const [isElectrumDisabled, setIsElectrumDisabled] = useState(true);
  const openScannerButton = useRef();
  const data = useRef(new Array(n));
  const hasUnsavedChanges = Boolean(cosigners.length > 0 && cosigners.length !== n);
  const isDiscardConfirmAlertPresented = useRef(false);
  const handleOnHelpPress = () => {
    navigation.navigate('WalletsAddMultisigHelp');
  };

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
    textBtc: {
      color: colors.buttonAlternativeTextColor,
    },
    textDestinationFirstFour: {
      color: colors.buttonAlternativeTextColor,
    },
    textBtcUnitValue: {
      color: colors.buttonAlternativeTextColor,
    },
    textDestination: {
      color: colors.foregroundColor,
    },
    modalContentShort: {
      backgroundColor: colors.modal,
    },
    modalContent: {
      backgroundColor: colors.modal,
    },
    textFiat: {
      color: colors.alternativeTextColor,
    },
    provideKeyButton: {
      backgroundColor: colors.buttonDisabledBackgroundColor,
    },
    exportButton: {
      backgroundColor: colors.buttonDisabledBackgroundColor,
    },
    provideKeyButtonText: {
      color: colors.buttonTextColor,
    },
    vaultKeyCircle: {
      backgroundColor: colors.buttonDisabledBackgroundColor,
    },
    vaultKeyText: {
      color: colors.alternativeTextColor,
    },
    feeFiatText: {
      color: colors.alternativeTextColor,
    },
    vaultKeyCircleSuccess: {
      backgroundColor: colors.msSuccessBG,
    },
    vaultKeyTextSigned: {
      color: colors.msSuccessBG,
    },
    word: {
      backgroundColor: colors.inputBackgroundColor,
    },
    wordText: {
      color: colors.labelText,
    },
    headerText: {
      color: colors.foregroundColor,
    },
    helpButton: {
      backgroundColor: colors.buttonDisabledBackgroundColor,
    },
    helpButtonText: {
      color: colors.foregroundColor,
    },
  });

  const onCreate = () => {
    setIsLoading(true);
    setTimeout(_onCreate, 100);
  };

  useEffect(() => {
    BlueElectrum.isDisabled().then(setIsElectrumDisabled);
  }, []);
  useEffect(() => {
    navigation.addListener('beforeRemove', e => {
      if (e.data.action.type === 'POP' && hasUnsavedChanges) {
        e.preventDefault();

        // Prompt the user before leaving the screen
        if (isDiscardConfirmAlertPresented.current === false) {
          isDiscardConfirmAlertPresented.current = true;
          Alert.alert(loc._.discard_changes, loc._.discard_changes_detail, [
            {
              text: loc._.cancel,
              style: 'cancel',
              onPress: () => {
                isDiscardConfirmAlertPresented.current = false;
              },
            },
            {
              text: loc._.ok,
              style: 'destructive',
              // If the user confirmed, then we dispatch the action we blocked earlier
              // This will continue the action that had triggered the removal of the screen
              onPress: () => navigation.dispatch(e.data.action),
            },
          ]);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, hasUnsavedChanges, cosigners]);

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
        throw new Error('This should never happen');
    }
    for (const cc of cosigners) {
      const fp = cc[1] || getFpCacheForMnemonics(cc[0]);
      w.addCosigner(cc[0], fp, cc[2]);
    }
    w.setLabel(walletLabel);
    if (!isElectrumDisabled) {
      await w.fetchBalance();
    }

    addWallet(w);
    await saveToDisk();
    A(A.ENUM.CREATED_WALLET);
    ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
    navigation.dangerouslyGetParent().goBack();
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
      setIsMnemonicsModalVisible(true);

      // filling cache
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
        throw new Error('This should never happen');
    }
    return path;
  };

  const viewKey = cosigner => {
    if (MultisigHDWallet.isXpubValid(cosigner[0])) {
      setCosignerXpub(MultisigCosigner.exportToJson(cosigner[1], cosigner[0], cosigner[2]));
      setCosignerXpubURv2(encodeUR(MultisigCosigner.exportToJson(cosigner[1], cosigner[0], cosigner[2]))[0]);
      setCosignerXpubFilename('bw-cosigner-' + cosigner[1] + '.json');
      setIsRenderCosignersXpubModalVisible(true);
    } else {
      const path = getPath();

      const xpub = getXpubCacheForMnemonics(cosigner[0]);
      const fp = getFpCacheForMnemonics(cosigner[0]);
      setCosignerXpub(MultisigCosigner.exportToJson(fp, xpub, path));
      setCosignerXpubURv2(encodeUR(MultisigCosigner.exportToJson(fp, xpub, path))[0]);
      setCosignerXpubFilename('bw-cosigner-' + fp + '.json');
      setIsRenderCosignersXpubModalVisible(true);
    }
  };

  const getXpubCacheForMnemonics = seed => {
    const path = getPath();
    return staticCache[seed + path] || setXpubCacheForMnemonics(seed);
  };

  const setXpubCacheForMnemonics = seed => {
    const path = getPath();
    const w = new MultisigHDWallet();
    w.setDerivationPath(path);
    staticCache[seed + path] = w.convertXpubToMultisignatureXpub(MultisigHDWallet.seedToXpub(seed, path));
    return staticCache[seed + path];
  };

  const getFpCacheForMnemonics = seed => {
    return staticCache[seed] || setFpCacheForMnemonics(seed);
  };

  const setFpCacheForMnemonics = seed => {
    staticCache[seed] = MultisigHDWallet.mnemonicToFingerprint(seed);
    return staticCache[seed];
  };

  const iHaveMnemonics = () => {
    setIsProvideMnemonicsModalVisible(true);
  };

  const tryUsingXpub = async xpub => {
    if (!MultisigHDWallet.isXpubForMultisig(xpub)) {
      setIsProvideMnemonicsModalVisible(false);
      setIsLoading(false);
      setImportText('');
      alert(loc.multisig.not_a_multisignature_xpub);
      return;
    }
    let fp = await prompt(loc.multisig.input_fp, loc.multisig.input_fp_explain, false, 'plain-text');
    fp = (fp + '').toUpperCase();
    if (!MultisigHDWallet.isFpValid(fp)) fp = '00000000';

    let path = await prompt(
      loc.multisig.input_path,
      loc.formatString(loc.multisig.input_path_explain, { default: getPath() }),
      false,
      'plain-text',
    );
    if (!MultisigHDWallet.isPathValid(path)) path = getPath();

    setIsProvideMnemonicsModalVisible(false);
    setIsLoading(false);
    setImportText('');

    const cosignersCopy = [...cosigners];
    cosignersCopy.push([xpub, fp, path]);
    if (Platform.OS !== 'android') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCosigners(cosignersCopy);
  };

  const useMnemonicPhrase = () => {
    setIsLoading(true);

    if (MultisigHDWallet.isXpubValid(importText)) {
      return tryUsingXpub(importText);
    }
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(importText);
    if (!hd.validateMnemonic()) {
      setIsLoading(false);
      return alert(loc.multisig.invalid_mnemonics);
    }

    const cosignersCopy = [...cosigners];
    cosignersCopy.push([hd.getSecret(), false, false]);
    if (Platform.OS !== 'android') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCosigners(cosignersCopy);

    setIsProvideMnemonicsModalVisible(false);
    setIsLoading(false);
    setImportText('');
  };

  const isValidMnemonicSeed = mnemonicSeed => {
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(mnemonicSeed);
    return hd.validateMnemonic();
  };

  const onBarScanned = ret => {
    if (!isDesktop) navigation.dangerouslyGetParent().pop();
    if (!ret.data) ret = { data: ret };
    if (ret.data.toUpperCase().startsWith('UR')) {
      alert('BC-UR not decoded. This should never happen');
    } else if (isValidMnemonicSeed(ret.data)) {
      setIsProvideMnemonicsModalVisible(true);
      setImportText(ret.data);
    } else {
      if (MultisigHDWallet.isXpubValid(ret.data) && !MultisigHDWallet.isXpubForMultisig(ret.data)) {
        return alert(loc.multisig.not_a_multisignature_xpub);
      }
      if (MultisigHDWallet.isXpubValid(ret.data)) {
        return tryUsingXpub(ret.data);
      }
      let cosigner = new MultisigCosigner(ret.data);
      if (!cosigner.isValid()) return alert(loc.multisig.invalid_cosigner);
      setIsProvideMnemonicsModalVisible(false);
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
              throw new Error('This should never happen');
          }
        }
      }

      for (const existingCosigner of cosigners) {
        if (existingCosigner[0] === cosigner.getXpub()) return alert(loc.multisig.this_cosigner_is_already_imported);
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
          throw new Error('This should never happen');
      }

      if (!correctFormat) return alert(loc.formatString(loc.multisig.invalid_cosigner_format, { format }));

      const cosignersCopy = [...cosigners];
      cosignersCopy.push([cosigner.getXpub(), cosigner.getFp(), cosigner.getPath()]);
      if (Platform.OS !== 'android') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCosigners(cosignersCopy);
    }
  };

  const scanOrOpenFile = () => {
    if (isDesktop) {
      fs.showActionSheet({ anchor: findNodeHandle(openScannerButton.current) }).then(onBarScanned);
    } else {
      setIsProvideMnemonicsModalVisible(false);
      navigation.navigate('ScanQRCodeRoot', {
        screen: 'ScanQRCode',
        params: {
          onBarScanned: onBarScanned,
          showFileImportButton: true,
        },
      });
    }
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
          circledText={`${el.index + 1}`}
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
      <BottomModal isVisible={isMnemonicsModalVisible} onClose={Keyboard.dismiss}>
        <View style={[styles.newKeyModalContent, stylesHook.modalContent]}>
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
          {isLoading ? (
            <ActivityIndicator />
          ) : (
            <BlueButton title={loc.send.success_done} onPress={() => setIsMnemonicsModalVisible(false)} />
          )}
        </View>
      </BottomModal>
    );
  };

  const hideProvideMnemonicsModal = () => {
    Keyboard.dismiss();
    setIsProvideMnemonicsModalVisible(false);
    setImportText('');
  };

  const renderProvideMnemonicsModal = () => {
    return (
      <BottomModal isVisible={isProvideMnemonicsModalVisible} onClose={hideProvideMnemonicsModal}>
        <KeyboardAvoidingView enabled={!Platform.isPad} behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={[styles.modalContent, stylesHook.modalContent]}>
            <BlueTextCentered>{loc.multisig.type_your_mnemonics}</BlueTextCentered>
            <BlueSpacing20 />
            <BlueFormMultiInput value={importText} onChangeText={setImportText} />
            <BlueSpacing40 />
            {isLoading ? (
              <ActivityIndicator />
            ) : (
              <BlueButton disabled={importText.trim().length === 0} title={loc.wallets.import_do_import} onPress={useMnemonicPhrase} />
            )}
            <BlueButtonLink ref={openScannerButton} disabled={isLoading} onPress={scanOrOpenFile} title={loc.wallets.import_scan_qr} />
          </View>
        </KeyboardAvoidingView>
      </BottomModal>
    );
  };

  const exportCosigner = () => {
    setIsLoading(true);
    fs.writeFileAndExport(cosignerXpubFilename, cosignerXpub).finally(() => setIsLoading(false));
  };

  const hideCosignersXpubModal = () => {
    Keyboard.dismiss();
    setIsRenderCosignersXpubModalVisible(false);
  };

  const renderCosignersXpubModal = () => {
    return (
      <BottomModal isVisible={isRenderCosignersXpubModalVisible} onClose={hideCosignersXpubModal}>
        <KeyboardAvoidingView enabled={!Platform.isPad} behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={[styles.modalContent, stylesHook.modalContent, styles.alignItemsCenter]}>
            <Text style={[styles.headerText, stylesHook.textDestination]}>{loc.multisig.this_is_cosigners_xpub}</Text>
            <BlueSpacing20 />
            <View style={styles.qrCodeContainer}>
              <QRCode
                value={cosignerXpubURv2}
                size={260}
                color="#000000"
                logoBackgroundColor={colors.brandingColor}
                backgroundColor="#FFFFFF"
                ecl="H"
              />
            </View>
            <BlueSpacing20 />
            <View style={styles.squareButtonWrapper}>
              {isLoading ? (
                <ActivityIndicator />
              ) : (
                <SquareButton style={[styles.exportButton, stylesHook.exportButton]} onPress={exportCosigner} title={loc.multisig.share} />
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
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
      {isLoading ? <ActivityIndicator /> : <BlueButton title={loc.multisig.create} onPress={onCreate} disabled={cosigners.length !== n} />}
    </View>
  );

  return (
    <View style={[styles.root, stylesHook.root]}>
      <StatusBar barStyle="light-content" />

      {renderHelp()}
      <View style={[styles.wrapBox]}>
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
  mainBlock: {
    height: '100%',
    marginHorizontal: 20,
    marginVertical: 24,
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
  vaultKeyCircle: {
    width: 42,
    height: 42,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vaultKeyText: { fontSize: 18, fontWeight: 'bold' },
  vaultKeyTextWrapper: { justifyContent: 'center', alignItems: 'center', paddingLeft: 16 },
  provideKeyButton: {
    marginTop: 4,
    marginLeft: 40,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  grayButton: {
    marginTop: 24,
    marginLeft: 40,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginVertical: 24,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  provideKeyButtonText: { fontWeight: '600', fontSize: 15 },
  textDestination: { fontWeight: '600' },
  modalContent: {
    paddingHorizontal: 22,
    paddingVertical: 32,
    justifyContent: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    minHeight: 400,
  },
  newKeyModalContent: {
    paddingHorizontal: 22,
    paddingBottom: 60,
    paddingTop: 50,
    justifyContent: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
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
  vaultKeyTextSignedWrapper: { justifyContent: 'center', alignItems: 'center', paddingLeft: 16 },
  vaultKeyTextSigned: { fontSize: 18, fontWeight: 'bold' },
  exportButton: {
    height: 48,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  headerText: { fontSize: 15, color: '#13244D' },
  header2Text: { color: '#9AA0AA', fontSize: 14, paddingBottom: 20 },
  alignItemsCenter: { alignItems: 'center' },
  squareButtonWrapper: { height: 50, width: 250 },
  qrCodeContainer: { borderWidth: 6, borderRadius: 8, borderColor: '#FFFFFF' },

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

WalletsAddMultisigStep2.navigationOptions = navigationStyle({
  headerTitle: null,
  gestureEnabled: false,
  swipeEnabled: false,
});

export default WalletsAddMultisigStep2;

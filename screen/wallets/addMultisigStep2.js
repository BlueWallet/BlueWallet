import React, { useContext, useRef, useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  I18nManager,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Alert,
} from 'react-native';
import { Icon, Image } from 'react-native-elements';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { BlueButtonLink, BlueFormMultiInput, BlueSpacing10, BlueSpacing20, BlueText, BlueTextCentered } from '../../BlueComponents';
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
import QRCodeComponent from '../../components/QRCodeComponent';
import presentAlert from '../../components/Alert';
import confirm from '../../helpers/confirm';
import { scanQrHelper } from '../../helpers/scan-qr';
import { useTheme } from '../../components/themes';
import Button from '../../components/Button';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import usePrivacy from '../../hooks/usePrivacy';
import prompt from '../../helpers/prompt';
import A from '../../blue_modules/analytics';
import SaveFileButton from '../../components/SaveFileButton';
import { useSettings } from '../../components/Context/SettingsContext';
import { P2PClient, P2PHost, P2PSession } from 'react-native-p2p-secure';
import OTPTextView from 'react-native-otp-textinput';
import { openSettings } from 'react-native-permissions';

const staticCache = {};
// TODO: Permissions for network access
const WalletsAddMultisigStep2 = () => {
  const { addWallet, saveToDisk, isElectrumDisabled, sleep, currentSharedCosigner, setSharedCosigner } = useContext(BlueStorageContext);
  const { isAdvancedModeEnabled } = useSettings();
  const { colors } = useTheme();

  const navigation = useNavigation();
  const { m, n, format, walletLabel } = useRoute().params;
  const { name } = useRoute();

  const [cosigners, setCosigners] = useState([]); // array of cosigners user provided. if format [cosigner, fp, path]
  const [isLoading, setIsLoading] = useState(false);
  const [isMnemonicsModalVisible, setIsMnemonicsModalVisible] = useState(false);
  const [isProvideMnemonicsModalVisible, setIsProvideMnemonicsModalVisible] = useState(false);
  const [isRenderCosignersXpubModalVisible, setIsRenderCosignersXpubModalVisible] = useState(false);
  const [cosignerXpub, setCosignerXpub] = useState(''); // string used in exportCosigner()
  const [cosignerXpubURv2, setCosignerXpubURv2] = useState(''); // string displayed in renderCosignersXpubModal()
  const [cosignerXpubFilename, setCosignerXpubFilename] = useState('bw-cosigner.bwcosigner');
  const [vaultKeyData, setVaultKeyData] = useState({ keyIndex: 1, xpub: '', seed: '', isLoading: false }); // string rendered in modal
  const [importText, setImportText] = useState('');
  const [askPassphrase, setAskPassphrase] = useState(false);
  const openScannerButton = useRef();
  const data = useRef(new Array(n));
  const { enableBlur, disableBlur } = usePrivacy();

  const [showP2PModal, setShowP2PModal] = useState(false);
  const [showP2PHostModal, setShowP2PHostModal] = useState(false);
  const [showP2PJoinModal, setShowP2PJoinModal] = useState(false);
  const [p2pUsername, setP2PUsername] = useState('');
  const [p2pSession, setP2PSession] = useState(null);
  const [p2pClient, setP2PClient] = useState(null);
  const [p2pHost, setP2PHost] = useState(null);

  const [p2pConnected, setP2PConnected] = useState(false);
  const [p2pDone, setP2PDone] = useState(false);
  const [p2pSharedKeys, setP2PSharedKeys] = useState([]);

  const [connectedNeighbors, setConnectedNeighbors] = useState([]);

  const [sessions, setSessions] = useState([]);
  const [connectingToSession, setConnectingToSession] = useState(false);
  const [p2pHostConnected, setP2PHostConnected] = useState(false);

  const p2pPasscode = useRef(null);

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
          setIsProvideMnemonicsModalVisible(true);
          setSharedCosigner('');
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSharedCosigner]);

  useEffect(() => {
    P2PSession.create('bluewallet').then(session => {
      setP2PSession(session);
    });
  }, []);

  // adding first shared cosigner and triggering the rest of the process
  useEffect(() => {
    if (p2pSharedKeys.length === n - 1) {
      const key = p2pSharedKeys.pop();
      onBarScanned({ data: key });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p2pSharedKeys]);

  // adding cosigners one by one to the vault
  useEffect(() => {
    if (p2pSharedKeys.length > 0) {
      const key = p2pSharedKeys.pop();
      onBarScanned({ data: key });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cosigners]);

  const handleOnHelpPress = () => {
    navigation.navigate('WalletsAddMultisigHelp');
  };

  const handleOnP2PPress = () => {
    if (cosigners.length === 0) {
      Alert.alert(loc.errors.error, loc.multisig.p2p_error_no_key);
    } else if (cosigners.length !== 1) {
      Alert.alert(loc.errors.error, loc.multisig.p2p_error_too_many_keys, [
        { text: loc.multisig.p2p_clear, onPress: () => setCosigners([]), style: 'destructive' },
        { text: loc._.cancel },
      ]);
    } else if (cosigners.every(c => MultisigHDWallet.isXpubValid(c[0]))) {
      Alert.alert(loc.multisig.p2p_warning, loc.multisig.p2p_warning_text, [
        { text: loc.multisig.p2p_clear, onPress: () => setCosigners([]), style: 'destructive' },
        { text: loc._.continue, onPress: () => setShowP2PModal(true) },
        { text: loc._.cancel },
      ]);
    } else {
      setShowP2PModal(true);
    }
  };

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
    textDestination: {
      color: colors.foregroundColor,
    },
    modalContent: {
      backgroundColor: colors.modal,
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
    headerButton: {
      backgroundColor: colors.buttonDisabledBackgroundColor,
    },
    headerButtonText: {
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
    navigation.getParent().goBack();
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

  const viewKey = (cosigner, showXpubModal = true) => {
    if (MultisigHDWallet.isXpubValid(cosigner[0])) {
      setCosignerXpub(MultisigCosigner.exportToJson(cosigner[1], cosigner[0], cosigner[2]));
      setCosignerXpubURv2(encodeUR(MultisigCosigner.exportToJson(cosigner[1], cosigner[0], cosigner[2]))[0]);
      setCosignerXpubFilename('bw-cosigner-' + cosigner[1] + '.bwcosigner');
    } else {
      const path = getPath();

      const xpub = getXpubCacheForMnemonics(cosigner[0], cosigner[3]);
      const fp = getFpCacheForMnemonics(cosigner[0], cosigner[3]);
      setCosignerXpub(MultisigCosigner.exportToJson(fp, xpub, path));
      setCosignerXpubURv2(encodeUR(MultisigCosigner.exportToJson(fp, xpub, path))[0]);
      setCosignerXpubFilename('bw-cosigner-' + fp + '.bwcosigner');
    }
    if (showXpubModal) {
      setIsRenderCosignersXpubModalVisible(true);
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
    setIsProvideMnemonicsModalVisible(true);
  };

  const tryUsingXpub = async (xpub, fp, path) => {
    if (!MultisigHDWallet.isXpubForMultisig(xpub)) {
      setIsProvideMnemonicsModalVisible(false);
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

    setIsProvideMnemonicsModalVisible(false);
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

    setIsProvideMnemonicsModalVisible(false);
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
      setIsProvideMnemonicsModalVisible(true);
      setImportText(ret.data);
    } else {
      if (MultisigHDWallet.isXpubValid(ret.data) && !MultisigHDWallet.isXpubForMultisig(ret.data)) {
        return presentAlert({ message: loc.multisig.not_a_multisignature_xpub });
      }
      if (MultisigHDWallet.isXpubValid(ret.data)) {
        return tryUsingXpub(ret.data);
      }
      let cosigner = new MultisigCosigner(ret.data);
      if (!cosigner.isValid()) return presentAlert({ message: loc.multisig.invalid_cosigner });
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
          throw new Error('This should never happen');
      }

      if (!correctFormat) return presentAlert({ message: loc.formatString(loc.multisig.invalid_cosigner_format, { format }) });

      const cosignersCopy = [...cosigners];
      cosignersCopy.push([cosigner.getXpub(), cosigner.getFp(), cosigner.getPath()]);
      if (Platform.OS !== 'android') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCosigners(cosignersCopy);
    }
  };

  const scanOrOpenFile = () => {
    setIsProvideMnemonicsModalVisible(false);
    InteractionManager.runAfterInteractions(async () => {
      const scanned = await scanQrHelper(navigation.navigate, name, true);
      onBarScanned({ data: scanned });
    });
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
          {isLoading ? <ActivityIndicator /> : <Button title={loc.send.success_done} onPress={() => setIsMnemonicsModalVisible(false)} />}
        </View>
      </BottomModal>
    );
  };

  const hideProvideMnemonicsModal = () => {
    Keyboard.dismiss();
    setIsProvideMnemonicsModalVisible(false);
    setImportText('');
    setAskPassphrase(false);
  };

  const renderProvideMnemonicsModal = () => {
    return (
      <BottomModal isVisible={isProvideMnemonicsModalVisible} onClose={hideProvideMnemonicsModal}>
        <KeyboardAvoidingView enabled={!Platform.isPad} behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={[styles.modalContent, stylesHook.modalContent]}>
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
            <BlueSpacing20 />
            {isLoading ? (
              <ActivityIndicator />
            ) : (
              <Button
                testID="DoImportKeyButton"
                disabled={importText.trim().length === 0}
                title={loc.wallets.import_do_import}
                onPress={useMnemonicPhrase}
              />
            )}
            <BlueButtonLink
              testID="ScanOrOpenFile"
              ref={openScannerButton}
              disabled={isLoading}
              onPress={scanOrOpenFile}
              title={loc.wallets.import_scan_qr}
            />
          </View>
        </KeyboardAvoidingView>
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
    setIsRenderCosignersXpubModalVisible(false);
  };

  const renderCosignersXpubModal = () => {
    return (
      <BottomModal isVisible={isRenderCosignersXpubModalVisible} onClose={hideCosignersXpubModal}>
        <KeyboardAvoidingView enabled={!Platform.isPad} behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={[styles.modalContent, stylesHook.modalContent, styles.alignItemsCenter]}>
            <Text style={[styles.headerText, stylesHook.textDestination]}>
              {loc.multisig.this_is_cosigners_xpub} {Platform.OS === 'ios' ? loc.multisig.this_is_cosigners_xpub_airdrop : ''}
            </Text>
            <BlueSpacing20 />
            <QRCodeComponent value={cosignerXpubURv2} size={260} />
            <BlueSpacing20 />
            <View style={styles.squareButtonWrapper}>
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
          </View>
        </KeyboardAvoidingView>
      </BottomModal>
    );
  };

  const hideP2PModal = () => {
    Keyboard.dismiss();
    setShowP2PModal(false);
    hideP2PHostModal();
    hideP2PJoinModal();
  };

  const hideP2PHostModal = () => {
    Keyboard.dismiss();
    setShowP2PHostModal(false);
    p2pHost ? p2pHost.destroy() : null;
    setP2PHost(null);
    setP2PConnected(false);
    setP2PDone(false);
    setConnectedNeighbors([]);
    setP2PSharedKeys([]);
  };

  const hideP2PJoinModal = () => {
    Keyboard.dismiss();
    setShowP2PJoinModal(false);
    p2pClient ? p2pClient.destroy() : null;
    setP2PClient(null);
    p2pPasscode.current = null;
    setSessions([]);
    setConnectingToSession(false);
    setP2PHostConnected(false);
    setP2PConnected(false);
    setP2PDone(false);
    setP2PSharedKeys([]);
  };

  const initP2PSession = session => {
    session.onNodeEvent('node-message', (sender, message) => {
      setP2PSharedKeys(_p2pSharedKeys => [..._p2pSharedKeys, message]);
    });
  };

  const startHostP2PSession = () => {
    p2pUsername ? p2pSession.setIdentifier(p2pUsername) : null;
    const server = new P2PHost(p2pSession);
    setP2PHost(server);

    server.on('coordinator-connected', neighbor => {
      setConnectedNeighbors(_connectedNeighbors =>
        _connectedNeighbors.map(_n => {
          if (_n.username === neighbor) {
            return { ..._n, connected: true, connecting: false };
          }
          return _n;
        }),
      );
    });
    server.on('coordinator-disconnected', neighbor => {
      setConnectedNeighbors(_connectedNeighbors =>
        _connectedNeighbors.map(_n => {
          if (_n.username === neighbor) {
            return { ..._n, disconnected: true };
          }
          return _n;
        }),
      );
    });
    server.on('coordinator-reconnected', neighbor => {
      setConnectedNeighbors(_connectedNeighbors =>
        _connectedNeighbors.map(_n => {
          if (_n.username === neighbor) {
            return { ..._n, disconnected: false };
          }
          return _n;
        }),
      );
    });
    server.on('coordinator-connection-start', neighbor => {
      setConnectedNeighbors(_connectedNeighbors => _connectedNeighbors.filter(_n => _n.username !== neighbor));
      setConnectedNeighbors(_connectedNeighbors => [
        ..._connectedNeighbors,
        { username: neighbor, connected: false, connecting: true, disconnected: false },
      ]);
    });
    server.on('coordinator-connection-fail', (neighbor, error) => {
      setConnectedNeighbors(_connectedNeighbors => _connectedNeighbors.filter(_n => _n.username !== neighbor));
    });
    server.on('session-started', () => {
      setP2PConnected(true);
      const interval = setInterval(() => {
        const neighbors = server.getNeighborStatus();
        if (neighbors.length === n - 1 && neighbors.every(_n => _n.status === 'connected')) {
          const cosigner = cosigners[0];
          const path = getPath();
          const xpub = getXpubCacheForMnemonics(cosigner[0], cosigner[3]);
          const fp = getFpCacheForMnemonics(cosigner[0], cosigner[3]);
          const payload = MultisigCosigner.exportToJson(fp, xpub, path);
          // console.log('startHostP2PSession', 'server sending message', JSON.stringify(payload));
          server.broadcastMessage(payload);
          clearInterval(interval);
          setP2PDone(true);
        }
      }, 1000);
    });

    server.start();
    setShowP2PHostModal(true);

    initP2PSession(server);
  };

  const startClientP2PSession = () => {
    p2pUsername ? p2pSession.setIdentifier(p2pUsername) : null;
    const client = new P2PClient(p2pSession);
    setP2PClient(client);
    client.on('discovery-service-list-update', updatedSessions => {
      setSessions(_sessions => [...updatedSessions]);
    });
    client.on('session-started', () => {
      setP2PConnected(true);
      const interval = setInterval(() => {
        const neighbors = client.getNeighborStatus();
        if (neighbors.length === n - 1 && neighbors.every(_n => _n.status === 'connected')) {
          const cosigner = cosigners[0];
          const path = getPath();
          const xpub = getXpubCacheForMnemonics(cosigner[0], cosigner[3]);
          const fp = getFpCacheForMnemonics(cosigner[0], cosigner[3]);
          const payload = MultisigCosigner.exportToJson(fp, xpub, path);
          // console.log('startClientP2pSession', 'server sending message', JSON.stringify(payload));
          client.broadcastMessage(payload);
          clearInterval(interval);
          setP2PDone(true);
        }
      }, 1000);
    });
    client.on('coordinator-error', error => {
      Alert.alert(loc.errors.error, error);
      setConnectingToSession(false);
      setP2PHostConnected(false);
    });
    client.on('coordinator-disconnected', () => {
      setConnectingToSession(false);
      setP2PHostConnected(false);
    });
    client.on('coordinator-authenticated', () => {
      setConnectingToSession(false);
      setP2PHostConnected(true);
    });
    client.start();
    setShowP2PJoinModal(true);

    initP2PSession(client);
  };

  const renderP2PModal = () => {
    const homeView = p2pSession ? (
      <View>
        <View style={styles.p2pImageContainer}>
          <Image source={require('../../img/addWallet/peer-to-peer.png')} style={styles.p2pImage} />
        </View>
        <BlueSpacing20 />
        <Text style={[styles.textDestination, stylesHook.textDestination]}>{loc.multisig.p2p_general_desc}</Text>
        <BlueSpacing20 />
        <Text style={[styles.textDestination, stylesHook.textDestination]}>{loc.multisig.p2p_username_guidance}</Text>
        <BlueSpacing20 />
        <TextInput
          placeholder={p2pSession.getIdentifier()}
          value={p2pUsername}
          style={styles.p2pTextInput}
          onChangeText={text => setP2PUsername(text)}
        />
        <BlueSpacing20 />
        <Button title={loc.multisig.p2p_host_button} onPress={() => startHostP2PSession()} />
        <BlueSpacing20 />
        <Button title={loc.multisig.p2p_join_button} onPress={() => startClientP2PSession()} />
        <BlueSpacing20 />
        <Text style={[styles.headerText, stylesHook.headerText]}>
          * {loc.multisig.p2p_permissions_text}{' '}
          <Text style={[styles.textDestination, stylesHook.textDestination]} onPress={() => openSettings()}>
            {loc.multisig.p2p_go_to_settings}
          </Text>
        </Text>
      </View>
    ) : (
      <View>
        <ActivityIndicator size={100} />
        <Text style={[styles.textDestination, stylesHook.textDestination]}>{loc.multisig.creating_p2p}</Text>
      </View>
    );

    const hostView = p2pHost ? (
      <View>
        <Icon style={styles.p2pBackChevron} name="chevron-left" onPress={() => hideP2PHostModal()} />
        <View style={styles.p2pImageContainer}>
          <Image source={require('../../img/addWallet/peer-to-peer.png')} style={styles.p2pImage} />
        </View>
        <Text style={[styles.textDestination, stylesHook.textDestination]}>{loc.multisig.p2p_host_description}</Text>
        <BlueSpacing20 />
        <Text style={[styles.textDestination, stylesHook.textDestination]}>{loc.multisig.p2p_username_title}: </Text>
        <TextInput editable={false} style={styles.p2pTextInput} value={p2pSession.getIdentifier()} />
        <BlueSpacing20 />
        <Text style={[styles.textDestination, stylesHook.textDestination]}>{loc.multisig.p2p_session_passcode}: </Text>
        <OTPTextView
          inputCount={6}
          tintColor="#007aff"
          offTintColor="#007aff"
          editable={false}
          defaultValue={p2pHost.getSessionPasscode()}
          keyboardType="numeric"
          textInputStyle={styles.p2pTextInput}
        />
        <Text style={[styles.headerText, stylesHook.headerText]}>{loc.multisig.p2p_share_passcode_session}</Text>
        <BlueSpacing20 />
        {p2pDone ? (
          <View>
            <Text style={[styles.textDestination, stylesHook.textDestination]}>{loc.multisig.p2p_key_share_success_message}</Text>
            <BlueSpacing20 />
            <Button title={loc.multisig.p2p_done} onPress={() => hideP2PModal()} />
          </View>
        ) : !p2pConnected ? (
          <View>
            <Text style={[styles.textDestination, stylesHook.textDestination]}>{loc.multisig.p2p_peers_connected_title}: </Text>
            <FlatList
              style={styles.p2pList}
              ListEmptyComponent={
                <View style={styles.p2pLoadingListContainer}>
                  <ActivityIndicator size={100} />
                  <Text style={[styles.textDestination, stylesHook.textDestination]}>{loc.multisig.p2p_no_peers_connected}</Text>
                </View>
              }
              data={connectedNeighbors}
              renderItem={({ item }) => (
                <View style={styles.p2pListItem}>
                  <Text style={styles.p2pListItemText}>{item.username}</Text>
                  {item.disconnected ? (
                    <Text>❌</Text>
                  ) : item.connecting ? (
                    <ActivityIndicator size="small" color="#000000" />
                  ) : item.connected ? (
                    <Text>✅</Text>
                  ) : (
                    <Text>❌</Text>
                  )}
                </View>
              )}
              keyExtractor={item => item.username}
              extraData={connectedNeighbors}
            />
            <Button
              disabled={connectedNeighbors.filter(item => item.connected).length !== n - 1}
              title={loc.multisig.p2p_start_key_transfer}
              onPress={() => {
                p2pHost.startP2PSession();
              }}
            />
          </View>
        ) : (
          <View style={styles.p2pLoadingListContainer}>
            <ActivityIndicator size={100} />
            <Text style={[styles.textDestination, stylesHook.textDestination]}>{loc.multisig.p2p_sharing_keys_message}</Text>
          </View>
        )}
      </View>
    ) : (
      <View>
        <ActivityIndicator size={100} />
        <Text style={[styles.textDestination, stylesHook.textDestination]}>{loc.multisig.p2p_host_creating_session}</Text>
      </View>
    );

    const joinView = p2pClient ? (
      <View>
        <Icon style={styles.p2pBackChevron} name="chevron-left" onPress={() => hideP2PJoinModal()} />
        <View style={styles.p2pImageContainer}>
          <Image source={require('../../img/addWallet/peer-to-peer.png')} style={styles.p2pImage} />
        </View>
        <Text style={[styles.textDestination, stylesHook.textDestination]}>{loc.multisig.p2p_join_description}</Text>
        <BlueSpacing20 />
        <Text style={[styles.textDestination, stylesHook.textDestination]}>{loc.multisig.p2p_username_title}: </Text>
        <TextInput editable={false} style={styles.p2pTextInput} value={p2pSession.getIdentifier()} />
        <BlueSpacing20 />

        {p2pDone ? (
          <View>
            <Text style={[styles.textDestination, stylesHook.textDestination]}>{loc.multisig.p2p_key_share_success_message}</Text>
            <BlueSpacing20 />
            <Button title={loc.multisig.p2p_done} onPress={() => hideP2PModal()} />
          </View>
        ) : p2pConnected ? (
          <View style={styles.p2pLoadingListContainer}>
            <ActivityIndicator size={100} />
            <Text style={[styles.textDestination, stylesHook.textDestination]}>{loc.multisig.p2p_sharing_keys_message}</Text>
          </View>
        ) : p2pHostConnected ? (
          <View style={styles.alignItemsCenter}>
            <ActivityIndicator size={50} />
            <Text style={[styles.textDestination, stylesHook.textDestination]}>{loc.multisig.p2p_connected_to_host_message}</Text>
          </View>
        ) : !connectingToSession ? (
          <View>
            <Text style={[styles.textDestination, stylesHook.textDestination]}>{loc.multisig.p2p_session_passcode}: </Text>
            <OTPTextView
              ref={p2pPasscode}
              inputCount={6}
              tintColor="#007aff"
              handleTextChange={text => {
                if (text.length === 6) {
                  p2pPasscode.current = text;
                }
              }}
              keyboardType="numeric"
              textInputStyle={styles.p2pTextInput}
            />
            <Text style={[styles.headerText, stylesHook.headerText]}>{loc.multisig.p2p_passcode_explanation}</Text>
            <BlueSpacing20 />
            <Text style={[styles.textDestination, stylesHook.textDestination]}>{loc.multisig.p2p_available_sessions_title}: </Text>
            <FlatList
              data={sessions}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.p2pListItem}
                  onPress={() => {
                    if (p2pPasscode.current.length !== 6) {
                      Alert.alert(loc.errors.error, loc.multisig.enter_p2p_passcode_provided_error);
                      return;
                    }
                    setConnectingToSession(true);
                    p2pClient.connectSession(item, p2pPasscode.current).catch(error => {
                      console.log(error);
                    });
                  }}
                >
                  <Text style={styles.p2pListItemText}>{item}</Text>
                </TouchableOpacity>
              )}
              keyExtractor={item => item}
              extraData={sessions}
            />
            <View style={styles.p2pLoadingListContainer}>
              <ActivityIndicator size={50} />
              <Text style={[styles.textDestination, stylesHook.textDestination]}>{loc.multisig.looking_for_p2p}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.alignItemsCenter}>
            <ActivityIndicator size={50} />
            <Text style={[styles.textDestination, stylesHook.textDestination]}>{loc.multisig.joining_p2p}</Text>
          </View>
        )}
      </View>
    ) : (
      <View>
        <ActivityIndicator size={100} />
        <Text style={[styles.textDestination, stylesHook.textDestination]}>{loc.multisig.creating_p2p}</Text>
      </View>
    );

    return (
      <BottomModal isVisible={showP2PModal} onClose={() => hideP2PModal()}>
        <View style={[styles.modalContent, stylesHook.modalContent]}>
          {showP2PHostModal ? hostView : showP2PJoinModal ? joinView : homeView}
        </View>
      </BottomModal>
    );
  };

  const renderHeaderButtons = () => {
    return (
      <View style={styles.headerButtonsWrapper}>
        <TouchableOpacity accessibilityRole="button" style={[styles.headerButton, stylesHook.headerButton]} onPress={handleOnHelpPress}>
          <Icon size={20} name="help" type="octaicon" color={colors.foregroundColor} />
          <Text style={[styles.headerButtonText, stylesHook.headerButtonText]}>{loc.multisig.ms_help}</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={[styles.headerButton, stylesHook.headerButton]} onPress={handleOnP2PPress}>
          <Icon size={20} name="people" type="octaicon" color={colors.foregroundColor} />
          <Text style={[styles.headerButtonText, stylesHook.headerButtonText]}>{loc.multisig.p2p_title}</Text>
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
      {renderHeaderButtons()}
      <View style={styles.wrapBox}>
        <FlatList data={data.current} renderItem={_renderKeyItem} keyExtractor={(_item, index) => `${index}`} />
      </View>
      {renderMnemonicsModal()}

      {renderProvideMnemonicsModal()}

      {renderCosignersXpubModal()}

      {renderP2PModal()}
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
  exportButton: {
    height: 48,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  headerText: { fontSize: 15, color: '#13244D' },
  alignItemsCenter: { alignItems: 'center' },
  squareButtonWrapper: { height: 50, width: 250 },
  headerButtonsWrapper: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
  },
  headerButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 50,
    flexDirection: 'row',
  },
  headerButtonText: {
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
  p2pImageContainer: { justifyContent: 'center', flexDirection: 'row' },
  p2pImage: { width: 100, height: 100, alignSelf: 'center' },
  p2pBackChevron: { alignSelf: 'flex-start', fontSize: 30 },
  p2pTextInput: { height: 40, borderColor: 'gray', borderWidth: 1, borderRadius: 5, padding: 10 },
  p2pList: {
    maxHeight: 150,
    minHeight: 150,
    marginVertical: 10,
    borderRadius: 5,
    paddingHorizontal: 10,
    shadowColor: '#000',
  },
  p2pLoadingListContainer: { justifyContent: 'center', alignItems: 'center', flexDirection: 'column' },
  p2pListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    backgroundColor: '#eef0f4',
    borderRadius: 5,
    marginVertical: 5,
  },
  p2pListItemText: {
    fontSize: 16,
    padding: 10,
    marginVertical: 5,
  },
});

WalletsAddMultisigStep2.navigationOptions = navigationStyle({
  title: null,
  gestureEnabled: false,
  swipeEnabled: false,
});

export default WalletsAddMultisigStep2;

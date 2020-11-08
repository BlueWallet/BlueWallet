/* global alert */
import React, { useContext, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BlueButton,
  BlueButtonLinkHook,
  BlueFormMultiInput,
  BlueLoadingHook,
  BlueNavigationStyle,
  BlueSpacing10,
  BlueSpacing20,
  BlueSpacing40,
  BlueTextCenteredHooks,
} from '../../BlueComponents';
import { Icon } from 'react-native-elements';
import { HDSegwitBech32Wallet, MultisigCosigner, MultisigHDWallet } from '../../class';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import loc from '../../loc';
import Modal from 'react-native-modal';
import { getSystemName } from 'react-native-device-info';
import ImagePicker from 'react-native-image-picker';
import ScanQRCode from '../send/ScanQRCode';
import QRCode from 'react-native-qrcode-svg';
import { SquareButton } from '../../components/SquareButton';
import MultipleStepsListItem, {
  MultipleStepsListItemButtohType,
  MultipleStepsListItemDashType,
} from '../../components/MultipleStepsListItem';
import Clipboard from '@react-native-community/clipboard';
import showPopupMenu from 'react-native-popup-menu-android';
import ToolTip from 'react-native-tooltip';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { BlueStorageContext } from '../../blue_modules/storage-context';

const A = require('../../blue_modules/analytics');
const fs = require('../../blue_modules/fs');
const isDesktop = getSystemName() === 'Mac OS X';
const LocalQRCode = require('@remobile/react-native-qrcode-local-image');
const staticCache = {};

const WalletsAddMultisigStep2 = () => {
  const { addWallet, saveToDisk, setNewWalletAdded } = useContext(BlueStorageContext);
  const { colors } = useTheme();

  const navigation = useNavigation();
  const { m, n, format } = useRoute().params;

  const [cosigners, setCosigners] = useState([]); // array of cosigners user provided. if format [cosigner, fp, path]
  const [isOnCreateButtonEnabled, setIsOnCreateButtonEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMnemonicsModalVisible, setIsMnemonicsModalVisible] = useState(false);
  const [isProvideMnemonicsModalVisible, setIsProvideMnemonicsModalVisible] = useState(false);
  const [isRenderCosignersXpubModalVisible, setIsRenderCosignersXpubModalVisible] = useState(false);
  const [cosignerXpub, setCosignerXpub] = useState(''); // string displayed in renderCosignersXpubModal()
  const [cosignerXpubFilename, setCosignerXpubFilename] = useState('bw-cosigner.json');
  const [vaultKeyData, setVaultKeyData] = useState({ keyIndex: 1, xpub: '', seed: '', isLoading: false }); // string rendered in modal
  const [importText, setImportText] = useState('');
  const tooltip = useRef();
  const data = useRef(new Array(n));

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
      backgroundColor: colors.elevated,
    },
    modalContent: {
      backgroundColor: colors.elevated,
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
  });

  const onCreate = async () => {
    setIsLoading(true);
    const w = new MultisigHDWallet();
    w.setM(m);
    switch (format) {
      case MultisigHDWallet.FORMAT_P2WSH:
        w.setNativeSegwit();
        w.setDerivationPath(MultisigHDWallet.PATH_NATIVE_SEGWIT);
        break;
      case MultisigHDWallet.FORMAT_P2SH_P2WSH:
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
      w.addCosigner(cc[0], cc[1], cc[2]);
    }
    w.setLabel('Multisig Vault');
    await w.fetchBalance();

    addWallet(w);
    await saveToDisk();
    setNewWalletAdded(true);
    A(A.ENUM.CREATED_WALLET);
    ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });

    navigation.dangerouslyGetParent().pop();
  };

  const generateNewKey = () => {
    const w = new HDSegwitBech32Wallet();
    w.generate().then(() => {
      const cosignersCopy = [...cosigners];
      cosignersCopy.push([w.getSecret(), false, false]);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCosigners(cosignersCopy);
      setVaultKeyData({ keyIndex: cosignersCopy.length, seed: w.getSecret(), xpub: w.getXpub(), isLoading: false });
      setIsMnemonicsModalVisible(true);
      if (cosignersCopy.length === n) setIsOnCreateButtonEnabled(true);
      // filling cache
      setTimeout(() => {
        // filling cache
        setXpubCacheForMnemonics(w.getSecret());
        setFpCacheForMnemonics(w.getSecret());
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
      setCosignerXpubFilename('bw-cosigner-' + cosigner[1] + '.json');
      setIsRenderCosignersXpubModalVisible(true);
    } else {
      const path = getPath();

      const xpub = getXpubCacheForMnemonics(cosigner[0]);
      const fp = getFpCacheForMnemonics(cosigner[0]);
      setCosignerXpub(MultisigCosigner.exportToJson(fp, xpub, path));
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
    staticCache[seed] = MultisigHDWallet.seedToFingerprint(seed);
    return staticCache[seed];
  };

  const iHaveMnemonics = () => {
    setIsProvideMnemonicsModalVisible(true);
  };

  const useMnemonicPhrase = () => {
    setIsLoading(true);
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(importText);
    if (!hd.validateMnemonic()) {
      setIsLoading(false);
      return alert(loc.multisig.invalid_mnemonics);
    }

    const cosignersCopy = [...cosigners];
    cosignersCopy.push([hd.getSecret(), false, false]);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCosigners(cosignersCopy);
    if (cosignersCopy.length === n) setIsOnCreateButtonEnabled(true);
    setIsProvideMnemonicsModalVisible(false);
    setIsLoading(false);
  };

  const onBarScanned = ret => {
    setIsProvideMnemonicsModalVisible(false);
    navigation.dangerouslyGetParent().pop();
    if (!ret.data) ret = { data: ret };
    if (ret.data.toUpperCase().startsWith('UR')) {
      alert('BC-UR not decoded. This should never happen');
    } else {
      let cosigner = new MultisigCosigner(ret.data);
      if (!cosigner.isValid()) return alert(loc.multisig.invalid_cosigner);

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
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCosigners(cosignersCopy);
      if (cosignersCopy.length === n) setIsOnCreateButtonEnabled(true);
    }
  };

  const scanOrOpenFile = () => {
    setIsProvideMnemonicsModalVisible(false);
    if (isDesktop) {
      ImagePicker.launchCamera(
        {
          title: null,
          mediaType: 'photo',
          takePhotoButtonTitle: null,
        },
        response => {
          if (response.uri) {
            const uri = Platform.OS === 'ios' ? response.uri.toString().replace('file://', '') : response.path.toString();
            LocalQRCode.decode(uri, (error, result) => {
              if (!error) {
                onBarScanned(result);
              } else {
                alert(loc.send.qr_error_no_qrcode);
              }
            });
          } else if (response.error) {
            ScanQRCode.presentCameraNotAuthorizedAlert(response.error);
          }
        },
      );
    } else {
      navigation.navigate('ScanQRCodeRoot', {
        screen: 'ScanQRCode',
        params: {
          onBarScanned: onBarScanned,
          showFileImportButton: true,
        },
      });
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
          dashes={
            el.index === data.length - 1
              ? isChecked
                ? MultipleStepsListItemDashType.top
                : renderProvideKeyButtons
                ? MultipleStepsListItemDashType.bottom
                : MultipleStepsListItemDashType.top
              : MultipleStepsListItemDashType.topAndBottom
          }
          checked={isChecked}
          rightButton={{
            disabled: vaultKeyData.isLoading,
            text: loc.multisig.view_key,
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
              dashes={el.index === data.length - 1 ? MultipleStepsListItemDashType.top : MultipleStepsListItemDashType.topAndBottom}
              checked={isChecked}
            />
          </>
        )}
      </View>
    );
  };

  const toolTipMenuOptions = () => {
    return Platform.select({
      // NOT WORKING ATM.
      // ios: [
      //   { text: this.state.wallet.hideBalance ? loc.transactions.details_balance_show : loc.transactions.details_balance_hide, onPress: this.handleBalanceVisibility },
      //   { text: loc.transactions.details_copy, onPress: this.handleCopyPress },
      // ],
      android: {
        id: 'copyXpub',
        label: loc.transactions.details_copy,
      },
    });
  };

  const showAndroidTooltip = () => {
    showPopupMenu(toolTipMenuOptions, handleToolTipSelection, vaultKeyData.xpub);
  };

  const handleToolTipSelection = () => {
    handleCopyPress();
  };

  const handleCopyPress = () => {
    Clipboard.setString(vaultKeyData.xpub);
  };

  const renderSecret = entries => {
    const component = [];
    const entriesObject = entries.entries();
    for (const [index, secret] of entriesObject) {
      if (entries.length > 1) {
        component.push(
          <View style={[styles.word, stylesHook.word]} key={`${secret}${index}`}>
            <Text style={[styles.wordText, stylesHook.wordText]}>
              {index + 1} . {secret}
            </Text>
          </View>,
        );
      } else {
        component.push(
          <TouchableOpacity
            style={[styles.word, stylesHook.word]}
            key={`${secret}${index}`}
            onLongPress={() => (Platform.OS === 'ios' ? tooltip.current.showMenu() : showAndroidTooltip())}
          >
            {Platform.OS === 'ios' && (
              <ToolTip
                ref={tooltip}
                actions={[
                  {
                    text: loc.transactions.details_copy,
                    onPress: () => handleCopyPress,
                  },
                ]}
              />
            )}
            <Text style={[styles.wordText, stylesHook.wordText]}>{secret}</Text>
          </TouchableOpacity>,
        );
      }
    }
    return component;
  };

  const renderMnemonicsModal = () => {
    return (
      <Modal isVisible={isMnemonicsModalVisible} style={styles.bottomModal} onBackdropPress={Keyboard.dismiss}>
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
          <BlueButton title={loc.send.success_done} onPress={() => setIsMnemonicsModalVisible(false)} />
        </View>
      </Modal>
    );
  };

  const renderProvideMnemonicsModal = () => {
    return (
      <Modal
        isVisible={isProvideMnemonicsModalVisible}
        style={styles.bottomModal}
        onBackdropPress={() => {
          Keyboard.dismiss();
          setIsProvideMnemonicsModalVisible(false);
          setImportText('');
        }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={[styles.modalContent, stylesHook.modalContent]}>
            <BlueTextCenteredHooks>{loc.multisig.type_your_mnemonics}</BlueTextCenteredHooks>
            <BlueSpacing20 />
            <BlueFormMultiInput value={importText} onChangeText={setImportText} />
            <BlueSpacing40 />
            {isLoading ? (
              <ActivityIndicator />
            ) : (
              <BlueButton disabled={importText.trim().length === 0} title={loc.wallets.import_do_import} onPress={useMnemonicPhrase} />
            )}
            <BlueButtonLinkHook disabled={isLoading} onPress={scanOrOpenFile} title={loc.wallets.import_scan_qr} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  const exportCosigner = () => {
    setIsLoading(true);
    fs.writeFileAndExport(cosignerXpubFilename, cosignerXpub).finally(() => setIsLoading(false));
  };

  const renderCosignersXpubModal = () => {
    return (
      <Modal
        isVisible={isRenderCosignersXpubModalVisible}
        style={styles.bottomModal}
        onBackdropPress={() => {
          Keyboard.dismiss();
          setIsRenderCosignersXpubModalVisible(false);
        }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={[styles.modalContent, stylesHook.modalContent, styles.alignItemsCenter]}>
            <Text style={[styles.headerText]}>{loc.multisig.this_is_cosigners_xpub}</Text>
            <BlueSpacing20 />
            <QRCode
              value={cosignerXpub}
              size={250}
              color="#000000"
              logoBackgroundColor={colors.brandingColor}
              backgroundColor="#FFFFFF"
              ecl="H"
            />

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
      </Modal>
    );
  };
  const footer = isLoading ? (
    <BlueLoadingHook />
  ) : (
    <View style={styles.buttonBottom}>
      <BlueButton title={loc.multisig.create} onPress={onCreate} disabled={!isOnCreateButtonEnabled} />
    </View>
  );

  return (
    <View style={[styles.root, stylesHook.root]}>
      <StatusBar barStyle="light-content" />
      <FlatList data={data.current} renderItem={_renderKeyItem} keyExtractor={(_item, index) => `${index}`} />

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
    marginHorizontal: 20,
  },
  mainBlock: {
    height: '100%',
    marginHorizontal: 20,
    marginVertical: 24,
  },
  buttonBottom: {
    marginHorizontal: 20,
    flex: 0.12,
    marginBottom: 36,
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
  bottomModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
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
    flexDirection: 'row',
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
});

WalletsAddMultisigStep2.navigationOptions = () => ({
  ...BlueNavigationStyle(),
  headerTitle: null,
});

export default WalletsAddMultisigStep2;

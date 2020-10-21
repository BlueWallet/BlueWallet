/* global alert */
import React, { useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BlueButton,
  BlueButtonHook,
  BlueFormMultiInput,
  BlueLoadingHook,
  BlueNavigationStyle,
  BlueSpacing20,
  BlueSpacing40,
  BlueText,
} from '../../BlueComponents';
import { HDSegwitBech32Wallet, MultisigCosigner, MultisigHDWallet } from '../../class';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import loc from '../../loc';
import Modal from 'react-native-modal';
import { Icon } from 'react-native-elements';
import { BlueCurrentTheme } from '../../components/themes';
import { getSystemName } from 'react-native-device-info';
import ImagePicker from 'react-native-image-picker';
import ScanQRCode from '../send/ScanQRCode';
import WalletImport from '../../class/wallet-import';
import QRCode from 'react-native-qrcode-svg';
import { SquareButton } from '../../components/SquareButton';
import WalletsAddMultisig from './addMultisig';

const fs = require('../../blue_modules/fs');
const isDesktop = getSystemName() === 'Mac OS X';
const LocalQRCode = require('@remobile/react-native-qrcode-local-image');
const staticCache = {};

const WalletsAddMultisigStep2 = () => {
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
  const [mnemonicsToDisplay, setMnemonicsToDisplay] = useState(''); // string rendered in modal
  const [importText, setImportText] = useState('');

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
    await WalletImport._saveWallet(w);
    navigation.dangerouslyGetParent().pop();
  };

  const generateNewKey = async () => {
    const w = new HDSegwitBech32Wallet();
    await w.generate();
    const cosignersCopy = [...cosigners];
    cosignersCopy.push([w.getSecret(), false, false]);
    setCosigners(cosignersCopy);
    setMnemonicsToDisplay(w.getSecret());
    setIsMnemonicsModalVisible(true);
    if (cosignersCopy.length === n) setIsOnCreateButtonEnabled(true);
    setTimeout(() => {
      // filling cache
      setXpubCacheForMnemonics(w.getSecret());
      setFpCacheForMnemonics(w.getSecret());
    }, 500);
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

      const xpub = getXpubCacheForMnemonics(cosigner[0], path);
      const fp = getFpCacheForMnemonics(cosigner[0]);
      setCosignerXpub(MultisigCosigner.exportToJson(fp, xpub, path));
      setCosignerXpubFilename('bw-cosigner-' + fp + '.json');
      setIsRenderCosignersXpubModalVisible(true);
    }
  };

  const getXpubCacheForMnemonics = seed => {
    const path = getPath();
    return staticCache[seed + path] || setXpubCacheForMnemonics(seed, path);
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

  const _renderKeyItemProvided = el => {
    return (
      <View style={styles.flexDirectionRow}>
        <View style={[styles.vaultKeyCircleSuccess, stylesHook.vaultKeyCircleSuccess]}>
          <Icon size={24} name="check" type="ionicons" color={colors.msSuccessCheck} />
        </View>
        <View style={styles.vaultKeyTextSignedWrapper}>
          <Text style={[styles.vaultKeyTextSigned, stylesHook.vaultKeyTextSigned]}>
            {loc.formatString(loc.multisig.vault_key, { number: el.index + 1 })}
          </Text>
        </View>

        <View>
          <TouchableOpacity
            style={[styles.provideKeyButton]}
            onPress={async () => {
              viewKey(cosigners[el.index]);
            }}
          >
            <Text style={[styles.provideKeyButtonText, stylesHook.provideKeyButtonText]}>{loc.multisig.view_key}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const iHaveMnemonics = () => {
    setIsProvideMnemonicsModalVisible(true);
  };

  const useMnemonicPhrase = () => {
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(importText);
    if (!hd.validateMnemonic()) return alert(loc.multisig.invalid_mnemonics);

    const cosignersCopy = [...cosigners];
    cosignersCopy.push([hd.getSecret(), false, false]);
    setCosigners(cosignersCopy);
    if (cosignersCopy.length === n) setIsOnCreateButtonEnabled(true);
    setIsProvideMnemonicsModalVisible(false);
  };

  const onBarScanned = ret => {
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
        if (existingCosigner[0] === cosigner.getXpub()) return alert('This cosigner is already imported');
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
      setCosigners(cosignersCopy);
      if (cosignersCopy.length === n) setIsOnCreateButtonEnabled(true);
    }
  };

  const scanOrOpenFile = () => {
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
    if (el.index < cosigners.length) return _renderKeyItemProvided(el);
    return (
      <View>
        <View style={styles.itemKeyUnprovidedWrapper}>
          <View style={[styles.vaultKeyCircle, stylesHook.vaultKeyCircle]}>
            <Text style={[styles.vaultKeyText, stylesHook.vaultKeyText]}>{el.index + 1}</Text>
          </View>
          <View style={styles.vaultKeyTextWrapper}>
            <Text style={[styles.vaultKeyText, stylesHook.vaultKeyText]}>
              {loc.formatString(loc.multisig.vault_key, { number: el.index + 1 })}
            </Text>
          </View>
        </View>

        {renderProvideKeyButtons && (
          <View>
            <TouchableOpacity
              style={[styles.provideKeyButton, stylesHook.provideKeyButton]}
              onPress={async () => {
                await generateNewKey();
              }}
            >
              <Text style={[styles.provideKeyButtonText, stylesHook.provideKeyButtonText]}>{loc.multisig.generate_new_key}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.provideKeyButton, stylesHook.provideKeyButton]}
              onPress={() => {
                scanOrOpenFile();
              }}
            >
              <Text style={[styles.provideKeyButtonText, stylesHook.provideKeyButtonText]}>{loc.multisig.scan_or_open_file}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.provideKeyButton, stylesHook.provideKeyButton]}
              onPress={() => {
                iHaveMnemonics();
              }}
            >
              <Text style={[styles.provideKeyButtonText, stylesHook.provideKeyButtonText]}>{loc.multisig.i_have_mnemonics}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderMnemonicsModal = () => {
    return (
      <Modal
        isVisible={isMnemonicsModalVisible}
        style={styles.bottomModal}
        onBackdropPress={() => {
          Keyboard.dismiss();
          setIsMnemonicsModalVisible(false);
        }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={styles.modalContent}>
            <Text>{loc.multisig.please_write_down_mnemonics}</Text>
            <BlueSpacing40 />
            <BlueText>{mnemonicsToDisplay}</BlueText>

            <BlueSpacing40 />
            <BlueSpacing40 />
            <BlueButton title={loc.multisig.i_wrote_it_down} onPress={() => setIsMnemonicsModalVisible(false)} />
          </View>
        </KeyboardAvoidingView>
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
        }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : null}>
          <View style={styles.modalContent}>
            <Text>{loc.multisig.type_your_mnemonics}</Text>
            <BlueFormMultiInput value={importText} onChangeText={setImportText} />
            <BlueSpacing40 />

            <BlueButton title={loc._.ok} onPress={useMnemonicPhrase} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  const exportCosigner = async () => {
    await fs.writeFileAndExport(cosignerXpubFilename, cosignerXpub);
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
          <View style={[styles.modalContent, styles.alignItemsCenter]}>
            <Text>{loc.multisig.this_is_cosigners_xpub}</Text>
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
              <SquareButton style={[styles.exportButton, stylesHook.exportButton]} onPress={exportCosigner} title={loc.multisig.share} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  const data = new Array(n);
  return (
    <ScrollView style={stylesHook.root}>
      <StatusBar barStyle="default" />
      <KeyboardAvoidingView enabled behavior={Platform.OS === 'ios' ? 'padding' : null} keyboardVerticalOffset={62}>
        <View style={styles.mainBlock}>
          <Text style={styles.headerText}>{loc.multisig.setup_header}</Text>
          <Text style={styles.header2Text}>
            {WalletsAddMultisig.getCurrentFormatReadable(format)}, {loc.formatString(loc.multisig.quorum, { m, n })}
          </Text>
          <FlatList data={data} renderItem={_renderKeyItem} keyExtractor={(_item, index) => `${index}`} scrollEnabled={false} />
          <BlueSpacing40 />
          {isLoading ? (
            <BlueLoadingHook />
          ) : (
            <BlueButtonHook title={loc.multisig.create} onPress={onCreate} disabled={!isOnCreateButtonEnabled} />
          )}
          <BlueSpacing20 />
        </View>
      </KeyboardAvoidingView>

      {renderMnemonicsModal()}

      {renderProvideMnemonicsModal()}

      {renderCosignersXpubModal()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  itemKeyUnprovidedWrapper: { flexDirection: 'row', paddingTop: 16 },
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
    flex: 1,
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
  provideKeyButtonText: { fontWeight: '600', fontSize: 15 },

  bottomModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContent: {
    backgroundColor: BlueCurrentTheme.colors.elevated,
    padding: 22,
    justifyContent: 'center',
    // alignItems: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    minHeight: 400,
    height: 400,
  },
  flexDirectionRow: { flexDirection: 'row', paddingVertical: 12 },
  vaultKeyCircleSuccess: {
    width: 42,
    height: 42,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
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
  headerText: { fontSize: 30, color: '#13244D' },
  mainBlock: { paddingLeft: 20, paddingRight: 20 },
  header2Text: { color: '#9AA0AA', fontSize: 14, paddingBottom: 20 },
  alignItemsCenter: { alignItems: 'center' },
  squareButtonWrapper: { height: 50, width: 250 },
});

WalletsAddMultisigStep2.navigationOptions = ({ navigation }) => ({
  ...BlueNavigationStyle(navigation, true),
  headerTitle: null,
  headerLeft: null,
});

export default WalletsAddMultisigStep2;

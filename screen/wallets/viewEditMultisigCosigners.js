/* global alert */
import React, { useContext, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  BlueButton,
  BlueButtonHook,
  BlueButtonLinkHook,
  BlueFormMultiInput,
  BlueLoadingHook,
  BlueNavigationStyle,
  BlueSpacing10,
  BlueSpacing20,
  BlueSpacing40,
  BlueText,
  BlueTextCentered,
} from '../../BlueComponents';
import { Icon } from 'react-native-elements';
import { HDSegwitBech32Wallet, MultisigCosigner, MultisigHDWallet } from '../../class';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import loc from '../../loc';
import Modal from 'react-native-modal';
import QRCode from 'react-native-qrcode-svg';
import { SquareButton } from '../../components/SquareButton';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import MultipleStepsListItem, {
  MultipleStepsListItemButtohType,
  MultipleStepsListItemDashType,
} from '../../components/MultipleStepsListItem';
import { getSystemName } from 'react-native-device-info';
import ImagePicker from 'react-native-image-picker';
import ScanQRCode from '../send/ScanQRCode';
const isDesktop = getSystemName() === 'Mac OS X';
const LocalQRCode = require('@remobile/react-native-qrcode-local-image');
const fs = require('../../blue_modules/fs');
const staticCache = {};

const ViewEditMultisigCosigners = () => {
  const { colors } = useTheme();
  const { wallets, sleep, setWalletsWithNewOrder } = useContext(BlueStorageContext);
  const { navigate } = useNavigation();
  const { walletId } = useRoute().params;
  let w = wallets.find(wallet => wallet.getID() === walletId);
  if (!w) {
    // lets create fake wallet so renderer wont throw any errors
    w = new MultisigHDWallet();
    w.setNativeSegwit();
  }

  const tempWallet = new MultisigHDWallet();
  tempWallet.setSecret(w.getSecret());
  const [wallet, setWallet] = useState(tempWallet);

  const m = tempWallet.getM();
  const n = tempWallet.getN();
  const format = tempWallet.getFormat();

  const [isLoading, setIsLoading] = useState(false);
  const [currentlyEditingCosignerNum, setCurrentlyEditingCosignerNum] = useState(false);
  const [isProvideMnemonicsModalVisible, setIsProvideMnemonicsModalVisible] = useState(false);
  const [isMnemonicsModalVisible, setIsMnemonicsModalVisible] = useState(false);
  const [isRenderCosignersXpubModalVisible, setIsRenderCosignersXpubModalVisible] = useState(false);
  const [cosignerXpub, setCosignerXpub] = useState(''); // string displayed in renderCosignersXpubModal()
  const [cosignerXpubFilename, setCosignerXpubFilename] = useState('bw-cosigner.json');
  const [importText, setImportText] = useState('');
  const [vaultKeyData, setVaultKeyData] = useState({ keyIndex: 1, xpub: '', seed: '', isLoading: false }); // string rendered in modal

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

  const onSave = async () => {
    setIsLoading(true);
    // eslint-disable-next-line prefer-const
    let newWallets = wallets.filter(w => {
      return w.getID() !== walletId;
    });
    newWallets.push(wallet);
    setWalletsWithNewOrder(newWallets);
    navigate('WalletsList');
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

  const viewKey = index => {
    const cosigner = wallet.getCosigner(index);
    if (MultisigHDWallet.isXpubValid(cosigner)) {
      setCosignerXpub(
        MultisigCosigner.exportToJson(wallet.getFingerprint(index), cosigner, wallet.getCustomDerivationPathForCosigner(index)),
      );
      setCosignerXpubFilename('bw-cosigner-' + wallet.getFingerprint(index) + '.json');
      setIsRenderCosignersXpubModalVisible(true);
    } else {
      const path = getPath();

      const xpub = getXpubCacheForMnemonics(cosigner);
      const fp = getFpCacheForMnemonics(cosigner);
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

  const renderSecret = entries => {
    const component = [];
    const entriesObject = entries.entries();
    for (const [index, secret] of entriesObject) {
      component.push(
        <View style={[styles.word, stylesHook.word]} key={`${secret}${index}`}>
          <Text style={[styles.wordText, stylesHook.wordText]}>{secret}</Text>
        </View>,
      );
    }
    return component;
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
        <View style={[styles.newKeyModalContent, stylesHook.modalContent]}>
          <View style={styles.itemKeyUnprovidedWrapper}>
            <View style={[styles.vaultKeyCircleSuccess, stylesHook.vaultKeyCircleSuccess]}>
              <Icon size={24} name="check" type="ionicons" color={colors.msSuccessCheck} />
            </View>
            <View style={styles.vaultKeyTextWrapper}>
              <Text style={[styles.vaultKeyText, stylesHook.vaultKeyText]}>
                {loc.formatString(loc.multisig.vault_key, { number: vaultKeyData.keyIndex + 1 })}
              </Text>
            </View>
          </View>
          <BlueSpacing20 />
          <Text style={[styles.provideKeyButtonText, stylesHook.textDestination]}>
            {loc.multisig.wallet_key_created}
            <Text style={[styles.textDestination, stylesHook.textDestination]}>{loc.multisig.wallet_key_created_bold_text1}</Text>
            <Text style={[styles.headerText, stylesHook.textDestination]}>{loc.multisig.wallet_key_created2}</Text>
            <Text style={[styles.textDestination, stylesHook.textDestination]}>{loc.multisig.wallet_key_created_bold_text2}</Text>
          </Text>
          <BlueSpacing20 />
          {vaultKeyData.xpub.length > 1 && (
            <>
              <Text style={[styles.textDestination, stylesHook.textDestination]}>{loc._.wallet_key}</Text>
              <BlueSpacing10 />
              <View style={styles.secretContainer}>{renderSecret([vaultKeyData.xpub])}</View>
            </>
          )}
          {vaultKeyData.seed.length > 1 && (
            <>
              <BlueSpacing20 />
              <Text style={[styles.textDestination, stylesHook.textDestination]}>{loc._.seed}</Text>
              <BlueSpacing10 />
              <View style={styles.secretContainer}>{renderSecret(vaultKeyData.seed.split(' '))}</View>
            </>
          )}
          <BlueSpacing20 />
          <BlueButton title={loc.send.success_done} onPress={() => setIsMnemonicsModalVisible(false)} />
        </View>
      </Modal>
    );
  };

  const _renderKeyItem = el => {
    const isXpub = MultisigHDWallet.isXpubValid(wallet.getCosigner(el.index + 1));
    let leftText;
    if (isXpub) {
      leftText = wallet.getCosigner(el.index + 1);
      const currentAddress = leftText;
      const firstFour = currentAddress.substring(0, 5);
      const lastFour = currentAddress.substring(currentAddress.length - 5, currentAddress.length);
      leftText = `${firstFour}...${lastFour}`;
    } else {
      const secret = wallet.getCosigner(el.index + 1).split(' ');
      leftText = `${secret[0]}...${secret[secret.length - 1]}`;
    }
    return (
      <View>
        <MultipleStepsListItem
          checked
          leftText={loc.formatString(loc.multisig.vault_key, { number: el.index + 1 })}
          dashes={el.index === data.length - 1 ? MultipleStepsListItemDashType.bottom : MultipleStepsListItemDashType.topAndBottom}
        />
        {isXpub ? (
          <View>
            <MultipleStepsListItem
              button={{
                buttonType: MultipleStepsListItemButtohType.partial,
                leftText,
                text: loc.multisig.view_key,
                onPress: () => {
                  setVaultKeyData({
                    keyIndex: el.index,
                    seed: isXpub ? '' : wallet.getCosigner(el.index + 1),
                    xpub: isXpub ? wallet.getCosigner(el.index + 1) : '',
                    isLoading: false,
                  });
                  setIsMnemonicsModalVisible(true);
                },
              }}
              dashes={MultipleStepsListItemDashType.topAndBottom}
            />
            <MultipleStepsListItem
              button={{
                text: loc.multisig.i_have_mnemonics,
                buttonType: MultipleStepsListItemButtohType.full,
                onPress: () => {
                  setCurrentlyEditingCosignerNum(el.index + 1);
                  setIsProvideMnemonicsModalVisible(true);
                },
              }}
              dashes={el.index === data.length - 1 ? MultipleStepsListItemDashType.top : MultipleStepsListItemDashType.topAndBottom}
            />
          </View>
        ) : (
          <View>
            <MultipleStepsListItem
              button={{
                leftText,
                text: loc.multisig.view_key,
                buttonType: MultipleStepsListItemButtohType.partial,
                onPress: () => {
                  setVaultKeyData({
                    keyIndex: el.index,
                    seed: isXpub ? '' : wallet.getCosigner(el.index + 1),
                    xpub: isXpub ? wallet.getCosigner(el.index + 1) : '',
                    isLoading: false,
                  });
                  setIsMnemonicsModalVisible(true);
                },
              }}
              dashes={MultipleStepsListItemDashType.topAndBottom}
            />
            <MultipleStepsListItem
              dashes={el.index === data.length - 1 ? MultipleStepsListItemDashType.top : MultipleStepsListItemDashType.topAndBottom}
              button={{
                text: loc.multisig.forget_this_seed,
                buttonType: MultipleStepsListItemButtohType.full,
                onPress: () => {
                  Alert.alert(
                    loc._.seed,
                    loc.multisig.are_you_sure_seed_will_be_lost,
                    [
                      {
                        text: loc._.ok,
                        onPress: () => {
                          xpubInsteadOfSeed(el.index + 1);
                        },
                        style: 'destructive',
                      },
                      { text: loc._.cancel, onPress: () => {}, style: 'cancel' },
                    ],
                    { cancelable: false },
                  );
                },
              }}
            />
          </View>
        )}
      </View>
    );
  };

  const handleUseMnemonicPhrase = () => {
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(importText);
    if (!hd.validateMnemonic()) return alert(loc.multisig.invalid_mnemonics);

    const newFp = MultisigHDWallet.seedToFingerprint(hd.getSecret());
    if (newFp !== wallet.getFingerprint(currentlyEditingCosignerNum)) return alert(loc.multisig.invalid_fingerprint);

    wallet.deleteCosigner(newFp);
    wallet.addCosigner(hd.getSecret());
    setWallet(wallet);
    setIsProvideMnemonicsModalVisible(false);
  };

  const xpubInsteadOfSeed = async index => {
    setIsLoading(true);
    await sleep(100); // chance for animations to kick in

    const mnemonics = wallet.getCosigner(index);
    const newFp = MultisigHDWallet.seedToFingerprint(mnemonics);
    const path = wallet.getCustomDerivationPathForCosigner(index);
    const xpub = wallet.convertXpubToMultisignatureXpub(MultisigHDWallet.seedToXpub(mnemonics, path));

    wallet.deleteCosigner(newFp);
    wallet.addCosigner(xpub, newFp, path);

    setWallet(wallet);
    setIsLoading(false);
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
                handleUseMnemonicPhrase(result);
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
      navigate('ScanQRCodeRoot', {
        screen: 'ScanQRCode',
        params: {
          onBarScanned: handleUseMnemonicPhrase,
          showFileImportButton: true,
        },
      });
    }
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
            <BlueTextCentered>{loc.multisig.type_your_mnemonics}</BlueTextCentered>
            <BlueSpacing20 />
            <BlueFormMultiInput value={importText} onChangeText={setImportText} />
            <BlueSpacing40 />
            {isLoading ? (
              <ActivityIndicator />
            ) : (
              <BlueButton
                disabled={importText.trim().length === 0}
                title={loc.wallets.import_do_import}
                onPress={handleUseMnemonicPhrase}
              />
            )}
            <BlueButtonLinkHook disabled={isLoading} onPress={scanOrOpenFile} title={loc.wallets.import_scan_qr} />
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
            <BlueText>{loc.multisig.this_is_cosigners_xpub}</BlueText>
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
              <SquareButton style={[styles.exportButton, stylesHook.exportButton]} onPress={exportCosigner} title={loc.multisig.share} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  const data = new Array(n);

  if (isLoading)
    return (
      <SafeAreaView style={[styles.root, stylesHook.root]}>
        <BlueLoadingHook />
      </SafeAreaView>
    );

  const footer = <BlueButtonHook title={loc._.save} onPress={onSave} />;

  return (
    <SafeAreaView style={[styles.root, stylesHook.root]}>
      <StatusBar barStyle="default" />
      <KeyboardAvoidingView
        enabled
        behavior={Platform.OS === 'ios' ? 'padding' : null}
        keyboardVerticalOffset={62}
        style={[styles.mainBlock, styles.root]}
      >
        <FlatList data={data} renderItem={_renderKeyItem} keyExtractor={(_item, index) => `${index}`} />
        <BlueSpacing10 />
        {footer}
      </KeyboardAvoidingView>

      {renderProvideMnemonicsModal()}

      {renderCosignersXpubModal()}
      {renderMnemonicsModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemKeyUnprovidedWrapper: { flexDirection: 'row', paddingTop: 16 },
  vaultKeyCircle: {
    width: 42,
    height: 42,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textDestination: { fontWeight: '600' },
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
  newKeyModalContent: {
    paddingHorizontal: 22,
    paddingVertical: 32,
    justifyContent: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  bottomModal: {
    justifyContent: 'flex-end',
    margin: 0,
    paddingBottom: 17,
  },
  modalContent: {
    padding: 22,
    justifyContent: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    backgroundColor: 'white',
    minHeight: 400,
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
  headerText: { fontSize: 15, color: '#13244D' },
  mainBlock: { marginHorizontal: 16 },
  header2Text: { color: '#9AA0AA', fontSize: 14, paddingBottom: 20 },
  alignItemsCenter: { alignItems: 'center' },
  squareButtonWrapper: { height: 50, width: 250 },
});

ViewEditMultisigCosigners.navigationOptions = ({ navigation }) => ({
  ...BlueNavigationStyle(navigation, true),
  title: loc.multisig.view_edit_cosigners_title,
  headerLeft: null,
});

export default ViewEditMultisigCosigners;

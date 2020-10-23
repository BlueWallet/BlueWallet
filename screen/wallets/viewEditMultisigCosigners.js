/* global alert */
import React, { useState } from 'react';
import {
  Alert,
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
} from '../../BlueComponents';
import { HDSegwitBech32Wallet, MultisigCosigner, MultisigHDWallet } from '../../class';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import loc from '../../loc';
import Modal from 'react-native-modal';
import { Icon } from 'react-native-elements';
import QRCode from 'react-native-qrcode-svg';
import { SquareButton } from '../../components/SquareButton';

const fs = require('../../blue_modules/fs');
const BlueApp = require('../../BlueApp');
const staticCache = {};

const ViewEditMultisigCosigners = () => {
  const { colors } = useTheme();

  const navigation = useNavigation();
  const { walletId } = useRoute().params;
  let w = BlueApp.getWallets().find(wallet => wallet.getID() === walletId);
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
  const [isRenderCosignersXpubModalVisible, setIsRenderCosignersXpubModalVisible] = useState(false);
  const [cosignerXpub, setCosignerXpub] = useState(''); // string displayed in renderCosignersXpubModal()
  const [cosignerXpubFilename, setCosignerXpubFilename] = useState('bw-cosigner.json');
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
  });

  const onSave = async () => {
    setIsLoading(true);
    BlueApp.wallets = BlueApp.wallets.filter(w => {
      return w.getID() !== walletId;
    });
    BlueApp.wallets.push(wallet);
    await BlueApp.saveToDisk();
    navigation.dangerouslyGetParent().popToTop();
    navigation.dangerouslyGetParent().popToTop();
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

  const _renderKeyItem = el => {
    const isXpub = MultisigHDWallet.isXpubValid(wallet.getCosigner(el.index + 1));
    return (
      <View>
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
                viewKey(el.index + 1);
              }}
            >
              <Text style={[styles.provideKeyButtonText, stylesHook.provideKeyButtonText]}>{loc.multisig.view_key}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {isXpub ? (
          <View>
            <Text>Xpub: {wallet.getCosigner(el.index + 1)}</Text>
            <Text>Fingerprint: {wallet.getFingerprint(el.index + 1)}</Text>
            <Text>Path: {wallet.getCustomDerivationPathForCosigner(el.index + 1)}</Text>

            <TouchableOpacity
              style={[styles.provideKeyButton, stylesHook.provideKeyButton]}
              onPress={() => {
                setCurrentlyEditingCosignerNum(el.index + 1);
                setIsProvideMnemonicsModalVisible(true);
              }}
            >
              <Text style={[styles.provideKeyButtonText, stylesHook.provideKeyButtonText]}>{loc.multisig.i_have_mnemonics}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text>{wallet.getCosigner(el.index + 1)}</Text>
            <TouchableOpacity
              style={[styles.provideKeyButton, stylesHook.provideKeyButton]}
              onPress={() => {
                Alert.alert(
                  loc.multisig.are_you_sure_seed_will_be_lost,
                  '',
                  [
                    {
                      text: loc._.yes,
                      onPress: () => {
                        xpubInsteadOfSeed(el.index + 1);
                      },
                      style: 'default',
                    },
                    { text: loc._.cancel, onPress: () => {}, style: 'cancel' },
                  ],
                  { cancelable: false },
                );
              }}
            >
              <Text style={[styles.provideKeyButtonText, stylesHook.provideKeyButtonText]}>{loc.multisig.forget_this_seed}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const useMnemonicPhrase = () => {
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
    await BlueApp.sleep(100); // chance for animations to kick in

    const mnemonics = wallet.getCosigner(index);
    const newFp = MultisigHDWallet.seedToFingerprint(mnemonics);
    const path = wallet.getCustomDerivationPathForCosigner(index);
    const xpub = wallet.convertXpubToMultisignatureXpub(MultisigHDWallet.seedToXpub(mnemonics, path));

    wallet.deleteCosigner(newFp);
    wallet.addCosigner(xpub, newFp, path);

    setWallet(wallet);
    setIsLoading(false);
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

  if (isLoading) return <BlueLoadingHook />;

  return (
    <ScrollView style={stylesHook.root}>
      <StatusBar barStyle="default" />
      <KeyboardAvoidingView enabled behavior={Platform.OS === 'ios' ? 'padding' : null} keyboardVerticalOffset={62}>
        <View style={styles.mainBlock}>
          <Text style={styles.header2Text}>
            {format}, {loc.formatString(loc.multisig.quorum, { m, n })}
          </Text>
          <FlatList data={data} renderItem={_renderKeyItem} keyExtractor={(_item, index) => `${index}`} scrollEnabled={false} />
          <BlueSpacing40 />
          <BlueButtonHook title={loc._.save} onPress={onSave} />
          <BlueSpacing20 />
        </View>
      </KeyboardAvoidingView>

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
    padding: 22,
    justifyContent: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    backgroundColor: 'white',
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

ViewEditMultisigCosigners.navigationOptions = ({ navigation }) => ({
  ...BlueNavigationStyle(navigation, true),
  title: loc.multisig.view_edit_cosigners_title,
  headerLeft: null,
});

export default ViewEditMultisigCosigners;

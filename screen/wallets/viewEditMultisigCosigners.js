/* global alert */
import React, { useContext, useState } from 'react';
import { Alert, FlatList, Keyboard, KeyboardAvoidingView, Platform, StatusBar, StyleSheet, Text, View } from 'react-native';
import {
  BlueButton,
  BlueButtonHook,
  BlueFormMultiInput,
  BlueLoadingHook,
  BlueNavigationStyle,
  BlueSpacing10,
  BlueSpacing20,
  BlueSpacing40,
  BlueText,
} from '../../BlueComponents';
import { HDSegwitBech32Wallet, MultisigCosigner, MultisigHDWallet } from '../../class';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import loc from '../../loc';
import Modal from 'react-native-modal';
import QRCode from 'react-native-qrcode-svg';
import { SquareButton } from '../../components/SquareButton';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import MultipleStepsListItem from '../../components/MultipleStepsListItem';
const fs = require('../../blue_modules/fs');
const staticCache = {};

const ViewEditMultisigCosigners = () => {
  const { colors } = useTheme();
  const { wallets, sleep, setWalletsWithNewOrder } = useContext(BlueStorageContext);
  const navigation = useNavigation();
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
          <View style={[styles.word, stylesHook.word]} key={`${secret}${index}`}>
            <Text style={[styles.wordText, stylesHook.wordText]}>{secret}</Text>
          </View>,
        );
      }
    }
    return component;
  };

  const _renderKeyItem = el => {
    const isXpub = MultisigHDWallet.isXpubValid(wallet.getCosigner(el.index + 1));
    return (
      <View>
        <MultipleStepsListItem
          checked
          leftText={loc.formatString(loc.multisig.vault_key, { number: el.index + 1 })}
          rightButton={{ text: loc.multisig.view_key, onPress: () => viewKey(el.index + 1) }}
        />
        {isXpub ? (
          <View>
            <BlueText>Xpub:</BlueText>
            <BlueSpacing10 />
            {renderSecret([wallet.getCosigner(el.index + 1)])}
            <BlueText>
              Fingerprint: <Text>{wallet.getFingerprint(el.index + 1)}</Text>{' '}
            </BlueText>
            <BlueSpacing10 />
            <BlueText>
              Path: <Text>{wallet.getCustomDerivationPathForCosigner(el.index + 1)}</Text>
            </BlueText>
            <BlueSpacing20 />
            <MultipleStepsListItem
              button={{
                text: loc.multisig.i_have_mnemonics,
                onPress: () => {
                  setCurrentlyEditingCosignerNum(el.index + 1);
                  setIsProvideMnemonicsModalVisible(true);
                },
              }}
            />
          </View>
        ) : (
          <View>
            <View style={styles.secretContainer}>{renderSecret(wallet.getCosigner(el.index + 1).split(' '))}</View>
            <MultipleStepsListItem
              button={{
                text: loc.multisig.forget_this_seed,
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

  const header = (
    <Text style={styles.header2Text}>
      {format}, {loc.formatString(loc.multisig.quorum, { m, n })}
    </Text>
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
        <FlatList ListHeaderComponent={header} data={data} renderItem={_renderKeyItem} keyExtractor={(_item, index) => `${index}`} />
        <BlueSpacing10 />
        {footer}
        <BlueSpacing10 />
      </KeyboardAvoidingView>

      {renderProvideMnemonicsModal()}

      {renderCosignersXpubModal()}
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
  headerText: { fontSize: 30, color: '#13244D' },
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

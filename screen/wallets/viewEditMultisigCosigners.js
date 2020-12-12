/* global alert */
import React, { useContext, useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Icon } from 'react-native-elements';
import { useFocusEffect, useNavigation, useRoute, useTheme } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSystemName } from 'react-native-device-info';
import { launchCamera } from 'react-native-image-picker';

import {
  BlueButton,
  BlueButtonLink,
  BlueFormMultiInput,
  BlueLoading,
  BlueNavigationStyle,
  BlueSpacing10,
  BlueSpacing20,
  BlueSpacing40,
  BlueTextCentered,
} from '../../BlueComponents';
import SquareEnumeratedWords, { SquareEnumeratedWordsContentAlign } from '../../components/SquareEnumeratedWords';
import BottomModal from '../../components/BottomModal';
import { HDSegwitBech32Wallet, MultisigHDWallet } from '../../class';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import MultipleStepsListItem, {
  MultipleStepsListItemButtohType,
  MultipleStepsListItemDashType,
} from '../../components/MultipleStepsListItem';
import ScanQRCode from '../send/ScanQRCode';
import Privacy from '../../Privacy';
import Biometric from '../../class/biometrics';
const LocalQRCode = require('@remobile/react-native-qrcode-local-image');

const isDesktop = getSystemName() === 'Mac OS X';

const ViewEditMultisigCosigners = () => {
  const { colors } = useTheme();
  const { wallets, setWalletsWithNewOrder } = useContext(BlueStorageContext);
  const { navigate, goBack } = useNavigation();
  const route = useRoute();
  const { walletId } = route.params;
  const w = useRef(wallets.find(wallet => wallet.getID() === walletId));
  const tempWallet = useRef(new MultisigHDWallet());
  const [wallet, setWallet] = useState();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaveButtonDisabled, setIsSaveButtonDisabled] = useState(true);
  const [currentlyEditingCosignerNum, setCurrentlyEditingCosignerNum] = useState(false);
  const [isProvideMnemonicsModalVisible, setIsProvideMnemonicsModalVisible] = useState(false);
  const [isMnemonicsModalVisible, setIsMnemonicsModalVisible] = useState(false);
  const [importText, setImportText] = useState('');
  const [vaultKeyData, setVaultKeyData] = useState({ keyIndex: 1, xpub: '', seed: '', path: '', fp: '', isLoading: false }); // string rendered in modal
  const data = useRef();
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

    const isBiometricsEnabled = await Biometric.isBiometricUseCapableAndEnabled();

    if (isBiometricsEnabled) {
      if (!(await Biometric.unlockWithBiometrics())) {
        setIsLoading(false);
        return;
      }
    }

    // eslint-disable-next-line prefer-const
    let newWallets = wallets.filter(w => {
      return w.getID() !== walletId;
    });
    await wallet.fetchBalance();
    newWallets.push(wallet);
    setWalletsWithNewOrder(newWallets);
    navigate('WalletsList');
  };
  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);

      Privacy.enableBlur();

      const task = InteractionManager.runAfterInteractions(async () => {
        const isBiometricsEnabled = await Biometric.isBiometricUseCapableAndEnabled();

        if (isBiometricsEnabled) {
          if (!(await Biometric.unlockWithBiometrics())) {
            return goBack();
          }
        }
        if (!w.current) {
          // lets create fake wallet so renderer wont throw any errors
          w.current = new MultisigHDWallet();
          w.current.setNativeSegwit();
        } else {
          tempWallet.current.setSecret(w.current.getSecret());
          data.current = new Array(tempWallet.current.getN());
          setWallet(tempWallet.current);
        }
        setIsLoading(false);
      });
      return () => {
        Privacy.disableBlur();
        task.cancel();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [walletId]),
  );

  const hideMnemonicsModal = () => {
    Keyboard.dismiss();
    setIsMnemonicsModalVisible(false);
  };

  const renderMnemonicsModal = () => {
    return (
      <BottomModal isVisible={isMnemonicsModalVisible} onClose={hideMnemonicsModal}>
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
          {vaultKeyData.xpub.length > 1 && (
            <>
              <Text style={[styles.textDestination, stylesHook.textDestination]}>{loc._.wallet_key}</Text>
              <BlueSpacing10 />
              <SquareEnumeratedWords
                contentAlign={SquareEnumeratedWordsContentAlign.left}
                entries={[vaultKeyData.xpub, vaultKeyData.fp, vaultKeyData.path]}
                appendNumber={false}
              />
            </>
          )}
          {vaultKeyData.seed.length > 1 && (
            <>
              <BlueSpacing20 />
              <Text style={[styles.textDestination, stylesHook.textDestination]}>{loc._.seed}</Text>
              <BlueSpacing10 />
              <SquareEnumeratedWords
                contentAlign={SquareEnumeratedWordsContentAlign.left}
                entries={vaultKeyData.seed.split(' ')}
                appendNumber
              />
            </>
          )}
          <BlueSpacing20 />
          <BlueButton title={loc.send.success_done} onPress={() => setIsMnemonicsModalVisible(false)} />
          <BlueSpacing40 />

        </View>
      </BottomModal>
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
            {!vaultKeyData.isLoading && (
              <MultipleStepsListItem
                button={{
                  buttonType: MultipleStepsListItemButtohType.partial,
                  leftText,
                  text: loc.multisig.view,
                  disabled: vaultKeyData.isLoading,
                  onPress: () => {
                    setVaultKeyData({
                      keyIndex: el.index + 1,
                      seed: '',
                      xpub: wallet.getCosigner(el.index + 1),
                      fp: wallet.getFingerprint(el.index + 1),
                      path: wallet.getCustomDerivationPathForCosigner(el.index + 1),
                      isLoading: false,
                    });
                    setIsMnemonicsModalVisible(true);
                  },
                }}
                dashes={MultipleStepsListItemDashType.topAndBottom}
              />
            )}
            <MultipleStepsListItem
              showActivityIndicator={vaultKeyData.keyIndex === el.index + 1 && vaultKeyData.isLoading}
              button={{
                text: loc.multisig.i_have_mnemonics,
                buttonType: MultipleStepsListItemButtohType.full,
                disabled: vaultKeyData.isLoading,
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
            {!vaultKeyData.isLoading && (
              <MultipleStepsListItem
                showActivityIndicator={vaultKeyData.keyIndex === el.index + 1 && vaultKeyData.isLoading}
                button={{
                  leftText,
                  text: loc.multisig.view,
                  disabled: vaultKeyData.isLoading,
                  buttonType: MultipleStepsListItemButtohType.partial,
                  onPress: () => {
                    setVaultKeyData({
                      keyIndex: el.index + 1,
                      seed: wallet.getCosigner(el.index + 1),
                      xpub: '',
                      fp: '',
                      path: '',
                      isLoading: false,
                    });
                    setIsMnemonicsModalVisible(true);
                  },
                }}
                dashes={MultipleStepsListItemDashType.topAndBottom}
              />
            )}
            <MultipleStepsListItem
              showActivityIndicator={vaultKeyData.keyIndex === el.index + 1 && vaultKeyData.isLoading}
              dashes={el.index === data.length - 1 ? MultipleStepsListItemDashType.top : MultipleStepsListItemDashType.topAndBottom}
              button={{
                text: loc.multisig.forget_this_seed,
                disabled: vaultKeyData.isLoading,
                buttonType: MultipleStepsListItemButtohType.full,
                onPress: () => {
                  Alert.alert(
                    loc._.seed,
                    loc.multisig.are_you_sure_seed_will_be_lost,
                    [
                      {
                        text: loc._.ok,
                        onPress: () => {
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          setVaultKeyData({
                            ...vaultKeyData,
                            isLoading: true,
                            keyIndex: el.index + 1,
                          });
                          setTimeout(
                            () =>
                              xpubInsteadOfSeed(el.index + 1).finally(() => {
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                setVaultKeyData({
                                  ...vaultKeyData,
                                  isLoading: false,
                                  keyIndex: el.index + 1,
                                });
                              }),
                            100,
                          );
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
    return _handleUseMnemonicPhrase(importText);
  };

  const _handleUseMnemonicPhrase = mnemonic => {
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(mnemonic);
    if (!hd.validateMnemonic()) return alert(loc.multisig.invalid_mnemonics);

    const newFp = MultisigHDWallet.seedToFingerprint(hd.getSecret());
    if (newFp !== wallet.getFingerprint(currentlyEditingCosignerNum)) return alert(loc.multisig.invalid_fingerprint);

    wallet.deleteCosigner(newFp);
    wallet.addCosigner(hd.getSecret());
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setWallet(wallet);
    setIsProvideMnemonicsModalVisible(false);
    setIsSaveButtonDisabled(false);
  };

  const xpubInsteadOfSeed = index => {
    return new Promise((resolve, reject) => {
      InteractionManager.runAfterInteractions(() => {
        try {
          const mnemonics = wallet.getCosigner(index);
          const newFp = MultisigHDWallet.seedToFingerprint(mnemonics);
          const path = wallet.getCustomDerivationPathForCosigner(index);
          const xpub = wallet.convertXpubToMultisignatureXpub(MultisigHDWallet.seedToXpub(mnemonics, path));
          wallet.deleteCosigner(newFp);
          wallet.addCosigner(xpub, newFp, path);
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setWallet(wallet);
          setIsSaveButtonDisabled(false);
          resolve();
        } catch (e) {
          alert(e.message);
          console.log(e);
          reject(e);
        }
      });
    });
  };

  const scanOrOpenFile = () => {
    setIsProvideMnemonicsModalVisible(false);
    if (isDesktop) {
      launchCamera(
        {
          title: null,
          mediaType: 'photo',
          takePhotoButtonTitle: null,
        },
        response => {
          if (response.uri) {
            const uri = Platform.OS === 'ios' ? response.uri.toString().replace('file://', '') : response.uri;
            LocalQRCode.decode(uri, (error, result) => {
              if (!error) {
                _handleUseMnemonicPhrase(result);
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
          launchedBy: route.name,
          onBarScanned: result => {
            _handleUseMnemonicPhrase(result);
          },
          showFileImportButton: true,
        },
      });
    }
  };

  const hideProvideMnemonicsModal = () => {
    Keyboard.dismiss();
    setIsProvideMnemonicsModalVisible(false);
    setImportText('');
  };

  const renderProvideMnemonicsModal = () => {
    return (
      <BottomModal isVisible={isProvideMnemonicsModalVisible} onClose={hideProvideMnemonicsModal}>
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
            <BlueButtonLink disabled={isLoading} onPress={scanOrOpenFile} title={loc.wallets.import_scan_qr} />
          </View>
        </KeyboardAvoidingView>
      </BottomModal>
    );
  };

  if (isLoading)
    return (
      <SafeAreaView style={[styles.root, stylesHook.root]}>
        <BlueLoading />
      </SafeAreaView>
    );

  const footer = <BlueButton disabled={vaultKeyData.isLoading || isSaveButtonDisabled} title={loc._.save} onPress={onSave} />;

  return (
    <SafeAreaView style={[styles.root, stylesHook.root]}>
      <StatusBar barStyle="default" />
      <KeyboardAvoidingView
        enabled
        behavior={Platform.OS === 'ios' ? 'padding' : null}
        keyboardVerticalOffset={62}
        style={[styles.mainBlock, styles.root]}
      >
        <FlatList data={data.current} extraData={vaultKeyData} renderItem={_renderKeyItem} keyExtractor={(_item, index) => `${index}`} />
        <BlueSpacing10 />
        {footer}
      </KeyboardAvoidingView>

      {renderProvideMnemonicsModal()}

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
  title: loc.multisig.manage_keys,
  headerLeft: null,
});

export default ViewEditMultisigCosigners;

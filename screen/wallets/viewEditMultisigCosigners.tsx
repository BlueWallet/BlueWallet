import React, { useContext, useRef, useState, useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  ListRenderItemInfo,
  Platform,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Icon, Badge } from 'react-native-elements';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  BlueButtonLink,
  BlueFormMultiInput,
  BlueLoading,
  BlueSpacing10,
  BlueSpacing20,
  BlueSpacing40,
  BlueText,
  BlueTextCentered,
} from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import * as NavigationService from '../../NavigationService';
import SquareEnumeratedWords, { SquareEnumeratedWordsContentAlign } from '../../components/SquareEnumeratedWords';
import BottomModal from '../../components/BottomModal';
import { AbstractWallet, HDSegwitBech32Wallet, MultisigCosigner, MultisigHDWallet } from '../../class';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import MultipleStepsListItem, {
  MultipleStepsListItemButtohType,
  MultipleStepsListItemDashType,
} from '../../components/MultipleStepsListItem';
import Biometric from '../../class/biometrics';
import { SquareButton } from '../../components/SquareButton';
import { encodeUR } from '../../blue_modules/ur';
import QRCodeComponent from '../../components/QRCodeComponent';
import presentAlert from '../../components/Alert';
import { scanQrHelper } from '../../helpers/scan-qr';
import { useTheme } from '../../components/themes';
import Button from '../../components/Button';
import { NativeStackScreenProps } from 'react-native-screens/native-stack';
import usePrivacy from '../../hooks/usePrivacy';
const fs = require('../../blue_modules/fs');
const prompt = require('../../helpers/prompt');

type StackParamsList = {
  ViewEditMultisigCosigners: { walletId: string };
};

const ViewEditMultisigCosigners = ({ route }: NativeStackScreenProps<StackParamsList, 'ViewEditMultisigCosigners'>) => {
  const hasLoaded = useRef(false);
  const { colors } = useTheme();
  const { wallets, setWalletsWithNewOrder, isElectrumDisabled, isAdvancedModeEnabled } = useContext(BlueStorageContext);
  const { navigate, goBack } = useNavigation();
  const openScannerButtonRef = useRef();
  const { walletId } = route.params;
  const w = useRef(wallets.find((wallet: AbstractWallet) => wallet.getID() === walletId));
  const tempWallet = useRef(new MultisigHDWallet());
  const [wallet, setWallet] = useState<MultisigHDWallet>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaveButtonDisabled, setIsSaveButtonDisabled] = useState(true);
  const [currentlyEditingCosignerNum, setCurrentlyEditingCosignerNum] = useState<number | false>(false);
  const [isProvideMnemonicsModalVisible, setIsProvideMnemonicsModalVisible] = useState(false);
  const [isMnemonicsModalVisible, setIsMnemonicsModalVisible] = useState(false);
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [importText, setImportText] = useState('');
  const [exportString, setExportString] = useState('{}'); // used in exportCosigner()
  const [exportStringURv2, setExportStringURv2] = useState(''); // used in QR
  const [exportFilename, setExportFilename] = useState('bw-cosigner.json');
  const [vaultKeyData, setVaultKeyData] = useState({ keyIndex: 1, xpub: '', seed: '', path: '', fp: '', isLoading: false }); // string rendered in modal
  const [askPassphrase, setAskPassphrase] = useState(false);
  const [isAdvancedModeEnabledRender, setIsAdvancedModeEnabledRender] = useState(false);
  const data = useRef<any[]>();
  const { enableBlur, disableBlur } = usePrivacy();

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
    textDestination: {
      color: colors.foregroundColor,
    },
    modalContent: {
      backgroundColor: colors.elevated,
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
    tipKeys: {
      color: colors.alternativeTextColor,
    },
    tipLabel: {
      backgroundColor: colors.inputBackgroundColor,
      borderColor: colors.inputBackgroundColor,
    },
    tipLabelText: {
      color: colors.buttonTextColor,
    },
  });

  useEffect(() => {
    isAdvancedModeEnabled().then(setIsAdvancedModeEnabledRender);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportCosigner = () => {
    setIsShareModalVisible(false);
    setTimeout(() => fs.writeFileAndExport(exportFilename, exportString), 1000);
  };

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
    let newWallets = wallets.filter((newWallet: MultisigHDWallet) => {
      return newWallet.getID() !== walletId;
    });
    if (!isElectrumDisabled) {
      await wallet?.fetchBalance();
    }
    newWallets.push(wallet);
    // @ts-ignore  wtf
    navigate('WalletsList');
    setTimeout(() => {
      setWalletsWithNewOrder(newWallets);
    }, 500);
  };
  useFocusEffect(
    useCallback(() => {
      // useFocusEffect is called on willAppear (example: when camera dismisses). we want to avoid this.
      if (hasLoaded.current) return;
      setIsLoading(true);

      enableBlur();

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
        hasLoaded.current = true;
        setIsLoading(false);
      });
      return () => {
        disableBlur();
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
          <Button
            title={loc.multisig.share}
            onPress={() => {
              setIsMnemonicsModalVisible(false);
              setTimeout(() => {
                setIsShareModalVisible(true);
              }, 1000);
            }}
          />
          <BlueSpacing20 />
          <Button title={loc.send.success_done} onPress={() => setIsMnemonicsModalVisible(false)} />
        </View>
      </BottomModal>
    );
  };

  const _renderKeyItem = (el: ListRenderItemInfo<any>) => {
    if (!wallet) {
      // failsafe
      return null;
    }
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

    // @ts-ignore not sure which one is correct
    const length = data?.length ?? data.current?.length ?? 0;

    return (
      <View>
        <MultipleStepsListItem
          checked
          leftText={loc.formatString(loc.multisig.vault_key, { number: el.index + 1 })}
          dashes={el.index === length - 1 ? MultipleStepsListItemDashType.bottom : MultipleStepsListItemDashType.topAndBottom}
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
                    const keyIndex = el.index + 1;
                    const xpub = wallet.getCosigner(keyIndex);
                    const fp = wallet.getFingerprint(keyIndex);
                    const path = wallet.getCustomDerivationPathForCosigner(keyIndex);
                    setVaultKeyData({
                      keyIndex,
                      seed: '',
                      xpub,
                      fp,
                      path,
                      isLoading: false,
                    });
                    setExportString(MultisigCosigner.exportToJson(fp, xpub, path));
                    setExportStringURv2(encodeUR(MultisigCosigner.exportToJson(fp, xpub, path))[0]);
                    setExportFilename('bw-cosigner-' + fp + '.json');
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
              dashes={el.index === length - 1 ? MultipleStepsListItemDashType.top : MultipleStepsListItemDashType.topAndBottom}
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
                    const keyIndex = el.index + 1;
                    const seed = wallet.getCosigner(keyIndex);
                    setVaultKeyData({
                      keyIndex,
                      seed,
                      xpub: '',
                      fp: '',
                      path: '',
                      isLoading: false,
                    });
                    setIsMnemonicsModalVisible(true);
                    const fp = wallet.getFingerprint(keyIndex);
                    const path = wallet.getCustomDerivationPathForCosigner(keyIndex);
                    const xpub = wallet.convertXpubToMultisignatureXpub(MultisigHDWallet.seedToXpub(seed, path));
                    setExportString(MultisigCosigner.exportToJson(fp, xpub, path));
                    setExportStringURv2(encodeUR(MultisigCosigner.exportToJson(fp, xpub, path))[0]);
                    setExportFilename('bw-cosigner-' + fp + '.json');
                  },
                }}
                dashes={MultipleStepsListItemDashType.topAndBottom}
              />
            )}
            <MultipleStepsListItem
              showActivityIndicator={vaultKeyData.keyIndex === el.index + 1 && vaultKeyData.isLoading}
              dashes={el.index === length - 1 ? MultipleStepsListItemDashType.top : MultipleStepsListItemDashType.topAndBottom}
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

  const handleUseMnemonicPhrase = async () => {
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
    return _handleUseMnemonicPhrase(importText, passphrase);
  };

  const _handleUseMnemonicPhrase = (mnemonic: string, passphrase: string) => {
    if (!wallet || !currentlyEditingCosignerNum) {
      // failsafe
      return;
    }

    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(mnemonic);
    if (!hd.validateMnemonic()) return presentAlert({ message: loc.multisig.invalid_mnemonics });
    try {
      wallet.replaceCosignerXpubWithSeed(currentlyEditingCosignerNum, hd.getSecret(), passphrase);
    } catch (e: any) {
      console.log(e);
      return presentAlert({ message: e.message });
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setWallet(wallet);
    setIsProvideMnemonicsModalVisible(false);
    setIsSaveButtonDisabled(false);
    setImportText('');
    setAskPassphrase(false);
  };

  const xpubInsteadOfSeed = (index: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      InteractionManager.runAfterInteractions(() => {
        try {
          wallet?.replaceCosignerSeedWithXpub(index);
        } catch (e: any) {
          reject(e);
          return presentAlert({ message: e.message });
        }
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setWallet(wallet);
        setIsSaveButtonDisabled(false);
        resolve();
      });
    });
  };

  const scanOrOpenFile = async () => {
    setIsProvideMnemonicsModalVisible(false);
    const scanned = await scanQrHelper(NavigationService.navigate, route.name, true);
    setImportText(String(scanned));
    setIsProvideMnemonicsModalVisible(true);
  };

  const hideProvideMnemonicsModal = () => {
    Keyboard.dismiss();
    setIsProvideMnemonicsModalVisible(false);
    setImportText('');
    setAskPassphrase(false);
  };

  const hideShareModal = () => {
    setIsShareModalVisible(false);
  };

  const renderProvideMnemonicsModal = () => {
    // @ts-ignore weird, property exists on typedefinition. might be some ts bugs
    const isPad: boolean = Platform.isPad;
    return (
      <BottomModal isVisible={isProvideMnemonicsModalVisible} onClose={hideProvideMnemonicsModal}>
        <KeyboardAvoidingView enabled={!isPad} behavior={Platform.OS === 'ios' ? 'position' : undefined}>
          <View style={[styles.modalContent, stylesHook.modalContent]}>
            <BlueTextCentered>{loc.multisig.type_your_mnemonics}</BlueTextCentered>
            <BlueSpacing20 />
            <BlueFormMultiInput value={importText} onChangeText={setImportText} />
            {isAdvancedModeEnabledRender && (
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
              <Button disabled={importText.trim().length === 0} title={loc.wallets.import_do_import} onPress={handleUseMnemonicPhrase} />
            )}
            <BlueButtonLink ref={openScannerButtonRef} disabled={isLoading} onPress={scanOrOpenFile} title={loc.wallets.import_scan_qr} />
          </View>
        </KeyboardAvoidingView>
      </BottomModal>
    );
  };

  const renderShareModal = () => {
    // @ts-ignore weird, property exists on typedefinition. might be some ts bugs
    const isPad: boolean = Platform.isPad;

    return (
      // @ts-ignore wtf doneButton
      <BottomModal isVisible={isShareModalVisible} onClose={hideShareModal} doneButton>
        <KeyboardAvoidingView enabled={!isPad} behavior={Platform.OS === 'ios' ? 'position' : undefined}>
          <View style={[styles.modalContent, stylesHook.modalContent, styles.alignItemsCenter]}>
            <Text style={[styles.headerText, stylesHook.textDestination]}>{loc.multisig.this_is_cosigners_xpub}</Text>
            <QRCodeComponent value={exportStringURv2} size={260} isLogoRendered={false} />
            <BlueSpacing20 />
            <View style={styles.squareButtonWrapper}>
              <SquareButton
                // @ts-ignore wtf style
                style={[styles.exportButton, stylesHook.exportButton]}
                onPress={exportCosigner}
                title={loc.multisig.share}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </BottomModal>
    );
  };

  if (isLoading)
    return (
      <View style={[styles.root, stylesHook.root]}>
        <BlueLoading />
      </View>
    );

  const howMany = (
    <Badge
      value={wallet?.getM() ?? 0}
      badgeStyle={[styles.tipLabel, stylesHook.tipLabel]}
      textStyle={[styles.tipLabelText, stylesHook.tipLabelText]}
    />
  );

  const andHere = (
    <Badge
      value={wallet?.howManySignaturesCanWeMake() ?? 0}
      badgeStyle={[styles.tipLabel, stylesHook.tipLabel]}
      textStyle={[styles.tipLabelText, stylesHook.tipLabelText]}
    />
  );

  const tipKeys = () => {
    return (
      <View>
        <BlueSpacing20 />
        <Text style={[styles.tipKeys, stylesHook.tipKeys]}>
          {loc.formatString(loc.multisig.signatures_required_to_spend, { number: howMany })}
          {loc.formatString(loc.multisig.signatures_we_can_make, { number: andHere })}
        </Text>
        <BlueSpacing10 />
        <BlueSpacing20 />
      </View>
    );
  };

  const footer = <Button disabled={vaultKeyData.isLoading || isSaveButtonDisabled} title={loc._.save} onPress={onSave} />;
  // @ts-ignore weird, property exists on typedefinition. might be some ts bugs
  const isPad: boolean = Platform.isPad;

  return (
    <View style={[styles.root, stylesHook.root]}>
      <KeyboardAvoidingView
        enabled={!isPad}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={62}
        style={[styles.mainBlock, styles.root]}
      >
        <FlatList
          ListHeaderComponent={tipKeys}
          data={data.current}
          extraData={vaultKeyData}
          renderItem={_renderKeyItem}
          keyExtractor={(_item, index) => `${index}`}
        />
        <BlueSpacing10 />
        {footer}
        <BlueSpacing40 />
      </KeyboardAvoidingView>

      {renderProvideMnemonicsModal()}

      {renderShareModal()}

      {renderMnemonicsModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemKeyUnprovidedWrapper: { flexDirection: 'row', paddingTop: 16 },
  textDestination: { fontWeight: '600' },
  vaultKeyText: { fontSize: 18, fontWeight: 'bold' },
  vaultKeyTextWrapper: { justifyContent: 'center', alignItems: 'center', paddingLeft: 16 },
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
  vaultKeyCircleSuccess: {
    width: 42,
    height: 42,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportButton: {
    height: 48,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  headerText: { fontSize: 15, color: '#13244D' },
  mainBlock: { marginHorizontal: 16 },
  alignItemsCenter: { alignItems: 'center' },
  squareButtonWrapper: { height: 50, width: 250 },
  tipKeys: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  tipLabel: {
    width: 30,
    marginRight: 6,
    position: 'relative',
    bottom: -3,
  },
  tipLabelText: {
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    justifyContent: 'space-between',
  },
});

ViewEditMultisigCosigners.navigationOptions = navigationStyle(
  {
    closeButton: true,
    headerBackVisible: false,
  },
  opts => ({ ...opts, headerTitle: loc.multisig.manage_keys }),
);

export default ViewEditMultisigCosigners;

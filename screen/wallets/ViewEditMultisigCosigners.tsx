import React, { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  findNodeHandle,
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
import { Badge, Icon } from '@rneui/themed';
import { isDesktop, isTablet } from '../../blue_modules/environment';
import { encodeUR } from '../../blue_modules/ur';
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
import SquareEnumeratedWords, { SquareEnumeratedWordsContentAlign } from '../../components/SquareEnumeratedWords';
import { useTheme } from '../../components/themes';
import prompt from '../../helpers/prompt';
import { scanQrHelper } from '../../helpers/scan-qr';
import { unlockWithBiometrics, useBiometrics } from '../../hooks/useBiometrics';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import usePrivacy from '../../hooks/usePrivacy';
import loc from '../../loc';
import ActionSheet from '../ActionSheet';
import { useStorage } from '../../hooks/context/useStorage';
import { useSettings } from '../../hooks/context/useSettings';

const ViewEditMultisigCosigners: React.FC = () => {
  const hasLoaded = useRef(false);
  const { colors } = useTheme();
  const { wallets, setWalletsWithNewOrder, isElectrumDisabled } = useStorage();
  const { isBiometricUseCapableAndEnabled } = useBiometrics();
  const { isAdvancedModeEnabled } = useSettings();
  const { navigate, dispatch, addListener } = useExtendedNavigation();
  const openScannerButtonRef = useRef();
  const route = useRoute();
  const { walletID } = route.params as { walletID: string };
  const w = useRef(wallets.find(wallet => wallet.getID() === walletID));
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
  const [vaultKeyData, setVaultKeyData] = useState({ keyIndex: 1, xpub: '', seed: '', passphrase: '', path: '', fp: '', isLoading: false }); // string rendered in modal
  const [askPassphrase, setAskPassphrase] = useState(false);
  const data = useRef<any[]>();
  /* discardChangesRef is only so the action sheet can be shown on mac catalyst when a 
    user tries to leave the screen with unsaved changes.
    Why the container view ? It was the easiest to get the ref for. No other reason.
  */
  const discardChangesRef = useRef<View>(null);
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
  useFocusEffect(
    useCallback(() => {
      const unsubscribe = addListener('beforeRemove', (e: { preventDefault: () => void; data: { action: any } }) => {
        // Check if there are unsaved changes
        if (isSaveButtonDisabled) {
          // If there are no unsaved changes, let the user leave the screen
          return;
        }

        // Prevent the default action (going back)
        e.preventDefault();

        // Show an alert asking the user to discard changes or cancel
        if (isDesktop) {
          if (!discardChangesRef.current) return dispatch(e.data.action);
          const anchor = findNodeHandle(discardChangesRef.current);
          if (!anchor) return dispatch(e.data.action);
          ActionSheet.showActionSheetWithOptions(
            {
              options: [loc._.cancel, loc._.ok],
              cancelButtonIndex: 0,
              title: loc._.discard_changes,
              message: loc._.discard_changes_explain,
              anchor,
            },
            buttonIndex => {
              if (buttonIndex === 1) {
                dispatch(e.data.action);
              }
            },
          );
        } else {
          Alert.alert(loc._.discard_changes, loc._.discard_changes_explain, [
            { text: loc._.cancel, style: 'cancel', onPress: () => {} },
            {
              text: loc._.ok,
              style: 'default',
              // If the user confirms, then we dispatch the action we blocked earlier
              onPress: () => dispatch(e.data.action),
            },
          ]);
        }
      });

      return unsubscribe;
    }, [isSaveButtonDisabled, addListener, dispatch]),
  );

  const saveFileButtonAfterOnPress = () => {
    setIsShareModalVisible(false);
  };

  const onSave = async () => {
    if (!wallet) {
      throw new Error('Wallet is undefined');
    }
    setIsLoading(true);

    const isBiometricsEnabled = await isBiometricUseCapableAndEnabled();

    if (isBiometricsEnabled) {
      if (!(await unlockWithBiometrics())) {
        setIsLoading(false);
        return;
      }
    }

    // eslint-disable-next-line prefer-const
    let newWallets = wallets.filter(newWallet => {
      return newWallet.getID() !== walletID;
    }) as MultisigHDWallet[];
    if (!isElectrumDisabled) {
      await wallet?.fetchBalance();
    }
    newWallets.push(wallet);
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
    }, [walletID]),
  );

  const hideMnemonicsModal = () => {
    Keyboard.dismiss();
    setIsMnemonicsModalVisible(false);
  };

  const renderMnemonicsModal = () => {
    return (
      <BottomModal isVisible={isMnemonicsModalVisible} onClose={hideMnemonicsModal} coverScreen={false}>
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
              {vaultKeyData.passphrase.length > 1 && (
                <Text style={[styles.textDestination, stylesHook.textDestination]}>{vaultKeyData.passphrase}</Text>
              )}
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
                    if (!path) {
                      presentAlert({ message: 'Cannot find derivation path for this cosigner' });
                      return;
                    }
                    setVaultKeyData({
                      keyIndex,
                      seed: '',
                      passphrase: '',
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
                    const passphrase = wallet.getCosignerPassphrase(keyIndex);
                    setVaultKeyData({
                      keyIndex,
                      seed,
                      xpub: '',
                      fp: '',
                      path: '',
                      passphrase: passphrase ?? '',
                      isLoading: false,
                    });
                    setIsMnemonicsModalVisible(true);
                    const fp = wallet.getFingerprint(keyIndex);
                    const path = wallet.getCustomDerivationPathForCosigner(keyIndex);
                    if (!path) {
                      presentAlert({ message: 'Cannot find derivation path for this cosigner' });
                      return;
                    }
                    const xpub = wallet.convertXpubToMultisignatureXpub(MultisigHDWallet.seedToXpub(seed, path, passphrase));
                    setExportString(MultisigCosigner.exportToJson(fp, xpub, path));
                    setExportStringURv2(encodeUR(MultisigCosigner.exportToJson(fp, xpub, path))[0]);
                    setExportFilename('bw-cosigner-' + fp + '.json');
                  },
                }}
                dashes={MultipleStepsListItemDashType.topAndBottom}
              />
            )}

            <MultipleStepsListItem
              useActionSheet
              actionSheetOptions={{
                options: [loc._.cancel, loc.multisig.confirm],
                title: loc._.seed,
                message: loc.multisig.are_you_sure_seed_will_be_lost,
                cancelButtonIndex: 0,
                confirmButtonIndex: 1,
              }}
              showActivityIndicator={vaultKeyData.keyIndex === el.index + 1 && vaultKeyData.isLoading}
              dashes={el.index === length - 1 ? MultipleStepsListItemDashType.top : MultipleStepsListItemDashType.topAndBottom}
              button={{
                text: loc.multisig.forget_this_seed,
                disabled: vaultKeyData.isLoading,
                buttonType: MultipleStepsListItemButtohType.full,

                onPress: (buttonIndex: number) => {
                  if (buttonIndex === 0) return;
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

  const _handleUseMnemonicPhrase = (mnemonic: string, passphrase?: string) => {
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
    const scanned = await scanQrHelper(route.name, true);
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
    return (
      <BottomModal avoidKeyboard isVisible={isProvideMnemonicsModalVisible} onClose={hideProvideMnemonicsModal} coverScreen={false}>
        <KeyboardAvoidingView enabled={!isTablet} behavior={Platform.OS === 'ios' ? 'position' : 'padding'} keyboardVerticalOffset={120}>
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
              <Button disabled={importText.trim().length === 0} title={loc.wallets.import_do_import} onPress={handleUseMnemonicPhrase} />
            )}
            <BlueButtonLink ref={openScannerButtonRef} disabled={isLoading} onPress={scanOrOpenFile} title={loc.wallets.import_scan_qr} />
          </View>
        </KeyboardAvoidingView>
      </BottomModal>
    );
  };

  const renderShareModal = () => {
    return (
      <BottomModal isVisible={isShareModalVisible} onClose={hideShareModal} doneButton coverScreen={false}>
        <KeyboardAvoidingView enabled={!isTablet} behavior={Platform.OS === 'ios' ? 'position' : undefined}>
          <View style={[styles.modalContent, stylesHook.modalContent, styles.alignItemsCenter]}>
            <Text style={[styles.headerText, stylesHook.textDestination]}>
              {loc.multisig.this_is_cosigners_xpub} {Platform.OS === 'ios' ? loc.multisig.this_is_cosigners_xpub_airdrop : ''}
            </Text>
            <QRCodeComponent value={exportStringURv2} size={260} isLogoRendered={false} />
            <BlueSpacing20 />
            <View style={styles.squareButtonWrapper}>
              <SaveFileButton
                style={[styles.exportButton, stylesHook.exportButton]}
                fileContent={exportString}
                fileName={exportFilename}
                afterOnPress={saveFileButtonAfterOnPress}
              >
                <SquareButton title={loc.multisig.share} />
              </SaveFileButton>
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

  return (
    <View style={[styles.root, stylesHook.root]} ref={discardChangesRef}>
      <KeyboardAvoidingView
        enabled={!isTablet}
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

export default ViewEditMultisigCosigners;

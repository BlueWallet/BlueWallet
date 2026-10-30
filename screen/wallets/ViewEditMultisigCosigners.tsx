import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation, RouteProp, useFocusEffect, useRoute, usePreventRemove } from '@react-navigation/native';
import { Alert, findNodeHandle, FlatList, GestureResponderEvent, ListRenderItemInfo, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Badge from '../../components/Badge';
import { isDesktop } from '../../blue_modules/environment';
import { encodeUR } from '../../blue_modules/ur';
import { MultisigCosigner } from '../../class/multisig-cosigner';
import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';
import { MultisigHDWallet } from '../../class/wallets/multisig-hd-wallet';
import presentAlert from '../../components/Alert';
import Button from '../../components/Button';
import MultipleStepsListItem, {
  MultipleStepsListItemButtonType,
  MultipleStepsListItemDashType,
} from '../../components/MultipleStepsListItem';
import { useTheme } from '../../components/themes';
import prompt from '../../helpers/prompt';
import { unlockWithBiometrics, useBiometrics } from '../../hooks/useBiometrics';
import { useScreenProtect } from '../../hooks/useScreenProtect';
import loc from '../../loc';
import ActionSheet from '../ActionSheet';
import { useStorage } from '../../hooks/context/useStorage';
import { useSettings } from '../../hooks/context/useSettings';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TWallet } from '../../class/wallets/types';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { BlueLoading } from '../../components/BlueLoading';
import { navigateToWalletsList } from '../../NavigationService';
import { errorMessage } from '../../helpers/errorMessage';

type RouteParams = RouteProp<DetailViewStackParamList, 'ViewEditMultisigCosigners'>;
type NavigationProp = NativeStackNavigationProp<DetailViewStackParamList, 'ViewEditMultisigCosigners'>;

const ViewEditMultisigCosigners: React.FC = () => {
  const hasLoaded = useRef(false);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { wallets, setWalletsWithNewOrder } = useStorage();
  const { isBiometricUseCapableAndEnabled } = useBiometrics();
  const { isElectrumDisabled, isPrivacyBlurEnabled } = useSettings();
  const { enableScreenProtect, disableScreenProtect } = useScreenProtect();
  const { dispatch, navigate, setParams, goBack } = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const { walletID } = route.params;
  const w = useRef(wallets.find(wallet => wallet.getID() === walletID));
  const tempWallet = useRef(new MultisigHDWallet());
  const [wallet, setWallet] = useState<MultisigHDWallet>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaveButtonDisabled, setIsSaveButtonDisabled] = useState(true);
  const [currentlyEditingCosignerNum, setCurrentlyEditingCosignerNum] = useState<number | false>(false);
  const [importText, setImportText] = useState('');
  const [vaultKeyData, setVaultKeyData] = useState({ keyIndex: 1, xpub: '', seed: '', passphrase: '', path: '', fp: '', isLoading: false }); // string rendered in modal
  const [isVaultKeyIndexDataLoading, setIsVaultKeyIndexDataLoading] = useState<number | undefined>(undefined);
  const [askPassphrase, setAskPassphrase] = useState(false);
  const [walletData, setWalletData] = useState<TWallet[]>([]);
  const saveButtonRef = useRef<React.ElementRef<typeof Button>>(null);

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
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
    footer: {
      paddingBottom: Math.max(insets.bottom, 16),
    },
  });

  usePreventRemove(!isSaveButtonDisabled, ({ data }) => {
    const anchor = isDesktop && saveButtonRef.current ? findNodeHandle(saveButtonRef.current) : null;

    if (anchor) {
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
            dispatch(data.action);
          }
        },
      );
      return;
    }

    Alert.alert(loc._.discard_changes, loc._.discard_changes_explain, [
      { text: loc._.cancel, style: 'cancel', onPress: () => {} },
      {
        text: loc._.ok,
        style: 'default',
        onPress: () => dispatch(data.action),
      },
    ]);
  });

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

    setParams({ headerRight: null });

    setTimeout(async () => {
      try {
        // eslint-disable-next-line prefer-const
        let newWallets = wallets.filter(newWallet => {
          return newWallet.getID() !== walletID;
        }) as MultisigHDWallet[];
        if (!isElectrumDisabled) {
          await wallet?.fetchBalance();
        }
        newWallets.push(wallet);
        setIsSaveButtonDisabled(true);
        setWalletsWithNewOrder(newWallets);
        setTimeout(() => {
          navigateToWalletsList();
        }, 500);
      } catch (error) {
        setIsLoading(false);
        setParams({ headerRight: undefined });
        presentAlert({ message: errorMessage(error) });
      }
    }, 100);
  };

  useFocusEffect(
    useCallback(() => {
      if (isPrivacyBlurEnabled) enableScreenProtect();

      // useFocusEffect is called on willAppear (example: when camera dismisses). we want to avoid this.
      if (!hasLoaded.current) {
        setIsLoading(true);

        let cancelled = false;
        (async () => {
          if (!w.current) {
            w.current = new MultisigHDWallet();
            w.current.setNativeSegwit();
          } else {
            try {
              if (!(w.current instanceof MultisigHDWallet)) {
                throw new Error('Not a multisig wallet');
              }
              tempWallet.current = w.current.cloneCosigners();
              if (!cancelled) {
                setWalletData(Array.from({ length: tempWallet.current.getN() }));
                setWallet(tempWallet.current);
              }
            } catch (_) {
              hasLoaded.current = true;
              setIsLoading(false);
              return Alert.alert(
                loc.multisig.manage_keys,
                loc.multisig.invalid_cosigner,
                [
                  {
                    text: loc._.ok,
                    onPress: async () => {
                      goBack();
                    },
                    style: 'default',
                  },
                ],
                { cancelable: false },
              );
            }
          }
          hasLoaded.current = true;
          if (!cancelled) setIsLoading(false);
        })();
        return () => {
          disableScreenProtect();
          cancelled = true;
        };
      }
      return () => {
        disableScreenProtect();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [walletID]),
  );

  const _renderKeyItem = (el: ListRenderItemInfo<TWallet>) => {
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

    const length = walletData.length;

    return (
      <View>
        <MultipleStepsListItem
          checked
          circledText={String(el.index + 1)}
          leftText={loc.formatString(loc.multisig.vault_key, { number: el.index + 1 })}
          dashes={el.index === length - 1 ? MultipleStepsListItemDashType.Bottom : MultipleStepsListItemDashType.TopAndBottom}
        />

        {isXpub ? (
          <View>
            {!vaultKeyData.isLoading && (
              <MultipleStepsListItem
                button={{
                  testID: 'VaultCosignerView' + String(el.index + 1),
                  buttonType: MultipleStepsListItemButtonType.Partial,
                  leadingIcon: 'eye',
                  leftText,
                  text: loc.multisig.view,
                  showActivityIndicator: isVaultKeyIndexDataLoading === el.index + 1,
                  disabled: vaultKeyData.isLoading,
                  onPress: () => {
                    setIsVaultKeyIndexDataLoading(el.index + 1);
                    setTimeout(() => {
                      const keyIndex = el.index + 1;
                      const xpub = wallet.getCosigner(keyIndex);
                      const fp = wallet.getFingerprint(keyIndex);
                      const path = wallet.getCustomDerivationPathForCosigner(keyIndex);
                      if (!path) {
                        presentAlert({ message: 'Cannot find derivation path for this cosigner' });
                        return;
                      }
                      const exportJson = MultisigCosigner.exportToJson(fp, xpub, path);
                      const exportFilenameValue = 'bw-cosigner-' + fp + '.json';
                      const exportUr = encodeUR(exportJson, 175, null)[0];
                      setVaultKeyData({
                        keyIndex,
                        seed: '',
                        passphrase: '',
                        xpub,
                        fp,
                        path,
                        isLoading: false,
                      });
                      navigate('ViewEditMultisigCosignerViewSheet', {
                        walletID,
                        vaultKeyData: {
                          keyIndex,
                          seed: '',
                          passphrase: '',
                          xpub,
                          fp,
                          path,
                          cosignerXpubURv2: exportUr,
                          exportFilename: exportFilenameValue,
                          exportString: exportJson,
                        },
                      });
                      setIsVaultKeyIndexDataLoading(undefined);
                    }, 100);
                  },
                }}
                dashes={MultipleStepsListItemDashType.TopAndBottom}
              />
            )}
            <MultipleStepsListItem
              showActivityIndicator={vaultKeyData.keyIndex === el.index + 1 && vaultKeyData.isLoading}
              button={{
                testID: 'VaultCosignerImportMnemonics' + String(el.index + 1),
                text: loc.multisig.i_have_mnemonics,
                buttonType: MultipleStepsListItemButtonType.Full,
                disabled: vaultKeyData.isLoading,
                onPress: () => {
                  setCurrentlyEditingCosignerNum(el.index + 1);
                  navigate('ViewEditMultisigProvideMnemonicsSheet', {
                    walletID,
                    currentlyEditingCosignerNum: el.index + 1,
                    importText,
                    askPassphrase,
                  });
                },
              }}
              dashes={el.index === length - 1 ? MultipleStepsListItemDashType.Top : MultipleStepsListItemDashType.TopAndBottom}
            />
          </View>
        ) : (
          <View>
            {!vaultKeyData.isLoading && (
              <MultipleStepsListItem
                showActivityIndicator={vaultKeyData.keyIndex === el.index + 1 && vaultKeyData.isLoading}
                button={{
                  testID: 'VaultCosignerView' + String(el.index + 1),
                  leftText,
                  text: loc.multisig.view,
                  disabled: vaultKeyData.isLoading,
                  showActivityIndicator: isVaultKeyIndexDataLoading === el.index + 1,
                  buttonType: MultipleStepsListItemButtonType.Partial,
                  leadingIcon: 'signature',
                  onPress: () => {
                    setIsVaultKeyIndexDataLoading(el.index + 1);
                    setTimeout(() => {
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
                      const fp = wallet.getFingerprint(keyIndex);
                      const path = wallet.getCustomDerivationPathForCosigner(keyIndex);
                      if (!path) {
                        presentAlert({ message: 'Cannot find derivation path for this cosigner' });
                        return;
                      }
                      const xpub = wallet.convertXpubToMultisignatureXpub(MultisigHDWallet.seedToXpub(seed, path, passphrase));
                      const exportJson = MultisigCosigner.exportToJson(fp, xpub, path);
                      const exportFilenameValue = 'bw-cosigner-' + fp + '.json';
                      const exportUr = encodeUR(exportJson, 175, null)[0];
                      setAskPassphrase(false);
                      navigate('ViewEditMultisigCosignerViewSheet', {
                        walletID,
                        vaultKeyData: {
                          keyIndex,
                          seed,
                          xpub,
                          fp,
                          path,
                          passphrase: passphrase ?? '',
                          cosignerXpubURv2: exportUr,
                          exportFilename: exportFilenameValue,
                          exportString: exportJson,
                        },
                      });
                      setIsVaultKeyIndexDataLoading(undefined);
                    }, 100);
                  },
                }}
                dashes={MultipleStepsListItemDashType.TopAndBottom}
              />
            )}

            <MultipleStepsListItem
              actionSheetOptions={{
                options: [loc._.cancel, loc.multisig.confirm],
                title: loc._.seed,
                message: loc.multisig.are_you_sure_seed_will_be_lost,
                cancelButtonIndex: 0,
                confirmButtonIndex: 1,
              }}
              showActivityIndicator={vaultKeyData.keyIndex === el.index + 1 && vaultKeyData.isLoading}
              dashes={el.index === length - 1 ? MultipleStepsListItemDashType.Top : MultipleStepsListItemDashType.TopAndBottom}
              button={{
                testID: 'VaultCosignerForgetSeed' + String(el.index + 1),
                text: loc.multisig.forget_this_seed,
                disabled: vaultKeyData.isLoading,
                buttonType: MultipleStepsListItemButtonType.Full,

                onPress: (e: number | GestureResponderEvent) => {
                  if (e === 0) return;
                  setVaultKeyData({
                    ...vaultKeyData,
                    isLoading: true,
                    keyIndex: el.index + 1,
                  });
                  setTimeout(
                    () =>
                      xpubInsteadOfSeed(el.index + 1).finally(() => {
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

  const _handleUseMnemonicPhrase = useCallback(
    (mnemonic: string, passphrase?: string, cosignerNumOverride?: number) => {
      const cosignerNum = cosignerNumOverride ?? currentlyEditingCosignerNum;
      if (!wallet || !cosignerNum) {
        // failsafe
        return;
      }

      const hd = new HDSegwitBech32Wallet();
      hd.setSecret(mnemonic);
      if (!hd.validateMnemonic() && !MultisigHDWallet.isValidElectrumSeed(hd.getSecret()))
        return presentAlert({ message: loc.multisig.invalid_mnemonics });
      try {
        wallet.replaceCosignerXpubWithSeed(cosignerNum, hd.getSecret(), passphrase);
      } catch (e) {
        console.log(e);
        return presentAlert({ message: errorMessage(e) });
      }

      setWallet(wallet);
      setIsSaveButtonDisabled(false);
      setImportText('');
      setAskPassphrase(false);
    },
    [wallet, currentlyEditingCosignerNum],
  );

  const handleUseMnemonicPhrase = useCallback(
    async ({
      mnemonicOverride,
      askPassphraseOverride,
      cosignerNumOverride,
    }: { mnemonicOverride?: string; askPassphraseOverride?: boolean; cosignerNumOverride?: number } = {}) => {
      const mnemonicToUse = (mnemonicOverride ?? importText).trim();
      if (!mnemonicToUse) return;
      const shouldAskPassphrase = askPassphraseOverride ?? askPassphrase;
      let passphrase;
      if (shouldAskPassphrase) {
        try {
          passphrase = await prompt(loc.wallets.import_passphrase_title, loc.wallets.import_passphrase_message);
        } catch (e) {
          if (errorMessage(e) === 'Cancel Pressed') {
            setIsLoading(false);
            return;
          }
          throw e;
        }
      }
      return _handleUseMnemonicPhrase(mnemonicToUse, passphrase, cosignerNumOverride);
    },
    [askPassphrase, importText, _handleUseMnemonicPhrase],
  );

  const xpubInsteadOfSeed = (index: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        wallet?.replaceCosignerSeedWithXpub(index);
      } catch (e) {
        reject(e);
        return presentAlert({ message: errorMessage(e) });
      }
      setWallet(wallet);
      setIsSaveButtonDisabled(false);
      resolve();
    });
  };

  useEffect(() => {
    if (route.params.sheetAction === 'importMnemonic' && route.params.sheetImportText) {
      const targetCosignerNum = route.params.sheetCurrentlyEditingCosignerNum;
      if (targetCosignerNum) setCurrentlyEditingCosignerNum(targetCosignerNum);
      setImportText(route.params.sheetImportText);
      setAskPassphrase(!!route.params.sheetAskPassphrase);
      handleUseMnemonicPhrase({
        mnemonicOverride: route.params.sheetImportText,
        askPassphraseOverride: route.params.sheetAskPassphrase,
        cosignerNumOverride: targetCosignerNum,
      });
      setParams({
        sheetAction: undefined,
        sheetImportText: undefined,
        sheetAskPassphrase: undefined,
        sheetCurrentlyEditingCosignerNum: undefined,
      });
    }
  }, [
    handleUseMnemonicPhrase,
    route.params.sheetAction,
    route.params.sheetImportText,
    route.params.sheetAskPassphrase,
    route.params.sheetCurrentlyEditingCosignerNum,
    setParams,
  ]);

  if (isLoading)
    return (
      <View style={[styles.root, stylesHook.root]}>
        <BlueLoading />
      </View>
    );

  const renderCountPhrase = (template: string, value: number) => {
    const [before = '', after = ''] = template.split('{number}');
    const leading = before.trim();
    const trailing = after.trim();
    return (
      <View style={styles.tipPhrase}>
        {leading.length > 0 ? <Text style={[styles.tipKeys, stylesHook.tipKeys]}>{leading}</Text> : null}
        <Badge
          value={value}
          badgeStyle={[styles.tipLabel, stylesHook.tipLabel]}
          textStyle={[styles.tipLabelText, stylesHook.tipLabelText]}
        />
        {trailing.length > 0 ? <Text style={[styles.tipKeys, stylesHook.tipKeys]}>{trailing}</Text> : null}
      </View>
    );
  };

  const tipKeys = () => {
    return (
      <View style={styles.tipKeysContainer}>
        <View style={styles.tipKeysRow}>
          {renderCountPhrase(loc.multisig.signatures_required_to_spend, wallet?.getM() ?? 0)}
          {renderCountPhrase(loc.multisig.signatures_we_can_make, wallet?.howManySignaturesCanWeMake() ?? 0)}
        </View>
      </View>
    );
  };

  const footer = (
    <Button
      ref={saveButtonRef}
      testID="VaultCosignersSave"
      disabled={vaultKeyData.isLoading || isSaveButtonDisabled}
      title={loc._.save}
      onPress={onSave}
    />
  );

  return (
    <View style={[styles.root, stylesHook.root]}>
      <FlatList
        testID="ViewEditMultisigCosignersFlatList"
        ListHeaderComponent={tipKeys}
        data={walletData}
        extraData={vaultKeyData}
        renderItem={_renderKeyItem}
        automaticallyAdjustKeyboardInsets
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        scrollToOverflowEnabled
        keyExtractor={(_item, index) => `${index}`}
        contentContainerStyle={styles.contentContainerStyle}
      />
      <View style={[styles.footer, stylesHook.footer]}>{footer}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  contentContainerStyle: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  tipKeysContainer: {
    paddingTop: 16,
    paddingBottom: 28,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  tipKeysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: 10,
    rowGap: 8,
  },
  tipPhrase: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tipKeys: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    includeFontPadding: false,
  },
  tipLabel: {
    width: 28,
    height: 28,
    minWidth: 28,
    minHeight: 28,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 14,
  },
  tipLabelText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 18,
    textAlign: 'center',
    includeFontPadding: false,
  },
});

export default ViewEditMultisigCosigners;

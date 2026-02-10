import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { Icon } from '@rneui/themed';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { encodeUR } from '../../blue_modules/ur';
import { HDSegwitBech32Wallet, MultisigCosigner, MultisigHDWallet } from '../../class';
import presentAlert from '../../components/Alert';
import Button from '../../components/Button';
import { useTheme } from '../../components/themes';
import confirm from '../../helpers/confirm';
import prompt from '../../helpers/prompt';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { useSettings } from '../../hooks/context/useSettings';
import MultipleStepsListItem, {
  MultipleStepsListItemButtonType,
  MultipleStepsListItemDashType,
} from '../../components/MultipleStepsListItem';
import { useScreenProtect } from '../../hooks/useScreenProtect';
import { BlueSpacing20 } from '../../components/BlueSpacing';

type MultisigStep2Params = {
  m: number;
  n: number;
  format: number | string;
  walletLabel: string;
  onBarScanned?: { data?: string } | string;
  sheetAction?: string;
  sheetImportText?: string;
  sheetAskPassphrase?: boolean;
};

type CosignerTuple = [string, string | false, string | false, string?];
type StaticCache = Record<string, string>;

const staticCache: StaticCache = {};

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const WalletsAddMultisigStep2 = () => {
  const { addAndSaveWallet, sleep, currentSharedCosigner, setSharedCosigner } = useStorage();
  const { enableScreenProtect, disableScreenProtect } = useScreenProtect();
  const { colors } = useTheme();

  const navigation = useExtendedNavigation();
  const route = useRoute<RouteProp<{ WalletsAddMultisigStep2: MultisigStep2Params }, 'WalletsAddMultisigStep2'>>();
  const params = route.params;
  const { m, n, format, walletLabel } = params;
  const [cosigners, setCosigners] = useState<CosignerTuple[]>([]); // array of cosigners user provided. if format [cosigner, fp, path]
  const [isLoading, setIsLoading] = useState(false);
  const [vaultKeyData, setVaultKeyData] = useState({ keyIndex: 1, xpub: '', seed: '', isLoading: false }); // string rendered in modal
  const [importText, setImportText] = useState('');
  const [askPassphrase, setAskPassphrase] = useState(false);
  const { isPrivacyBlurEnabled, isElectrumDisabled } = useSettings();
  const data = useRef<Array<null | undefined>>(new Array(n));

  useFocusEffect(
    useCallback(() => {
      if (isPrivacyBlurEnabled) {
        enableScreenProtect();
      }
      return () => {
        disableScreenProtect();
      };
    }, [isPrivacyBlurEnabled, enableScreenProtect, disableScreenProtect]),
  );

  useEffect(() => {
    console.log(currentSharedCosigner);
    if (currentSharedCosigner) {
      (async function () {
        if (await confirm(loc.multisig.shared_key_detected, loc.multisig.shared_key_detected_question)) {
          setImportText(currentSharedCosigner);
          navigation.navigate('WalletsAddMultisigProvideMnemonicsSheet', {
            importText: currentSharedCosigner,
            askPassphrase,
          });
          setSharedCosigner('');
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSharedCosigner]);

  const handleOnHelpPress = useCallback(() => {
    navigation.navigate('WalletsAddMultisigHelp');
  }, [navigation]);

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      // eslint-disable-next-line react/no-unstable-nested-components
      headerRight: () => (
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.helpButton, { backgroundColor: colors.buttonDisabledBackgroundColor }]}
          onPress={handleOnHelpPress}
        >
          <Icon size={20} name="help" type="octaicon" color={colors.foregroundColor} />
          <Text style={[styles.helpButtonText, { color: colors.foregroundColor }]}>{loc.multisig.ms_help}</Text>
        </TouchableOpacity>
      ),
    });
  }, [colors.buttonDisabledBackgroundColor, colors.foregroundColor, handleOnHelpPress, navigation]);

  const onCreate = async () => {
    setIsLoading(true);
    navigation.setOptions({ headerBackVisible: false });
    await sleep(100);
    try {
      await _onCreate(); // this can fail with "Duplicate fingerprint" error or other
    } catch (e) {
      setIsLoading(false);
      navigation.setOptions({ headerBackVisible: true });
      const message = e instanceof Error ? e.message : String(e);
      presentAlert({ message });
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
        console.error('Unexpected format:', format);
        throw new Error('This should never happen');
    }
    for (const cc of cosigners) {
      const fp = (cc[1] || getFpCacheForMnemonics(cc[0], cc[3])) as string;
      const path = typeof cc[2] === 'string' && cc[2] ? cc[2] : getPath();
      w.addCosigner(cc[0], fp, path, cc[3]);
    }
    w.setLabel(walletLabel);
    if (!isElectrumDisabled) {
      await w.fetchBalance();
    }

    addAndSaveWallet(w);

    triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
    navigation.getParent()?.goBack();
  };

  const getPath = useCallback(() => {
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
        console.error('Unexpected format:', format);
        throw new Error('This should never happen');
    }
    return path;
  }, [format]);

  const setXpubCacheForMnemonics = useCallback(
    (seed: string, passphrase?: string) => {
      const path = getPath();
      const w = new MultisigHDWallet();
      w.setDerivationPath(path);
      staticCache[seed + path + passphrase] = w.convertXpubToMultisignatureXpub(MultisigHDWallet.seedToXpub(seed, path, passphrase));
      return staticCache[seed + path + passphrase];
    },
    [getPath],
  );

  const setFpCacheForMnemonics = useCallback((seed: string, passphrase?: string) => {
    staticCache[seed + (passphrase ?? '')] = MultisigHDWallet.mnemonicToFingerprint(seed, passphrase);
    return staticCache[seed + (passphrase ?? '')];
  }, []);

  const getXpubCacheForMnemonics = useCallback(
    (seed: string, passphrase?: string) => {
      const path = getPath();
      return staticCache[seed + path + passphrase] || setXpubCacheForMnemonics(seed, passphrase);
    },
    [getPath, setXpubCacheForMnemonics],
  );

  const getFpCacheForMnemonics = useCallback(
    (seed: string, passphrase?: string) => {
      return staticCache[seed + (passphrase ?? '')] || setFpCacheForMnemonics(seed, passphrase);
    },
    [setFpCacheForMnemonics],
  );

  const generateNewKey = useCallback(() => {
    const w = new HDSegwitBech32Wallet();
    w.generate().then(() => {
      const cosignersCopy = [...cosigners];
      cosignersCopy.push([w.getSecret(), false, false]);
      setCosigners(cosignersCopy);
      setVaultKeyData({ keyIndex: cosignersCopy.length, seed: w.getSecret(), xpub: w.getXpub(), isLoading: false });
      setIsLoading(true);
      navigation.navigate('WalletsAddMultisigVaultKeySheet', {
        keyIndex: cosignersCopy.length,
        seed: w.getSecret(),
      });
      setTimeout(() => {
        // filling cache
        setXpubCacheForMnemonics(w.getSecret());
        setFpCacheForMnemonics(w.getSecret());
        setIsLoading(false);
      }, 500);
    });
  }, [cosigners, navigation, setFpCacheForMnemonics, setXpubCacheForMnemonics]);

  const viewKey = useCallback(
    (cosigner: CosignerTuple) => {
      if (MultisigHDWallet.isXpubValid(cosigner[0])) {
        const cosignerJson = MultisigCosigner.exportToJson(cosigner[1] as string, cosigner[0], cosigner[2] as string);
        const cosignerUR = encodeUR(cosignerJson, 175, null)[0];
        const filename = 'bw-cosigner-' + cosigner[1] + '.bwcosigner';
        navigation.navigate('WalletsAddMultisigCosignerXpubSheet', {
          cosignerXpub: cosignerJson,
          cosignerXpubURv2: cosignerUR,
          cosignerXpubFilename: filename,
        });
      } else {
        const path = getPath();

        const xpub = getXpubCacheForMnemonics(cosigner[0], cosigner[3]);
        const fp = getFpCacheForMnemonics(cosigner[0], cosigner[3]);
        const cosignerJson = MultisigCosigner.exportToJson(fp, xpub, path);
        const cosignerUR = encodeUR(cosignerJson, 175, null)[0];
        const filename = 'bw-cosigner-' + fp + '.bwcosigner';
        navigation.navigate('WalletsAddMultisigCosignerXpubSheet', {
          cosignerXpub: cosignerJson,
          cosignerXpubURv2: cosignerUR,
          cosignerXpubFilename: filename,
        });
      }
    },
    [getPath, getFpCacheForMnemonics, getXpubCacheForMnemonics, navigation],
  );

  const iHaveMnemonics = useCallback(() => {
    navigation.navigate('WalletsAddMultisigProvideMnemonicsSheet', {
      importText,
      askPassphrase,
    });
  }, [askPassphrase, importText, navigation]);

  const tryUsingXpub = useCallback(
    async (xpub: string, fp?: string, path?: string) => {
      if (!MultisigHDWallet.isXpubForMultisig(xpub)) {
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

      setIsLoading(false);
      setImportText('');
      setAskPassphrase(false);

      const cosignersCopy = [...cosigners];
      cosignersCopy.push([xpub, fp ?? false, path ?? false]);
      setCosigners(cosignersCopy);
    },
    [cosigners, getPath],
  );

  const isValidMnemonicSeed = (mnemonicSeed: string) => {
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(mnemonicSeed);
    return hd.validateMnemonic();
  };

  const onBarScanned = useCallback(
    async (ret: { data?: string } | string) => {
      const payload = typeof ret === 'string' ? { data: ret } : ret;
      const dataString = payload.data ?? '';

      try {
        let retData = JSON.parse(dataString);
        if (Array.isArray(retData) && retData.length === 1) {
          // UR:CRYPTO-ACCOUNT now parses as an array of accounts, even if it is just one,
          // so in case of cosigner data its gona be an array of 1 cosigner account. lets pop it for
          // the code that expects it
          retData = retData.pop();
          payload.data = JSON.stringify(retData);
        }
      } catch (e) {
        console.debug('JSON parsing failed for returnedData:', e);
      }

      if ((payload.data ?? '').toUpperCase().startsWith('UR')) {
        presentAlert({ message: 'BC-UR not decoded. This should never happen' });
      } else if (isValidMnemonicSeed(payload.data ?? '')) {
        setImportText(payload.data ?? '');
        navigation.navigate('WalletsAddMultisigProvideMnemonicsSheet', {
          importText: payload.data ?? '',
          askPassphrase,
        });
      } else {
        if (payload.data && MultisigHDWallet.isXpubValid(payload.data) && !MultisigHDWallet.isXpubForMultisig(payload.data)) {
          return presentAlert({ message: loc.multisig.not_a_multisignature_xpub });
        }
        if (payload.data && MultisigHDWallet.isXpubValid(payload.data)) {
          return tryUsingXpub(payload.data);
        }
        if (!payload.data) {
          return presentAlert({ message: loc.multisig.invalid_cosigner });
        }

        let cosigner = new MultisigCosigner(payload.data);
        if (!cosigner.isValid()) {
          return presentAlert({ message: loc.multisig.invalid_cosigner });
        }

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
                console.error('Unexpected format:', format);
                throw new Error('This should never happen');
            }
          }
        }

        for (const existingCosigner of cosigners) {
          let existingXpub = existingCosigner[0];
          if (!MultisigHDWallet.isXpubValid(existingXpub)) {
            // derive the xpub from mnemonic-based cosigner
            existingXpub = getXpubCacheForMnemonics(existingCosigner[0], existingCosigner[3]);
          }
          if (existingXpub === cosigner.getXpub()) {
            return presentAlert({ message: loc.multisig.this_cosigner_is_already_imported });
          }
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
            console.error('Unexpected format:', format);
            throw new Error('This should never happen');
        }
        if (!correctFormat) {
          return presentAlert({ message: loc.formatString(loc.multisig.invalid_cosigner_format, { format }) });
        }
        const cosignersCopy = [...cosigners];
        cosignersCopy.push([cosigner.getXpub(), cosigner.getFp(), cosigner.getPath()]);
        setCosigners(cosignersCopy);
      }
    },
    [askPassphrase, cosigners, format, getXpubCacheForMnemonics, navigation, tryUsingXpub],
  );

  const utilizeMnemonicPhrase = useCallback(
    async (overrideText?: string, overrideAskPassphrase?: boolean) => {
      const textToUse = overrideText ?? importText;
      const askForPassphrase = overrideAskPassphrase ?? askPassphrase;
      setIsLoading(true);

      if (MultisigHDWallet.isXpubValid(textToUse)) {
        return tryUsingXpub(textToUse);
      }
      try {
        const jsonText = JSON.parse(textToUse);
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
      hd.setSecret(textToUse);
      if (!hd.validateMnemonic()) {
        setIsLoading(false);
        return presentAlert({ message: loc.multisig.invalid_mnemonics });
      }

      let passphrase: string | undefined;
      if (askForPassphrase) {
        try {
          passphrase = await prompt(loc.wallets.import_passphrase_title, loc.wallets.import_passphrase_message);
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          if (message === 'Cancel Pressed') {
            setIsLoading(false);
            return;
          }
          throw e;
        }
      }

      const cosignersCopy = [...cosigners];
      cosignersCopy.push([hd.getSecret(), false, false, passphrase]);
      setCosigners(cosignersCopy);

      setIsLoading(false);
      setImportText('');
      setAskPassphrase(false);
    },
    [askPassphrase, cosigners, importText, tryUsingXpub],
  );

  useEffect(() => {
    const scannedData = params.onBarScanned;
    if (scannedData) {
      onBarScanned(scannedData);
      navigation.setParams({ onBarScanned: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, params.onBarScanned]);

  useEffect(() => {
    const { sheetAction, sheetImportText, sheetAskPassphrase } = params;
    if (!sheetAction) return;

    if (sheetAction === 'importMnemonic') {
      setImportText(sheetImportText ?? '');
      setAskPassphrase(!!sheetAskPassphrase);
      utilizeMnemonicPhrase(sheetImportText ?? '', sheetAskPassphrase ?? askPassphrase);
    }

    navigation.setParams({ sheetAction: undefined, sheetImportText: undefined, sheetAskPassphrase: undefined });
  }, [askPassphrase, navigation, params, utilizeMnemonicPhrase]);

  const dashType = useCallback(
    ({ index, lastIndex, isChecked, isFocus }: { index: number; lastIndex: number; isChecked: boolean; isFocus: boolean }) => {
      if (isChecked) {
        return index === lastIndex ? MultipleStepsListItemDashType.Top : MultipleStepsListItemDashType.TopAndBottom;
      }
      if (index === lastIndex) {
        return isFocus ? MultipleStepsListItemDashType.TopAndBottom : MultipleStepsListItemDashType.Top;
      }
      return MultipleStepsListItemDashType.TopAndBottom;
    },
    [],
  );

  const _renderKeyItem = useCallback(
    (el: { index: number }) => {
      const renderProvideKeyButtons = el.index === cosigners.length;
      const isChecked = el.index < cosigners.length;
      return (
        <Animated.View layout={LinearTransition}>
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
                  buttonType: MultipleStepsListItemButtonType.Full,
                  onPress: () => {
                    setVaultKeyData({ keyIndex: el.index, xpub: '', seed: '', isLoading: true });
                    generateNewKey();
                  },
                  text: loc.multisig.create_new_key,
                  disabled: vaultKeyData.isLoading,
                }}
                dashes={MultipleStepsListItemDashType.TopAndBottom}
                checked={isChecked}
              />
              <MultipleStepsListItem
                button={{
                  testID: 'VaultCosignerImport' + String(el.index + 1),
                  onPress: iHaveMnemonics,
                  buttonType: MultipleStepsListItemButtonType.Full,
                  text: loc.wallets.import_do_import,
                  disabled: vaultKeyData.isLoading,
                }}
                dashes={
                  el.index === data.current.length - 1 ? MultipleStepsListItemDashType.Top : MultipleStepsListItemDashType.TopAndBottom
                }
                checked={isChecked}
              />
            </>
          )}
        </Animated.View>
      );
    },
    [cosigners, dashType, generateNewKey, iHaveMnemonics, vaultKeyData, viewKey],
  );

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
      <View style={styles.wrapBox}>
        <AnimatedFlatList
          data={data.current}
          renderItem={_renderKeyItem}
          keyExtractor={(_item, index) => `${index}`}
          extraData={cosigners}
          // @ts-expect-error Reanimated itemLayoutAnimation prop not in RN types
          itemLayoutAnimation={LinearTransition}
        />
      </View>
      {footer}
      <BlueSpacing20 />
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
  helpButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default WalletsAddMultisigStep2;

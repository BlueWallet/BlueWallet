import React, { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Linking, StyleSheet, TextInput, View } from 'react-native';
import Animated, { Layout } from 'react-native-reanimated';
import assert from 'assert';

import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import BlueButtonLink from '../../components/BlueButtonLink';
import BlueFormLabel from '../../components/BlueFormLabel';
import BlueText from '../../components/BlueText';
import { HDLegacyP2PKHWallet } from '../../class/wallets/hd-legacy-p2pkh-wallet';
import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';
import { HDTaprootWallet } from '../../class/wallets/hd-taproot-wallet';
import { LightningCustodianWallet } from '../../class/wallets/lightning-custodian-wallet';
import presentAlert from '../../components/Alert';
import Button from '../../components/Button';
import { useTheme } from '../../components/themes';
import WalletButton from '../../components/WalletButton';
import loc from '../../loc';
import { Chain } from '../../models/bitcoinUnits';
import { useStorage } from '../../hooks/context/useStorage';
import { getLNDHub } from '../../helpers/lndHub';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AddWalletStackParamList } from '../../navigation/AddWalletStack';
import { RouteProp, useRoute } from '@react-navigation/native';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { BlueSpacing20, BlueSpacing40 } from '../../components/BlueSpacing';
import { hexToUint8Array } from '../../blue_modules/uint8array-extras';
import { LightningArkWallet } from '../../class/wallets/lightning-ark-wallet.ts';
import { resetScanWasBBQR } from '../../helpers/scan-qr.ts';

enum ButtonSelected {
  // @ts-ignore: Return later to update
  ONCHAIN = Chain.ONCHAIN,
  // @ts-ignore: Return later to update
  OFFCHAIN = Chain.OFFCHAIN,
  VAULT = 'VAULT',
  ARK = 'ARK',
}

interface State {
  isLoading: boolean;
  walletBaseURI: string;
  selectedIndex: number;
  label: string;
  selectedWalletType: ButtonSelected;
}

const ActionTypes = {
  SET_LOADING: 'SET_LOADING',
  SET_WALLET_BASE_URI: 'SET_WALLET_BASE_URI',
  SET_SELECTED_INDEX: 'SET_SELECTED_INDEX',
  SET_LABEL: 'SET_LABEL',
  SET_SELECTED_WALLET_TYPE: 'SET_SELECTED_WALLET_TYPE',
} as const;
type ActionTypes = (typeof ActionTypes)[keyof typeof ActionTypes];

interface TAction {
  type: ActionTypes;
  payload?: any;
}

const index2walletType: Record<number, { text: string; subtitle: string; walletType: string }> = {
  0: { subtitle: 'p2wpkh/HD', text: `${loc.multisig.native_segwit_title}`, walletType: HDSegwitBech32Wallet.type },
  1: { subtitle: 'p2pkh/HD', text: `${loc.multisig.legacy_title}`, walletType: HDLegacyP2PKHWallet.type },
  2: { subtitle: 'p2tr/HD', text: 'Taproot', walletType: HDTaprootWallet.type },
  3: {
    // lightning
    subtitle: LightningCustodianWallet.subtitleReadable,
    text: LightningCustodianWallet.typeReadable,
    walletType: LightningCustodianWallet.type,
  },
};

const initialState: State = {
  isLoading: true,
  walletBaseURI: '',
  selectedIndex: 0,
  label: '',
  selectedWalletType: ButtonSelected.ONCHAIN,
};

const walletReducer = (state: State, action: TAction): State => {
  switch (action.type) {
    case ActionTypes.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case ActionTypes.SET_WALLET_BASE_URI:
      return { ...state, walletBaseURI: action.payload };
    case ActionTypes.SET_SELECTED_INDEX:
      return { ...state, selectedIndex: action.payload, selectedWalletType: ButtonSelected.ONCHAIN };
    case ActionTypes.SET_LABEL:
      return { ...state, label: action.payload };
    case ActionTypes.SET_SELECTED_WALLET_TYPE:
      return { ...state, selectedWalletType: action.payload };
    default:
      return state;
  }
};

type NavigationProps = NativeStackNavigationProp<AddWalletStackParamList, 'AddWallet'>;

type RouteProps = RouteProp<AddWalletStackParamList, 'AddWallet'>;

const WalletsAdd: React.FC = () => {
  const { colors } = useTheme();
  const layoutTransition = useMemo(() => Layout.springify().damping(16).stiffness(180), []);

  // State
  const [state, dispatch] = useReducer(walletReducer, initialState);
  const [backdoorPressed, setBackdoorPressed] = useState(0);
  const isLoading = state.isLoading;
  const walletBaseURI = state.walletBaseURI;
  const label = state.label;
  //
  const { addWallet, saveToDisk } = useStorage();
  const route = useRoute<RouteProps>();
  const { entropy: entropyHex, words, selectedIndex: routeSelectedIndex, selectedWalletType: routeSelectedWalletType } = route.params || {};
  const selectedIndex = typeof routeSelectedIndex === 'number' ? routeSelectedIndex : state.selectedIndex;
  const selectedWalletType: ButtonSelected =
    routeSelectedWalletType === Chain.OFFCHAIN
      ? ButtonSelected.OFFCHAIN
      : routeSelectedWalletType === Chain.ONCHAIN
        ? ButtonSelected.ONCHAIN
        : routeSelectedWalletType === ButtonSelected.VAULT
          ? ButtonSelected.VAULT
          : routeSelectedWalletType === ButtonSelected.ARK
            ? ButtonSelected.ARK
            : state.selectedWalletType;
  const entropy = entropyHex ? hexToUint8Array(entropyHex) : undefined;
  const { navigate, goBack, setParams } = useExtendedNavigation<NavigationProps>();
  const stylesHook = {
    advancedText: {
      color: colors.feeText,
    },
    label: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
    },
    noPadding: {
      backgroundColor: colors.elevated,
    },
    root: {
      backgroundColor: colors.elevated,
    },
    lndUri: {
      borderColor: colors.formBorder,
      borderBottomColor: colors.formBorder,
      backgroundColor: colors.inputBackgroundColor,
    },
  };

  const hasStoredLndHub = (walletBaseURI ?? '').trim().length > 0;

  const setSelectedWalletType = useCallback(
    (value: ButtonSelected) => {
      const paramWalletType: Chain | 'VAULT' | 'ARK' =
        value === ButtonSelected.ONCHAIN ? Chain.ONCHAIN : value === ButtonSelected.OFFCHAIN ? Chain.OFFCHAIN : value;
      setParams({
        selectedWalletType: paramWalletType,
        selectedIndex,
      });
    },
    [selectedIndex, setParams],
  );

  const confirmResetEntropy = useCallback(
    (newWalletType: ButtonSelected) => {
      if (entropy || words) {
        Alert.alert(
          loc.wallets.add_entropy_reset_title,
          loc.wallets.add_entropy_reset_message,
          [
            {
              text: loc._.cancel,
              style: 'cancel',
            },
            {
              text: loc._.ok,
              style: 'destructive',
              onPress: () => {
                setParams({ entropy: undefined, words: undefined });
                setSelectedWalletType(newWalletType);
              },
            },
          ],
          { cancelable: true },
        );
      } else {
        setSelectedWalletType(newWalletType);
      }
    },
    [entropy, setParams, setSelectedWalletType, words],
  );

  const handleOnLightningArkButtonPressed = useCallback(() => {
    confirmResetEntropy(ButtonSelected.ARK);
  }, [confirmResetEntropy]);

  const handleOnLightningButtonPressed = useCallback(() => {
    confirmResetEntropy(ButtonSelected.OFFCHAIN);
  }, [confirmResetEntropy]);

  useEffect(() => {
    // resetting format of last camera qr scan, in case user will use camera to
    // scan his wallet backup to import wallet
    resetScanWasBBQR();

    getLNDHub()
      .then(url => (url ? setWalletBaseURI(url) : setWalletBaseURI('')))
      .catch(() => setWalletBaseURI(''))
      .finally(() => setIsLoading(false));
  }, []);

  const setIsLoading = (value: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: value });
  };

  const setWalletBaseURI = (value: string) => {
    dispatch({ type: 'SET_WALLET_BASE_URI', payload: value });
  };

  const setLabel = (value: string) => {
    dispatch({ type: 'SET_LABEL', payload: value });
  };

  const createWallet = async () => {
    setIsLoading(true);

    if (selectedWalletType === ButtonSelected.OFFCHAIN) {
      createLightningWallet();
    } else if (selectedWalletType === ButtonSelected.ARK) {
      createLightningArkWallet();
    } else if (selectedWalletType === ButtonSelected.ONCHAIN) {
      let w: HDSegwitBech32Wallet | HDLegacyP2PKHWallet | HDTaprootWallet;

      for (let c = 0; c < Object.values(index2walletType).length; c++) {
        if (c === selectedIndex) {
          switch (index2walletType[c].walletType) {
            case HDTaprootWallet.type:
              w = new HDTaprootWallet();
              w.setLabel(label || loc.wallets.details_title);
              break;
            case HDLegacyP2PKHWallet.type:
              w = new HDLegacyP2PKHWallet();
              w.setLabel(label || loc.wallets.details_title);
              break;
            case HDSegwitBech32Wallet.type:
              w = new HDSegwitBech32Wallet();
              w.setLabel(label || loc.wallets.details_title);
              break;
          }
        }
      }

      assert(w!, 'Internal error: could not decide which wallet to create');

      if (selectedWalletType === ButtonSelected.ONCHAIN) {
        if (entropy) {
          try {
            await w.generateFromEntropy(entropy);
          } catch (e: any) {
            console.log(e.toString());
            presentAlert({ message: e.toString() });
            return;
          }
        } else {
          await w.generate();
        }
        addWallet(w);
        await saveToDisk();

        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
        if (w.type === HDLegacyP2PKHWallet.type || w.type === HDSegwitBech32Wallet.type || w.type === HDTaprootWallet.type) {
          navigate('PleaseBackup', {
            walletID: w.getID(),
          });
        } else {
          goBack();
        }
      }
    } else if (selectedWalletType === ButtonSelected.VAULT) {
      setIsLoading(false);
      navigate('WalletsAddMultisig', { walletLabel: label.trim().length > 0 ? label : loc.multisig.default_label });
    }
  };

  const createLightningWallet = async () => {
    const wallet = new LightningCustodianWallet();
    wallet.setLabel(label || loc.wallets.details_title);

    try {
      const lndhub = walletBaseURI?.trim();
      if (lndhub) {
        const isValidNodeAddress = await LightningCustodianWallet.isValidNodeAddress(lndhub);
        if (isValidNodeAddress) {
          wallet.setBaseURI(lndhub);
          await wallet.init();
        } else {
          throw new Error('The provided node address is not valid LNDHub node.');
        }
      }
      await wallet.createAccount();
      await wallet.authorize();
    } catch (Err: any) {
      setIsLoading(false);
      console.warn('lnd create failure', Err);
      if (Err.message) {
        return presentAlert({ message: Err.message });
      } else {
        return presentAlert({ message: loc.wallets.add_lndhub_error });
      }
      // giving app, not adding anything
    }

    await wallet.generate();
    addWallet(wallet);
    await saveToDisk();

    triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
    navigate('PleaseBackupLNDHub', {
      walletID: wallet.getID(),
    });
  };

  const createLightningArkWallet = async () => {
    const wallet = new LightningArkWallet();
    wallet.setLabel(label || loc.wallets.details_title);
    try {
      await wallet.generate();
    } catch (Err: any) {
      setIsLoading(false);
      console.warn('lightning ark create failure', Err);
      return presentAlert({ message: Err.message ?? '' });
    }

    addWallet(wallet);
    await saveToDisk();

    triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
    navigate('PleaseBackupLNDHub', {
      walletID: wallet.getID(),
    });
  };

  const navigateToImportWallet = () => {
    navigate('ImportWallet');
  };

  const handleOnVaultButtonPressed = () => {
    Keyboard.dismiss();
    confirmResetEntropy(ButtonSelected.VAULT);
  };

  const handleOnBitcoinButtonPressed = () => {
    setBackdoorPressed(prevState => prevState + 1);
    Keyboard.dismiss();
    setSelectedWalletType(ButtonSelected.ONCHAIN);
  };

  const onLearnMorePressed = () => {
    Linking.openURL('https://bluewallet.io/lightning/');
  };

  const LightningButtonMemo = useMemo(
    () => (
      <WalletButton
        buttonType="Lightning"
        testID="ActivateLightningButton"
        active={selectedWalletType === ButtonSelected.OFFCHAIN}
        onPress={handleOnLightningButtonPressed}
        size={styles.button}
      />
    ),
    [selectedWalletType, handleOnLightningButtonPressed],
  );

  return (
    <Animated.View layout={layoutTransition} style={styles.flex1}>
      <SafeAreaScrollView
        style={stylesHook.root}
        testID="ScrollView"
        automaticallyAdjustKeyboardInsets
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustContentInsets
        automaticallyAdjustsScrollIndicatorInsets
      >
        <BlueSpacing20 />
        <BlueFormLabel>{loc.wallets.add_wallet_name}</BlueFormLabel>
        <View style={[styles.label, stylesHook.label]}>
          <TextInput
            testID="WalletNameInput"
            value={label}
            placeholderTextColor="#81868e"
            placeholder={loc.wallets.add_placeholder}
            onChangeText={setLabel}
            style={styles.textInputCommon}
            editable={!isLoading}
            underlineColorAndroid="transparent"
          />
        </View>
        <BlueFormLabel>{loc.wallets.add_wallet_type}</BlueFormLabel>
        <View style={styles.buttons}>
          <WalletButton
            buttonType="Bitcoin"
            testID="ActivateBitcoinButton"
            active={selectedWalletType === ButtonSelected.ONCHAIN}
            onPress={handleOnBitcoinButtonPressed}
            size={styles.button}
          />
          <WalletButton
            buttonType="Vault"
            testID="ActivateVaultButton"
            active={selectedWalletType === ButtonSelected.VAULT}
            onPress={handleOnVaultButtonPressed}
            size={styles.button}
          />
          {backdoorPressed >= 20 ? (
            <WalletButton
              buttonType="LightningArk"
              testID="ActivateLightningArkButton"
              active={selectedWalletType === ButtonSelected.ARK}
              onPress={handleOnLightningArkButtonPressed}
              size={styles.button}
            />
          ) : null}
          {(selectedWalletType === ButtonSelected.OFFCHAIN || hasStoredLndHub) && LightningButtonMemo}
        </View>
        <View style={styles.advanced}>
          {selectedWalletType === ButtonSelected.OFFCHAIN && (
            <>
              <BlueSpacing20 />
              <View style={styles.lndhubTitle}>
                <BlueText>{loc.wallets.add_lndhub}</BlueText>
                <BlueButtonLink title={loc.wallets.learn_more} onPress={onLearnMorePressed} />
              </View>

              <View style={[styles.lndUri, stylesHook.lndUri]}>
                <TextInput
                  value={walletBaseURI}
                  onChangeText={setWalletBaseURI}
                  onSubmitEditing={Keyboard.dismiss}
                  placeholder={loc.wallets.add_lndhub_placeholder}
                  clearButtonMode="while-editing"
                  autoCapitalize="none"
                  textContentType="URL"
                  autoCorrect={false}
                  placeholderTextColor="#81868e"
                  style={styles.textInputCommon}
                  editable={!isLoading}
                  underlineColorAndroid="transparent"
                />
              </View>
            </>
          )}

          <BlueSpacing20 />
          {!isLoading ? (
            <>
              <Button
                testID="Create"
                title={loc.wallets.add_create}
                disabled={
                  !selectedWalletType || (selectedWalletType === ButtonSelected.OFFCHAIN && (walletBaseURI ?? '').trim().length === 0)
                }
                onPress={createWallet}
              />

              <BlueButtonLink
                testID="ImportWallet"
                style={styles.import}
                title={loc.wallets.add_import_wallet}
                onPress={navigateToImportWallet}
              />
              <BlueSpacing40 />
            </>
          ) : (
            <ActivityIndicator />
          )}
        </View>
      </SafeAreaScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  label: {
    flexDirection: 'row',
    borderWidth: 1,
    borderBottomWidth: 0.5,
    minHeight: 44,
    height: 44,
    marginHorizontal: 20,
    alignItems: 'center',
    marginVertical: 16,
    borderRadius: 4,
  },
  textInputCommon: {
    flex: 1,
    marginHorizontal: 8,
    color: '#81868e',
    fontSize: 15,
    lineHeight: 19,
  },
  buttons: {
    flexDirection: 'column',
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 0,
    minHeight: 100,
  },
  button: {
    width: '100%',
    height: 'auto',
  },
  advanced: {
    marginHorizontal: 20,
  },
  lndUri: {
    flexDirection: 'row',
    borderWidth: 1,
    borderBottomWidth: 0.5,
    minHeight: 44,
    height: 44,
    alignItems: 'center',
    marginVertical: 16,
    borderRadius: 4,
  },
  import: {
    marginVertical: 24,
  },
  lndhubTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

export default WalletsAdd;

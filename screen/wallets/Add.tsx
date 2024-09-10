import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useReducer } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  LayoutAnimation,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';

import A from '../../blue_modules/analytics';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { BlueButtonLink, BlueFormLabel, BlueSpacing20, BlueSpacing40, BlueText } from '../../BlueComponents';
import { BlueApp, HDSegwitBech32Wallet, HDSegwitP2SHWallet, LightningCustodianWallet, SegwitP2SHWallet } from '../../class';
import presentAlert from '../../components/Alert';
import Button from '../../components/Button';
import { useTheme } from '../../components/themes';
import WalletButton from '../../components/WalletButton';
import loc from '../../loc';
import { Chain } from '../../models/bitcoinUnits';
import { useStorage } from '../../hooks/context/useStorage';
import ToolTipMenu from '../../components/TooltipMenu';
import { Icon } from '@rneui/themed';
import { CommonToolTipActions } from '../../typings/CommonToolTipActions';
import { Action } from '../../components/types';

enum ButtonSelected {
  // @ts-ignore: Return later to update
  ONCHAIN = Chain.ONCHAIN,
  // @ts-ignore: Return later to update
  OFFCHAIN = Chain.OFFCHAIN,
  VAULT = 'VAULT',
}

interface State {
  isLoading: boolean;
  walletBaseURI: string;
  selectedIndex: number;
  label: string;
  selectedWalletType: ButtonSelected;
  entropy: Buffer | undefined;
  entropyButtonText: string;
}

const ActionTypes = {
  SET_LOADING: 'SET_LOADING',
  SET_WALLET_BASE_URI: 'SET_WALLET_BASE_URI',
  SET_SELECTED_INDEX: 'SET_SELECTED_INDEX',
  SET_LABEL: 'SET_LABEL',
  SET_SELECTED_WALLET_TYPE: 'SET_SELECTED_WALLET_TYPE',
  SET_ENTROPY: 'SET_ENTROPY',
  SET_ENTROPY_BUTTON_TEXT: 'SET_ENTROPY_BUTTON_TEXT',
} as const;
type ActionTypes = (typeof ActionTypes)[keyof typeof ActionTypes];

interface TAction {
  type: ActionTypes;
  payload?: any;
}

const initialState: State = {
  isLoading: true,
  walletBaseURI: '',
  selectedIndex: 0,
  label: '',
  selectedWalletType: ButtonSelected.ONCHAIN,
  entropy: undefined,
  entropyButtonText: loc.wallets.add_entropy_provide,
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
    case ActionTypes.SET_ENTROPY:
      return { ...state, entropy: action.payload };
    case ActionTypes.SET_ENTROPY_BUTTON_TEXT:
      return { ...state, entropyButtonText: action.payload };
    default:
      return state;
  }
};

const WalletsAdd: React.FC = () => {
  const { colors } = useTheme();

  // State
  const [state, dispatch] = useReducer(walletReducer, initialState);
  const isLoading = state.isLoading;
  const walletBaseURI = state.walletBaseURI;
  const selectedIndex = state.selectedIndex;
  const label = state.label;
  const selectedWalletType = state.selectedWalletType;
  const entropy = state.entropy;
  const entropyButtonText = state.entropyButtonText;
  const colorScheme = useColorScheme();
  //
  const { addWallet, saveToDisk } = useStorage();
  const { navigate, goBack, setOptions } = useNavigation();
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

  const entropyGenerated = useCallback((newEntropy: Buffer) => {
    let entropyTitle;
    if (!newEntropy) {
      entropyTitle = loc.wallets.add_entropy_provide;
    } else {
      entropyTitle = loc.formatString(loc.wallets.add_entropy_bytes, {
        bytes: newEntropy.length,
      });
    }
    setEntropy(newEntropy);
    setEntropyButtonText(entropyTitle);
  }, []);

  const navigateToEntropy = useCallback(() => {
    Alert.alert(
      loc.wallets.add_wallet_seed_length,
      loc.wallets.add_wallet_seed_length_message,
      [
        {
          text: loc._.cancel,
          onPress: () => {},
          style: 'default',
        },
        {
          text: loc.wallets.add_wallet_seed_length_12,
          onPress: () => {
            // @ts-ignore: Return later to update
            navigate('ProvideEntropy', { onGenerated: entropyGenerated, words: 12 });
          },
          style: 'default',
        },
        {
          text: loc.wallets.add_wallet_seed_length_24,
          onPress: () => {
            // @ts-ignore: Return later to update
            navigate('ProvideEntropy', { onGenerated: entropyGenerated, words: 24 });
          },
          style: 'default',
        },
      ],
      { cancelable: true },
    );
  }, [entropyGenerated, navigate]);

  const toolTipActions = useMemo(() => {
    const walletSubactions: Action[] = [
      {
        id: HDSegwitBech32Wallet.type,
        text: `${loc.multisig.native_segwit_title}`,
        subtitle: 'p2wsh/HD',
        menuState: selectedIndex === 0 && selectedWalletType === ButtonSelected.ONCHAIN,
      },
      {
        id: SegwitP2SHWallet.type,
        text: `${loc.multisig.wrapped_segwit_title}`,
        subtitle: 'p2sh-p2wsh/HD',
        menuState: selectedIndex === 1 && selectedWalletType === ButtonSelected.ONCHAIN,
      },
      {
        id: HDSegwitP2SHWallet.type,
        text: `${loc.multisig.legacy_title}`,
        subtitle: 'p2sh/non-HD',
        menuState: selectedIndex === 2 && selectedWalletType === ButtonSelected.ONCHAIN,
      },
      {
        id: LightningCustodianWallet.type,
        text: LightningCustodianWallet.typeReadable,
        subtitle: LightningCustodianWallet.subtitleReadable,
        menuState: selectedWalletType === ButtonSelected.OFFCHAIN,
      },
    ];

    const walletAction: Action = {
      id: 'wallets',
      text: loc.multisig.wallet_type,
      subactions: walletSubactions,
      displayInline: true,
    };

    const entropyAction = {
      ...CommonToolTipActions.Entropy,
      text: entropyButtonText,
      menuState: false,
    };

    return [walletAction, entropyAction];
  }, [entropyButtonText, selectedIndex, selectedWalletType]);

  const handleOnLightningButtonPressed = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedWalletType(ButtonSelected.OFFCHAIN);
  }, []);

  const HeaderRight = useMemo(
    () => (
      <ToolTipMenu
        isButton
        isMenuPrimaryAction
        onPressMenuItem={(id: string) => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          if (id === HDSegwitBech32Wallet.type) {
            setSelectedIndex(0);
          } else if (id === SegwitP2SHWallet.type) {
            setSelectedIndex(1);
          } else if (id === HDSegwitP2SHWallet.type) {
            setSelectedIndex(2);
          } else if (id === LightningCustodianWallet.type) {
            handleOnLightningButtonPressed();
          } else if (id === CommonToolTipActions.Entropy.id) {
            navigateToEntropy();
          }
        }}
        actions={toolTipActions}
      >
        <Icon size={22} name="more-horiz" type="material" color={colors.foregroundColor} />
      </ToolTipMenu>
    ),
    [colors.foregroundColor, handleOnLightningButtonPressed, navigateToEntropy, toolTipActions],
  );

  useEffect(() => {
    setOptions({
      headerRight: () => HeaderRight,
      statusBarStyle: Platform.select({ ios: 'light', default: colorScheme === 'dark' ? 'light' : 'dark' }),
    });
  }, [HeaderRight, colorScheme, colors.foregroundColor, navigateToEntropy, setOptions, toolTipActions]);

  useEffect(() => {
    AsyncStorage.getItem(BlueApp.LNDHUB)
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

  const setSelectedIndex = (value: number) => {
    dispatch({ type: 'SET_SELECTED_INDEX', payload: value });
  };

  const setLabel = (value: string) => {
    dispatch({ type: 'SET_LABEL', payload: value });
  };

  const setSelectedWalletType = (value: ButtonSelected) => {
    dispatch({ type: 'SET_SELECTED_WALLET_TYPE', payload: value });
  };

  const setEntropy = (value: Buffer) => {
    dispatch({ type: 'SET_ENTROPY', payload: value });
  };

  const setEntropyButtonText = (value: string) => {
    dispatch({ type: 'SET_ENTROPY_BUTTON_TEXT', payload: value });
  };

  const createWallet = async () => {
    setIsLoading(true);

    if (selectedWalletType === ButtonSelected.OFFCHAIN) {
      createLightningWallet();
    } else if (selectedWalletType === ButtonSelected.ONCHAIN) {
      let w: HDSegwitBech32Wallet | SegwitP2SHWallet | HDSegwitP2SHWallet;
      if (selectedIndex === 2) {
        // zero index radio - HD segwit
        w = new HDSegwitP2SHWallet();
        w.setLabel(label || loc.wallets.details_title);
      } else if (selectedIndex === 1) {
        // btc was selected
        // index 1 radio - segwit single address
        w = new SegwitP2SHWallet();
        w.setLabel(label || loc.wallets.details_title);
      } else {
        // btc was selected
        // index 2 radio - hd bip84
        w = new HDSegwitBech32Wallet();
        w.setLabel(label || loc.wallets.details_title);
      }
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
        A(A.ENUM.CREATED_WALLET);
        triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
        if (w.type === HDSegwitP2SHWallet.type || w.type === HDSegwitBech32Wallet.type) {
          // @ts-ignore: Return later to update
          navigate('PleaseBackup', {
            walletID: w.getID(),
          });
        } else {
          goBack();
        }
      }
    } else if (selectedWalletType === ButtonSelected.VAULT) {
      setIsLoading(false);
      // @ts-ignore: Return later to update
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
    A(A.ENUM.CREATED_LIGHTNING_WALLET);
    await wallet.generate();
    addWallet(wallet);
    await saveToDisk();

    A(A.ENUM.CREATED_WALLET);
    triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
    // @ts-ignore: Return later to update
    navigate('PleaseBackupLNDHub', {
      walletID: wallet.getID(),
    });
  };

  const navigateToImportWallet = () => {
    // @ts-ignore: Return later to update
    navigate('ImportWallet');
  };

  const handleOnVaultButtonPressed = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Keyboard.dismiss();
    setSelectedWalletType(ButtonSelected.VAULT);
  };

  const handleOnBitcoinButtonPressed = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Keyboard.dismiss();
    setSelectedWalletType(ButtonSelected.ONCHAIN);
  };

  const onLearnMorePressed = () => {
    Linking.openURL('https://bluewallet.io/lightning/');
  };

  return (
    <ScrollView style={stylesHook.root} testID="ScrollView" automaticallyAdjustKeyboardInsets>
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
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

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { useContext, useEffect, useReducer } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import {
  BitcoinButton,
  BlueButtonLink,
  BlueFormLabel,
  BlueSpacing20,
  BlueSpacing40,
  BlueText,
  LightningButton,
  VaultButton,
} from '../../BlueComponents';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import {
  AbstractWallet,
  HDSegwitBech32Wallet,
  HDSegwitP2SHWallet,
  LightningCustodianWallet,
  LightningLdkWallet,
  SegwitP2SHWallet,
} from '../../class';
import presentAlert from '../../components/Alert';
import Button from '../../components/Button';
import { LdkButton } from '../../components/LdkButton';
import ListItem from '../../components/ListItem';
import { useTheme } from '../../components/themes';
import useAsyncPromise from '../../hooks/useAsyncPromise';
import loc from '../../loc';
import { Chain } from '../../models/bitcoinUnits';
const BlueApp = require('../../BlueApp');
const AppStorage = BlueApp.AppStorage;
const A = require('../../blue_modules/analytics');

enum ButtonSelected {
  // @ts-ignore: Return later to update
  ONCHAIN = Chain.ONCHAIN,
  // @ts-ignore: Return later to update
  OFFCHAIN = Chain.OFFCHAIN,
  VAULT = 'VAULT',
  LDK = 'LDK',
}

interface State {
  isLoading: boolean;
  walletBaseURI: string;
  selectedIndex: number;
  label: string;
  selectedWalletType: ButtonSelected;
  backdoorPressed: number;
  entropy: string | any[] | undefined;
  entropyButtonText: string;
}

const ActionTypes = {
  SET_LOADING: 'SET_LOADING',
  SET_WALLET_BASE_URI: 'SET_WALLET_BASE_URI',
  SET_SELECTED_INDEX: 'SET_SELECTED_INDEX',
  SET_LABEL: 'SET_LABEL',
  SET_SELECTED_WALLET_TYPE: 'SET_SELECTED_WALLET_TYPE',
  INCREMENT_BACKDOOR_PRESSED: 'INCREMENT_BACKDOOR_PRESSED',
  SET_ENTROPY: 'SET_ENTROPY',
  SET_ENTROPY_BUTTON_TEXT: 'SET_ENTROPY_BUTTON_TEXT',
} as const;
type ActionTypes = (typeof ActionTypes)[keyof typeof ActionTypes];

interface Action {
  type: ActionTypes;
  payload?: any;
}

const initialState: State = {
  isLoading: true,
  walletBaseURI: '',
  selectedIndex: 0,
  label: '',
  selectedWalletType: ButtonSelected.ONCHAIN,
  backdoorPressed: 1,
  entropy: undefined,
  entropyButtonText: loc.wallets.add_entropy_provide,
};

const walletReducer = (state: State, action: Action): State => {
  switch (action.type) {
    case ActionTypes.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case ActionTypes.SET_WALLET_BASE_URI:
      return { ...state, walletBaseURI: action.payload };
    case ActionTypes.SET_SELECTED_INDEX:
      return { ...state, selectedIndex: action.payload };
    case ActionTypes.SET_LABEL:
      return { ...state, label: action.payload };
    case ActionTypes.SET_SELECTED_WALLET_TYPE:
      return { ...state, selectedWalletType: action.payload };
    case ActionTypes.INCREMENT_BACKDOOR_PRESSED:
      return { ...state, backdoorPressed: state.backdoorPressed + 1 };
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
  const backdoorPressed = state.backdoorPressed;
  const entropy = state.entropy;
  const entropyButtonText = state.entropyButtonText;
  //
  const colorScheme = useColorScheme();
  const { addWallet, saveToDisk, isAdvancedModeEnabled, wallets } = useContext(BlueStorageContext);
  const isAdvancedOptionsEnabled = useAsyncPromise(isAdvancedModeEnabled);
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

  useEffect(() => {
    AsyncStorage.getItem(AppStorage.LNDHUB)
      .then(url => (url ? setWalletBaseURI(url) : setWalletBaseURI('')))
      .catch(() => setWalletBaseURI(''))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    setOptions({
      statusBarStyle: Platform.select({ ios: 'light', default: colorScheme === 'dark' ? 'light' : 'dark' }),
    });
  }, [colorScheme, setOptions]);

  const entropyGenerated = (newEntropy: string | any[]) => {
    let entropyTitle;
    if (!newEntropy) {
      entropyTitle = loc.wallets.add_entropy_provide;
    } else if (newEntropy.length < 32) {
      entropyTitle = loc.formatString(loc.wallets.add_entropy_remain, {
        gen: newEntropy.length,
        rem: 32 - newEntropy.length,
      });
    } else {
      entropyTitle = loc.formatString(loc.wallets.add_entropy_generated, {
        gen: newEntropy.length,
      });
    }
    setEntropy(newEntropy);
    setEntropyButtonText(entropyTitle);
  };

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

  const setBackdoorPressed = (value: number) => {
    dispatch({ type: 'INCREMENT_BACKDOOR_PRESSED', payload: value });
  };

  const setEntropy = (value: string | any[]) => {
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
            // @ts-ignore: Return later to update
            await w.generateFromEntropy(entropy);
          } catch (e: any) {
            console.log(e.toString());
            presentAlert({ message: e.toString() });
            goBack();
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
    } else if (selectedWalletType === ButtonSelected.LDK) {
      setIsLoading(false);
      createLightningLdkWallet();
    }
  };

  const createLightningLdkWallet = async () => {
    const foundLdk = wallets.find((w: AbstractWallet) => w.type === LightningLdkWallet.type);
    if (foundLdk) {
      return presentAlert({ message: 'LDK wallet already exists' });
    }
    setIsLoading(true);
    const wallet = new LightningLdkWallet();
    wallet.setLabel(label || loc.wallets.details_title);

    await wallet.generate();
    await wallet.init();
    setIsLoading(false);
    addWallet(wallet);
    await saveToDisk();

    A(A.ENUM.CREATED_WALLET);
    triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
    // @ts-ignore: Return later to update
    navigate('PleaseBackupLdk', {
      walletID: wallet.getID(),
    });
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

  const navigateToEntropy = () => {
    // @ts-ignore: Return later to update
    navigate('ProvideEntropy', { onGenerated: entropyGenerated });
  };

  const navigateToImportWallet = () => {
    // @ts-ignore: Return later to update
    navigate('ImportWallet');
  };

  const handleOnVaultButtonPressed = () => {
    Keyboard.dismiss();
    setSelectedWalletType(ButtonSelected.VAULT);
  };

  const handleOnBitcoinButtonPressed = () => {
    Keyboard.dismiss();
    setSelectedWalletType(ButtonSelected.ONCHAIN);
  };

  const handleOnLightningButtonPressed = () => {
    // @ts-ignore: Return later to update
    setBackdoorPressed((prevState: number) => {
      return prevState + 1;
    });
    Keyboard.dismiss();
    setSelectedWalletType(ButtonSelected.OFFCHAIN);
  };

  const handleOnLdkButtonPressed = async () => {
    Keyboard.dismiss();
    setSelectedWalletType(ButtonSelected.LDK);
  };

  return (
    <ScrollView style={stylesHook.root} testID="ScrollView">
      <BlueSpacing20 />
      <KeyboardAvoidingView enabled behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={62}>
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
          <BitcoinButton
            testID="ActivateBitcoinButton"
            active={selectedWalletType === ButtonSelected.ONCHAIN}
            onPress={handleOnBitcoinButtonPressed}
            style={styles.button}
          />
          <LightningButton
            active={selectedWalletType === ButtonSelected.OFFCHAIN}
            onPress={handleOnLightningButtonPressed}
            style={styles.button}
          />
          {backdoorPressed > 10 ? (
            <LdkButton
              active={selectedWalletType === ButtonSelected.LDK}
              onPress={handleOnLdkButtonPressed}
              style={styles.button}
              subtext={LightningLdkWallet.getPackageVersion()}
              text="LDK"
            />
          ) : null}
          <VaultButton
            testID="ActivateVaultButton"
            active={selectedWalletType === ButtonSelected.VAULT}
            onPress={handleOnVaultButtonPressed}
            style={styles.button}
          />
        </View>

        <View style={styles.advanced}>
          {(() => {
            if (selectedWalletType === ButtonSelected.ONCHAIN && isAdvancedOptionsEnabled.data) {
              return (
                <View>
                  <BlueSpacing20 />
                  <Text style={[styles.advancedText, stylesHook.advancedText]}>{loc.settings.advanced_options}</Text>
                  <ListItem
                    containerStyle={[styles.noPadding, stylesHook.noPadding]}
                    bottomDivider={false}
                    onPress={() => setSelectedIndex(0)}
                    title={HDSegwitBech32Wallet.typeReadable}
                    checkmark={selectedIndex === 0}
                  />
                  <ListItem
                    containerStyle={[styles.noPadding, stylesHook.noPadding]}
                    bottomDivider={false}
                    onPress={() => setSelectedIndex(1)}
                    title={SegwitP2SHWallet.typeReadable}
                    checkmark={selectedIndex === 1}
                  />
                  <ListItem
                    containerStyle={[styles.noPadding, stylesHook.noPadding]}
                    bottomDivider={false}
                    onPress={() => setSelectedIndex(2)}
                    title={HDSegwitP2SHWallet.typeReadable}
                    checkmark={selectedIndex === 2}
                  />
                </View>
              );
            } else if (selectedWalletType === ButtonSelected.OFFCHAIN) {
              return (
                <>
                  <BlueSpacing20 />
                  <Text style={[styles.advancedText, stylesHook.advancedText]}>{loc.settings.advanced_options}</Text>
                  <BlueSpacing20 />
                  <BlueText>{loc.wallets.add_lndhub}</BlueText>
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
              );
            }
          })()}
          {isAdvancedOptionsEnabled.data === true && selectedWalletType === ButtonSelected.ONCHAIN && !isLoading && (
            <BlueButtonLink style={styles.import} title={entropyButtonText} onPress={navigateToEntropy} />
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
      </KeyboardAvoidingView>
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
  advancedText: {
    fontWeight: '500',
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
  noPadding: {
    paddingHorizontal: 0,
  },
});

export default WalletsAdd;

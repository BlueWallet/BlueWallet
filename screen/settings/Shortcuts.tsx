import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useReducer, useState } from 'react';
import { ScrollView, TouchableWithoutFeedback, View, Platform } from 'react-native';
import { TWallet } from '../../class/wallets/types';
import ListItem from '../../components/ListItem';
import { useStorage } from '../../hooks/context/useStorage';
import { storeInKeychain, getFromKeychain, deleteFromKeychain } from '../../helpers/keychain';
import DeviceInfo from 'react-native-device-info';
import useOnAppLaunch from '../../hooks/useOnAppLaunch';
import loc from '../../loc';
import presentAlert from '../../components/Alert';
import selectWallet from '../../helpers/select-wallet';
import { Chain } from '../../models/bitcoinUnits';
import { RECEIVE_BITCOIN_INTENT_KEY } from '../../helpers/intents';

type RootStackParamList = {
  SelectWallet: { onWalletSelect: (wallet: TWallet) => void; onChainRequireSend: boolean };
};

type ShortcutSettingsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SelectWallet'>;

const enum ActionType {
  SetIntentWalletLabel = 'SET_INTENT_WALLET_LABEL',
  SetUseReceiveBitcoinIntentSwitch = 'SET_USE_RECEIVE_BITCOIN_INTENT_SWITCH',
  SetDefaultWalletLabel = 'SET_DEFAULT_WALLET_LABEL',
  SetViewAllWalletsSwitch = 'SET_VIEW_ALL_WALLETS_SWITCH',
}

type State = {
  intentWalletLabel: string;
  useReceiveBitcoinIntent: boolean;
  defaultWalletLabel: string;
  isViewAllWalletsSwitchEnabled: boolean;
};

type Action =
  | { type: ActionType.SetIntentWalletLabel; payload: string }
  | { type: ActionType.SetUseReceiveBitcoinIntentSwitch; payload: boolean }
  | { type: ActionType.SetDefaultWalletLabel; payload: string }
  | { type: ActionType.SetViewAllWalletsSwitch; payload: boolean };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case ActionType.SetIntentWalletLabel:
      return { ...state, intentWalletLabel: action.payload };
    case ActionType.SetUseReceiveBitcoinIntentSwitch:
      return { ...state, useReceiveBitcoinIntent: action.payload };
    case ActionType.SetDefaultWalletLabel:
      return { ...state, defaultWalletLabel: action.payload };
    case ActionType.SetViewAllWalletsSwitch:
      return { ...state, isViewAllWalletsSwitchEnabled: action.payload };
    default:
      return state;
  }
};

const ShortcutSettings: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, {
    intentWalletLabel: '',
    useReceiveBitcoinIntent: false,
    defaultWalletLabel: '',
    isViewAllWalletsSwitchEnabled: true,
  });

  const [isSupportedEnvironment, setIsSupportedEnvironment] = useState(false);
  const { navigate } = useNavigation<ShortcutSettingsNavigationProp>();
  const { wallets } = useStorage();
  const { getSelectedDefaultWallet, setSelectedDefaultWallet } = useOnAppLaunch();
  const { name } = useRoute();

  useEffect(() => {
    const checkEnvironment = async () => {
      const systemVersion = await DeviceInfo.getSystemVersion();
      const majorVersion = parseInt(systemVersion.split('.')[0], 10);

      if ((Platform.OS === 'ios' && majorVersion >= 16) || Platform.OS === 'macos') {
        setIsSupportedEnvironment(true);
      }
    };

    checkEnvironment();
  }, []);

  useEffect(() => {
    const initializeDefaultWallet = async () => {
      const walletID = await getSelectedDefaultWallet();
      if (!walletID) {
        dispatch({ type: ActionType.SetViewAllWalletsSwitch, payload: true });
      } else {
        const selectedWallet = wallets.find(wallet => wallet.getID() === walletID);
        if (selectedWallet) {
          dispatch({ type: ActionType.SetDefaultWalletLabel, payload: selectedWallet.getLabel() });
          dispatch({ type: ActionType.SetViewAllWalletsSwitch, payload: false });
        }
      }
    };

    initializeDefaultWallet();
  }, [wallets, getSelectedDefaultWallet]);

  useEffect(() => {
    const fetchReceiveBitcoinIntentData = async () => {
      const storedData = await getFromKeychain(RECEIVE_BITCOIN_INTENT_KEY, true);
      if (storedData) {
        const wallet = wallets.find(w => w.getID() === storedData.walletID);
        dispatch({ type: ActionType.SetIntentWalletLabel, payload: wallet?.getLabel() || loc.settings.no_wallet_selected });
        dispatch({ type: ActionType.SetUseReceiveBitcoinIntentSwitch, payload: true });
      }
    };

    fetchReceiveBitcoinIntentData();
  }, [wallets]);

  const selectWalletForReceiveBitcoinIntent = async () => {
    if (wallets.length === 0) {
      presentAlert({ message: loc.settings.no_wallet_available });
    } else {
      const wallet = await selectWallet(navigate, name, Chain.ONCHAIN);
      if (wallet) {
        await onWalletSelectForReceiveBitcoinIntent(wallet);
      }
    }
  };

  const selectWalletForDefault = () => {
    if (wallets.length === 0) {
      presentAlert({ message: loc.settings.no_wallet_available });
    } else {
      selectWallet(navigate, name, Chain.ONCHAIN).then(onWalletSelectForDefault);
    }
  };

  const onWalletSelectForReceiveBitcoinIntent = async (wallet: TWallet) => {
    const walletAddress = await wallet.getAddressAsync();

    if (typeof walletAddress === 'string') {
      const error = await storeInKeychain(
        { address: walletAddress, label: wallet.getLabel(), walletID: wallet.getID() },
        RECEIVE_BITCOIN_INTENT_KEY,
        true, // Access group usage
      );

      if (error) {
        presentAlert({ message: error.message }); // Display the specific error message to the user
      } else {
        dispatch({ type: ActionType.SetIntentWalletLabel, payload: wallet.getLabel() });
        dispatch({ type: ActionType.SetUseReceiveBitcoinIntentSwitch, payload: true });
      }
    }
  };

  const onWalletSelectForDefault = async (wallet: TWallet) => {
    dispatch({ type: ActionType.SetDefaultWalletLabel, payload: wallet.getLabel() });
    await setSelectedDefaultWallet(wallet.getID());
  };

  const onReceiveBitcoinIntentSwitchValueChanged = async (value: boolean) => {
    dispatch({ type: ActionType.SetUseReceiveBitcoinIntentSwitch, payload: value });

    if (!value) {
      dispatch({ type: ActionType.SetIntentWalletLabel, payload: loc.settings.no_wallet_selected });
      await deleteFromKeychain(RECEIVE_BITCOIN_INTENT_KEY, true);
    } else {
      const firstWallet = wallets[0];
      if (firstWallet) {
        await onWalletSelectForReceiveBitcoinIntent(firstWallet);
      } else {
        presentAlert({ message: loc.settings.no_wallet_available });
      }
    }
  };
  const onViewAllWalletsSwitchValueChanged = async (value: boolean) => {
    dispatch({ type: ActionType.SetViewAllWalletsSwitch, payload: value });

    if (!value && wallets.length === 1) {
      const selectedWallet = wallets[0];
      await setSelectedDefaultWallet(selectedWallet.getID());
      dispatch({ type: ActionType.SetDefaultWalletLabel, payload: selectedWallet.getLabel() });
    } else if (!value) {
      const selectedWalletID = await getSelectedDefaultWallet();
      const selectedWallet = wallets.find(wallet => wallet.getID() === selectedWalletID);
      if (selectedWallet) {
        dispatch({ type: ActionType.SetDefaultWalletLabel, payload: selectedWallet.getLabel() });
      }
    } else {
      await setSelectedDefaultWallet(undefined);
      dispatch({ type: ActionType.SetDefaultWalletLabel, payload: loc.settings.no_wallet_selected });
    }
  };

  return (
    <ScrollView automaticallyAdjustContentInsets={false} contentInsetAdjustmentBehavior="automatic">
      <View>
        {isSupportedEnvironment && (
          <View>
            <ListItem
              title={loc.settings.view_wallet_transactions}
              Component={TouchableWithoutFeedback}
              switch={{
                onValueChange: onViewAllWalletsSwitchValueChanged,
                value: state.isViewAllWalletsSwitchEnabled,
                disabled: wallets.length <= 0,
              }}
              subtitle={loc.settings.summary_transactions}
            />

            {!state.isViewAllWalletsSwitchEnabled && (
              <ListItem
                title={loc.settings.default_info}
                onPress={selectWalletForDefault}
                rightTitle={state.defaultWalletLabel}
                chevron
                disabled={wallets.length <= 1}
              />
            )}

            <ListItem
              title={loc.settings.receive_bitcoin_intent}
              Component={TouchableWithoutFeedback}
              switch={{
                onValueChange: onReceiveBitcoinIntentSwitchValueChanged,
                value: state.useReceiveBitcoinIntent,
              }}
              subtitle={loc.settings.enable_receive_bitcoin_intent_desc}
            />

            {state.useReceiveBitcoinIntent && (
              <ListItem
                title={loc.wallets.select_wallet}
                onPress={selectWalletForReceiveBitcoinIntent}
                rightTitle={state.intentWalletLabel || loc.settings.no_wallet_selected}
                chevron
                disabled={wallets.length <= 0}
              />
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default ShortcutSettings;

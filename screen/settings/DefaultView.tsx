import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useReducer, useState } from 'react';
import { ScrollView, TouchableWithoutFeedback, View } from 'react-native';
import { TWallet } from '../../class/wallets/types';
import ListItem from '../../components/ListItem';
import useOnAppLaunch from '../../hooks/useOnAppLaunch';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { storeInKeychain } from '../../helpers/keychain'; // Import the Keychain helper
import DeviceInfo from 'react-native-device-info'; // Import DeviceInfo to check the device

type RootStackParamList = {
  SelectWallet: { onWalletSelect: (wallet: TWallet) => void; onChainRequireSend: boolean };
};

type DefaultViewNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SelectWallet'>;

const enum ActionType {
  SetDefaultWalletLabel = 'SET_DEFAULT_WALLET_LABEL',
  SetViewAllWalletsSwitch = 'SET_VIEW_ALL_WALLETS_SWITCH',
  SetActionButtonWalletLabel = 'SET_ACTION_BUTTON_WALLET_LABEL',
}

type State = {
  defaultWalletLabel: string;
  isViewAllWalletsSwitchEnabled: boolean;
  actionButtonWalletLabel: string;
};

type Action =
  | { type: ActionType.SetDefaultWalletLabel; payload: string }
  | { type: ActionType.SetViewAllWalletsSwitch; payload: boolean }
  | { type: ActionType.SetActionButtonWalletLabel; payload: string };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case ActionType.SetDefaultWalletLabel:
      return { ...state, defaultWalletLabel: action.payload };
    case ActionType.SetViewAllWalletsSwitch:
      return { ...state, isViewAllWalletsSwitchEnabled: action.payload };
    case ActionType.SetActionButtonWalletLabel:
      return { ...state, actionButtonWalletLabel: action.payload };
    default:
      return state;
  }
};

const DefaultView: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, {
    defaultWalletLabel: '',
    isViewAllWalletsSwitchEnabled: true,
    actionButtonWalletLabel: '', // State to manage the wallet selected for Action Button
  });

  const [isIPhone15OrNewer, setIsIPhone15OrNewer] = useState(false); // State to track if the device is iPhone 15 or newer

  const { navigate, pop } = useNavigation<DefaultViewNavigationProp>();
  const { wallets } = useStorage();
  const { isViewAllWalletsEnabled, getSelectedDefaultWallet, setSelectedDefaultWallet, setViewAllWalletsEnabled } = useOnAppLaunch();

  // Check if the device is iPhone 15 or newer
  useEffect(() => {
    const checkDevice = async () => {
      const deviceId = await DeviceInfo.getDeviceId();
      // Check if the device ID starts with "iPhone15" or newer (e.g., "iPhone16")
      if (deviceId.startsWith('iPhone15') || deviceId.startsWith('iPhone16')) {
        setIsIPhone15OrNewer(true);
      }
    };

    checkDevice();
  }, []);

  // Fetch current view settings and default wallet when the component mounts
  useEffect(() => {
    (async () => {
      const newViewAllWalletsEnabled: boolean = await isViewAllWalletsEnabled();
      let newDefaultWalletLabel: string = '';
      const walletID = await getSelectedDefaultWallet();

      if (walletID) {
        const w = wallets.find(wallet => wallet.getID() === walletID);
        if (w) newDefaultWalletLabel = w.getLabel();
      }

      dispatch({ type: ActionType.SetDefaultWalletLabel, payload: newDefaultWalletLabel });
      dispatch({ type: ActionType.SetViewAllWalletsSwitch, payload: newViewAllWalletsEnabled });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle switching the "View All Wallets" toggle
  const onViewAllWalletsSwitchValueChanged = async (value: boolean) => {
    await setViewAllWalletsEnabled(value);
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
    }
  };

  // Handle wallet selection for default wallet usage
  const selectWallet = () => {
    navigate('SelectWallet', { onWalletSelect: onWalletSelectValueChanged, onChainRequireSend: false });
  };

  // Handle wallet selection for Action Button usage
  const selectWalletForActionButton = () => {
    navigate('SelectWallet', { onWalletSelect: onWalletSelectForActionButton, onChainRequireSend: false });
  };

  // Handle when a wallet is selected for default wallet
  const onWalletSelectValueChanged = async (wallet: TWallet) => {
    await setViewAllWalletsEnabled(false);
    await setSelectedDefaultWallet(wallet.getID());
    dispatch({ type: ActionType.SetDefaultWalletLabel, payload: wallet.getLabel() });
    dispatch({ type: ActionType.SetViewAllWalletsSwitch, payload: false });
    pop();
  };

  // Handle when a wallet is selected for Action Button
  const onWalletSelectForActionButton = async (wallet: TWallet) => {
    // Store the selected wallet for the Action Button in Keychain
    await storeInKeychain({ qrcode: wallet.getAddress(), label: wallet.getLabel() });
    dispatch({ type: ActionType.SetActionButtonWalletLabel, payload: wallet.getLabel() });
    pop();
  };

  return (
    <ScrollView automaticallyAdjustContentInsets={false} contentInsetAdjustmentBehavior="automatic">
      <View>
        <ListItem
          title={loc.settings.default_wallets}
          Component={TouchableWithoutFeedback}
          switch={{
            onValueChange: onViewAllWalletsSwitchValueChanged,
            value: state.isViewAllWalletsSwitchEnabled,
            disabled: wallets.length <= 0,
          }}
          subtitle={loc.settings.default_desc}
        />

        {/* Wallet selection when 'View All Wallets' is disabled */}
        {!state.isViewAllWalletsSwitchEnabled && (
          <ListItem
            title={loc.settings.default_info}
            onPress={selectWallet}
            rightTitle={state.defaultWalletLabel}
            chevron
            disabled={wallets.length <= 1}
          />
        )}

        {/* Render the section for selecting a wallet for the Action Button only if the device is an iPhone 15 or newer */}
        {isIPhone15OrNewer && (
          <ListItem
            title={loc.settings.select_wallet_for_action_button} // Add this to your loc file as needed
            onPress={selectWalletForActionButton}
            rightTitle={state.actionButtonWalletLabel || loc.settings.no_wallet_selected}
            chevron
            disabled={wallets.length <= 0}
          />
        )}
      </View>
    </ScrollView>
  );
};

export default DefaultView;
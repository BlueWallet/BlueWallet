/**
 * @deprecated This screen is not accessible from the UI and has been disabled.
 * The default view feature has been removed. This file is kept for potential future use.
 */
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useReducer } from 'react';
import { View } from 'react-native';
import { TWallet } from '../../class/wallets/types';
import useOnAppLaunch from '../../hooks/useOnAppLaunch';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { SettingsScrollView, SettingsSection, SettingsListItem } from '../../components/platform';

type RootStackParamList = {
  SelectWallet: { onWalletSelect: (wallet: TWallet) => void; onChainRequireSend: boolean };
};

type DefaultViewNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SelectWallet'>;

const enum ActionType {
  SetDefaultWalletLabel = 'SET_DEFAULT_WALLET_LABEL',
  SetViewAllWalletsSwitch = 'SET_VIEW_ALL_WALLETS_SWITCH',
}

type State = {
  defaultWalletLabel: string;
  isViewAllWalletsSwitchEnabled: boolean;
};

type Action = { type: ActionType.SetDefaultWalletLabel; payload: string } | { type: ActionType.SetViewAllWalletsSwitch; payload: boolean };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case ActionType.SetDefaultWalletLabel:
      return { ...state, defaultWalletLabel: action.payload };
    case ActionType.SetViewAllWalletsSwitch:
      return { ...state, isViewAllWalletsSwitchEnabled: action.payload };
    default:
      return state;
  }
};

const DefaultView: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, {
    defaultWalletLabel: '',
    isViewAllWalletsSwitchEnabled: true,
  });

  const { navigate, pop } = useNavigation<DefaultViewNavigationProp>();
  const { wallets } = useStorage();
  const { isViewAllWalletsEnabled, getSelectedDefaultWallet, setSelectedDefaultWallet, setViewAllWalletsEnabled } = useOnAppLaunch();
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
  }, [isViewAllWalletsEnabled, getSelectedDefaultWallet, wallets]);

  const onWalletSelectValueChanged = useCallback(
    async (wallet: TWallet) => {
      await setViewAllWalletsEnabled(false);
      await setSelectedDefaultWallet(wallet.getID());
      dispatch({ type: ActionType.SetDefaultWalletLabel, payload: wallet.getLabel() });
      dispatch({ type: ActionType.SetViewAllWalletsSwitch, payload: false });
      pop();
    },
    [setViewAllWalletsEnabled, setSelectedDefaultWallet, pop],
  );

  const onViewAllWalletsSwitchValueChanged = useCallback(
    async (value: boolean) => {
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
    },
    [setViewAllWalletsEnabled, wallets, setSelectedDefaultWallet, getSelectedDefaultWallet],
  );

  return (
    <SettingsScrollView>
      <SettingsSection>
        <SettingsListItem
          title={loc.settings.default_wallets}
          subtitle={loc.settings.default_desc}
          Component={View}
          position={state.isViewAllWalletsSwitchEnabled ? 'single' : 'first'}
          switch={{
            value: state.isViewAllWalletsSwitchEnabled,
            onValueChange: onViewAllWalletsSwitchValueChanged,
            disabled: wallets.length <= 0,
          }}
        />

        {!state.isViewAllWalletsSwitchEnabled && (
          <SettingsListItem
            title={loc.settings.default_info}
            rightTitle={state.defaultWalletLabel}
            onPress={() => navigate('SelectWallet', { onWalletSelect: onWalletSelectValueChanged, onChainRequireSend: false })}
            disabled={wallets.length <= 1}
            chevron
            position="last"
          />
        )}
      </SettingsSection>
    </SettingsScrollView>
  );
};

export default DefaultView;

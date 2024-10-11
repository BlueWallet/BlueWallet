import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useReducer } from 'react';
import { ScrollView, TouchableWithoutFeedback, View } from 'react-native';
import { TWallet } from '../../class/wallets/types';
import ListItem from '../../components/ListItem';
import useOnAppLaunch from '../../hooks/useOnAppLaunch';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onViewAllWalletsSwitchValueChanged = async (value: boolean) => {
    await setViewAllWalletsEnabled(value);
    dispatch({ type: ActionType.SetViewAllWalletsSwitch, payload: value });

    if (!value && wallets.length === 1) {
      // Automatically select the wallet if there is only one
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

  const selectWallet = () => {
    navigate('SelectWallet', { onWalletSelect: onWalletSelectValueChanged, onChainRequireSend: false });
  };

  const onWalletSelectValueChanged = async (wallet: TWallet) => {
    await setViewAllWalletsEnabled(false);
    await setSelectedDefaultWallet(wallet.getID());
    dispatch({ type: ActionType.SetDefaultWalletLabel, payload: wallet.getLabel() });
    dispatch({ type: ActionType.SetViewAllWalletsSwitch, payload: false });
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

        {!state.isViewAllWalletsSwitchEnabled && (
          <ListItem
            title={loc.settings.default_info}
            onPress={selectWallet}
            rightTitle={state.defaultWalletLabel}
            chevron
            disabled={wallets.length <= 1}
          />
        )}
      </View>
    </ScrollView>
  );
};

export default DefaultView;

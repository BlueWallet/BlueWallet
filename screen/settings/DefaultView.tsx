import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useReducer } from 'react';
import { StyleSheet, View } from 'react-native';
import { TWallet } from '../../class/wallets/types';
import useOnAppLaunch from '../../hooks/useOnAppLaunch';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { usePlatformTheme } from '../../theme';
import PlatformListItem from '../../components/PlatformListItem';

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
  const { colors: platformColors, sizing } = usePlatformTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: platformColors.background,
    },
    contentContainer: {
      marginHorizontal: 16,
    },
    firstSectionContainer: {
      paddingTop: sizing.firstSectionContainerPaddingTop,
      marginBottom: 16,
    },
    separator: {
      height: 1,
      backgroundColor: 'rgba(0,0,0,0.05)',
      marginLeft: 16,
    },
  });

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

  const renderSeparator = <View style={styles.separator} />;

  return (
    <SafeAreaScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.firstSectionContainer}>
        <PlatformListItem
          title={loc.settings.default_wallets}
          subtitle={loc.settings.default_desc}
          containerStyle={{
            backgroundColor: platformColors.cardBackground,
          }}
          Component={View}
          isFirst
          isLast={state.isViewAllWalletsSwitchEnabled}
          bottomDivider={!state.isViewAllWalletsSwitchEnabled}
          switch={{
            value: state.isViewAllWalletsSwitchEnabled,
            onValueChange: onViewAllWalletsSwitchValueChanged,
            disabled: wallets.length <= 0,
          }}
        />

        {!state.isViewAllWalletsSwitchEnabled && renderSeparator}

        {!state.isViewAllWalletsSwitchEnabled && (
          <PlatformListItem
            title={loc.settings.default_info}
            rightTitle={state.defaultWalletLabel}
            containerStyle={{
              backgroundColor: platformColors.cardBackground,
            }}
            onPress={() => navigate('SelectWallet', { onWalletSelect: onWalletSelectValueChanged, onChainRequireSend: false })}
            disabled={wallets.length <= 1}
            isLast
            chevron
            bottomDivider={false}
          />
        )}
      </View>
    </SafeAreaScrollView>
  );
};

export default DefaultView;

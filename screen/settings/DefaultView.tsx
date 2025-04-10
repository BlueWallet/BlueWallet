import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useReducer } from 'react';
import { StyleSheet, View } from 'react-native';
import { TWallet } from '../../class/wallets/types';
import useOnAppLaunch from '../../hooks/useOnAppLaunch';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import SafeAreaFlatList from '../../components/SafeAreaFlatList';
import { usePlatformTheme } from '../../components/platformThemes';
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

interface SettingItem {
  id: string;
  title: string;
  onPress?: () => void;
  isSwitch?: boolean;
  switchValue?: boolean;
  onSwitchValueChange?: (value: boolean) => void;
  subtitle?: string;
  rightTitle?: string;
  disabled?: boolean;
}

const DefaultView: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, {
    defaultWalletLabel: '',
    isViewAllWalletsSwitchEnabled: true,
  });

  const { navigate, pop } = useNavigation<DefaultViewNavigationProp>();
  const { wallets } = useStorage();
  const { isViewAllWalletsEnabled, getSelectedDefaultWallet, setSelectedDefaultWallet, setViewAllWalletsEnabled } = useOnAppLaunch();
  const { colors, sizing, layout } = usePlatformTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listItemContainer: {
      backgroundColor: colors.cardBackground,
      minHeight: 77,
    },
    headerOffset: {
      height: sizing.firstSectionContainerPaddingTop,
    },
    contentContainer: {
      marginHorizontal: 16,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const selectWallet = useCallback(() => {
    navigate('SelectWallet', { onWalletSelect: onWalletSelectValueChanged, onChainRequireSend: false });
  }, [navigate, onWalletSelectValueChanged]);

  const onViewAllWalletsSwitchValueChanged = useCallback(
    async (value: boolean) => {
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
    },
    [setViewAllWalletsEnabled, wallets, setSelectedDefaultWallet, getSelectedDefaultWallet],
  );

  const settingsItems = useCallback((): SettingItem[] => {
    const items: SettingItem[] = [
      {
        id: 'viewAllWallets',
        title: loc.settings.default_wallets,
        subtitle: loc.settings.default_desc,
        isSwitch: true,
        switchValue: state.isViewAllWalletsSwitchEnabled,
        onSwitchValueChange: onViewAllWalletsSwitchValueChanged,
        disabled: wallets.length <= 0,
      },
    ];

    if (!state.isViewAllWalletsSwitchEnabled) {
      items.push({
        id: 'selectDefaultWallet',
        title: loc.settings.default_info,
        onPress: selectWallet,
        rightTitle: state.defaultWalletLabel,
        disabled: wallets.length <= 1,
      });
    }

    return items;
  }, [state.isViewAllWalletsSwitchEnabled, state.defaultWalletLabel, wallets.length, onViewAllWalletsSwitchValueChanged, selectWallet]);

  const renderItem = useCallback(
    (props) => {
      const item = props.item; // Access without destructuring to avoid ESLint error
      const items = settingsItems();
      const isFirst = items.indexOf(item) === 0;
      const isLast = items.indexOf(item) === items.length - 1;

      if (item.isSwitch) {
        return (
          <PlatformListItem
            title={item.title}
            subtitle={item.subtitle}
            containerStyle={styles.listItemContainer}
            isFirst={isFirst}
            isLast={isLast}
            Component={View}
            bottomDivider={layout.showBorderBottom && !isLast}
            switch={{
              value: item.switchValue || false,
              onValueChange: item.onSwitchValueChange,
              disabled: item.disabled,
            }}
          />
        );
      }

      return (
        <PlatformListItem
          title={item.title}
          rightTitle={item.rightTitle}
          containerStyle={styles.listItemContainer}
          onPress={item.onPress}
          disabled={item.disabled}
          chevron
          isFirst={isFirst}
          isLast={isLast}
          bottomDivider={layout.showBorderBottom && !isLast}
        />
      );
    },
    [layout.showBorderBottom, styles.listItemContainer, settingsItems],
  );

  const keyExtractor = useCallback((item: SettingItem) => item.id, []);

  const ListHeaderComponent = useCallback(() => <View style={styles.headerOffset} />, [styles.headerOffset]);

  return (
    <SafeAreaFlatList
      style={styles.container}
      data={settingsItems()}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeaderComponent}
      contentContainerStyle={styles.contentContainer}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets
      removeClippedSubviews
    />
  );
};

export default DefaultView;

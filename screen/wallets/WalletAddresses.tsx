import React, { useCallback, useEffect, useLayoutEffect, useRef, useReducer, useMemo } from 'react';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { ActivityIndicator, FlatList, StyleSheet, View, Platform, UIManager } from 'react-native';
import { WatchOnlyWallet } from '../../class';
import { AddressItem } from '../../components/addresses/AddressItem';
import { useTheme } from '../../components/themes';
import { disallowScreenshot } from 'react-native-screen-capture';
import { useStorage } from '../../hooks/context/useStorage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import SegmentedControl from '../../components/SegmentControl';
import loc from '../../loc';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { isDesktop } from '../../blue_modules/environment';

export const TABS = {
  EXTERNAL: 'receive',
  INTERNAL: 'change',
} as const;

type TabKey = keyof typeof TABS;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Address {
  key: string;
  index: number;
  address: string;
  isInternal: boolean;
  balance: number;
  transactions: number;
}

interface WalletAddressesState {
  showAddresses: boolean;
  addresses: Address[];
  currentTab: (typeof TABS)[keyof typeof TABS];
  search: string;
}

const SET_SHOW_ADDRESSES = 'SET_SHOW_ADDRESSES' as const;
const SET_ADDRESSES = 'SET_ADDRESSES' as const;
const SET_CURRENT_TAB = 'SET_CURRENT_TAB' as const;
const SET_SEARCH = 'SET_SEARCH' as const;

type WalletAddressesAction =
  | { type: typeof SET_SHOW_ADDRESSES; payload: boolean }
  | { type: typeof SET_ADDRESSES; payload: Address[] }
  | { type: typeof SET_CURRENT_TAB; payload: (typeof TABS)[keyof typeof TABS] }
  | { type: typeof SET_SEARCH; payload: string };

const initialState: WalletAddressesState = {
  showAddresses: false,
  addresses: [],
  currentTab: TABS.EXTERNAL,
  search: '',
};

const reducer = (state: WalletAddressesState, action: WalletAddressesAction): WalletAddressesState => {
  switch (action.type) {
    case SET_SHOW_ADDRESSES:
      return { ...state, showAddresses: action.payload };
    case SET_ADDRESSES:
      return { ...state, addresses: action.payload };
    case SET_CURRENT_TAB:
      return { ...state, currentTab: action.payload };
    case SET_SEARCH:
      return { ...state, search: action.payload };
    default:
      return state;
  }
};

export const totalBalance = ({ c, u } = { c: 0, u: 0 }) => c + u;

export const getAddress = (wallet: any, index: number, isInternal: boolean): Address => {
  let address: string;
  let balance = 0;
  let transactions = 0;

  if (isInternal) {
    address = wallet._getInternalAddressByIndex(index);
    balance = totalBalance(wallet._balances_by_internal_index[index]);
    transactions = wallet._txs_by_internal_index[index]?.length;
  } else {
    address = wallet._getExternalAddressByIndex(index);
    balance = totalBalance(wallet._balances_by_external_index[index]);
    transactions = wallet._txs_by_external_index[index]?.length;
  }

  return {
    key: address,
    index,
    address,
    isInternal,
    balance,
    transactions,
  };
};

export const sortByAddressIndex = (a: Address, b: Address) => {
  return a.index > b.index ? 1 : -1;
};

export const filterByAddressType = (
  type: (typeof TABS)[keyof typeof TABS],
  isInternal: boolean,
  currentType: (typeof TABS)[keyof typeof TABS],
) => {
  return currentType === type ? isInternal === true : isInternal === false;
};

type NavigationProps = NativeStackNavigationProp<DetailViewStackParamList, 'WalletAddresses'>;
type RouteProps = RouteProp<DetailViewStackParamList, 'WalletAddresses'>;

const WalletAddresses: React.FC = () => {
  const [{ showAddresses, addresses, currentTab, search }, dispatch] = useReducer(reducer, initialState);

  const { wallets } = useStorage();
  const { walletID } = useRoute<RouteProps>().params;

  const addressList = useRef<FlatList<Address>>(null);
  const wallet = wallets.find((w: any) => w.getID() === walletID);

  const balanceUnit = wallet?.getPreferredBalanceUnit() ?? BitcoinUnit.BTC;
  const isWatchOnly = wallet?.type === WatchOnlyWallet.type;
  const walletInstance = isWatchOnly ? wallet._hdWalletInstance : wallet;
  const allowSignVerifyMessage = (wallet && 'allowSignVerifyMessage' in wallet && wallet.allowSignVerifyMessage()) ?? false;

  const { colors } = useTheme();
  const { setOptions } = useExtendedNavigation<NavigationProps>();

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
  });

  const filteredAddresses = useMemo(
    () => addresses.filter(address => filterByAddressType(TABS.INTERNAL, address.isInternal, currentTab)).sort(sortByAddressIndex),
    [addresses, currentTab],
  );

  useEffect(() => {
    if (showAddresses && addressList.current) {
      addressList.current.scrollToIndex({ animated: false, index: 0 });
    }
  }, [showAddresses]);

  useLayoutEffect(() => {
    setOptions({
      headerSearchBarOptions: {
        onChangeText: (event: { nativeEvent: { text: string } }) => dispatch({ type: SET_SEARCH, payload: event.nativeEvent.text }),
      },
    });
  }, [setOptions]);

  const getAddresses = useCallback(() => {
    const newAddresses: Address[] = [];
    // @ts-ignore: idk what to do
    for (let index = 0; index <= (walletInstance?.next_free_change_address_index ?? 0); index++) {
      const address = getAddress(walletInstance, index, true);
      newAddresses.push(address);
    }

    // @ts-ignore: idk what to do
    for (let index = 0; index < (walletInstance?.next_free_address_index ?? 0) + (walletInstance?.gap_limit ?? 0); index++) {
      const address = getAddress(walletInstance, index, false);
      newAddresses.push(address);
    }
    dispatch({ type: SET_ADDRESSES, payload: newAddresses });
    dispatch({ type: SET_SHOW_ADDRESSES, payload: true });
  }, [walletInstance]);

  useFocusEffect(
    useCallback(() => {
      if (!isDesktop) disallowScreenshot(true);
      getAddresses();
      return () => {
        if (!isDesktop) disallowScreenshot(false);
      };
    }, [getAddresses]),
  );

  const data =
    search.length > 0 ? filteredAddresses.filter(item => item.address.toLowerCase().includes(search.toLowerCase())) : filteredAddresses;

  const renderRow = useCallback(
    ({ item }: { item: Address }) => {
      return (
        <AddressItem item={item} {...item} balanceUnit={balanceUnit} walletID={walletID} allowSignVerifyMessage={allowSignVerifyMessage} />
      );
    },
    [balanceUnit, walletID, allowSignVerifyMessage],
  );

  if (!wallet) {
    return (
      <View>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={[styles.root, stylesHook.root]}>
      <FlatList
        contentContainerStyle={stylesHook.root}
        ref={addressList}
        data={data}
        extraData={data}
        initialNumToRender={20}
        renderItem={renderRow}
        ListEmptyComponent={search.length > 0 ? null : <ActivityIndicator />}
        centerContent={!showAddresses}
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={
          <SegmentedControl
            values={Object.values(TABS).map(tab => loc.addresses[`type_${tab}`])}
            selectedIndex={Object.values(TABS).findIndex(tab => tab === currentTab)}
            onChange={index => {
              const tabKey = Object.keys(TABS)[index] as TabKey;
              dispatch({ type: SET_CURRENT_TAB, payload: TABS[tabKey] });
            }}

            // style={{ marginVertical: 10 }}
          />
        }
      />
    </View>
  );
};

export default WalletAddresses;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

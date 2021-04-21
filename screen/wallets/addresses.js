import React, { useCallback, useState, useContext, useRef, useEffect } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View, StatusBar } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, useTheme } from '@react-navigation/native';
import Privacy from '../../blue_modules/Privacy';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import loc from '../../loc';
import navigationStyle from '../../components/navigationStyle';
import { AddressItem } from '../../components/addresses/AddressItem';
import { WatchOnlyWallet } from '../../class';

export const totalBalance = ({ c, u } = { c: 0, u: 0 }) => c + u;

export const getAddress = (wallet, index, isInternal) => {
  let address;
  let balance = 0;

  if (isInternal) {
    address = wallet._getInternalAddressByIndex(index);
    balance = totalBalance(wallet._balances_by_internal_index[index]);
  } else {
    address = wallet._getExternalAddressByIndex(index);
    balance = totalBalance(wallet._balances_by_external_index[index]);
  }

  return {
    key: address,
    index,
    address,
    isInternal,
    balance,
    transactions: 0,
  };
};

export const sortByIndexAndType = (a, b) => {
  if (a.isInternal > b.isInternal) return 1;
  if (a.isInternal < b.isInternal) return -1;

  if (a.index > b.index) return 1;
  if (a.index < b.index) return -1;
};

const WalletAddresses = () => {
  const [showAddresses, setShowAddresses] = useState(false);

  const [addresses, setAddresses] = useState([]);

  const { wallets } = useContext(BlueStorageContext);

  const { walletID } = useRoute().params;

  const addressList = useRef();

  const wallet = wallets.find(w => w.getID() === walletID);

  const balanceUnit = wallet.getPreferredBalanceUnit();

  const walletInstance = wallet.type === WatchOnlyWallet.type ? wallet._hdWalletInstance : wallet;

  const { colors } = useTheme();

  const { navigate } = useNavigation();

  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
  });

  useEffect(() => {
    if (showAddresses) {
      addressList.current.scrollToIndex({ animated: false, index: 0 });
    }
  }, [showAddresses]);

  const getAddresses = () => {
    const addressList = [];

    for (let index = 0; index < walletInstance.next_free_change_address_index + walletInstance.gap_limit; index++) {
      const address = getAddress(walletInstance, index, true);

      addressList.push(address);
    }

    for (let index = 0; index < walletInstance.next_free_address_index + walletInstance.gap_limit; index++) {
      const address = getAddress(walletInstance, index, false);

      addressList.push(address);
    }

    setAddresses(addressList.sort(sortByIndexAndType));
    setShowAddresses(true);
  };

  useFocusEffect(
    useCallback(() => {
      Privacy.enableBlur();

      getAddresses();

      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const navigateToReceive = item => {
    navigate('ReceiveDetailsRoot', {
      screen: 'ReceiveDetails',
      params: {
        walletID,
        address: item.item.address,
      },
    });
  };

  const renderRow = item => {
    return <AddressItem {...item} balanceUnit={balanceUnit} onPress={() => navigateToReceive(item)} />;
  };

  return (
    <View style={[styles.root, stylesHook.root]}>
      <StatusBar barStyle="default" />
      <FlatList
        contentContainerStyle={stylesHook.root}
        ref={addressList}
        data={addresses}
        extraData={addresses}
        initialNumToRender={40}
        renderItem={renderRow}
        ListEmptyComponent={<ActivityIndicator />}
        centerContent={!showAddresses}
        contentInsetAdjustmentBehavior="automatic"
      />
    </View>
  );
};

WalletAddresses.navigationOptions = navigationStyle({
  title: loc.addresses.addresses_title,
});

export default WalletAddresses;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

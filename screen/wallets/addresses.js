import React, { useCallback, useState, useContext } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import Privacy from '../../blue_modules/Privacy';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import loc from '../../loc';
import navigationStyle from '../../components/navigationStyle';
import { AddressItem } from '../../components/addresses/AddressItem';
import { WatchOnlyWallet } from '../../class';

const getAddress = (wallet, index, isInternal) => {
  let address;
  let balance = 0;

  const getAllBalance = ({ c, u } = { c: 0, u: 0 }) => c + u;

  if (isInternal) {
    address = wallet._getInternalAddressByIndex(index);
    balance = getAllBalance(wallet._balances_by_internal_index[index]);
  } else {
    address = wallet._getExternalAddressByIndex(index);
    balance = getAllBalance(wallet._balances_by_external_index[index]);
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

const sortByIndexAndType = (a, b) => {
  if (a.isInternal > b.isInternal) return 1;
  if (a.isInternal < b.isInternal) return -1;

  if (a.index > b.index) return 1;
  if (a.index < b.index) return -1;
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
  },
  loadMoreButton: {
    borderRadius: 9,
    minHeight: 49,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    alignSelf: 'auto',
    flexGrow: 1,
    marginHorizontal: 16,
  },
  loadMoreText: {
    fontSize: 16,
  },
});

const WalletAddresses = () => {
  const [showAddresses, setShowAddresses] = useState(false);

  const [addresses, setAddresses] = useState([]);

  const { wallets } = useContext(BlueStorageContext);

  const {
    params: { walletID },
  } = useRoute();

  const wallet = wallets.find(w => w.getID() === walletID);

  const balanceUnit = wallet.getPreferredBalanceUnit();

  const walletInstance = wallet.type === WatchOnlyWallet.type ? wallet._hdWalletInstance : wallet;

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

  const render = () => {
    if (showAddresses) {
      return <FlatList data={addresses} renderItem={item => <AddressItem {...item} balanceUnit={balanceUnit} />} />;
    }

    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  };

  return render();
};

WalletAddresses.navigationOptions = navigationStyle({
  closeButton: true,
  title: loc.addresses.addresses_title,
  headerLeft: null,
});

export default WalletAddresses;

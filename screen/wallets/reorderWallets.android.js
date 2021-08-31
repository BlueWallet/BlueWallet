import React, { useEffect, useState, useRef, useContext } from 'react';
import { View, ActivityIndicator, Image, Text, StyleSheet, StatusBar, ScrollView, I18nManager } from 'react-native';
import { BluePrivateBalance } from '../../BlueComponents';
import SortableList from 'react-native-sortable-list';
import LinearGradient from 'react-native-linear-gradient';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useNavigation, useTheme } from '@react-navigation/native';

import navigationStyle from '../../components/navigationStyle';
import { PlaceholderWallet, LightningCustodianWallet, MultisigHDWallet } from '../../class';
import WalletGradient from '../../class/wallet-gradient';
import loc, { formatBalance, transactionTimeToReadable } from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    paddingTop: 20,
  },
  root: {
    flex: 1,
  },
  itemRoot: {
    backgroundColor: 'transparent',
    padding: 10,
    marginVertical: 17,
  },
  gradient: {
    padding: 15,
    borderRadius: 10,
    minHeight: 164,
    elevation: 5,
  },
  image: {
    width: 99,
    height: 94,
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  transparentText: {
    backgroundColor: 'transparent',
  },
  label: {
    backgroundColor: 'transparent',
    fontSize: 19,
    color: '#fff',
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
  },
  balance: {
    backgroundColor: 'transparent',
    fontWeight: 'bold',
    fontSize: 36,
    color: '#fff',
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
  },
  latestTxLabel: {
    backgroundColor: 'transparent',
    fontSize: 13,
    color: '#fff',
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
  },
  latestTxValue: {
    backgroundColor: 'transparent',
    fontWeight: 'bold',
    fontSize: 16,
    color: '#fff',
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
  },
});

const ReorderWallets = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [hasMovedARow, setHasMovedARow] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const sortableList = useRef();
  const { colors } = useTheme();
  const { wallets, setWalletsWithNewOrder } = useContext(BlueStorageContext);
  const navigation = useNavigation();
  const stylesHook = {
    root: {
      backgroundColor: colors.elevated,
    },
    loading: {
      backgroundColor: colors.elevated,
    },
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      if (sortableList.current?.state.data.length === data.length && hasMovedARow) {
        const newWalletsOrderArray = [];
        sortableList.current.state.order.forEach(element => {
          newWalletsOrderArray.push(data[element]);
        });
        setWalletsWithNewOrder(newWalletsOrderArray);
      }
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, hasMovedARow]);

  useEffect(() => {
    const loadWallets = wallets.filter(wallet => wallet.type !== PlaceholderWallet.type);
    setData(loadWallets);
    setIsLoading(false);
  }, [wallets]);

  const renderItem = (item, _active) => {
    if (!item.data) {
      return;
    }
    item = item.data;

    return (
      <View shadowOpacity={40 / 100} shadowOffset={{ width: 0, height: 0 }} shadowRadius={5} style={styles.itemRoot}>
        <LinearGradient shadowColor="#000000" colors={WalletGradient.gradientsFor(item.type)} style={styles.gradient}>
          <Image
            source={(() => {
              switch (item.type) {
                case LightningCustodianWallet.type:
                  return I18nManager.isRTL ? require('../../img/lnd-shape-rtl.png') : require('../../img/lnd-shape.png');
                case MultisigHDWallet.type:
                  return I18nManager.isRTL ? require('../../img/vault-shape-rtl.png') : require('../../img/vault-shape.png');
                default:
                  return I18nManager.isRTL ? require('../../img/btc-shape-rtl.png') : require('../../img/btc-shape.png');
              }
            })()}
            style={styles.image}
          />

          <Text style={styles.transparentText} />
          <Text numberOfLines={1} style={styles.label}>
            {item.getLabel()}
          </Text>
          {item.hideBalance ? (
            <BluePrivateBalance />
          ) : (
            <Text numberOfLines={1} adjustsFontSizeToFit style={styles.balance}>
              {formatBalance(Number(item.getBalance()), item.getPreferredBalanceUnit(), true)}
            </Text>
          )}
          <Text style={styles.transparentText} />
          <Text numberOfLines={1} style={styles.latestTxLabel}>
            {loc.wallets.list_latest_transaction}
          </Text>
          <Text numberOfLines={1} style={styles.latestTxValue}>
            {item.getTransactions().find(tx => tx.confirmations === 0)
              ? loc.transactions.pending.toLowerCase()
              : transactionTimeToReadable(item.getLatestTransactionTime())}
          </Text>
        </LinearGradient>
      </View>
    );
  };

  const onChangeOrder = () => {
    ReactNativeHapticFeedback.trigger('impactMedium', { ignoreAndroidSystemSettings: false });
    setHasMovedARow(true);
  };

  const onActivateRow = () => {
    ReactNativeHapticFeedback.trigger('selection', { ignoreAndroidSystemSettings: false });
    setScrollEnabled(false);
  };

  const onReleaseRow = () => {
    ReactNativeHapticFeedback.trigger('impactLight', { ignoreAndroidSystemSettings: false });
    setScrollEnabled(true);
  };

  return isLoading ? (
    <View style={[styles.loading, stylesHook.loading]}>
      <ActivityIndicator />
    </View>
  ) : (
    <View style={[styles.root, stylesHook.root]}>
      <StatusBar barStyle="light-content" />
      <ScrollView scrollEnabled={scrollEnabled}>
        <SortableList
          ref={sortableList}
          data={data}
          renderRow={renderItem}
          scrollEnabled={false}
          onChangeOrder={onChangeOrder}
          onActivateRow={onActivateRow}
          onReleaseRow={onReleaseRow}
        />
      </ScrollView>
    </View>
  );
};

ReorderWallets.navigationOptions = navigationStyle(
  {
    closeButton: true,
    headerLeft: null,
  },
  opts => ({ ...opts, title: loc.wallets.reorder_title }),
);

export default ReorderWallets;

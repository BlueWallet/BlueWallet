import React, { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, Image, Text, StyleSheet, StatusBar, ScrollView } from 'react-native';
import { BlueNavigationStyle } from '../../BlueComponents';
import SortableList from 'react-native-sortable-list';
import LinearGradient from 'react-native-linear-gradient';
import { PlaceholderWallet, LightningCustodianWallet } from '../../class';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import WalletGradient from '../../class/wallet-gradient';
import loc, { formatBalance, transactionTimeToReadable } from '../../loc';
import { useNavigation, useTheme } from '@react-navigation/native';
const EV = require('../../blue_modules/events');
/** @type {AppStorage} */
const BlueApp = require('../../BlueApp');

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
  },
  balance: {
    backgroundColor: 'transparent',
    fontWeight: 'bold',
    fontSize: 36,
    color: '#fff',
  },
  latestTxLabel: {
    backgroundColor: 'transparent',
    fontSize: 13,
    color: '#fff',
  },
  latestTxValue: {
    backgroundColor: 'transparent',
    fontWeight: 'bold',
    fontSize: 16,
    color: '#fff',
  },
});

const ReorderWallets = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [hasMovedARow, setHasMovedARow] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const sortableList = useRef();
  const { setParams, goBack } = useNavigation();
  const { colors } = useTheme();
  const stylesHook = {
    root: {
      backgroundColor: colors.elevated,
    },
    loading: {
      backgroundColor: colors.elevated,
    },
  };

  useEffect(() => {
    setParams(
      {
        customCloseButtonFunction: async () => {
          if (sortableList.current.state.data.length === data.length && hasMovedARow) {
            const newWalletsOrderArray = [];
            sortableList.current.state.order.forEach(element => {
              newWalletsOrderArray.push(data[element]);
            });
            BlueApp.wallets = newWalletsOrderArray;
            await BlueApp.saveToDisk();
            setTimeout(function () {
              EV(EV.enum.WALLETS_COUNT_CHANGED);
            }, 500); // adds some animaton
            goBack();
          } else {
            goBack();
          }
        },
      },
      [],
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goBack, hasMovedARow, setParams]);

  useEffect(() => {
    const loadWallets = BlueApp.getWallets().filter(wallet => wallet.type !== PlaceholderWallet.type);
    setData(loadWallets);
    setIsLoading(false);
  }, []);

  const renderItem = (item, _active) => {
    if (!item.data) {
      return;
    }
    item = item.data;

    return (
      <View shadowOpacity={40 / 100} shadowOffset={{ width: 0, height: 0 }} shadowRadius={5} style={styles.itemRoot}>
        <LinearGradient shadowColor="#000000" colors={WalletGradient.gradientsFor(item.type)} style={styles.gradient}>
          <Image
            source={
              (LightningCustodianWallet.type === item.type && require('../../img/lnd-shape.png')) || require('../../img/btc-shape.png')
            }
            style={styles.image}
          />

          <Text style={styles.transparentText} />
          <Text numberOfLines={1} style={styles.label}>
            {item.getLabel()}
          </Text>
          <Text numberOfLines={1} adjustsFontSizeToFit style={styles.balance}>
            {formatBalance(Number(item.getBalance()), item.getPreferredBalanceUnit(), true)}
          </Text>
          <Text style={styles.transparentText} />
          <Text numberOfLines={1} style={styles.latestTxLabel}>
            {loc.wallets.list_latest_transaction}
          </Text>
          <Text numberOfLines={1} style={styles.latestTxValue}>
            {transactionTimeToReadable(item.getLatestTransactionTime())}
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

ReorderWallets.navigationOptions = ({ navigation, route }) => ({
  ...BlueNavigationStyle(
    navigation,
    true,
    route.params && route.params.customCloseButtonFunction ? route.params.customCloseButtonFunction : undefined,
  ),
  headerTitle: loc.wallets.reorder_title,
  headerLeft: null,
  gestureEnabled: false,
});

export default ReorderWallets;

import React, { useRef, useState, useEffect } from 'react';
import { StatusBar, View, TouchableOpacity, InteractionManager, StyleSheet, Alert, useWindowDimensions } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { WalletsCarousel, BlueNavigationStyle, BlueHeaderDefaultMainHooks } from '../../BlueComponents';
import { Icon } from 'react-native-elements';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import PropTypes from 'prop-types';
import { AppStorage, PlaceholderWallet } from '../../class';
import WalletImport from '../../class/wallet-import';
import * as NavigationService from '../../NavigationService';
import loc from '../../loc';
import { BlueCurrentTheme } from '../../components/themes';
import { useTheme, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
const EV = require('../../blue_modules/events');
const BlueApp: AppStorage = require('../../BlueApp');
const BlueElectrum = require('../../blue_modules/BlueElectrum');

const DrawerList = props => {
  const walletsCarousel = useRef();
  const [wallets, setWallets] = useState(BlueApp.getWallets().concat(false));
  const height = useWindowDimensions().height;
  const { colors } = useTheme();
  const { selectedWallet } = useRoute().params || '';
  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.brandingColor,
    },
  });
  let lastSnappedTo = 0;

  const refreshTransactions = () => {
    InteractionManager.runAfterInteractions(async () => {
      let noErr = true;
      try {
        // await BlueElectrum.ping();
        await BlueElectrum.waitTillConnected();
        const balanceStart = +new Date();
        await BlueApp.fetchWalletBalances(lastSnappedTo || 0);
        const balanceEnd = +new Date();
        console.log('fetch balance took', (balanceEnd - balanceStart) / 1000, 'sec');
        const start = +new Date();
        await BlueApp.fetchWalletTransactions(lastSnappedTo || 0);
        const end = +new Date();
        console.log('fetch tx took', (end - start) / 1000, 'sec');
      } catch (err) {
        noErr = false;
        console.warn(err);
      }
      if (noErr) await BlueApp.saveToDisk(); // caching

      redrawScreen();
    });
  };

  useEffect(() => {
    EV(EV.enum.TRANSACTIONS_COUNT_CHANGED);
    console.log('drawerList wallets changed');
  }, [wallets]);

  const redrawScreen = (scrollToEnd = false) => {
    console.log('drawerList redrawScreen()');

    const newWallets = BlueApp.getWallets().concat(false);
    if (scrollToEnd) {
      scrollToEnd = newWallets.length > wallets.length;
    }

    setWallets(newWallets);
    if (scrollToEnd) {
      // eslint-disable-next-line no-unused-expressions
      walletsCarousel.current?.snapToItem(wallets.length - 2);
    }
  };

  useEffect(() => {
    // here, when we receive REMOTE_TRANSACTIONS_COUNT_CHANGED we fetch TXs and balance for current wallet.
    // placing event subscription here so it gets exclusively re-subscribed more often. otherwise we would
    // have to unsubscribe on unmount and resubscribe again on mount.
    EV(EV.enum.REMOTE_TRANSACTIONS_COUNT_CHANGED, refreshTransactions, true);

    EV(EV.enum.WALLETS_COUNT_CHANGED, () => redrawScreen(true));

    console.log('drawerList useEffect');
    // the idea is that upon wallet launch we will refresh
    // all balances and all transactions here:
    redrawScreen();
    InteractionManager.runAfterInteractions(async () => {
      try {
        await BlueElectrum.waitTillConnected();
        const balanceStart = +new Date();
        await BlueApp.fetchWalletBalances();
        const balanceEnd = +new Date();
        console.log('fetch all wallet balances took', (balanceEnd - balanceStart) / 1000, 'sec');
        const start = +new Date();
        await BlueApp.fetchWalletTransactions();
        const end = +new Date();
        console.log('fetch all wallet txs took', (end - start) / 1000, 'sec');
        redrawScreen();
        await BlueApp.saveToDisk();
      } catch (error) {
        console.log(error);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClick = index => {
    console.log('click', index);
    const wallet = BlueApp.wallets[index];
    if (wallet) {
      if (wallet.type === PlaceholderWallet.type) {
        Alert.alert(
          loc.wallets.add_details,
          loc.wallets.list_import_problem,
          [
            {
              text: loc.wallets.details_delete,
              onPress: () => {
                WalletImport.removePlaceholderWallet();
                EV(EV.enum.WALLETS_COUNT_CHANGED);
              },
              style: 'destructive',
            },
            {
              text: loc.wallets.list_tryagain,
              onPress: () => {
                props.navigation.navigate('AddWalletRoot', { screen: 'ImportWallet', params: { label: wallet.getSecret() } });
                WalletImport.removePlaceholderWallet();
                EV(EV.enum.WALLETS_COUNT_CHANGED);
              },
              style: 'default',
            },
          ],
          { cancelable: false },
        );
      } else {
        props.navigation.navigate('WalletTransactions', {
          wallet: wallet,
          key: `WalletTransactions-${wallet.getID()}`,
        });
      }
    } else {
      // if its out of index - this must be last card with incentive to create wallet
      if (!BlueApp.getWallets().some(wallet => wallet.type === PlaceholderWallet.type)) {
        props.navigation.navigate('Navigation', { screen: 'AddWalletRoot' });
      }
    }
  };

  const handleLongPress = () => {
    if (BlueApp.getWallets().length > 1 && !BlueApp.getWallets().some(wallet => wallet.type === PlaceholderWallet.type)) {
      props.navigation.navigate('ReorderWallets');
    } else {
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
    }
  };

  const onSnapToItem = index => {
    console.log('onSnapToItem', index);
    lastSnappedTo = index;
    if (index < BlueApp.getWallets().length) {
      // not the last
    }

    if (wallets[index].type === PlaceholderWallet.type) {
      return;
    }

    // now, lets try to fetch balance and txs for this wallet in case it has changed
    lazyRefreshWallet(index);
  };

  /**
   * Decides whether wallet with such index shoud be refreshed,
   * refreshes if yes and redraws the screen
   * @param index {Integer} Index of the wallet.
   * @return {Promise.<void>}
   */
  const lazyRefreshWallet = async index => {
    /** @type {Array.<AbstractWallet>} wallets */
    const wallets = BlueApp.getWallets();
    if (!wallets[index]) {
      return;
    }

    const oldBalance = wallets[index].getBalance();
    let noErr = true;
    let didRefresh = false;

    try {
      if (wallets[index] && wallets[index].type !== PlaceholderWallet.type && wallets[index].timeToRefreshBalance()) {
        console.log('snapped to, and now its time to refresh wallet #', index);
        await wallets[index].fetchBalance();
        if (oldBalance !== wallets[index].getBalance() || wallets[index].getUnconfirmedBalance() !== 0) {
          console.log('balance changed, thus txs too');
          // balance changed, thus txs too
          await wallets[index].fetchTransactions();
          redrawScreen();
          didRefresh = true;
        } else if (wallets[index].timeToRefreshTransaction()) {
          console.log(wallets[index].getLabel(), 'thinks its time to refresh TXs');
          await wallets[index].fetchTransactions();
          if (wallets[index].fetchPendingTransactions) {
            await wallets[index].fetchPendingTransactions();
          }
          if (wallets[index].fetchUserInvoices) {
            await wallets[index].fetchUserInvoices();
            await wallets[index].fetchBalance(); // chances are, paid ln invoice was processed during `fetchUserInvoices()` call and altered user's balance, so its worth fetching balance again
          }
          redrawScreen();
          didRefresh = true;
        } else {
          console.log('balance not changed');
        }
      }
    } catch (Err) {
      noErr = false;
      console.warn(Err);
    }

    if (noErr && didRefresh) {
      await BlueApp.saveToDisk(); // caching
    }
  };

  const renderWalletsCarousel = () => {
    return (
      <WalletsCarousel
        removeClippedSubviews={false}
        data={wallets}
        onPress={handleClick}
        handleLongPress={handleLongPress}
        onSnapToItem={onSnapToItem}
        ref={walletsCarousel}
        testID="WalletsList"
        vertical
        itemHeight={190}
        sliderHeight={height}
        contentContainerCustomStyle={styles.contentContainerCustomStyle}
        inactiveSlideOpacity={1.0}
        selectedWallet={selectedWallet}
      />
    );
  };

  return (
    <DrawerContentScrollView {...props} scrollEnabled={false}>
      <View styles={[styles.root, stylesHook.root]}>
        <StatusBar barStyle="default" />
        <SafeAreaView style={styles.root}>
          <BlueHeaderDefaultMainHooks
            leftText={loc.wallets.list_title}
            onNewWalletPress={
              !BlueApp.getWallets().some(wallet => wallet.type === PlaceholderWallet.type)
                ? () => props.navigation.navigate('AddWalletRoot')
                : null
            }
          />
        </SafeAreaView>
        {renderWalletsCarousel()}
      </View>
    </DrawerContentScrollView>
  );
};

export default DrawerList;
const styles = StyleSheet.create({
  contentContainerCustomStyle: {
    paddingRight: 10,
    paddingLeft: 20,
  },
  root: {
    flex: 1,
  },
  headerTouch: {
    height: 48,
    paddingRight: 16,
    paddingLeft: 32,
    paddingVertical: 10,
  },
});

DrawerList.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    addListener: PropTypes.func,
  }),
  route: PropTypes.shape({
    name: PropTypes.string,
    params: PropTypes.object,
  }),
};

DrawerList.navigationOptions = ({ navigation }) => {
  return {
    ...BlueNavigationStyle(navigation, true),
    title: '',
    headerStyle: {
      backgroundColor: BlueCurrentTheme.colors.customHeader,
      borderBottomWidth: 0,
      elevation: 0,
      shadowOpacity: 0,
      shadowOffset: { height: 0, width: 0 },
    },
    headerRight: () => (
      <TouchableOpacity testID="SettingsButton" style={styles.headerTouch} onPress={() => NavigationService.navigate('Settings')}>
        <Icon size={22} name="kebab-horizontal" type="octicon" color={BlueCurrentTheme.colors.foregroundColor} />
      </TouchableOpacity>
    ),
  };
};

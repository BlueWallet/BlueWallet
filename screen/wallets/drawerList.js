/* global alert */
import React, { Component, useRef, useState, useEffect } from 'react';
import {
  StatusBar,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  InteractionManager,
  Clipboard,
  SectionList,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { BlueScanButton, WalletsCarousel, BlueHeaderDefaultMain, BlueTransactionListItem, BlueNavigationStyle } from '../../BlueComponents';
import { Icon } from 'react-native-elements';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import PropTypes from 'prop-types';
import { AppStorage, PlaceholderWallet } from '../../class';
import WalletImport from '../../class/wallet-import';
import ActionSheet from '../ActionSheet';
import ImagePicker from 'react-native-image-picker';
import * as NavigationService from '../../NavigationService';
import loc from '../../loc';
import { BlueCurrentTheme } from '../../components/themes';
import { getSystemName } from 'react-native-device-info';
const EV = require('../../blue_modules/events');
const A = require('../../blue_modules/analytics');
const BlueApp: AppStorage = require('../../BlueApp');
const BlueElectrum = require('../../blue_modules/BlueElectrum');
const LocalQRCode = require('@remobile/react-native-qrcode-local-image');

const WalletsListSections = { CAROUSEL: 'CAROUSEL' };

const lastSnappedTo = 0;
const isDesktop = getSystemName() === 'Mac OS X';
const DrawerList = props => {
  const walletsCarousel = useRef();
  const [wallets, setWallets] = useState(BlueApp.getWallets().concat(false));
  const [isFlatListRefreshControlHidden, setIsFlatListRefreshControlHidden] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const height = useWindowDimensions().height;
  useEffect(() => {
    EV(EV.enum.WALLETS_COUNT_CHANGED, () => redrawScreen(true));
  }, []);

  /**
   * Forcefully fetches TXs and balance for lastSnappedTo (i.e. current) wallet.
   * Triggered manually by user on pull-to-refresh.
   */
  const refreshTransactions = () => {
    this.setState(
      {
        isFlatListRefreshControlHidden: false,
      },
      () => {
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

          this.redrawScreen();
        });
      },
    );
  };

  const redrawScreen = (scrollToEnd = false) => {
    console.log('wallets/list redrawScreen()');

    // here, when we receive REMOTE_TRANSACTIONS_COUNT_CHANGED we fetch TXs and balance for current wallet.
    // placing event subscription here so it gets exclusively re-subscribed more often. otherwise we would
    // have to unsubscribe on unmount and resubscribe again on mount.
    EV(EV.enum.REMOTE_TRANSACTIONS_COUNT_CHANGED, refreshTransactions, true);

    if (BlueApp.getBalance() !== 0) {
      A(A.ENUM.GOT_NONZERO_BALANCE);
    } else {
      A(A.ENUM.GOT_ZERO_BALANCE);
    }

    const newWallets = BlueApp.getWallets().concat(false);

    setIsFlatListRefreshControlHidden(true);
    setWallets(newWallets);
  };

  const txMemo = hash => {
    if (BlueApp.tx_metadata[hash] && BlueApp.tx_metadata[hash].memo) {
      return BlueApp.tx_metadata[hash].memo;
    }
    return '';
  };

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

  const _keyExtractor = (_item, index) => index.toString();

  const renderListHeaderComponent = () => {
    const style = { opacity: isFlatListRefreshControlHidden ? 1.0 : 0.5 };
    return (
      <View style={styles.listHeaderBack}>
        <Text style={styles.listHeaderText}>{loc.transactions.list_title}</Text>
        {isDesktop && (
          <TouchableOpacity style={style} onPress={refreshTransactions} disabled={isLoading}>
            <Icon name="refresh" type="font-awesome" color={BlueCurrentTheme.colors.feeText} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const handleLongPress = () => {
    if (BlueApp.getWallets().length > 1 && !BlueApp.getWallets().some(wallet => wallet.type === PlaceholderWallet.type)) {
      props.navigation.navigate('ReorderWallets');
    } else {
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
    }
  };

  const renderWalletsCarousel = () => {
    return (
      <WalletsCarousel
        removeClippedSubviews={false}
        data={wallets}
        onPress={handleClick}
        handleLongPress={handleLongPress}
        // onSnapToItem={onSnapToItem}
        ref={walletsCarousel}
        testID="WalletsList"
        vertical
        itemHeight={190}
        sliderHeight={height}
      />
    );
  };

  return (
    <DrawerContentScrollView {...props}>
      <StatusBar barStyle="default" />
      <BlueHeaderDefaultMain
        leftText={loc.wallets.list_title}
        onNewWalletPress={
          !BlueApp.getWallets().some(wallet => wallet.type === PlaceholderWallet.type)
            ? () => props.navigation.navigate('AddWalletRoot')
            : null
        }
      />
      {renderWalletsCarousel()}
    </DrawerContentScrollView>
  );
};

export default DrawerList;
const styles = StyleSheet.create({
  root: {},
  scrollContent: {
    top: 0,
    left: 0,
    bottom: 60,
    right: 0,
  },
  wrapper: {
    backgroundColor: BlueCurrentTheme.colors.brandingColor,
    flex: 1,
  },
  walletsListWrapper: {
    flex: 1,
    backgroundColor: BlueCurrentTheme.colors.brandingColor,
  },
  headerStyle: {
    ...Platform.select({
      ios: {
        marginTop: 44,
        height: 32,
        alignItems: 'flex-end',
        justifyContent: 'center',
      },
      android: {
        marginTop: 8,
        height: 44,
        alignItems: 'flex-end',
        justifyContent: 'center',
      },
    }),
  },
  headerTouch: {
    height: 48,
    paddingRight: 16,
    paddingLeft: 32,
    paddingVertical: 10,
  },
  listHeaderBack: {
    backgroundColor: BlueCurrentTheme.colors.background,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  listHeaderText: {
    fontWeight: 'bold',
    fontSize: 24,
    marginVertical: 8,
    color: BlueCurrentTheme.colors.foregroundColor,
  },
  ltRoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 16,
    backgroundColor: BlueCurrentTheme.colors.ballOutgoingExpired,
    padding: 16,
    borderRadius: 6,
  },
  ltTextWrap: {
    flexDirection: 'column',
  },
  ltTextBig: {
    fontSize: 16,
    fontWeight: '600',
    color: BlueCurrentTheme.colors.foregroundColor,
  },
  ltTextSmall: {
    fontSize: 13,
    fontWeight: '500',
    color: BlueCurrentTheme.colors.alternativeTextColor,
  },
  ltButtonWrap: {
    flexDirection: 'column',
    backgroundColor: '#007AFF',
    borderRadius: 16,
  },
  ltButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  footerRoot: {
    top: 80,
    height: 160,
    marginBottom: 80,
  },
  footerEmpty: {
    fontSize: 18,
    color: '#9aa0aa',
    textAlign: 'center',
  },
  footerStart: {
    fontSize: 18,
    color: '#9aa0aa',
    textAlign: 'center',
    fontWeight: '600',
  },
  scanButton: {
    alignSelf: 'center',
    backgroundColor: 'transparent',
    position: 'absolute',
    width: '34%',
    maxWidth: 200,
    bottom: 30,
    borderRadius: 30,
    height: '6.3%',
    minHeight: 44,
    overflow: 'hidden',
  },
  listHeader: {
    backgroundColor: '#FFFFFF',
  },
  transaction: {
    marginHorizontal: 4,
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

DrawerList.navigationOptions = ({ navigation, route }) => {
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

/* global alert */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StatusBar,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  SectionList,
  Alert,
  Platform,
  Image,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { WalletsCarousel, BlueHeaderDefaultMain, BlueTransactionListItem } from '../../BlueComponents';
import { Icon } from 'react-native-elements';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { AppStorage, PlaceholderWallet } from '../../class';
import WalletImport from '../../class/wallet-import';
import ActionSheet from '../ActionSheet';
import ImagePicker from 'react-native-image-picker';
import Clipboard from '@react-native-community/clipboard';
import loc from '../../loc';
import { FContainer, FButton } from '../../components/FloatButtons';
import { getSystemName, isTablet } from 'react-native-device-info';
import { presentCameraNotAuthorizedAlert } from '../../class/camera';
import { useFocusEffect, useNavigation, useRoute, useTheme } from '@react-navigation/native';
const EV = require('../../blue_modules/events');
const A = require('../../blue_modules/analytics');
const BlueApp: AppStorage = require('../../BlueApp');
const BlueElectrum = require('../../blue_modules/BlueElectrum');
const LocalQRCode = require('@remobile/react-native-qrcode-local-image');

const WalletsListSections = { CAROUSEL: 'CAROUSEL', LOCALTRADER: 'LOCALTRADER', TRANSACTIONS: 'TRANSACTIONS' };
let lastSnappedTo = 0;
const isDesktop = getSystemName() === 'Mac OS X';

const WalletsList = () => {
  const walletsCarousel = useRef();
  const { width } = useWindowDimensions();
  const { colors, scanImage } = useTheme();
  const { navigate, setOptions } = useNavigation();
  const routeName = useRoute().name;
  const [isLoading, setIsLoading] = useState(true);
  const [wallets, setWallets] = useState(BlueApp.getWallets().concat(false));
  const [itemWidth, setItemWidth] = useState(width * 0.82 > 375 ? 375 : width * 0.82);
  const [isLargeScreen, setIsLargeScreen] = useState(
    Platform.OS === 'android' ? isTablet() : width >= Dimensions.get('screen').width / 3 && isTablet(),
  );
  const [dataSource, setDataSource] = useState([]);

  const stylesHook = StyleSheet.create({
    walletsListWrapper: {
      backgroundColor: colors.brandingColor,
    },
    listHeaderBack: {
      backgroundColor: colors.background,
    },
    listHeaderText: {
      color: colors.foregroundColor,
    },
    ltRoot: {
      backgroundColor: colors.ballOutgoingExpired,
    },

    ltTextBig: {
      color: colors.foregroundColor,
    },
    ltTextSmall: {
      color: colors.alternativeTextColor,
    },
  });

  useEffect(() => {
    EV(EV.enum.WALLETS_COUNT_CHANGED, () => redrawScreen(true));
    // here, when we receive TRANSACTIONS_COUNT_CHANGED we do not query
    // remote server, we just redraw the screen
    EV(EV.enum.TRANSACTIONS_COUNT_CHANGED, redrawScreen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      redrawScreen();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  useEffect(() => {
    setOptions({
      title: '',
      headerStyle: {
        backgroundColor: colors.customHeader,
        borderBottomWidth: 0,
        elevation: 0,
        shadowOpacity: 0,
        shadowOffset: { height: 0, width: 0 },
      },
      headerRight: () => (
        <TouchableOpacity testID="SettingsButton" style={styles.headerTouch} onPress={navigateToSettings}>
          <Icon size={22} name="kebab-horizontal" type="octicon" color={colors.foregroundColor} />
        </TouchableOpacity>
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors]);

  const navigateToSettings = () => {
    navigate('Settings');
  };

  /**
   * Forcefully fetches TXs and balance for lastSnappedTo (i.e. current) wallet.
   * Triggered manually by user on pull-to-refresh.
   */
  const refreshTransactions = async () => {
    setIsLoading(true);
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
      setIsLoading(false);
    }
    if (noErr) await BlueApp.saveToDisk(); // caching
    setIsLoading(false);
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

    const storedWallets = BlueApp.getWallets().concat(false);
    const storedDataSource = BlueApp.getTransactions(null, 10);
    if (scrollToEnd) {
      scrollToEnd = storedWallets.length > wallets.length;
    }

    setDataSource(storedDataSource);
    setWallets(storedWallets);
    setIsLoading(false);
    if (scrollToEnd) {
      navigate('DrawerRoot', { wallets: BlueApp.getWallets() });
      // eslint-disable-next-line no-unused-expressions
      walletsCarousel.current?.snapToItem(storedWallets.length - 2);
    }
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
                navigate('AddWalletRoot', { screen: 'ImportWallet', params: { label: wallet.getSecret() } });
                WalletImport.removePlaceholderWallet();
                EV(EV.enum.WALLETS_COUNT_CHANGED);
              },
              style: 'default',
            },
          ],
          { cancelable: false },
        );
      } else {
        navigate('WalletTransactions', {
          wallet,
          key: `WalletTransactions-${wallet.getID()}`,
        });
      }
    } else {
      // if its out of index - this must be last card with incentive to create wallet
      if (!BlueApp.getWallets().some(wallet => wallet.type === PlaceholderWallet.type)) {
        navigate('AddWalletRoot');
      }
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
      if (wallets && wallets[index] && wallets[index].type !== PlaceholderWallet.type && wallets[index].timeToRefreshBalance()) {
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

  const renderListHeaderComponent = () => {
    const style = { opacity: isLoading ? 1.0 : 0.5 };
    return (
      <View style={[styles.listHeaderBack, stylesHook.listHeaderBack]}>
        <Text style={[styles.listHeaderText, stylesHook.listHeaderText]}>{loc.transactions.list_title}</Text>
        {isDesktop && (
          <TouchableOpacity style={style} onPress={refreshTransactions} disabled={isLoading}>
            <Icon name="refresh" type="font-awesome" color={colors.feeText} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const handleLongPress = () => {
    if (BlueApp.getWallets().length > 1 && !BlueApp.getWallets().some(wallet => wallet.type === PlaceholderWallet.type)) {
      navigate('ReorderWallets');
    } else {
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
    }
  };

  const renderTransactionListsRow = data => {
    return (
      <View style={styles.transaction}>
        <BlueTransactionListItem item={data.item} itemPriceUnit={data.item.walletPreferredBalanceUnit} />
      </View>
    );
  };

  const renderLocalTrader = () => {
    if (BlueApp.getWallets().length > 0 && !BlueApp.getWallets().some(wallet => wallet.type === PlaceholderWallet.type)) {
      return (
        <TouchableOpacity
          onPress={() => {
            navigate('HodlHodl', { screen: 'HodlHodl' });
          }}
          style={[styles.ltRoot, stylesHook.ltRoot]}
        >
          <View style={styles.ltTextWrap}>
            <Text style={[styles.ltTextBig, stylesHook.ltTextBig]}>Local Trader</Text>
            <Text style={[styles.ltTextSmall, stylesHook.ltTextSmall]}>{loc.hodl.p2p}</Text>
          </View>
          <View style={styles.ltButtonWrap}>
            <Text style={styles.ltButton}>New</Text>
          </View>
        </TouchableOpacity>
      );
    } else {
      return null;
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
        sliderWidth={width}
        itemWidth={itemWidth}
      />
    );
  };

  const renderSectionItem = item => {
    switch (item.section.key) {
      case WalletsListSections.CAROUSEL:
        return isLargeScreen ? null : renderWalletsCarousel();
      case WalletsListSections.LOCALTRADER:
        return renderLocalTrader();
      case WalletsListSections.TRANSACTIONS:
        return renderTransactionListsRow(item);
      default:
        return null;
    }
  };

  const renderSectionHeader = section => {
    switch (section.section.key) {
      case WalletsListSections.CAROUSEL:
        return isLargeScreen ? null : (
          <BlueHeaderDefaultMain
            leftText={loc.wallets.list_title}
            onNewWalletPress={
              !BlueApp.getWallets().some(wallet => wallet.type === PlaceholderWallet.type) ? () => navigate('AddWalletRoot') : null
            }
          />
        );
      case WalletsListSections.TRANSACTIONS:
        return renderListHeaderComponent();
      default:
        return null;
    }
  };

  const renderSectionFooter = section => {
    switch (section.section.key) {
      case WalletsListSections.TRANSACTIONS:
        if (dataSource.length === 0 && !isLoading) {
          return (
            <View style={styles.footerRoot}>
              <Text style={styles.footerEmpty}>{loc.wallets.list_empty_txs1}</Text>
              <Text style={styles.footerStart}>{loc.wallets.list_empty_txs2}</Text>
            </View>
          );
        } else {
          return null;
        }
      default:
        return null;
    }
  };

  const renderScanButton = () => {
    if (BlueApp.getWallets().length > 0 && !BlueApp.getWallets().some(wallet => wallet.type === PlaceholderWallet.type)) {
      return (
        <FContainer>
          <FButton
            onPress={onScanButtonPressed}
            onLongPress={isDesktop ? undefined : sendButtonLongPress}
            icon={<Image resizeMode="stretch" source={scanImage} />}
            text={loc.send.details_scan}
          />
        </FContainer>
      );
    } else {
      return null;
    }
  };

  const sectionListKeyExtractor = (item, index) => {
    return `${item}${index}}`;
  };

  const onScanButtonPressed = () => {
    if (isDesktop) {
      sendButtonLongPress();
    } else {
      navigate('ScanQRCodeRoot', {
        screen: 'ScanQRCode',
        params: {
          launchedBy: routeName,
          onBarScanned,
          showFileImportButton: false,
        },
      });
    }
  };

  const onBarScanned = value => {
    DeeplinkSchemaMatch.navigationRouteFor({ url: value }, completionValue => {
      ReactNativeHapticFeedback.trigger('impactLight', { ignoreAndroidSystemSettings: false });
      navigate(...completionValue);
    });
  };

  const choosePhoto = () => {
    ImagePicker.launchImageLibrary(
      {
        title: null,
        mediaType: 'photo',
        takePhotoButtonTitle: null,
      },
      response => {
        if (response.uri) {
          const uri = Platform.OS === 'ios' ? response.uri.toString().replace('file://', '') : response.path.toString();
          LocalQRCode.decode(uri, (error, result) => {
            if (!error) {
              onBarScanned(result);
            } else {
              alert(loc.send.qr_error_no_qrcode);
            }
          });
        }
      },
    );
  };

  const takePhoto = () => {
    ImagePicker.launchCamera(
      {
        title: null,
        mediaType: 'photo',
        takePhotoButtonTitle: null,
      },
      response => {
        if (response.uri) {
          const uri = Platform.OS === 'ios' ? response.uri.toString().replace('file://', '') : response.path.toString();
          LocalQRCode.decode(uri, (error, result) => {
            if (!error) {
              onBarScanned(result);
            } else {
              alert(loc.send.qr_error_no_qrcode);
            }
          });
        } else if (response.error) {
          presentCameraNotAuthorizedAlert(response.error);
        }
      },
    );
  };

  const copyFromClipbard = async () => {
    onBarScanned(await Clipboard.getString());
  };

  const sendButtonLongPress = async () => {
    const isClipboardEmpty = (await Clipboard.getString()).replace(' ', '').length === 0;
    if (Platform.OS === 'ios') {
      const options = [loc._.cancel, loc.wallets.list_long_choose, isDesktop ? loc.wallets.take_photo : loc.wallets.list_long_scan];
      if (!isClipboardEmpty) {
        options.push(loc.wallets.list_long_clipboard);
      }
      ActionSheet.showActionSheetWithOptions({ options, cancelButtonIndex: 0 }, buttonIndex => {
        if (buttonIndex === 1) {
          choosePhoto();
        } else if (buttonIndex === 2) {
          if (isDesktop) {
            takePhoto();
          } else {
            navigate('ScanQRCodeRoot', {
              screen: 'ScanQRCode',
              params: {
                launchedBy: routeName,
                onBarScanned,
                showFileImportButton: false,
              },
            });
          }
        } else if (buttonIndex === 3) {
          copyFromClipbard();
        }
      });
    } else if (Platform.OS === 'android') {
      const buttons = [
        {
          text: loc._.cancel,
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: loc.wallets.list_long_choose,
          onPress: choosePhoto,
        },
        {
          text: loc.wallets.list_long_scan,
          onPress: () =>
            navigate('ScanQRCodeRoot', {
              screen: 'ScanQRCode',
              params: {
                launchedBy: routeName,
                onBarScanned,
                showFileImportButton: false,
              },
            }),
        },
      ];
      if (!isClipboardEmpty) {
        buttons.push({
          text: loc.wallets.list_long_clipboard,
          onPress: copyFromClipbard,
        });
      }
      ActionSheet.showActionSheetWithOptions({
        title: '',
        message: '',
        buttons,
      });
    }
  };

  const onLayout = _e => {
    setIsLargeScreen(Platform.OS === 'android' ? isTablet() : width >= Dimensions.get('screen').width / 3 && isTablet());
    setItemWidth(width * 0.82 > 375 ? 375 : width * 0.82);
  };

  return (
    <View style={styles.root} onLayout={onLayout}>
      <StatusBar barStyle="default" />
      <View style={[styles.walletsListWrapper, stylesHook.walletsListWrapper]}>
        <SectionList
          onRefresh={refreshTransactions}
          refreshing={isLoading}
          renderItem={renderSectionItem}
          keyExtractor={sectionListKeyExtractor}
          renderSectionHeader={renderSectionHeader}
          initialNumToRender={20}
          contentInset={styles.scrollContent}
          renderSectionFooter={renderSectionFooter}
          sections={[
            { key: WalletsListSections.CAROUSEL, data: [WalletsListSections.CAROUSEL] },
            { key: WalletsListSections.LOCALTRADER, data: [WalletsListSections.LOCALTRADER] },
            { key: WalletsListSections.TRANSACTIONS, data: dataSource },
          ]}
        />
        {renderScanButton()}
      </View>
    </View>
  );
};

export default WalletsList;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    top: 0,
    left: 0,
    bottom: 60,
    right: 0,
  },
  wrapper: {
    flex: 1,
  },
  walletsListWrapper: {
    flex: 1,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  listHeaderText: {
    fontWeight: 'bold',
    fontSize: 24,
    marginVertical: 8,
  },
  ltRoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 16,
    padding: 16,
    borderRadius: 6,
  },
  ltTextWrap: {
    flexDirection: 'column',
  },
  ltTextBig: {
    fontSize: 16,
    fontWeight: '600',
  },
  ltTextSmall: {
    fontSize: 13,
    fontWeight: '500',
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
  listHeader: {
    backgroundColor: '#FFFFFF',
  },
  transaction: {
    marginHorizontal: 0,
  },
});

import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
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
  SafeAreaView,
} from 'react-native';
import { BlueHeaderDefaultMain, BlueTransactionListItem } from '../../BlueComponents';
import WalletsCarousel from '../../components/WalletsCarousel';
import { Icon } from 'react-native-elements';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { PlaceholderWallet } from '../../class';
import WalletImport from '../../class/wallet-import';
import ActionSheet from '../ActionSheet';
import Clipboard from '@react-native-community/clipboard';
import loc from '../../loc';
import { FContainer, FButton } from '../../components/FloatButtons';
import { isTablet } from 'react-native-device-info';
import { useFocusEffect, useNavigation, useRoute, useTheme } from '@react-navigation/native';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { isCatalyst, isMacCatalina } from '../../blue_modules/environment';

const A = require('../../blue_modules/analytics');
const fs = require('../../blue_modules/fs');
const WalletsListSections = { CAROUSEL: 'CAROUSEL', LOCALTRADER: 'LOCALTRADER', TRANSACTIONS: 'TRANSACTIONS' };

const WalletsList = () => {
  const walletsCarousel = useRef();
  const { wallets, pendingWallets, getTransactions, getBalance, refreshAllWalletTransactions, setSelectedWallet } = useContext(
    BlueStorageContext,
  );
  const { width } = useWindowDimensions();
  const { colors, scanImage } = useTheme();
  const { navigate, setOptions } = useNavigation();
  const routeName = useRoute().name;
  const [isLoading, setIsLoading] = useState(false);
  const [itemWidth, setItemWidth] = useState(width * 0.82 > 375 ? 375 : width * 0.82);
  const [isLargeScreen, setIsLargeScreen] = useState(
    Platform.OS === 'android' ? isTablet() : width >= Dimensions.get('screen').width / 3 && isTablet(),
  );
  const [carouselData, setCarouselData] = useState([]);
  const dataSource = getTransactions(null, 10);
  const walletsCount = useRef(wallets.length);

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

  useFocusEffect(
    useCallback(() => {
      verifyBalance();
      setSelectedWallet('');
      StatusBar.setBarStyle('default');
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  useEffect(() => {
    const allWallets = wallets.concat(pendingWallets);
    const newCarouselData = allWallets.concat(false);
    setCarouselData(newCarouselData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets, pendingWallets]);

  useEffect(() => {
    if (walletsCount.current < wallets.length) {
      walletsCarousel.current?.snapToItem(walletsCount.current);
    }
    walletsCount.current = wallets.length;
  }, [wallets]);

  useEffect(() => {
    if (pendingWallets.length > 0) {
      walletsCarousel.current?.snapToItem(carouselData.length - pendingWallets.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingWallets]);

  const verifyBalance = () => {
    if (getBalance() !== 0) {
      A(A.ENUM.GOT_NONZERO_BALANCE);
    } else {
      A(A.ENUM.GOT_ZERO_BALANCE);
    }
  };

  useEffect(() => {
    setOptions({
      title: '',
      headerShown: !isCatalyst,
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
   * Forcefully fetches TXs and balance for ALL wallets.
   * Triggered manually by user on pull-to-refresh.
   */
  const refreshTransactions = (showLoadingIndicator = true, showUpdateStatusIndicator = false) => {
    setIsLoading(showLoadingIndicator);
    refreshAllWalletTransactions(showLoadingIndicator, showUpdateStatusIndicator).finally(() => setIsLoading(false));
  };

  useEffect(() => {
    refreshTransactions(false, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // call refreshTransactions() only once, when screen mounts

  const handleClick = index => {
    console.log('click', index);
    const wallet = carouselData[index];
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
              },
              style: 'destructive',
            },
            {
              text: loc.wallets.list_tryagain,
              onPress: () => {
                navigate('AddWalletRoot', { screen: 'ImportWallet', params: { label: wallet.getSecret() } });
                WalletImport.removePlaceholderWallet();
              },
              style: 'default',
            },
          ],
          { cancelable: false },
        );
      } else {
        const walletID = wallet.getID();
        navigate('WalletTransactions', {
          walletID,
          walletType: wallet.type,
          key: `WalletTransactions-${walletID}`,
        });
      }
    } else {
      // if its out of index - this must be last card with incentive to create wallet
      navigate('AddWalletRoot');
    }
  };

  const onSnapToItem = index => {
    console.log('onSnapToItem', index);
    if (wallets[index] && (wallets[index].timeToRefreshBalance() || wallets[index].timeToRefreshTransaction())) {
      console.log(wallets[index].getLabel(), 'thinks its time to refresh either balance or transactions. refetching both');
      refreshAllWalletTransactions(index, false).finally(() => setIsLoading(false));
    }
  };

  const renderListHeaderComponent = () => {
    const style = { opacity: isLoading ? 1.0 : 0.5 };
    return (
      <View style={[styles.listHeaderBack, stylesHook.listHeaderBack]}>
        <Text textBreakStrategy="simple" style={[styles.listHeaderText, stylesHook.listHeaderText]}>
          {`${loc.transactions.list_title}${'  '}`}
        </Text>
        {isCatalyst && (
          <TouchableOpacity style={style} onPress={() => refreshTransactions(true)} disabled={isLoading}>
            <Icon name="refresh" type="font-awesome" color={colors.feeText} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const handleLongPress = () => {
    if (carouselData.length > 1 && !carouselData.some(wallet => wallet.type === PlaceholderWallet.type)) {
      navigate('ReorderWallets');
    } else {
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
    }
  };

  const renderTransactionListsRow = data => {
    return (
      <View style={styles.transaction}>
        <BlueTransactionListItem item={data.item} itemPriceUnit={data.item.walletPreferredBalanceUnit} walletID={data.item.walletID} />
      </View>
    );
  };

  const renderLocalTrader = () => {
    if (carouselData.every(wallet => wallet === false)) return null;
    if (carouselData.length > 0 && !carouselData.some(wallet => wallet.type === PlaceholderWallet.type)) {
      const button = (
        <TouchableOpacity
          onPress={() => {
            navigate('HodlHodl', { screen: 'HodlHodl' });
          }}
          style={[styles.ltRoot, stylesHook.ltRoot]}
        >
          <View style={styles.ltTextWrap}>
            <Text style={[styles.ltTextBig, stylesHook.ltTextBig]}>{loc.hodl.local_trader}</Text>
            <Text style={[styles.ltTextSmall, stylesHook.ltTextSmall]}>{loc.hodl.p2p}</Text>
          </View>
        </TouchableOpacity>
      );
      return isLargeScreen ? <SafeAreaView>{button}</SafeAreaView> : button;
    } else {
      return null;
    }
  };

  const renderWalletsCarousel = () => {
    return (
      <WalletsCarousel
        removeClippedSubviews={false}
        data={carouselData}
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
            onNewWalletPress={!carouselData.some(wallet => wallet.type === PlaceholderWallet.type) ? () => navigate('AddWalletRoot') : null}
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
    if (carouselData.length > 0 && !carouselData.some(wallet => wallet.type === PlaceholderWallet.type)) {
      return (
        <FContainer>
          <FButton
            onPress={onScanButtonPressed}
            onLongPress={isMacCatalina ? undefined : sendButtonLongPress}
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
    if (isMacCatalina) {
      fs.showActionSheet().then(onBarScanned);
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

  const copyFromClipboard = async () => {
    onBarScanned(await Clipboard.getString());
  };

  const sendButtonLongPress = async () => {
    const isClipboardEmpty = (await Clipboard.getString()).replace(' ', '').length === 0;
    if (Platform.OS === 'ios') {
      if (isMacCatalina) {
        fs.showActionSheet().then(onBarScanned);
      } else {
        const options = [loc._.cancel, loc.wallets.list_long_choose, loc.wallets.list_long_scan];
        if (!isClipboardEmpty) {
          options.push(loc.wallets.list_long_clipboard);
        }
        ActionSheet.showActionSheetWithOptions({ options, cancelButtonIndex: 0 }, buttonIndex => {
          if (buttonIndex === 1) {
            fs.showImagePickerAndReadImage().then(onBarScanned);
          } else if (buttonIndex === 2) {
            navigate('ScanQRCodeRoot', {
              screen: 'ScanQRCode',
              params: {
                launchedBy: routeName,
                onBarScanned,
                showFileImportButton: false,
              },
            });
          } else if (buttonIndex === 3) {
            copyFromClipboard();
          }
        });
      }
    } else if (Platform.OS === 'android') {
      const buttons = [
        {
          text: loc._.cancel,
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: loc.wallets.list_long_choose,
          onPress: () => fs.showActionSheet().then(onBarScanned),
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
          onPress: copyFromClipboard,
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

  const onRefresh = () => {
    refreshTransactions(true, false);
  };

  return (
    <View style={styles.root} onLayout={onLayout}>
      <StatusBar barStyle="default" />
      <View style={[styles.walletsListWrapper, stylesHook.walletsListWrapper]}>
        <SectionList
          onRefresh={onRefresh}
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

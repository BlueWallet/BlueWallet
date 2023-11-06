import React, { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  SectionList,
  Platform,
  Image,
  Dimensions,
  useWindowDimensions,
  findNodeHandle,
  I18nManager,
} from 'react-native';
import { BlueHeaderDefaultMain } from '../../BlueComponents';
import WalletsCarousel from '../../components/WalletsCarousel';
import { Icon } from 'react-native-elements';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import ActionSheet from '../ActionSheet';
import loc from '../../loc';
import { FContainer, FButton } from '../../components/FloatButtons';
import { useFocusEffect, useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { isDesktop, isTablet } from '../../blue_modules/environment';
import BlueClipboard from '../../blue_modules/clipboard';
import navigationStyle from '../../components/navigationStyle';
import { TransactionListItem } from '../../components/TransactionListItem';
import { scanQrHelper } from '../../helpers/scan-qr';
import { useTheme } from '../../components/themes';

const A = require('../../blue_modules/analytics');
const fs = require('../../blue_modules/fs');
const WalletsListSections = { CAROUSEL: 'CAROUSEL', TRANSACTIONS: 'TRANSACTIONS' };

const WalletsList = () => {
  const walletsCarousel = useRef();
  const currentWalletIndex = useRef(0);
  const { wallets, getTransactions, getBalance, refreshAllWalletTransactions, setSelectedWallet, isElectrumDisabled } =
    useContext(BlueStorageContext);
  const { width } = useWindowDimensions();
  const { colors, scanImage } = useTheme();
  const { navigate, setOptions } = useNavigation();
  const isFocused = useIsFocused();
  const routeName = useRoute().name;
  const [isLoading, setIsLoading] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(
    Platform.OS === 'android' ? isTablet() : (width >= Dimensions.get('screen').width / 2 && isTablet()) || isDesktop,
  );
  const dataSource = getTransactions(null, 10);
  const walletsCount = useRef(wallets.length);
  const walletActionButtonsRef = useRef();

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
  });

  useFocusEffect(
    useCallback(() => {
      verifyBalance();
      setSelectedWallet('');
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  useEffect(() => {
    // new wallet added
    if (wallets.length > walletsCount.current) {
      walletsCarousel.current?.scrollToItem({ item: wallets[walletsCount.current] });
    }

    walletsCount.current = wallets.length;
  }, [wallets]);

  const verifyBalance = () => {
    if (getBalance() !== 0) {
      A(A.ENUM.GOT_NONZERO_BALANCE);
    } else {
      A(A.ENUM.GOT_ZERO_BALANCE);
    }
  };

  useLayoutEffect(() => {
    setOptions({
      navigationBarColor: colors.navigationBarColor,
      headerShown: !isDesktop,
      headerStyle: {
        backgroundColor: colors.customHeader,
        borderBottomWidth: 0,
        elevation: 0,
        shadowOpacity: 0,
        shadowOffset: { height: 0, width: 0 },
      },
      // eslint-disable-next-line react/no-unstable-nested-components
      headerRight: () =>
        I18nManager.isRTL ? null : (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={loc._.more}
            testID="SettingsButton"
            style={styles.headerTouch}
            onPress={navigateToSettings}
          >
            <Icon size={22} name="more-horiz" type="material" color={colors.foregroundColor} />
          </TouchableOpacity>
        ),
      // eslint-disable-next-line react/no-unstable-nested-components
      headerLeft: () =>
        I18nManager.isRTL ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={loc._.more}
            testID="SettingsButton"
            style={styles.headerTouch}
            onPress={navigateToSettings}
          >
            <Icon size={22} name="more-horiz" type="material" color={colors.foregroundColor} />
          </TouchableOpacity>
        ) : null,
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
  const refreshTransactions = async (showLoadingIndicator = true, showUpdateStatusIndicator = false) => {
    if (isElectrumDisabled) return setIsLoading(false);
    setIsLoading(showLoadingIndicator);
    refreshAllWalletTransactions(false, showUpdateStatusIndicator).finally(() => setIsLoading(false));
  };

  useEffect(() => {
    refreshTransactions(false, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // call refreshTransactions() only once, when screen mounts

  const handleClick = item => {
    if (item?.getID) {
      const walletID = item.getID();
      navigate('WalletTransactions', {
        walletID,
        walletType: item.type,
        key: `WalletTransactions-${walletID}`,
      });
    } else {
      navigate('AddWalletRoot');
    }
  };

  const onSnapToItem = e => {
    if (!isFocused) return;

    const contentOffset = e.nativeEvent.contentOffset;
    const index = Math.ceil(contentOffset.x / width);

    if (currentWalletIndex.current !== index) {
      console.log('onSnapToItem', wallets.length === index ? 'NewWallet/Importing card' : index);
      if (wallets[index] && (wallets[index].timeToRefreshBalance() || wallets[index].timeToRefreshTransaction())) {
        console.log(wallets[index].getLabel(), 'thinks its time to refresh either balance or transactions. refetching both');
        refreshAllWalletTransactions(index, false).finally(() => setIsLoading(false));
      }
      currentWalletIndex.current = index;
    } else {
      console.log('onSnapToItem did not change. Most likely momentum stopped at the same index it started.');
    }
  };

  const renderListHeaderComponent = () => {
    return (
      <View style={[styles.listHeaderBack, stylesHook.listHeaderBack]}>
        <Text textBreakStrategy="simple" style={[styles.listHeaderText, stylesHook.listHeaderText]}>
          {`${loc.transactions.list_title}${'  '}`}
        </Text>
      </View>
    );
  };

  const handleLongPress = () => {
    if (wallets.length > 1) {
      navigate('ReorderWallets');
    } else {
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
    }
  };

  const renderTransactionListsRow = data => {
    return (
      <View style={styles.transaction}>
        <TransactionListItem item={data.item} itemPriceUnit={data.item.walletPreferredBalanceUnit} walletID={data.item.walletID} />
      </View>
    );
  };

  const renderWalletsCarousel = () => {
    return (
      <WalletsCarousel
        data={wallets.concat(false)}
        extraData={[wallets]}
        onPress={handleClick}
        handleLongPress={handleLongPress}
        onMomentumScrollEnd={onSnapToItem}
        ref={walletsCarousel}
        testID="WalletsList"
        horizontal
        scrollEnabled={isFocused}
      />
    );
  };

  const renderSectionItem = item => {
    switch (item.section.key) {
      case WalletsListSections.CAROUSEL:
        return isLargeScreen ? null : renderWalletsCarousel();
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
          <BlueHeaderDefaultMain leftText={loc.wallets.list_title} onNewWalletPress={() => navigate('AddWalletRoot')} />
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
            <View style={styles.footerRoot} testID="NoTransactionsMessage">
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
    if (wallets.length > 0) {
      return (
        <FContainer ref={walletActionButtonsRef.current}>
          <FButton
            onPress={onScanButtonPressed}
            onLongPress={sendButtonLongPress}
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
    scanQrHelper(navigate, routeName, false).then(onBarScanned);
  };

  const onBarScanned = value => {
    if (!value) return;
    DeeplinkSchemaMatch.navigationRouteFor({ url: value }, completionValue => {
      ReactNativeHapticFeedback.trigger('impactLight', { ignoreAndroidSystemSettings: false });
      navigate(...completionValue);
    });
  };

  const copyFromClipboard = async () => {
    onBarScanned(await BlueClipboard().getClipboardContent());
  };

  const sendButtonLongPress = async () => {
    const isClipboardEmpty = (await BlueClipboard().getClipboardContent()).trim().length === 0;
    if (Platform.OS === 'ios') {
      const options = [loc._.cancel, loc.wallets.list_long_choose, loc.wallets.list_long_scan];
      if (!isClipboardEmpty) {
        options.push(loc.wallets.list_long_clipboard);
      }
      ActionSheet.showActionSheetWithOptions(
        { options, cancelButtonIndex: 0, anchor: findNodeHandle(walletActionButtonsRef.current) },
        buttonIndex => {
          if (buttonIndex === 1) {
            fs.showImagePickerAndReadImage().then(onBarScanned);
          } else if (buttonIndex === 2) {
            scanQrHelper(navigate, routeName, false).then(onBarScanned);
          } else if (buttonIndex === 3) {
            copyFromClipboard();
          }
        },
      );
    } else if (Platform.OS === 'android') {
      const buttons = [
        {
          text: loc._.cancel,
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: loc.wallets.list_long_choose,
          onPress: () => fs.showImagePickerAndReadImage().then(onBarScanned),
        },
        {
          text: loc.wallets.list_long_scan,
          onPress: () => scanQrHelper(navigate, routeName, false).then(onBarScanned),
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
    setIsLargeScreen(Platform.OS === 'android' ? isTablet() : (width >= Dimensions.get('screen').width / 2 && isTablet()) || isDesktop);
  };

  const onRefresh = () => {
    refreshTransactions(true, false);
  };

  return (
    <View style={styles.root} onLayout={onLayout}>
      <View style={[styles.walletsListWrapper, stylesHook.walletsListWrapper]}>
        <SectionList
          removeClippedSubviews
          contentInsetAdjustmentBehavior="automatic"
          automaticallyAdjustContentInsets
          refreshing={isLoading}
          {...(isElectrumDisabled ? {} : { refreshing: isLoading, onRefresh })}
          renderItem={renderSectionItem}
          keyExtractor={sectionListKeyExtractor}
          renderSectionHeader={renderSectionHeader}
          initialNumToRender={20}
          contentInset={styles.scrollContent}
          renderSectionFooter={renderSectionFooter}
          sections={[
            { key: WalletsListSections.CAROUSEL, data: [WalletsListSections.CAROUSEL] },
            { key: WalletsListSections.TRANSACTIONS, data: dataSource },
          ]}
        />
        {renderScanButton()}
      </View>
    </View>
  );
};

export default WalletsList;
WalletsList.navigationOptions = navigationStyle({}, opts => ({ ...opts, headerTitle: '', headerBackTitle: loc.wallets.list_title }));

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
  walletsListWrapper: {
    flex: 1,
  },
  headerTouch: {
    height: 48,
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
    marginVertical: 16,
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
  transaction: {
    marginHorizontal: 0,
  },
});

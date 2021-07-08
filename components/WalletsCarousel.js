import React, { useRef, useCallback, useImperativeHandle, forwardRef, useContext } from 'react';
import PropTypes from 'prop-types';
import {
  ActivityIndicator,
  Animated,
  Image,
  I18nManager,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
  Dimensions,
  FlatList,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import loc, { formatBalance, transactionTimeToReadable } from '../loc';
import { LightningCustodianWallet, MultisigHDWallet, PlaceholderWallet } from '../class';
import WalletGradient from '../class/wallet-gradient';
import { BluePrivateBalance } from '../BlueComponents';
import { BlueStorageContext } from '../blue_modules/storage-context';
import { isHandset, isTablet, isDesktop } from '../blue_modules/environment';

const nStyles = StyleSheet.create({
  root: {},
  container: {
    borderRadius: 10,
    minHeight: Platform.OS === 'ios' ? 164 : 181,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  addAWAllet: {
    fontWeight: '600',
    fontSize: 24,
    marginBottom: 4,
  },
  addLine: {
    fontSize: 13,
  },
  button: {
    marginTop: 12,
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    fontWeight: '500',
  },
});

const NewWalletPanel = ({ onPress }) => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const itemWidth = width * 0.82 > 375 ? 375 : width * 0.82;
  const isLargeScreen = Platform.OS === 'android' ? isTablet() : width >= Dimensions.get('screen').width / 2 && (isTablet() || isDesktop);
  const nStylesHooks = StyleSheet.create({
    container: isLargeScreen
      ? {
          paddingHorizontal: 24,
          marginVertical: 16,
        }
      : { paddingVertical: 16, paddingHorizontal: 24 },
  });

  return (
    <TouchableOpacity
      accessibilityRole="button"
      testID="CreateAWallet"
      onPress={onPress}
      style={isLargeScreen ? {} : { width: itemWidth * 1.2 }}
    >
      <View
        style={[
          nStyles.container,
          nStylesHooks.container,
          { backgroundColor: WalletGradient.createWallet() },
          isLargeScreen ? {} : { width: itemWidth },
        ]}
      >
        <Text style={[nStyles.addAWAllet, { color: colors.foregroundColor }]}>{loc.wallets.list_create_a_wallet}</Text>
        <Text style={[nStyles.addLine, { color: colors.alternativeTextColor }]}>{loc.wallets.list_create_a_wallet_text}</Text>
        <View style={nStyles.button}>
          <Text style={[nStyles.buttonText, { color: colors.brandingColor }]}>{loc.wallets.list_create_a_button}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

NewWalletPanel.propTypes = {
  onPress: PropTypes.func.isRequired,
};

const iStyles = StyleSheet.create({
  root: { paddingRight: 20 },
  rootLargeDevice: { marginVertical: 20 },
  grad: {
    padding: 15,
    borderRadius: 12,
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
  br: {
    backgroundColor: 'transparent',
  },
  label: {
    backgroundColor: 'transparent',
    fontSize: 19,
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
  },
  importError: {
    backgroundColor: 'transparent',
    fontSize: 19,
    marginTop: 40,
  },
  activity: {
    marginTop: 40,
  },
  balance: {
    backgroundColor: 'transparent',
    fontWeight: 'bold',
    fontSize: 36,
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
  },
  latestTx: {
    backgroundColor: 'transparent',
    fontSize: 13,
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
  },
  latestTxTime: {
    backgroundColor: 'transparent',
    fontWeight: 'bold',
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
    fontSize: 16,
  },
});

const WalletCarouselItem = ({ item, index, onPress, handleLongPress, isSelectedWallet }) => {
  const scaleValue = new Animated.Value(1.0);
  const { colors } = useTheme();
  const { walletTransactionUpdateStatus } = useContext(BlueStorageContext);
  const { width } = useWindowDimensions();
  const itemWidth = width * 0.82 > 375 ? 375 : width * 0.82;
  const isLargeScreen = Platform.OS === 'android' ? isTablet() : width >= Dimensions.get('screen').width / 2 && (isTablet() || isDesktop);
  const onPressedIn = () => {
    const props = { duration: 50 };
    props.useNativeDriver = true;
    props.toValue = 0.9;
    Animated.spring(scaleValue, props).start();
  };

  const onPressedOut = () => {
    const props = { duration: 50 };
    props.useNativeDriver = true;
    props.toValue = 1.0;
    Animated.spring(scaleValue, props).start();
  };

  if (!item)
    return (
      <NewWalletPanel
        onPress={() => {
          onPressedOut();
          onPress(index);
        }}
      />
    );

  if (item.type === PlaceholderWallet.type) {
    return (
      <Animated.View
        style={[isLargeScreen ? iStyles.rootLargeDevice : { ...iStyles.root, width: itemWidth }, { transform: [{ scale: scaleValue }] }]}
        shadowOpacity={40 / 100}
        shadowOffset={{ width: 0, height: 0 }}
        shadowRadius={5}
      >
        <TouchableWithoutFeedback
          onPressIn={item.getIsFailure() ? onPressedIn : null}
          onPressOut={item.getIsFailure() ? onPressedOut : null}
          onPress={() => {
            if (item.getIsFailure()) {
              onPressedOut();
              onPress(index);
              onPressedOut();
            }
          }}
        >
          <LinearGradient shadowColor={colors.shadowColor} colors={WalletGradient.gradientsFor(item.type)} style={iStyles.grad}>
            <Image
              source={I18nManager.isRTL ? require('../img/btc-shape-rtl.png') : require('../img/btc-shape.png')}
              style={iStyles.image}
            />
            <Text style={iStyles.br} />
            <Text numberOfLines={1} style={[iStyles.label, { color: colors.inverseForegroundColor }]}>
              {item.getIsFailure() ? loc.wallets.import_placeholder_fail : loc.wallets.import_placeholder_inprogress}
            </Text>
            {item.getIsFailure() ? (
              <Text testID="ImportError" numberOfLines={0} style={[iStyles.importError, { color: colors.inverseForegroundColor }]}>
                {loc.wallets.list_import_error}
              </Text>
            ) : (
              <ActivityIndicator style={iStyles.activity} />
            )}
          </LinearGradient>
        </TouchableWithoutFeedback>
      </Animated.View>
    );
  }

  const opacity = isSelectedWallet === false ? 0.5 : 1.0;
  let image;
  switch (item.type) {
    case LightningCustodianWallet.type:
      image = I18nManager.isRTL ? require('../img/lnd-shape-rtl.png') : require('../img/lnd-shape.png');
      break;
    case MultisigHDWallet.type:
      image = I18nManager.isRTL ? require('../img/vault-shape-rtl.png') : require('../img/vault-shape.png');
      break;
    default:
      image = I18nManager.isRTL ? require('../img/btc-shape-rtl.png') : require('../img/btc-shape.png');
  }

  const latestTransactionText =
    walletTransactionUpdateStatus === true || walletTransactionUpdateStatus === item.getID()
      ? loc.transactions.updating
      : item.getBalance() !== 0 && item.getLatestTransactionTime() === 0
      ? loc.wallets.pull_to_refresh
      : item.getTransactions().find(tx => tx.confirmations === 0)
      ? loc.transactions.pending
      : transactionTimeToReadable(item.getLatestTransactionTime());

  const balance = !item.hideBalance && formatBalance(Number(item.getBalance()), item.getPreferredBalanceUnit(), true);

  return (
    <Animated.View
      style={[
        isLargeScreen ? iStyles.rootLargeDevice : { ...iStyles.root, width: itemWidth },
        { opacity, transform: [{ scale: scaleValue }] },
      ]}
      shadowOpacity={25 / 100}
      shadowOffset={{ width: 0, height: 3 }}
      shadowRadius={8}
    >
      <TouchableWithoutFeedback
        testID={item.getLabel()}
        onPressIn={onPressedIn}
        onPressOut={onPressedOut}
        onLongPress={handleLongPress}
        onPress={() => {
          onPressedOut();
          onPress(index);
          onPressedOut();
        }}
      >
        <LinearGradient shadowColor={colors.shadowColor} colors={WalletGradient.gradientsFor(item.type)} style={iStyles.grad}>
          <Image source={image} style={iStyles.image} />
          <Text style={iStyles.br} />
          <Text numberOfLines={1} style={[iStyles.label, { color: colors.inverseForegroundColor }]}>
            {item.getLabel()}
          </Text>
          {item.hideBalance ? (
            <BluePrivateBalance />
          ) : (
            <Text
              numberOfLines={1}
              key={balance} // force component recreation on balance change. To fix right-to-left languages, like Farsi
              adjustsFontSizeToFit
              style={[iStyles.balance, { color: colors.inverseForegroundColor }]}
            >
              {balance}
            </Text>
          )}
          <Text style={iStyles.br} />
          <Text numberOfLines={1} style={[iStyles.latestTx, { color: colors.inverseForegroundColor }]}>
            {loc.wallets.list_latest_transaction}
          </Text>

          <Text numberOfLines={1} style={[iStyles.latestTxTime, { color: colors.inverseForegroundColor }]}>
            {latestTransactionText}
          </Text>
        </LinearGradient>
      </TouchableWithoutFeedback>
    </Animated.View>
  );
};

WalletCarouselItem.propTypes = {
  item: PropTypes.any,
  index: PropTypes.number.isRequired,
  onPress: PropTypes.func.isRequired,
  handleLongPress: PropTypes.func.isRequired,
  isSelectedWallet: PropTypes.bool,
};

const cStyles = StyleSheet.create({
  loading: {
    position: 'absolute',
    alignItems: 'center',
  },
  content: {
    paddingTop: 16,
  },
  contentLargeScreen: {
    paddingHorizontal: 16,
  },
  separatorStyle: { width: 16, height: 20 },
});

const WalletsCarousel = forwardRef((props, ref) => {
  const { preferredFiatCurrency, language } = useContext(BlueStorageContext);
  const renderItem = useCallback(
    ({ item, index }) => (
      <WalletCarouselItem
        isSelectedWallet={props.vertical && props.selectedWallet && item ? props.selectedWallet === item.getID() : undefined}
        item={item}
        index={index}
        handleLongPress={props.handleLongPress}
        onPress={props.onPress}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.vertical, props.selectedWallet, props.handleLongPress, props.onPress, preferredFiatCurrency, language],
  );
  const flatListRef = useRef();
  const ListHeaderComponent = () => <View style={cStyles.separatorStyle} />;

  useImperativeHandle(ref, () => ({
    scrollToItem: ({ item }) => {
      setTimeout(() => {
        flatListRef?.current?.scrollToItem({ item, viewPosition: 0.3 });
      }, 300);
    },
    scrollToIndex: index => {
      setTimeout(() => {
        flatListRef?.current?.scrollToIndex({ index, viewPosition: 0.3 });
      }, 300);
    },
  }));

  const { width } = useWindowDimensions();
  const sliderHeight = 190;
  const itemWidth = width * 0.82 > 375 ? 375 : width * 0.82;
  const isLargeScreen = Platform.OS === 'android' ? isTablet() : width >= Dimensions.get('screen').width / 2 && (isTablet() || isDesktop);

  return (
    <FlatList
      ref={flatListRef}
      renderItem={renderItem}
      keyExtractor={(_, index) => index.toString()}
      showsVerticalScrollIndicator={false}
      pagingEnabled
      disableIntervalMomentum={isHandset}
      snapToInterval={itemWidth} // Adjust to your content width
      decelerationRate="fast"
      contentContainerStyle={isLargeScreen ? cStyles.contentLargeScreen : cStyles.content}
      directionalLockEnabled
      showsHorizontalScrollIndicator={false}
      initialNumToRender={10}
      ListHeaderComponent={ListHeaderComponent}
      style={props.vertical ? {} : { height: sliderHeight + 9 }}
      {...props}
    />
  );
});

WalletsCarousel.propTypes = {
  vertical: PropTypes.bool,
  selectedWallet: PropTypes.string,
  onPress: PropTypes.func.isRequired,
  handleLongPress: PropTypes.func.isRequired,
};

export default WalletsCarousel;

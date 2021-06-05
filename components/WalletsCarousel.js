import React, { useRef, useCallback, useState, useImperativeHandle, forwardRef, useContext } from 'react';
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
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Carousel from 'react-native-snap-carousel';

import loc, { formatBalance, transactionTimeToReadable } from '../loc';
import { LightningCustodianWallet, MultisigHDWallet, PlaceholderWallet } from '../class';
import WalletGradient from '../class/wallet-gradient';
import { BluePrivateBalance } from '../BlueComponents';
import { BlueStorageContext } from '../blue_modules/storage-context';

const nStyles = StyleSheet.create({
  root: {
    marginVertical: 17,
    paddingLeft: I18nManager.isRTL ? 12 : 0,
    paddingRight: I18nManager.isRTL ? 0 : 12,
  },
  container: {
    paddingHorizontal: 24,
    paddingVertical: 16,
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
  return (
    <TouchableOpacity testID="CreateAWallet" onPress={onPress} style={nStyles.root}>
      <View style={[nStyles.container, { backgroundColor: WalletGradient.createWallet() }]}>
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
  root: {
    paddingLeft: I18nManager.isRTL ? 12 : 0,
    paddingRight: I18nManager.isRTL ? 0 : 12,
    marginVertical: 17,
  },
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
        style={[iStyles.root, { transform: [{ scale: scaleValue }] }]}
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
      style={[iStyles.root, { opacity, transform: [{ scale: scaleValue }] }]}
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
    left: 16,
    flexDirection: I18nManager.isRTL && Platform.OS === 'android' ? 'row-reverse' : 'row',

}
});

const WalletsCarousel = forwardRef((props, ref) => {
  const carouselRef = useRef();
  const [loading, setLoading] = useState(true);
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

  useImperativeHandle(ref, () => ({
    snapToItem: item => carouselRef?.current?.snapToItem(item),
  }));

  const { width } = useWindowDimensions();
  const sliderWidth = width * 1;
  const itemWidth = width * 0.82 > 375 ? 375 : width * 0.82;
  const sliderHeight = 190;

  const onLayout = () => setLoading(false);

  return (
    <>
      {loading && (
        <View
          style={[
            cStyles.loading,
            {
              paddingVertical: sliderHeight / 2,
              paddingHorizontal: sliderWidth / 2,
            },
          ]}
        >
          <ActivityIndicator />
        </View>
      )}
      <Carousel
        ref={carouselRef}
        renderItem={renderItem}
        sliderWidth={sliderWidth}
        sliderHeight={sliderHeight}
        itemWidth={itemWidth}
        inactiveSlideScale={1}
        inactiveSlideOpacity={I18nManager.isRTL && Platform.OS === 'android' ? 1.0 : 0.7}
        activeSlideAlignment="start"
        contentContainerCustomStyle={cStyles.content}

        initialNumToRender={10}
        onLayout={onLayout}
        {...props}
      />
    </>
  );
});

WalletsCarousel.propTypes = {
  vertical: PropTypes.bool,
  selectedWallet: PropTypes.string,
  onPress: PropTypes.func.isRequired,
  handleLongPress: PropTypes.func.isRequired,
};

export default WalletsCarousel;

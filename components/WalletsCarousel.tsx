import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import {
  Animated,
  FlatList,
  I18nManager,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  FlatListProps,
  ListRenderItemInfo,
  ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { BlueSpacing10 } from '../BlueComponents';
import { LightningCustodianWallet, MultisigHDWallet } from '../class';
import WalletGradient from '../class/wallet-gradient';
import { useIsLargeScreen } from '../hooks/useIsLargeScreen';
import loc, { formatBalance, transactionTimeToReadable } from '../loc';
import { BlurredBalanceView } from './BlurredBalanceView';
import { useTheme } from './themes';
import { useStorage } from '../hooks/context/useStorage';
import { WalletTransactionsStatus } from './Context/StorageProvider';
import { Transaction, TWallet } from '../class/wallets/types';

interface NewWalletPanelProps {
  onPress: () => void;
}

const nStyles = StyleSheet.create({
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

const NewWalletPanel: React.FC<NewWalletPanelProps> = ({ onPress }) => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const itemWidth = width * 0.82 > 375 ? 375 : width * 0.82;
  const { isLargeScreen } = useIsLargeScreen();
  const nStylesHooks = StyleSheet.create({
    container: isLargeScreen
      ? {
          paddingHorizontal: 24,
          marginVertical: 16,
        }
      : { paddingVertical: 16, paddingHorizontal: 24 },
  });

  return (
    <Pressable accessibilityRole="button" testID="CreateAWallet" onPress={onPress} style={isLargeScreen ? {} : { width: itemWidth * 1.2 }}>
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
    </Pressable>
  );
};

interface WalletCarouselItemProps {
  item: TWallet;
  onPress: (item: TWallet) => void;
  handleLongPress?: () => void;
  isSelectedWallet?: boolean;
  customStyle?: ViewStyle;
  horizontal?: boolean;
  searchQuery?: string;
  renderHighlightedText?: (text: string, query: string) => JSX.Element;
}

const iStyles = StyleSheet.create({
  root: { paddingRight: 20 },
  rootLargeDevice: { marginVertical: 20 },
  grad: {
    padding: 15,
    borderRadius: 12,
    minHeight: 164,
  },
  balanceContainer: {
    height: 40,
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
  shadowContainer: {
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 25 / 100,
        shadowRadius: 8,
        borderRadius: 12,
      },
      android: {
        elevation: 8,
        borderRadius: 12,
      },
    }),
  },
});

interface WalletCarouselItemProps {
  item: TWallet;
  onPress: (item: TWallet) => void;
  handleLongPress?: () => void;
  isSelectedWallet?: boolean;
  customStyle?: ViewStyle;
  horizontal?: boolean;
  isPlaceHolder?: boolean;
  searchQuery?: string;
  renderHighlightedText?: (text: string, query: string) => JSX.Element;
  animationsEnabled?: boolean;
  onPressIn?: () => void;
  onPressOut?: () => void;
}

export const WalletCarouselItem: React.FC<WalletCarouselItemProps> = React.memo(
  ({
    item,
    onPress,
    handleLongPress,
    isSelectedWallet,
    customStyle,
    horizontal,
    searchQuery,
    renderHighlightedText,
    animationsEnabled = true,
    isPlaceHolder = false,
    onPressIn,
    onPressOut,
  }) => {
    const scaleValue = useRef(new Animated.Value(1.0)).current;
    const { colors } = useTheme();
    const { walletTransactionUpdateStatus } = useStorage();
    const { width } = useWindowDimensions();
    const itemWidth = width * 0.82 > 375 ? 375 : width * 0.82;
    const { isLargeScreen } = useIsLargeScreen();

    const onPressedIn = useCallback(() => {
      if (animationsEnabled) {
        Animated.spring(scaleValue, {
          toValue: 0.95,
          useNativeDriver: true,
          friction: 3,
          tension: 100,
        }).start();
      }
      if (onPressIn) onPressIn();
    }, [scaleValue, animationsEnabled, onPressIn]);

    const onPressedOut = useCallback(() => {
      if (animationsEnabled) {
        Animated.spring(scaleValue, {
          toValue: 1.0,
          useNativeDriver: true,
          friction: 3,
          tension: 100,
        }).start();
      }
      if (onPressOut) onPressOut();
    }, [scaleValue, animationsEnabled, onPressOut]);

    const handlePress = useCallback(() => {
      onPressedOut();
      onPress(item);
    }, [item, onPress, onPressedOut]);

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
      walletTransactionUpdateStatus === WalletTransactionsStatus.ALL || walletTransactionUpdateStatus === item.getID()
        ? loc.transactions.updating
        : item.getBalance() !== 0 && item.getLatestTransactionTime() === 0
          ? loc.wallets.pull_to_refresh
          : item.getTransactions().find((tx: Transaction) => tx.confirmations === 0)
            ? loc.transactions.pending
            : transactionTimeToReadable(item.getLatestTransactionTime());

    const balance = !item.hideBalance && formatBalance(Number(item.getBalance()), item.getPreferredBalanceUnit(), true);

    return (
      <Animated.View
        style={[
          isLargeScreen || !horizontal ? [iStyles.rootLargeDevice, customStyle] : (customStyle ?? { ...iStyles.root, width: itemWidth }),
          { opacity, transform: [{ scale: scaleValue }] },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          testID={item.getLabel()}
          onPressIn={onPressedIn}
          onPressOut={onPressedOut}
          onLongPress={() => {
            if (handleLongPress) handleLongPress();
          }}
          onPress={handlePress}
        >
          <View style={[iStyles.shadowContainer, { backgroundColor: colors.background, shadowColor: colors.shadowColor }]}>
            <LinearGradient colors={WalletGradient.gradientsFor(item.type)} style={iStyles.grad}>
              <Image source={image} style={iStyles.image} />
              <Text style={iStyles.br} />
              {!isPlaceHolder && (
                <>
                  <Text numberOfLines={1} style={[iStyles.label, { color: colors.inverseForegroundColor }]}>
                    {renderHighlightedText && searchQuery ? renderHighlightedText(item.getLabel(), searchQuery) : item.getLabel()}
                  </Text>
                  <View style={iStyles.balanceContainer}>
                    {item.hideBalance ? (
                      <>
                        <BlueSpacing10 />
                        <BlurredBalanceView />
                      </>
                    ) : (
                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        key={`${balance}`} // force component recreation on balance change. To fix right-to-left languages, like Farsi
                        style={[iStyles.balance, { color: colors.inverseForegroundColor }]}
                      >
                        {`${balance} `}
                      </Text>
                    )}
                  </View>
                  <Text style={iStyles.br} />
                  <Text numberOfLines={1} style={[iStyles.latestTx, { color: colors.inverseForegroundColor }]}>
                    {loc.wallets.list_latest_transaction}
                  </Text>
                  <Text numberOfLines={1} style={[iStyles.latestTxTime, { color: colors.inverseForegroundColor }]}>
                    {latestTransactionText}
                  </Text>
                </>
              )}
            </LinearGradient>
          </View>
        </Pressable>
      </Animated.View>
    );
  },
);

interface WalletsCarouselProps extends Partial<FlatListProps<any>> {
  horizontal?: boolean;
  isFlatList?: boolean;
  selectedWallet?: string;
  onPress: (item: TWallet) => void;
  onNewWalletPress?: () => void;
  handleLongPress?: () => void;
  data: TWallet[];
  scrollEnabled?: boolean;
  searchQuery?: string;
  renderHighlightedText?: (text: string, query: string) => JSX.Element;
}

type FlatListRefType = FlatList<any> & {
  scrollToEnd(params?: { animated?: boolean | null }): void;
  scrollToIndex(params: { animated?: boolean | null; index: number; viewOffset?: number; viewPosition?: number }): void;
  scrollToItem(params: { animated?: boolean | null; item: TWallet; viewPosition?: number }): void;
  scrollToOffset(params: { animated?: boolean | null; offset: number }): void;
  recordInteraction(): void;
  flashScrollIndicators(): void;
  getNativeScrollRef(): View;
};

const cStyles = StyleSheet.create({
  content: {
    paddingTop: 16,
  },
  contentLargeScreen: {
    paddingHorizontal: 16,
  },
  separatorStyle: {
    width: 16,
    height: 20,
  },
});

const ListHeaderComponent: React.FC = () => <View style={cStyles.separatorStyle} />;

const WalletsCarousel = forwardRef<FlatListRefType, WalletsCarouselProps>((props, ref) => {
  const {
    horizontal = true,
    data,
    handleLongPress,
    onPress,
    selectedWallet,
    scrollEnabled = true,
    onNewWalletPress,
    searchQuery,
    renderHighlightedText,
    isFlatList = true,
  } = props;
  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<TWallet>) =>
      item ? (
        <WalletCarouselItem
          isSelectedWallet={!horizontal && selectedWallet ? selectedWallet === item.getID() : undefined}
          item={item}
          handleLongPress={handleLongPress}
          onPress={onPress}
          horizontal={horizontal}
          searchQuery={searchQuery}
          renderHighlightedText={renderHighlightedText}
        />
      ) : null,
    [horizontal, selectedWallet, handleLongPress, onPress, searchQuery, renderHighlightedText],
  );

  const flatListRef = useRef<FlatList<any>>(null);

  useImperativeHandle(ref, (): any => {
    return {
      scrollToEnd: (params: { animated?: boolean | null | undefined } | undefined) => flatListRef.current?.scrollToEnd(params),
      scrollToIndex: (params: {
        animated?: boolean | null | undefined;
        index: number;
        viewOffset?: number | undefined;
        viewPosition?: number | undefined;
      }) => flatListRef.current?.scrollToIndex(params),
      scrollToItem: (params: {
        animated?: boolean | null | undefined;
        item: any;
        viewOffset?: number | undefined;
        viewPosition?: number | undefined;
      }) => flatListRef.current?.scrollToItem(params),
      scrollToOffset: (params: { animated?: boolean | null | undefined; offset: number }) => flatListRef.current?.scrollToOffset(params),
      recordInteraction: () => flatListRef.current?.recordInteraction(),
      flashScrollIndicators: () => flatListRef.current?.flashScrollIndicators(),
      getNativeScrollRef: () => flatListRef.current?.getNativeScrollRef(),
    };
  }, []);

  const onScrollToIndexFailed = (error: { averageItemLength: number; index: number }): void => {
    console.debug('onScrollToIndexFailed');
    console.debug(error);
    flatListRef.current?.scrollToOffset({ offset: error.averageItemLength * error.index, animated: true });
    setTimeout(() => {
      if (data.length !== 0 && flatListRef.current !== null) {
        flatListRef.current.scrollToIndex({ index: error.index, animated: true });
      }
    }, 100);
  };

  const { width } = useWindowDimensions();
  const sliderHeight = 195;
  const itemWidth = width * 0.82 > 375 ? 375 : width * 0.82;

  return isFlatList ? (
    <FlatList
      ref={flatListRef}
      renderItem={renderItem}
      extraData={data}
      keyExtractor={(_, index) => index.toString()}
      showsVerticalScrollIndicator={false}
      pagingEnabled={horizontal}
      disableIntervalMomentum={horizontal}
      snapToInterval={itemWidth}
      decelerationRate="fast"
      contentContainerStyle={cStyles.content}
      directionalLockEnabled
      showsHorizontalScrollIndicator={false}
      initialNumToRender={10}
      scrollEnabled={scrollEnabled}
      ListHeaderComponent={ListHeaderComponent}
      style={{ minHeight: sliderHeight + 12 }}
      onScrollToIndexFailed={onScrollToIndexFailed}
      ListFooterComponent={onNewWalletPress ? <NewWalletPanel onPress={onNewWalletPress} /> : null}
      {...props}
    />
  ) : (
    <View style={cStyles.contentLargeScreen}>
      {data.map((item, index) =>
        item ? (
          <WalletCarouselItem
            isSelectedWallet={!horizontal && selectedWallet ? selectedWallet === item.getID() : undefined}
            item={item}
            handleLongPress={handleLongPress}
            onPress={onPress}
            key={index}
            searchQuery={props.searchQuery}
            renderHighlightedText={props.renderHighlightedText}
          />
        ) : null,
      )}
      {onNewWalletPress && <NewWalletPanel onPress={onNewWalletPress} />}
    </View>
  );
});

export default WalletsCarousel;

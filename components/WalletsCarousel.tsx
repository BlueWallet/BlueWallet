import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useEffect, createRef } from 'react';
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
  LayoutAnimation,
  UIManager,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { BlueSpacing10 } from '../BlueComponents';
import { LightningCustodianWallet, MultisigHDWallet } from '../class';
import WalletGradient from '../class/wallet-gradient';
import { useSizeClass, SizeClass } from '../blue_modules/sizeClass';
import loc, { formatBalance, transactionTimeToReadable } from '../loc';
import { BlurredBalanceView } from './BlurredBalanceView';
import { useTheme } from './themes';
import { useStorage } from '../hooks/context/useStorage';
import { WalletTransactionsStatus } from './Context/StorageProvider';
import { Transaction, TWallet } from '../class/wallets/types';
import HighlightedText from './HighlightedText';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  const { isLarge } = useSizeClass();
  const nStylesHooks = StyleSheet.create({
    container: isLarge
      ? {
          paddingHorizontal: 24,
          marginVertical: 16,
        }
      : { paddingVertical: 16, paddingHorizontal: 24 },
  });

  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      friction: 4,
    }).start();
  }, [scale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 4,
    }).start();
  }, [scale]);

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      testID="CreateAWallet"
      style={({ pressed }) => [
        isLarge ? {} : { width: itemWidth * 1.2 },
        {
          opacity: pressed ? 0.9 : 1.0,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={loc.wallets.list_create_a_wallet}
    >
      <Animated.View
        style={[
          nStyles.container,
          nStylesHooks.container,
          { backgroundColor: WalletGradient.createWallet() },
          isLarge ? {} : { width: itemWidth },
          { transform: [{ scale }] },
        ]}
      >
        <Text style={[nStyles.addAWAllet, { color: colors.foregroundColor }]}>{loc.wallets.list_create_a_wallet}</Text>
        <Text style={[nStyles.addLine, { color: colors.alternativeTextColor }]}>{loc.wallets.list_create_a_wallet_text}</Text>
        <View style={nStyles.button}>
          <Text style={[nStyles.buttonText, { color: colors.brandingColor }]}>{loc.wallets.list_create_a_button}</Text>
        </View>
      </Animated.View>
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
  isPlaceHolder?: boolean;
  searchQuery?: string;
  renderHighlightedText?: (text: string, query: string) => JSX.Element;
  animationsEnabled?: boolean;
  onPressIn?: () => void;
  onPressOut?: () => void;
  isNewWallet?: boolean;
  isExiting?: boolean;
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
    isNewWallet = false,
    isExiting = false,
  }) => {
    const scaleValue = useRef(new Animated.Value(1.0)).current;
    const opacityValue = useRef(new Animated.Value(isSelectedWallet === false ? 0.5 : 1.0)).current;
    const translateYValue = useRef(new Animated.Value(isNewWallet ? 20 : 0)).current;
    const { colors } = useTheme();
    const { walletTransactionUpdateStatus } = useStorage();
    const { width } = useWindowDimensions();
    const itemWidth = width * 0.82 > 375 ? 375 : width * 0.82;
    const { sizeClass } = useSizeClass();

    const springConfig = useMemo(() => ({ useNativeDriver: true, tension: 100 }), []);
    const animateScale = useCallback(
      (toValue: number, callback?: () => void) => {
        Animated.spring(scaleValue, { toValue, ...springConfig }).start(callback);
      },
      [scaleValue, springConfig],
    );

    useEffect(() => {
      if (!animationsEnabled) return;

      const targetOpacity = isSelectedWallet === false ? 0.5 : 1.0;
      Animated.spring(opacityValue, {
        toValue: targetOpacity,
        useNativeDriver: true,
        tension: 30,
        friction: 7,
        velocity: 0.1,
      }).start();
    }, [isSelectedWallet, opacityValue, animationsEnabled]);

    const onPressedIn = useCallback(() => {
      if (animationsEnabled) {
        animateScale(0.95);
      }
      if (onPressIn) onPressIn();
    }, [animateScale, animationsEnabled, onPressIn]);

    const onPressedOut = useCallback(() => {
      if (animationsEnabled) {
        animateScale(1.0);
      }
      if (onPressOut) onPressOut();
    }, [animateScale, animationsEnabled, onPressOut]);

    const handlePress = useCallback(() => {
      onPress(item);
    }, [item, onPress]);

    useEffect(() => {
      if (isNewWallet && animationsEnabled) {
        Animated.parallel([
          Animated.timing(translateYValue, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(opacityValue, {
            toValue: isSelectedWallet === false ? 0.5 : 1.0,
            useNativeDriver: true,
            friction: 7,
          }),
        ]).start();
      }
    }, [isNewWallet, animationsEnabled, translateYValue, opacityValue, isSelectedWallet]);

    useEffect(() => {
      if (isExiting && animationsEnabled) {
        Animated.parallel([
          Animated.timing(translateYValue, {
            toValue: -20,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacityValue, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, [isExiting, animationsEnabled, translateYValue, opacityValue]);

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
          sizeClass === SizeClass.Large || !horizontal
            ? [iStyles.rootLargeDevice, customStyle]
            : (customStyle ?? { ...iStyles.root, width: itemWidth }),
          {
            opacity: opacityValue,
            transform: [{ scale: scaleValue }, { translateY: translateYValue }],
          },
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
          delayHoverIn={0}
          delayHoverOut={0}
        >
          <View style={[iStyles.shadowContainer, { backgroundColor: colors.background, shadowColor: colors.shadowColor }]}>
            <LinearGradient colors={WalletGradient.gradientsFor(item.type)} style={iStyles.grad}>
              <Image source={image} style={iStyles.image} />
              <Text style={iStyles.br} />
              {!isPlaceHolder && (
                <>
                  <Text numberOfLines={1} style={[iStyles.label, { color: colors.inverseForegroundColor }]}>
                    {renderHighlightedText && searchQuery ? (
                      <HighlightedText
                        text={item.getLabel()}
                        query={searchQuery}
                        style={[iStyles.label, { color: colors.inverseForegroundColor }]}
                      />
                    ) : (
                      item.getLabel()
                    )}
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
  animateChanges?: boolean;
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

const styles = StyleSheet.create({
  listHeaderSeparator: {
    width: 16,
    height: 20,
  },
});

const ListHeaderSeparator = () => <View style={styles.listHeaderSeparator} />;

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
    animateChanges = false,
  } = props;

  const { width } = useWindowDimensions();
  const itemWidth = React.useMemo(() => (width * 0.82 > 375 ? 375 : width * 0.82), [width]);

  const prevDataLength = useRef(data.length);
  const prevWalletIds = useRef<string[]>([]);
  const newWalletsMap = useRef<Record<string, boolean>>({});
  const lastAddedWalletId = useRef<string | null>(null);
  const hasFocusedRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  const flatListRef = useRef<FlatList<any>>(null);
  const walletRefs = useRef<Record<string, React.RefObject<View>>>({});

  const { sizeClass } = useSizeClass();

  useImperativeHandle(ref, (): any => {
    if (isFlatList) {
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
    } else {
      // For non-FlatList mode, we'll return simpler methods to get/set information
      // but not actually handle scrolling (leaving that to the parent drawer)
      return {
        scrollToEnd: () => console.debug('[WalletsCarousel] scrollToEnd not implemented for non-FlatList'),
        scrollToIndex: () => console.debug('[WalletsCarousel] scrollToIndex not implemented for non-FlatList'),
        scrollToItem: () => console.debug('[WalletsCarousel] scrollToItem not implemented for non-FlatList'),
        scrollToOffset: () => console.debug('[WalletsCarousel] scrollToOffset not implemented for non-FlatList'),
        recordInteraction: () => {},
        flashScrollIndicators: () => {},
        getNativeScrollRef: () => null,
        // Add a method to get position information about a wallet
        getWalletPosition: (walletId: string) => {
          const walletRef = walletRefs.current[walletId];
          if (walletRef?.current) {
            return new Promise<{ x: number; y: number; width: number; height: number }>(resolve => {
              walletRef.current?.measure((x, y, widthVal, heightVal, pageX, pageY) => {
                resolve({ x: pageX, y: pageY, width: widthVal, height: heightVal });
              });
            });
          }
          return Promise.resolve(null);
        },
      };
    }
  }, [isFlatList]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    data.forEach(wallet => {
      if (!walletRefs.current[wallet.getID()]) {
        walletRefs.current[wallet.getID()] = createRef<View>();
      }
    });
  }, [data]);

  const scrollToWalletById = useCallback(
    (walletId: string, animated = true) => {
      if (!walletId) return;

      console.debug('[WalletsCarousel] Attempting to scroll to wallet:', walletId);

      if (isFlatList && flatListRef.current) {
        const walletIndex = data.findIndex(wallet => wallet.getID() === walletId);
        if (walletIndex !== -1) {
          try {
            console.debug('[WalletsCarousel] Found wallet at index:', walletIndex, 'horizontal:', horizontal);
            flatListRef.current.scrollToIndex({
              index: walletIndex,
              animated,
              viewPosition: 0.5, // Center the wallet in the view
            });
          } catch (error) {
            console.warn('[WalletsCarousel] Error scrolling to wallet:', error);
            // Fallback: try scrolling to offset
            // Use different measurement based on orientation
            const itemSize = horizontal ? itemWidth : 195; // 195 is the approximate height of wallet card
            flatListRef.current.scrollToOffset({
              offset: itemSize * walletIndex,
              animated,
            });
          }
        }
      } else if (!isFlatList) {
        // For non-FlatList, just log the attempt
        // The parent DrawerContentScrollView should handle this
        const walletIndex = data.findIndex(wallet => wallet.getID() === walletId);
        console.debug(
          '[WalletsCarousel] Would scroll to wallet index:',
          walletIndex,
          'but leaving scrolling to parent DrawerContentScrollView',
        );
      }
    },
    [data, isFlatList, itemWidth, horizontal],
  );

  useEffect(() => {
    if (animateChanges) {
      const currentWalletIds = data.map(wallet => wallet.getID());

      // Skip auto-scrolling on initial mount
      if (isInitialMount.current) {
        isInitialMount.current = false;
        prevWalletIds.current = currentWalletIds;
        prevDataLength.current = data.length;
        return;
      }

      // Handle wallet additions
      const addedWallets = currentWalletIds.filter(id => !prevWalletIds.current.includes(id));
      if (addedWallets.length > 0) {
        // Track last added wallet for animations and scrolling
        lastAddedWalletId.current = addedWallets[addedWallets.length - 1];

        addedWallets.forEach(id => {
          newWalletsMap.current[id] = true;
        });

        // Always animate layout changes
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

        // Auto-scroll to new wallet after mount (no condition, always scroll)
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }

        scrollTimeoutRef.current = setTimeout(() => {
          // Add null check before calling scrollToWalletById
          if (lastAddedWalletId.current !== null) {
            scrollToWalletById(lastAddedWalletId.current, true);
          }
        }, 300);
      }

      // Handle wallet removals
      if (prevDataLength.current > data.length) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }

      // Update refs for next comparison
      prevWalletIds.current = currentWalletIds;
      prevDataLength.current = data.length;

      // Clear animation states
      if (addedWallets.length > 0) {
        setTimeout(() => {
          addedWallets.forEach(id => {
            delete newWalletsMap.current[id];
          });
          lastAddedWalletId.current = null;
        }, 2000);
      }
    }
  }, [data, animateChanges, scrollToWalletById]);

  const onScrollToIndexFailed = (error: { averageItemLength: number; index: number }): void => {
    console.debug('onScrollToIndexFailed', error);
    flatListRef.current?.scrollToOffset({ offset: error.averageItemLength * error.index, animated: true });
    setTimeout(() => {
      if (data.length !== 0 && flatListRef.current !== null) {
        flatListRef.current.scrollToIndex({ index: error.index, animated: true });
      }
    }, 100);
  };

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
          isNewWallet={animateChanges && newWalletsMap.current[item.getID()]}
          animationsEnabled={animateChanges}
        />
      ) : null,
    [horizontal, selectedWallet, handleLongPress, onPress, searchQuery, renderHighlightedText, animateChanges],
  );

  const keyExtractor = useCallback((item: TWallet, index: number) => (item?.getID ? item.getID() : index.toString()), []);

  const sliderHeight = 195;

  useEffect(() => {
    return () => {
      hasFocusedRef.current = false;
    };
  }, []);

  const renderNonFlatListWallets = useCallback(() => {
    return data.map((item, index) =>
      item ? (
        <View
          key={item.getID()}
          ref={walletRefs.current[item.getID()]}
          onLayout={() => {
            if (walletRefs.current[item.getID()]?.current && newWalletsMap.current[item.getID()]) {
              walletRefs.current[item.getID()].current?.measure((x, y, widthVal, heightVal, pageX, pageY) => {
                console.debug(`[WalletsCarousel] New wallet ${item.getID()} positioned at y=${y}, pageY=${pageY}`);
              });
            }
          }}
        >
          <WalletCarouselItem
            isSelectedWallet={!horizontal && selectedWallet ? selectedWallet === item.getID() : undefined}
            item={item}
            handleLongPress={handleLongPress}
            onPress={onPress}
            searchQuery={props.searchQuery}
            renderHighlightedText={props.renderHighlightedText}
            isNewWallet={animateChanges && newWalletsMap.current[item.getID()]}
            animationsEnabled={animateChanges}
          />
        </View>
      ) : null,
    );
  }, [data, horizontal, selectedWallet, handleLongPress, onPress, props.searchQuery, props.renderHighlightedText, animateChanges]);

  useEffect(() => {
    // We check the current values inside the effect, but don't include them as dependencies
    if (!isFlatList && lastAddedWalletId.current !== null && !isInitialMount.current) {
      // Use a slightly longer delay to ensure the ScrollView has fully rendered
      const scrollDelay = setTimeout(() => {
        console.debug('[WalletsCarousel] Attempting delayed scroll to:', lastAddedWalletId.current);
        if (lastAddedWalletId.current !== null) {
          scrollToWalletById(lastAddedWalletId.current, true);
        }
      }, 500);

      return () => clearTimeout(scrollDelay);
    }
  }, [isFlatList, scrollToWalletById]); // Remove ref.current values from dependency array

  const cStyles = StyleSheet.create({
    content: {
      paddingTop: 16,
    },
    contentLargeScreen: {
      paddingHorizontal: sizeClass === SizeClass.Large ? 16 : 12,
    },
  });

  return isFlatList ? (
    <FlatList
      ref={flatListRef}
      renderItem={renderItem}
      extraData={[data, animateChanges, newWalletsMap.current, selectedWallet, lastAddedWalletId.current]}
      keyExtractor={keyExtractor}
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
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={ListHeaderSeparator}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets
      automaticallyAdjustKeyboardInsets
      automaticallyAdjustsScrollIndicatorInsets
      style={{ minHeight: sliderHeight + 12 }}
      onScrollToIndexFailed={onScrollToIndexFailed}
      ListFooterComponent={onNewWalletPress ? <NewWalletPanel onPress={onNewWalletPress} /> : null}
      {...props}
    />
  ) : (
    <View style={cStyles.contentLargeScreen}>
      {renderNonFlatListWallets()}
      {onNewWalletPress && <NewWalletPanel onPress={onNewWalletPress} />}
    </View>
  );
});

export default WalletsCarousel;

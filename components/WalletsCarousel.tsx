import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useEffect, createRef } from 'react';
import {
  FlatList,
  ImageBackground,
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
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { LightningArkWallet, LightningCustodianWallet, MultisigHDWallet } from '../class';
import WalletGradient from '../class/wallet-gradient';
import { useSizeClass, SizeClass } from '../blue_modules/sizeClass';
import loc, { formatBalance, transactionTimeToReadable } from '../loc';
import { BlurredBalanceView } from './BlurredBalanceView';
import { useTheme } from './themes';
import { useStorage } from '../hooks/context/useStorage';
import { WalletTransactionsStatus } from './Context/StorageProvider';
import { Transaction, TWallet } from '../class/wallets/types';
import { BlueSpacing10 } from './BlueSpacing';
import { useLocale } from '@react-navigation/native';

// Horizontal carousel shows a small peek of the next card; adjust overlap to control that spacing.
const CARD_OVERLAP = 24;

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

  const scale = useSharedValue(1);

  const animatedScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 14, stiffness: 180 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 14, stiffness: 180 });
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
          { backgroundColor: colors.borderTopColor },
          isLarge ? {} : { width: itemWidth },
          animatedScaleStyle,
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
  renderHighlightedText?: (text: string, query: string) => React.ReactElement;
  animationsEnabled?: boolean;
  onPressIn?: () => void;
  onPressOut?: () => void;
  isNewWallet?: boolean;
  isExiting?: boolean;
  isDraggingActive?: boolean;
  dragActiveScale?: number;
  sizeVariant?: 'default' | 'compact';
}

const iStyles = StyleSheet.create({
  root: { paddingRight: 20 },
  rootLargeDevice: { marginVertical: 20 },
  rootCompact: { paddingRight: 12, marginVertical: 12 },
  grad: {
    borderRadius: 12,
    minHeight: 164,
  },
  gradCompact: {
    borderRadius: 10,
    minHeight: 132,
  },
  gradContent: {
    padding: 15,
  },
  gradContentCompact: {
    padding: 12,
  },
  balanceContainer: {
    height: 40,
  },
  balanceContainerCompact: {
    height: 32,
  },
  image: {
    width: 99,
    height: 94,
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  imageCompact: {
    width: 78,
    height: 74,
    right: 4,
    bottom: 4,
  },
  br: {
    backgroundColor: 'transparent',
  },
  label: {
    backgroundColor: 'transparent',
    fontSize: 19,
  },
  labelCompact: {
    fontSize: 16,
  },
  balance: {
    backgroundColor: 'transparent',
    fontWeight: 'bold',
    fontSize: 36,
  },
  balanceCompact: {
    fontSize: 28,
    lineHeight: 34,
  },
  latestTx: {
    backgroundColor: 'transparent',
    fontSize: 13,
  },
  latestTxCompact: {
    fontSize: 12,
  },
  latestTxTime: {
    backgroundColor: 'transparent',
    fontWeight: 'bold',
    fontSize: 16,
  },
  latestTxTimeCompact: {
    fontSize: 14,
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
  shadowContainerCompact: {
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 20 / 100,
        shadowRadius: 6,
        borderRadius: 10,
      },
      android: {
        elevation: 6,
        borderRadius: 10,
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
    isDraggingActive = false,
    dragActiveScale = 1.02,
    sizeVariant = 'default',
  }: WalletCarouselItemProps) => {
    const walletLabel = item.getLabel ? item.getLabel() : '';
    const pressScale = useSharedValue(1.0);
    const dragScale = useSharedValue(isDraggingActive ? dragActiveScale : 1.0);
    const opacityValue = useSharedValue(isSelectedWallet === false ? 0.5 : 1.0);
    const translateYValue = useSharedValue(isNewWallet ? 20 : 0);
    const balanceOpacity = useSharedValue(1);
    const balanceTranslateY = useSharedValue(0);
    const { colors } = useTheme();
    const { walletTransactionUpdateStatus } = useStorage();
    const { width } = useWindowDimensions();
    const itemWidth = width * 0.82 > 375 ? 375 : width * 0.82;
    const { sizeClass } = useSizeClass();
    const isCompact = sizeVariant === 'compact';
    const { direction } = useLocale();
    const previousBalance = useRef<string | undefined>(undefined);
    const balance = !item.hideBalance && formatBalance(Number(item.getBalance()), item.getPreferredBalanceUnit(), true);
    const safeBalance = balance || undefined;

    const animatePressScale = useCallback(
      (toValue: number) => {
        pressScale.value = withSpring(toValue, { damping: 13, stiffness: 180, mass: 0.9 });
      },
      [pressScale],
    );

    useEffect(() => {
      dragScale.value = withSpring(isDraggingActive ? dragActiveScale : 1, { damping: 16, stiffness: 200, mass: 1 });
    }, [isDraggingActive, dragActiveScale, dragScale]);

    useEffect(() => {
      if (!animationsEnabled) return;

      const targetOpacity = isSelectedWallet === false ? 0.5 : 1.0;
      opacityValue.value = withSpring(targetOpacity, { damping: 18, stiffness: 240 });
    }, [isSelectedWallet, opacityValue, animationsEnabled]);

    const onPressedIn = useCallback(() => {
      if (animationsEnabled) {
        animatePressScale(0.97);
      }
      if (onPressIn) onPressIn();
    }, [animatePressScale, animationsEnabled, onPressIn]);

    const onPressedOut = useCallback(() => {
      if (animationsEnabled) {
        animatePressScale(1.0);
      }
      if (onPressOut) onPressOut();
    }, [animatePressScale, animationsEnabled, onPressOut]);

    const handlePress = useCallback(() => {
      onPress(item);
    }, [item, onPress]);

    useEffect(() => {
      if (isNewWallet && animationsEnabled) {
        translateYValue.value = withTiming(0, { duration: 300 });
        opacityValue.value = withSpring(isSelectedWallet === false ? 0.5 : 1.0, { damping: 18, stiffness: 240 });
      }
    }, [isNewWallet, animationsEnabled, translateYValue, opacityValue, isSelectedWallet]);

    useEffect(() => {
      if (!animationsEnabled) {
        previousBalance.current = safeBalance;
        return;
      }

      if (previousBalance.current !== undefined && previousBalance.current !== safeBalance) {
        // Subtle currency-like transition on balance updates.
        balanceOpacity.value = 0;
        balanceTranslateY.value = 6;
        balanceOpacity.value = withTiming(1, { duration: 180 });
        balanceTranslateY.value = withSpring(0, { damping: 16, stiffness: 220 });
      }

      previousBalance.current = safeBalance;
    }, [safeBalance, animationsEnabled, balanceOpacity, balanceTranslateY]);

    useEffect(() => {
      if (isExiting && animationsEnabled) {
        translateYValue.value = withTiming(-20, { duration: 200 });
        opacityValue.value = withTiming(0, { duration: 200 });
      }
    }, [isExiting, animationsEnabled, translateYValue, opacityValue]);

    const animatedCardStyle = useAnimatedStyle(() => ({
      opacity: opacityValue.value,
      transform: [{ scale: pressScale.value * dragScale.value }, { translateY: translateYValue.value }],
    }));

    const animatedBalanceStyle = useAnimatedStyle(() => ({
      opacity: balanceOpacity.value,
      transform: [{ translateY: balanceTranslateY.value }],
    }));

    let image;
    switch (item.type) {
      case LightningCustodianWallet.type:
      case LightningArkWallet.type:
        image = direction === 'rtl' ? require('../img/lnd-shape-rtl.png') : require('../img/lnd-shape.png');
        break;
      case MultisigHDWallet.type:
        image = direction === 'rtl' ? require('../img/vault-shape-rtl.png') : require('../img/vault-shape.png');
        break;
      default:
        image = direction === 'rtl' ? require('../img/btc-shape-rtl.png') : require('../img/btc-shape.png');
    }

    let latestTransactionText;

    if (walletTransactionUpdateStatus === WalletTransactionsStatus.ALL || walletTransactionUpdateStatus === item.getID()) {
      latestTransactionText = loc.transactions.updating;
    } else if (item.getBalance() !== 0 && item.getLatestTransactionTime() === 0) {
      latestTransactionText = loc.wallets.pull_to_refresh;
    } else if (item.getTransactions().find((tx: Transaction) => tx.confirmations === 0)) {
      latestTransactionText = loc.transactions.pending;
    } else {
      latestTransactionText = transactionTimeToReadable(item.getLatestTransactionTime());
    }

    return (
      <Animated.View
        style={[
          sizeClass === SizeClass.Large || !horizontal
            ? [iStyles.rootLargeDevice, customStyle]
            : [iStyles.root, { width: itemWidth }, customStyle],
          animatedCardStyle,
        ]}
      >
        <Pressable
          accessibilityRole="button"
          testID={walletLabel}
          onPressIn={onPressedIn}
          onPressOut={onPressedOut}
          onLongPress={() => {
            if (handleLongPress) handleLongPress();
          }}
          onPress={handlePress}
          delayHoverIn={0}
          delayHoverOut={0}
        >
          <View
            style={[
              iStyles.shadowContainer,
              isCompact && iStyles.shadowContainerCompact,
              { backgroundColor: colors.background, shadowColor: colors.shadowColor },
            ]}
          >
            <LinearGradient
              colors={WalletGradient.gradientsFor(item.type)}
              style={[iStyles.grad, isCompact && iStyles.gradCompact]}
            >
              <View style={[iStyles.gradContent, isCompact && iStyles.gradContentCompact]}>
                <ImageBackground source={image} style={[iStyles.image, isCompact && iStyles.imageCompact]} />
                <Text style={iStyles.br} />
                {!isPlaceHolder && (
                  <>
                    <Text
                      numberOfLines={1}
                      style={[
                        iStyles.label,
                        isCompact && iStyles.labelCompact,
                        { color: colors.inverseForegroundColor, writingDirection: direction },
                      ]}
                    >
                      {renderHighlightedText ? renderHighlightedText(walletLabel, searchQuery || '') : walletLabel}
                    </Text>
                    <View style={[iStyles.balanceContainer, isCompact && iStyles.balanceContainerCompact]}>
                      {item.hideBalance ? (
                        <>
                          <BlueSpacing10 />
                          <BlurredBalanceView />
                        </>
                      ) : (
                        <Animated.Text
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          key={`${balance}`} // force component recreation on balance change. To fix right-to-left languages, like Farsi
                          style={[
                            iStyles.balance,
                            isCompact && iStyles.balanceCompact,
                            { color: colors.inverseForegroundColor, writingDirection: direction },
                            animatedBalanceStyle,
                          ]}
                        >
                          {`${balance} `}
                        </Animated.Text>
                      )}
                    </View>
                    <Text style={iStyles.br} />
                    <Text
                      numberOfLines={1}
                      style={[
                        iStyles.latestTx,
                        isCompact && iStyles.latestTxCompact,
                        { color: colors.inverseForegroundColor, writingDirection: direction },
                      ]}
                    >
                      {loc.wallets.list_latest_transaction}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[
                        iStyles.latestTxTime,
                        isCompact && iStyles.latestTxTimeCompact,
                        { color: colors.inverseForegroundColor, writingDirection: direction },
                      ]}
                    >
                      {latestTransactionText}
                    </Text>
                  </>
                )}
              </View>
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
  renderHighlightedText?: (text: string, query: string) => React.ReactElement;
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
  const layoutTransition = useMemo(() => LinearTransition.duration(240).easing(Easing.inOut(Easing.quad)), []);
  const enteringTransition = useMemo(() => FadeIn.duration(180), []);
  const exitingTransition = useMemo(() => FadeOut.duration(150), []);

  const prevWalletIds = useRef<string[]>([]);
  const newWalletsMap = useRef<Record<string, boolean>>({});
  const lastAddedWalletId = useRef<string | null>(null);
  const hasFocusedRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  const flatListRef = useRef<FlatList<any>>(null);
  const walletRefs = useRef<Record<string, React.RefObject<View | null>>>({});

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
        walletRefs.current[wallet.getID()] = createRef<View | null>();
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

      // Update refs for next comparison
      prevWalletIds.current = currentWalletIds;

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
    ({ item }: ListRenderItemInfo<TWallet>) => {
      if (!item) return null;
      const content = (
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
      );

      if (!animateChanges) return content;

      return (
        <Animated.View layout={layoutTransition} entering={enteringTransition} exiting={exitingTransition}>
          {content}
        </Animated.View>
      );
    },
    [
      horizontal,
      selectedWallet,
      handleLongPress,
      onPress,
      searchQuery,
      renderHighlightedText,
      animateChanges,
      layoutTransition,
      enteringTransition,
      exitingTransition,
    ],
  );

  const keyExtractor = useCallback((item: TWallet, index: number) => (item?.getID ? item.getID() : index.toString()), []);

  const sliderHeight = 195;

  useEffect(() => {
    return () => {
      hasFocusedRef.current = false;
    };
  }, []);

  const renderNonFlatListWallets = useCallback(() => {
    return data.map(item => {
      if (!item) return null;

      const content = (
        <View
          key={!animateChanges ? item.getID() : undefined}
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
      );

      if (!animateChanges) return content;

      return (
        <Animated.View key={item.getID()} layout={layoutTransition} entering={enteringTransition} exiting={exitingTransition}>
          {content}
        </Animated.View>
      );
    });
  }, [
    data,
    horizontal,
    selectedWallet,
    handleLongPress,
    onPress,
    props.searchQuery,
    props.renderHighlightedText,
    animateChanges,
    layoutTransition,
    enteringTransition,
    exitingTransition,
  ]);

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
      snapToInterval={horizontal ? itemWidth - CARD_OVERLAP : undefined}
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

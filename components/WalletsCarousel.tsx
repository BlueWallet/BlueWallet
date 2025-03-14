import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useEffect, useState } from 'react';
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
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import { Icon } from '@rneui/base';

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
  isPlaceHolder?: boolean;
  searchQuery?: string;
  renderHighlightedText?: (text: string, query: string) => JSX.Element;
  animationsEnabled?: boolean;
  onPressIn?: () => void;
  onPressOut?: () => void;
  longPressAction?: 'reorder' | 'default'; // Add this new prop
  simplifiedRendering?: boolean; // Add prop for simplified rendering mode
  longPressDelay?: number; // Add this prop with default value
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
  longPressIndicator: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    width: 60,
    height: 60,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 10,
    top: '50%',
    left: '50%',
    marginLeft: -30,
    marginTop: -30,
  },
  longPressInnerCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
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
    longPressAction = 'default', // Default value
    simplifiedRendering = false,
    longPressDelay = 500, // Add this prop with default value
  }) => {
    const scaleValue = useRef(new Animated.Value(1.0)).current;
    const { colors } = useTheme();
    const hapticTriggered = useRef(false);
    const { walletTransactionUpdateStatus } = useStorage();
    const { width } = useWindowDimensions();
    const itemWidth = width * 0.82 > 375 ? 375 : width * 0.82;
    const { isLargeScreen } = useIsLargeScreen();
    const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Add new state and animated values for long press indicator
    const [showLongPressIndicator, setShowLongPressIndicator] = useState(false);
    const longPressProgress = useRef(new Animated.Value(0)).current;
    const longPressOpacity = useRef(new Animated.Value(0)).current;
    const cardBackgroundOpacity = useRef(new Animated.Value(1)).current; // New animated value for card background
    const LONG_PRESS_DURATION = 500; // Match the delayLongPress value

    const animateScale = useCallback(
      (toValue: number, callback?: () => void) => {
        // Use timing for more consistent response
        Animated.timing(scaleValue, {
          toValue,
          duration: 100, // Short duration for immediate feedback
          useNativeDriver: true,
        }).start(callback);
      },
      [scaleValue],
    );

    // Animate the long press indicator
    const startLongPressAnimation = useCallback(() => {
      // Reset values
      longPressProgress.setValue(0);
      longPressOpacity.setValue(0);
      cardBackgroundOpacity.setValue(1);

      // Show the indicator
      setShowLongPressIndicator(true);

      // Animate opacity in
      Animated.timing(longPressOpacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();

      // Animate progress
      Animated.timing(longPressProgress, {
        toValue: 1,
        duration: LONG_PRESS_DURATION,
        useNativeDriver: true,
      }).start();

      // Animate card background opacity - create pulsing effect
      Animated.sequence([
        Animated.timing(cardBackgroundOpacity, {
          toValue: 0.7,
          duration: LONG_PRESS_DURATION / 3,
          useNativeDriver: true,
        }),
        Animated.timing(cardBackgroundOpacity, {
          toValue: 0.85,
          duration: LONG_PRESS_DURATION / 3,
          useNativeDriver: true,
        }),
        Animated.timing(cardBackgroundOpacity, {
          toValue: 0.7,
          duration: LONG_PRESS_DURATION / 3,
          useNativeDriver: true,
        }),
      ]).start();
    }, [longPressProgress, longPressOpacity, cardBackgroundOpacity, LONG_PRESS_DURATION]);

    // Reset the long press indicator
    const resetLongPressIndicator = useCallback(() => {
      Animated.parallel([
        Animated.timing(longPressOpacity, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(cardBackgroundOpacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowLongPressIndicator(false);
        longPressProgress.setValue(0);
      });
    }, [longPressOpacity, longPressProgress, cardBackgroundOpacity]);

    // Add a timeout delay before showing the long press indicator
    const LONG_PRESS_INDICATOR_DELAY = 200; // Show indicator after 200ms of pressing
    const longPressIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Separate the scale animation from the long press indicator
    const onPressedIn = useCallback(() => {
      // Always animate the scale down for better feedback, unless specifically disabled
      if (animationsEnabled !== false) {
        animateScale(0.96);
      }
      if (onPressIn) onPressIn();

      // Clear any existing timeouts to prevent multiple triggers
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
      if (longPressIndicatorTimeoutRef.current) {
        clearTimeout(longPressIndicatorTimeoutRef.current);
      }

      // Only show long press indicator if drag is available, and only after a delay
      if (handleLongPress) {
        // Set a timeout to show the long press indicator after a delay
        longPressIndicatorTimeoutRef.current = setTimeout(() => {
          startLongPressAnimation();

          // Set a timeout to match the delayLongPress
          longPressTimeoutRef.current = setTimeout(() => {
            resetLongPressIndicator();
          }, LONG_PRESS_DURATION - LONG_PRESS_INDICATOR_DELAY);
        }, LONG_PRESS_INDICATOR_DELAY);
      }
    }, [
      animateScale,
      animationsEnabled,
      onPressIn,
      handleLongPress,
      startLongPressAnimation,
      resetLongPressIndicator,
      LONG_PRESS_DURATION,
    ]);

    const onPressedOut = useCallback(() => {
      // Always animate the scale back up, unless specifically disabled
      if (animationsEnabled !== false) {
        animateScale(1.0);
      }
      if (onPressOut) onPressOut();

      // Clear both long press timeouts if the user releases before the long press activates
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }
      if (longPressIndicatorTimeoutRef.current) {
        clearTimeout(longPressIndicatorTimeoutRef.current);
        longPressIndicatorTimeoutRef.current = null;
      }

      // Hide the indicator
      resetLongPressIndicator();
    }, [animateScale, animationsEnabled, onPressOut, resetLongPressIndicator]);

    const handlePress = useCallback(() => {
      // Clear any potential long press indicators when a tap is detected
      if (longPressIndicatorTimeoutRef.current) {
        clearTimeout(longPressIndicatorTimeoutRef.current);
        longPressIndicatorTimeoutRef.current = null;
      }
      resetLongPressIndicator();

      onPress(item);
    }, [item, onPress, resetLongPressIndicator]);

    // Clean up any timeouts when component unmounts
    useEffect(() => {
      return () => {
        if (longPressTimeoutRef.current) {
          clearTimeout(longPressTimeoutRef.current);
        }
        if (longPressIndicatorTimeoutRef.current) {
          clearTimeout(longPressIndicatorTimeoutRef.current);
        }
      };
    }, []);

    // Transform for the progress fill
    const progressScale = longPressProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 1],
    });

    // Render the appropriate icon based on longPressAction
    const renderLongPressIcon = () => {
      if (longPressAction === 'reorder') {
        return <Icon name="sort" type="font-awesome" size={20} color="#000" />;
      }
      return <Icon name="list" type="font-awesome" size={20} color="#000" />;
    };

    // Calculate the combined opacity for the card
    const finalOpacity = Animated.multiply(cardBackgroundOpacity, new Animated.Value(isSelectedWallet === false ? 0.5 : 1.0));

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

    // If in simplified rendering mode, use a more performant version
    if (simplifiedRendering) {
      return (
        <View
          style={
            isLargeScreen || !horizontal ? [iStyles.rootLargeDevice, customStyle] : (customStyle ?? { ...iStyles.root, width: itemWidth })
          }
        >
          <View style={[iStyles.shadowContainer, { backgroundColor: colors.background, shadowColor: colors.shadowColor }]}>
            <LinearGradient colors={WalletGradient.gradientsFor(item.type)} style={iStyles.grad}>
              <Text numberOfLines={1} style={[iStyles.label, { color: colors.inverseForegroundColor }]}>
                {item.getLabel()}
              </Text>
            </LinearGradient>
          </View>
        </View>
      );
    }

    // Regular rendering with animations
    return (
      <Animated.View
        style={[
          isLargeScreen || !horizontal ? [iStyles.rootLargeDevice, customStyle] : (customStyle ?? { ...iStyles.root, width: itemWidth }),
          {
            opacity: finalOpacity, // Use the combined animated opacity
            transform: [{ scale: scaleValue }],
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          testID={item.getLabel()}
          onPressIn={onPressedIn}
          onPressOut={onPressedOut}
          delayLongPress={longPressDelay} // Use the prop here instead of hardcoded value
          onLongPress={() => {
            if (handleLongPress) {
              // Make sure haptic is triggered before the handler to provide instant feedback
              triggerHapticFeedback(HapticFeedbackTypes.ImpactMedium);
              hapticTriggered.current = true;
              handleLongPress();
            }
          }}
          onPress={handlePress}
          delayHoverIn={0}
          delayHoverOut={0}
        >
          <View style={[iStyles.shadowContainer, { backgroundColor: colors.background, shadowColor: colors.shadowColor }]}>
            {/* Long press indicator overlay */}
            {showLongPressIndicator && handleLongPress && (
              <Animated.View
                style={[
                  iStyles.longPressIndicator,
                  {
                    opacity: longPressOpacity,
                  },
                ]}
              >
                <Animated.View
                  style={[
                    iStyles.longPressInnerCircle,
                    {
                      transform: [{ scale: progressScale }],
                    },
                  ]}
                >
                  {renderLongPressIcon()}
                </Animated.View>
              </Animated.View>
            )}

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
  // Optimize re-renders with custom comparison
  (prevProps, nextProps) => {
    if (prevProps.simplifiedRendering && nextProps.simplifiedRendering) {
      // For simplified rendering, only compare essential props
      return prevProps.item.getID() === nextProps.item.getID();
    }
    // Default comparison for regular rendering
    return (
      prevProps.item.getID() === nextProps.item.getID() &&
      prevProps.isSelectedWallet === nextProps.isSelectedWallet &&
      prevProps.animationsEnabled === nextProps.animationsEnabled &&
      prevProps.item.hideBalance === nextProps.item.hideBalance &&
      prevProps.searchQuery === nextProps.searchQuery
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
  disableAnimations?: boolean; // Add this new prop
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
    disableAnimations, // Add this prop
  } = props;

  const { width } = useWindowDimensions();
  const itemWidth = useMemo(() => (width * 0.82 > 375 ? 375 : width * 0.82), [width]);

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<TWallet>) =>
      item ? (
        <WalletCarouselItem
          isSelectedWallet={!horizontal && selectedWallet ? selectedWallet === item.getID() : undefined}
          item={item}
          handleLongPress={handleLongPress} // Pass through with no wrapper to avoid breaking the event chain
          onPress={onPress}
          horizontal={horizontal}
          searchQuery={searchQuery}
          renderHighlightedText={renderHighlightedText}
          // Use shorter longPressDelay for better responsiveness
          longPressDelay={300}
          animationsEnabled={!disableAnimations} // Pass the prop here
        />
      ) : null,
    [horizontal, selectedWallet, handleLongPress, onPress, searchQuery, renderHighlightedText, disableAnimations],
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
    console.debug('onScrollToIndexFailed', error);
    flatListRef.current?.scrollToOffset({ offset: error.averageItemLength * error.index, animated: true });
    setTimeout(() => {
      if (data.length !== 0 && flatListRef.current !== null) {
        flatListRef.current.scrollToIndex({ index: error.index, animated: true });
      }
    }, 100);
  };

  const sliderHeight = 195;

  const keyExtractor = useCallback((item: TWallet, index: number) => (item?.getID ? item.getID() : index.toString()), []);

  return isFlatList ? (
    <FlatList
      ref={flatListRef}
      renderItem={renderItem}
      extraData={data}
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

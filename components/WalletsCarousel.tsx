import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useEffect, useState } from 'react';
import {
  AccessibilityActionEvent,
  FlatList,
  ImageBackground,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  FlatListProps,
  LayoutChangeEvent,
  ListRenderItemInfo,
  NativeScrollEvent,
  NativeSyntheticEvent,
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
import { LightningArkWallet } from '../class/wallets/lightning-ark-wallet';
import { LightningCustodianWallet } from '../class/wallets/lightning-custodian-wallet';
import { MultisigHDWallet } from '../class/wallets/multisig-hd-wallet';
import WalletGradient from '../class/wallet-gradient';
import { shouldUseWideLayout } from '../blue_modules/layout';
import loc, { formatBalance, transactionTimeToReadable } from '../loc';
import { BlurredBalanceView } from './BlurredBalanceView';
import { withAlpha } from './color';
import { useTheme } from './themes';
import { LightningTransaction, Transaction, TWallet } from '../class/wallets/types';
import { BlueSpacing10 } from './BlueSpacing';
import { useLocale } from '@react-navigation/native';

export const WALLET_CAROUSEL_HEADER_WIDTH = 16;

/** Base card body height at default Dynamic Type — grows with larger Dynamic Type, never shrinks below default. */
export const WALLET_CARD_BASE_MIN_HEIGHT = 164;
/** Top inset above wallet cards in the horizontal home carousel. */
export const WALLET_CAROUSEL_PADDING_TOP = 12;
/** Bottom inset so iOS card shadows (offset 4 + radius 8) are not clipped by the list row. */
export const WALLET_CAROUSEL_PADDING_BOTTOM = 20;

/** Scale layout metrics up for accessibility sizes; keep the design default when fontScale ≤ 1. */
const scaleLayoutUp = (base: number, fontScale: number): number => Math.round(base * Math.max(1, fontScale));

export const getWalletCardMinHeight = (fontScale = 1): number => scaleLayoutUp(WALLET_CARD_BASE_MIN_HEIGHT, fontScale);

export const getWalletCarouselHeight = (fontScale = 1): number =>
  scaleLayoutUp(WALLET_CAROUSEL_PADDING_TOP, fontScale) +
  getWalletCardMinHeight(fontScale) +
  scaleLayoutUp(WALLET_CAROUSEL_PADDING_BOTTOM, fontScale);

/** Default carousel row height at `fontScale` 1 — prefer `getWalletCarouselHeight(fontScale)` when layout depends on Dynamic Type. */
export const WALLET_CAROUSEL_HEIGHT = getWalletCarouselHeight(1);

/** Vertical gap between the wallet title/balance block and the latest-tx footer on carousel cards. */
const WALLET_CARD_SECTION_GAP = 12;
const WALLET_CARD_TEXT_OPACITY = 0.85;
const WALLET_CAROUSEL_ITEM_GAP = 20;
const ACCESSIBILITY_LAYOUT_FONT_SCALE = 1.3;

type PressableHandle = React.ElementRef<typeof Pressable>;
type CarouselKeyDownEvent = {
  nativeEvent: {
    key: string;
    code: string;
    altKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    isComposing?: boolean;
  };
  preventDefault: () => void;
  stopPropagation: () => void;
  isDefaultPrevented: () => boolean;
};
type KeyboardEventProps = { onKeyDown?: (event: CarouselKeyDownEvent) => void };
// Key events are available at runtime in RN 0.88, but the project's legacy public types do not expose them yet.
const KeyboardAwareView = View as React.ComponentType<React.ComponentProps<typeof View> & KeyboardEventProps>;
const KeyboardAwareFlatList = FlatList as unknown as <ItemT>(
  props: FlatListProps<ItemT> & KeyboardEventProps & React.RefAttributes<FlatList<ItemT>>,
) => React.ReactElement;

export const getWalletCarouselItemWidth = (containerWidth: number) => Math.min(375, Math.round(containerWidth * 0.82));

export const getWalletCarouselKeyboardTarget = (
  key: string,
  currentIndex: number,
  itemCount: number,
  horizontal: boolean,
  isRTL: boolean,
): number | null => {
  if (itemCount <= 0) return null;
  if (key === 'Home') return 0;
  if (key === 'End') return itemCount - 1;

  let delta = 0;
  if (key === 'PageUp' || key === 'PageDown') {
    delta = key === 'PageDown' ? 1 : -1;
  } else if (horizontal && (key === 'ArrowLeft' || key === 'ArrowRight')) {
    delta = key === 'ArrowRight' ? 1 : -1;
    if (isRTL) delta *= -1;
  } else if (!horizontal && (key === 'ArrowUp' || key === 'ArrowDown')) {
    delta = key === 'ArrowDown' ? 1 : -1;
  } else {
    return null;
  }

  if (currentIndex < 0) return delta > 0 ? 0 : itemCount - 1;
  const targetIndex = currentIndex + delta;
  return targetIndex >= 0 && targetIndex < itemCount ? targetIndex : null;
};

interface WalletCarouselLayoutMetrics {
  itemWidth: number;
  cardMinHeight: number;
  carouselHeight: number;
  fontScale: number;
  isWideLayout: boolean;
  usesAccessibilityLayout: boolean;
}

const useWalletCarouselLayoutMetrics = (containerWidth?: number): WalletCarouselLayoutMetrics => {
  const { height, width: windowWidth, fontScale } = useWindowDimensions();
  const availableWidth = containerWidth || windowWidth;

  return useMemo(
    () => ({
      itemWidth: getWalletCarouselItemWidth(availableWidth),
      cardMinHeight: getWalletCardMinHeight(fontScale),
      carouselHeight: getWalletCarouselHeight(fontScale),
      fontScale,
      isWideLayout: shouldUseWideLayout(availableWidth, height),
      usesAccessibilityLayout: fontScale >= ACCESSIBILITY_LAYOUT_FONT_SCALE,
    }),
    [availableWidth, fontScale, height],
  );
};

/** Shared pending-pill rule for on-chain vs Lightning/Ark cards. */
export const walletHasPendingTransaction = (item: TWallet): boolean => {
  const isLightningShaped = item.type === LightningCustodianWallet.type || item.type === LightningArkWallet.type;
  // Lightning/Ark: `ispaid === false` alone is not pending (failed/refunded swaps stay in history).
  if (isLightningShaped) {
    return item.getTransactions().some((tx: Pick<LightningTransaction, 'ispaid' | 'failed'>) => tx.ispaid === false && !tx.failed);
  }
  return item.getTransactions().some((tx: Transaction) => tx.confirmations === 0);
};

interface NewWalletPanelProps {
  onPress: () => void;
  layout: WalletCarouselLayoutMetrics;
  focusRef?: React.Ref<PressableHandle>;
  onFocus?: () => void;
}

const nStyles = StyleSheet.create({
  container: {
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  root: { paddingEnd: WALLET_CAROUSEL_ITEM_GAP },
  containerWide: {
    paddingHorizontal: 24,
    marginVertical: 16,
  },
  containerNarrow: {
    paddingVertical: 16,
    paddingHorizontal: 24,
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

const NewWalletPanel: React.FC<NewWalletPanelProps> = ({ onPress, layout, focusRef, onFocus }) => {
  const { colors } = useTheme();
  const { cardMinHeight, isWideLayout, itemWidth } = layout;

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
      ref={focusRef}
      onFocus={onFocus}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      testID="CreateAWallet"
      style={({ pressed }) => [
        !isWideLayout && [nStyles.root, { width: itemWidth }],
        {
          opacity: pressed ? 0.9 : 1.0,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={loc.wallets.list_create_a_wallet}
      accessibilityHint={loc.wallets.list_create_a_wallet_text.replace(/\s*\n\s*/g, ' ')}
    >
      <Animated.View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={[
          nStyles.container,
          isWideLayout ? nStyles.containerWide : nStyles.containerNarrow,
          { minHeight: cardMinHeight },
          { backgroundColor: colors.lightButton },
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
  hideBalance: boolean;
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
  focusRef?: React.Ref<PressableHandle>;
  onFocus?: () => void;
}

const iStyles = StyleSheet.create({
  root: { paddingEnd: WALLET_CAROUSEL_ITEM_GAP },
  rootLargeDevice: { marginVertical: 20 },
  grad: {
    borderRadius: 12,
    minHeight: 164,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  gradCompact: {
    borderRadius: 10,
    minHeight: 132,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  gradContent: {
    padding: 15,
    width: '100%',
  },
  gradContentCompact: {
    padding: 12,
  },
  balanceContainer: {
    minHeight: 40,
    justifyContent: 'center',
  },
  balanceContainerCompact: {
    minHeight: 32,
    justifyContent: 'center',
  },
  image: {
    width: 99,
    height: 94,
    position: 'absolute',
    bottom: 0,
    end: 0,
  },
  imageCompact: {
    width: 78,
    height: 74,
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

const WalletCarouselItemContent: React.FC<WalletCarouselItemProps & { layout: WalletCarouselLayoutMetrics }> = ({
  item,
  hideBalance,
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
  layout,
  focusRef,
  onFocus,
}) => {
  const walletLabel = item.getLabel ? item.getLabel() : '';
  const pressScale = useSharedValue(1.0);
  const dragScale = useSharedValue(isDraggingActive ? dragActiveScale : 1.0);
  const opacityValue = useSharedValue(isSelectedWallet === false ? 0.5 : 1.0);
  const translateYValue = useSharedValue(isNewWallet ? 20 : 0);
  const balanceOpacity = useSharedValue(1);
  const balanceTranslateY = useSharedValue(0);
  const { colors } = useTheme();
  const { cardMinHeight, fontScale, isWideLayout, itemWidth, usesAccessibilityLayout } = layout;
  const isCompact = sizeVariant === 'compact';
  const { direction } = useLocale();
  const scaledCardStyles = useMemo(
    () => ({
      grad: { minHeight: cardMinHeight },
      gradContent: { padding: scaleLayoutUp(15, fontScale) },
      contentSpacing: { rowGap: scaleLayoutUp(WALLET_CARD_SECTION_GAP, fontScale) },
      balanceContainer: { minHeight: scaleLayoutUp(40, fontScale) },
      label: { lineHeight: scaleLayoutUp(24, fontScale) },
      balance: { lineHeight: scaleLayoutUp(38, fontScale) },
      balanceCompact: { lineHeight: scaleLayoutUp(30, fontScale) },
      latestTx: { lineHeight: scaleLayoutUp(18, fontScale) },
      latestTxTime: { lineHeight: scaleLayoutUp(22, fontScale) },
    }),
    [cardMinHeight, fontScale],
  );
  const cardTextStyle = useMemo(
    () => ({
      color: withAlpha(colors.inverseForegroundColor, WALLET_CARD_TEXT_OPACITY),
      writingDirection: direction,
    }),
    [colors.inverseForegroundColor, direction],
  );
  const previousBalance = useRef<string | undefined>(undefined);
  const balance = !hideBalance && formatBalance(Number(item.getBalance()), item.getPreferredBalanceUnit(), true);
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

  if (item.getBalance() !== 0 && item.getLatestTransactionTime() === 0) {
    latestTransactionText = loc.wallets.pull_to_refresh;
  } else if (walletHasPendingTransaction(item)) {
    latestTransactionText = loc.transactions.pending;
  } else {
    latestTransactionText = transactionTimeToReadable(item.getLatestTransactionTime());
  }

  // Keep the card as one concise screen-reader element. In particular, never
  // disclose a hidden balance through accessibility metadata.
  const accessibilityLabel = [walletLabel, balance || undefined, loc.wallets.list_latest_transaction, latestTransactionText]
    .filter(Boolean)
    .join(', ');
  const accessibilityActions = handleLongPress ? [{ name: 'manage', label: loc.wallets.manage_title }] : undefined;
  const onAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === 'manage') {
        handleLongPress?.();
      }
    },
    [handleLongPress],
  );

  return (
    <Animated.View
      accessible={false}
      importantForAccessibility={isPlaceHolder ? 'no-hide-descendants' : 'auto'}
      style={[
        isWideLayout || !horizontal ? [iStyles.rootLargeDevice, customStyle] : [iStyles.root, { width: itemWidth }, customStyle],
        animatedCardStyle,
      ]}
    >
      <Pressable
        ref={focusRef}
        onFocus={onFocus}
        accessible={!isPlaceHolder}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={isSelectedWallet === undefined ? undefined : { selected: isSelectedWallet }}
        accessibilityActions={accessibilityActions}
        onAccessibilityAction={onAccessibilityAction}
        testID={walletLabel}
        onPressIn={onPressedIn}
        onPressOut={onPressedOut}
        onLongPress={handleLongPress}
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
            style={[iStyles.grad, isCompact && iStyles.gradCompact, scaledCardStyles.grad]}
          >
            <ImageBackground source={image} style={[iStyles.image, isCompact && iStyles.imageCompact]} accessible={false} />
            <View
              style={[
                iStyles.gradContent,
                isCompact && iStyles.gradContentCompact,
                !isCompact && scaledCardStyles.gradContent,
                scaledCardStyles.contentSpacing,
              ]}
            >
              {!isPlaceHolder && (
                <>
                  <View>
                    <Text
                      numberOfLines={usesAccessibilityLayout ? 2 : 1}
                      style={[iStyles.label, isCompact && iStyles.labelCompact, scaledCardStyles.label, cardTextStyle]}
                    >
                      {renderHighlightedText ? renderHighlightedText(walletLabel, searchQuery || '') : walletLabel}
                    </Text>
                    <View
                      style={[iStyles.balanceContainer, isCompact && iStyles.balanceContainerCompact, scaledCardStyles.balanceContainer]}
                    >
                      {hideBalance ? (
                        <>
                          <BlueSpacing10 />
                          <BlurredBalanceView />
                        </>
                      ) : (
                        <Animated.Text
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.55}
                          key={`${balance}`} // force component recreation on balance change. To fix right-to-left languages, like Farsi
                          style={[
                            iStyles.balance,
                            isCompact && iStyles.balanceCompact,
                            isCompact ? scaledCardStyles.balanceCompact : scaledCardStyles.balance,
                            cardTextStyle,
                            animatedBalanceStyle,
                          ]}
                        >
                          {`${balance} `}
                        </Animated.Text>
                      )}
                    </View>
                  </View>
                  <View>
                    <Text
                      numberOfLines={usesAccessibilityLayout ? 2 : 1}
                      adjustsFontSizeToFit={!usesAccessibilityLayout}
                      minimumFontScale={0.8}
                      style={[iStyles.latestTx, isCompact && iStyles.latestTxCompact, scaledCardStyles.latestTx, cardTextStyle]}
                    >
                      {loc.wallets.list_latest_transaction}
                    </Text>
                    <Text
                      numberOfLines={usesAccessibilityLayout ? 2 : 1}
                      adjustsFontSizeToFit={!usesAccessibilityLayout}
                      minimumFontScale={0.8}
                      style={[iStyles.latestTxTime, isCompact && iStyles.latestTxTimeCompact, scaledCardStyles.latestTxTime, cardTextStyle]}
                    >
                      {latestTransactionText}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </LinearGradient>
        </View>
      </Pressable>
    </Animated.View>
  );
};

/** Standalone wallet cards fall back to window metrics; carousel rows receive container metrics from their parent. */
export const WalletCarouselItem: React.FC<WalletCarouselItemProps> = props => {
  const fallbackLayout = useWalletCarouselLayoutMetrics();
  return <WalletCarouselItemContent {...props} layout={fallbackLayout} />;
};

interface WalletsCarouselProps extends Partial<FlatListProps<TWallet>> {
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

/** what the carousel actually exposes through its ref (a subset of FlatList in list mode) */
export type CarouselListRefType = {
  scrollToEnd: (params?: { animated?: boolean | null }) => void;
  scrollToIndex: (params: { animated?: boolean | null; index: number; viewOffset?: number; viewPosition?: number }) => void;
  scrollToItem: (params: { animated?: boolean | null; item: TWallet; viewOffset?: number; viewPosition?: number }) => void;
  scrollToOffset: (params: { animated?: boolean | null; offset: number }) => void;
  recordInteraction: () => void;
  flashScrollIndicators: () => void;
  getNativeScrollRef: () => unknown;
  getWalletPosition?: (walletId: string) => Promise<{ x: number; y: number; width: number; height: number } | null>;
  focusPrevious: () => void;
  focusNext: () => void;
  focusFirst: () => void;
  focusLast: () => void;
  activateFocused: () => void;
};

const styles = StyleSheet.create({
  listHeaderSeparator: {
    width: WALLET_CAROUSEL_HEADER_WIDTH,
    height: 20,
  },
});

const ListHeaderSeparator = () => <View style={styles.listHeaderSeparator} accessible={false} />;

const WalletsCarousel = forwardRef<CarouselListRefType, WalletsCarouselProps>((props, ref) => {
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
    onLayout,
    onMomentumScrollEnd,
  } = props;
  const { direction } = useLocale();

  const [containerWidth, setContainerWidth] = useState<number>();
  const layout = useWalletCarouselLayoutMetrics(containerWidth);
  const { carouselHeight, fontScale, isWideLayout, itemWidth } = layout;
  const snapOffsets = useMemo(() => {
    if (!horizontal) return undefined;
    const itemCount = data.length + (onNewWalletPress ? 1 : 0);
    return Array.from({ length: itemCount }, (_, index) => index * itemWidth);
  }, [data.length, horizontal, itemWidth, onNewWalletPress]);
  const layoutTransition = useMemo(() => LinearTransition.duration(240).easing(Easing.inOut(Easing.quad)), []);
  const enteringTransition = useMemo(() => FadeIn.duration(180), []);
  const exitingTransition = useMemo(() => FadeOut.duration(150), []);

  const prevWalletIds = useRef<string[]>([]);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRetryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const focusFrameRef = useRef<number | null>(null);
  const pendingFocusIndexRef = useRef<number | null>(null);
  const focusedItemIndexRef = useRef(-1);
  const isInitialMount = useRef(true);

  const flatListRef = useRef<FlatList<TWallet>>(null);
  const walletRefs = useRef<Record<string, React.MutableRefObject<View | null>>>({});
  const focusableItemRefs = useRef<Record<number, PressableHandle | null>>({});

  const handleCarouselLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const nextWidth = event.nativeEvent.layout.width;
      setContainerWidth(currentWidth => (currentWidth === nextWidth ? currentWidth : nextWidth));
      onLayout?.(event);
    },
    [onLayout],
  );
  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset = horizontal ? event.nativeEvent.contentOffset.x : event.nativeEvent.contentOffset.y;
      const itemSize = horizontal ? itemWidth : carouselHeight;
      const lastIndex = data.length + (onNewWalletPress ? 0 : -1);
      focusedItemIndexRef.current = Math.min(Math.max(Math.round(offset / itemSize), 0), Math.max(lastIndex, 0));
      onMomentumScrollEnd?.(event);
    },
    [carouselHeight, data.length, horizontal, itemWidth, onMomentumScrollEnd, onNewWalletPress],
  );

  const getItemLayout = useCallback(
    (_items: ArrayLike<TWallet> | null | undefined, index: number) => ({
      length: itemWidth,
      offset: WALLET_CAROUSEL_HEADER_WIDTH + itemWidth * index,
      index,
    }),
    [itemWidth],
  );

  const requestItemFocus = useCallback((index: number) => {
    if (focusFrameRef.current !== null) cancelAnimationFrame(focusFrameRef.current);
    focusFrameRef.current = requestAnimationFrame(() => {
      const node = focusableItemRefs.current[index] as (PressableHandle & { focus?: () => void }) | undefined;
      if (node) {
        node.focus?.();
        pendingFocusIndexRef.current = null;
      }
      focusFrameRef.current = null;
    });
  }, []);

  const setFocusableItemRef = useCallback(
    (index: number, node: PressableHandle | null) => {
      if (node) {
        focusableItemRefs.current[index] = node;
        if (pendingFocusIndexRef.current === index) requestItemFocus(index);
      } else {
        delete focusableItemRefs.current[index];
      }
    },
    [requestItemFocus],
  );

  const focusItemAtIndex = useCallback(
    (index: number) => {
      focusedItemIndexRef.current = index;
      pendingFocusIndexRef.current = index;
      flatListRef.current?.recordInteraction();

      if (isFlatList && flatListRef.current) {
        if (index < data.length) {
          flatListRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
        } else {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }

      requestItemFocus(index);
    },
    [data.length, isFlatList, requestItemFocus],
  );

  const handleKeyDown = useCallback(
    (event: CarouselKeyDownEvent) => {
      if (event.isDefaultPrevented() || event.nativeEvent.altKey || event.nativeEvent.ctrlKey || event.nativeEvent.metaKey) return;

      const { code, isComposing, key } = event.nativeEvent;
      if (isComposing) return;
      const targetIndex = getWalletCarouselKeyboardTarget(
        key || code,
        focusedItemIndexRef.current,
        data.length + (onNewWalletPress ? 1 : 0),
        horizontal,
        direction === 'rtl',
      );
      if (targetIndex === null) return;

      event.preventDefault();
      event.stopPropagation();
      focusItemAtIndex(targetIndex);
    },
    [data.length, direction, focusItemAtIndex, horizontal, onNewWalletPress],
  );

  const focusRelative = useCallback(
    (delta: number) => {
      const itemCount = data.length + (onNewWalletPress ? 1 : 0);
      if (itemCount === 0) return;
      const currentIndex = focusedItemIndexRef.current < 0 ? (delta > 0 ? -1 : itemCount) : focusedItemIndexRef.current;
      const targetIndex = Math.min(itemCount - 1, Math.max(0, currentIndex + delta));
      if (targetIndex !== currentIndex) focusItemAtIndex(targetIndex);
    },
    [data.length, focusItemAtIndex, onNewWalletPress],
  );
  const focusFirst = useCallback(() => {
    if (data.length > 0 || onNewWalletPress) focusItemAtIndex(0);
  }, [data.length, focusItemAtIndex, onNewWalletPress]);
  const focusLast = useCallback(() => {
    const itemCount = data.length + (onNewWalletPress ? 1 : 0);
    if (itemCount > 0) focusItemAtIndex(itemCount - 1);
  }, [data.length, focusItemAtIndex, onNewWalletPress]);
  const activateFocused = useCallback(() => {
    const index = focusedItemIndexRef.current < 0 ? 0 : focusedItemIndexRef.current;
    if (index < data.length) {
      onPress(data[index]);
    } else if (index === data.length) {
      onNewWalletPress?.();
    }
  }, [data, onNewWalletPress, onPress]);

  useImperativeHandle(ref, (): CarouselListRefType => {
    const keyboardCommands = {
      focusPrevious: () => focusRelative(-1),
      focusNext: () => focusRelative(1),
      focusFirst,
      focusLast,
      activateFocused,
    };
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
          item: TWallet;
          viewOffset?: number | undefined;
          viewPosition?: number | undefined;
        }) => flatListRef.current?.scrollToItem(params),
        scrollToOffset: (params: { animated?: boolean | null | undefined; offset: number }) => flatListRef.current?.scrollToOffset(params),
        recordInteraction: () => flatListRef.current?.recordInteraction(),
        flashScrollIndicators: () => flatListRef.current?.flashScrollIndicators(),
        getNativeScrollRef: () => flatListRef.current?.getNativeScrollRef(),
        ...keyboardCommands,
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
        ...keyboardCommands,
        // Add a method to get position information about a wallet
        getWalletPosition: (walletId: string) => {
          const walletRef = walletRefs.current[walletId];
          if (walletRef?.current) {
            return new Promise<{ x: number; y: number; width: number; height: number }>(resolve => {
              walletRef.current?.measure((x: number, y: number, widthVal: number, heightVal: number, pageX: number, pageY: number) => {
                resolve({ x: pageX, y: pageY, width: widthVal, height: heightVal });
              });
            });
          }
          return Promise.resolve(null);
        },
      };
    }
  }, [activateFocused, focusFirst, focusLast, focusRelative, isFlatList]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (scrollRetryTimeoutRef.current) {
        clearTimeout(scrollRetryTimeoutRef.current);
      }
      if (focusFrameRef.current !== null) {
        cancelAnimationFrame(focusFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const activeWalletIds = new Set(data.map(wallet => wallet.getID()));
    Object.keys(walletRefs.current).forEach(walletId => {
      if (!activeWalletIds.has(walletId)) delete walletRefs.current[walletId];
    });
    data.forEach(wallet => {
      if (!walletRefs.current[wallet.getID()]) {
        walletRefs.current[wallet.getID()] = { current: null };
      }
    });
    const itemCount = data.length + (onNewWalletPress ? 1 : 0);
    Object.keys(focusableItemRefs.current).forEach(index => {
      if (Number(index) >= itemCount) delete focusableItemRefs.current[Number(index)];
    });
    if (focusedItemIndexRef.current >= itemCount) focusedItemIndexRef.current = itemCount - 1;
  }, [data, onNewWalletPress]);

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
            const itemSize = horizontal ? itemWidth : carouselHeight;
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
    [carouselHeight, data, isFlatList, itemWidth, horizontal],
  );

  useEffect(() => {
    const currentWalletIds = data.map(wallet => wallet.getID());
    if (!animateChanges) {
      prevWalletIds.current = currentWalletIds;
      isInitialMount.current = true;
      return;
    }

    // Skip auto-scrolling on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevWalletIds.current = currentWalletIds;
      return;
    }

    const previousWalletIds = new Set(prevWalletIds.current);
    const addedWallets = currentWalletIds.filter(id => !previousWalletIds.has(id));
    if (addedWallets.length > 0) {
      const lastAddedWalletId = addedWallets[addedWallets.length - 1];

      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

      scrollTimeoutRef.current = setTimeout(() => {
        scrollToWalletById(lastAddedWalletId, true);
        scrollTimeoutRef.current = null;
      }, 300);
    }

    prevWalletIds.current = currentWalletIds;
  }, [data, animateChanges, scrollToWalletById]);

  const onScrollToIndexFailed = useCallback(
    (error: { averageItemLength: number; index: number }): void => {
      console.debug('onScrollToIndexFailed', error);
      flatListRef.current?.scrollToOffset({ offset: error.averageItemLength * error.index, animated: true });
      if (scrollRetryTimeoutRef.current) clearTimeout(scrollRetryTimeoutRef.current);
      scrollRetryTimeoutRef.current = setTimeout(() => {
        if (error.index < data.length && flatListRef.current) {
          flatListRef.current.scrollToIndex({ index: error.index, animated: true });
        }
        scrollRetryTimeoutRef.current = null;
      }, 100);
    },
    [data.length],
  );

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<TWallet>) => {
      if (!item) return null;
      const content = (
        <WalletCarouselItemContent
          isSelectedWallet={!horizontal && selectedWallet ? selectedWallet === item.getID() : undefined}
          item={item}
          hideBalance={item.hideBalance}
          handleLongPress={handleLongPress}
          onPress={onPress}
          horizontal={horizontal}
          searchQuery={searchQuery}
          renderHighlightedText={renderHighlightedText}
          animationsEnabled={animateChanges}
          layout={layout}
          focusRef={node => setFocusableItemRef(index, node)}
          onFocus={() => {
            focusedItemIndexRef.current = index;
            pendingFocusIndexRef.current = null;
          }}
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
      layout,
      setFocusableItemRef,
    ],
  );

  const keyExtractor = useCallback((item: TWallet, index: number) => (item?.getID ? item.getID() : index.toString()), []);

  const renderNonFlatListWallets = useCallback(() => {
    return data.map((item, index) => {
      if (!item) return null;

      const content = (
        <View
          key={!animateChanges ? item.getID() : undefined}
          ref={(node: View | null) => {
            // Keep existing ref object in map
            walletRefs.current[item.getID()] ??= { current: null };
            walletRefs.current[item.getID()].current = node;
          }}
        >
          <WalletCarouselItemContent
            isSelectedWallet={!horizontal && selectedWallet ? selectedWallet === item.getID() : undefined}
            item={item}
            hideBalance={item.hideBalance}
            handleLongPress={handleLongPress}
            onPress={onPress}
            searchQuery={props.searchQuery}
            renderHighlightedText={props.renderHighlightedText}
            animationsEnabled={animateChanges}
            layout={layout}
            focusRef={node => setFocusableItemRef(index, node)}
            onFocus={() => {
              focusedItemIndexRef.current = index;
              pendingFocusIndexRef.current = null;
            }}
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
    layout,
    setFocusableItemRef,
  ]);

  const contentContainerStyle = useMemo(
    () => ({
      paddingTop: scaleLayoutUp(WALLET_CAROUSEL_PADDING_TOP, fontScale),
      paddingBottom: scaleLayoutUp(WALLET_CAROUSEL_PADDING_BOTTOM, fontScale),
    }),
    [fontScale],
  );
  const largeScreenContentStyle = useMemo(() => ({ paddingHorizontal: isWideLayout ? 16 : 12 }), [isWideLayout]);
  const listExtraData = useMemo(
    () => [props.extraData, data, animateChanges, selectedWallet],
    [animateChanges, data, props.extraData, selectedWallet],
  );
  const newWalletPanel = useMemo(
    () =>
      onNewWalletPress ? (
        <NewWalletPanel
          onPress={onNewWalletPress}
          layout={layout}
          focusRef={node => setFocusableItemRef(data.length, node)}
          onFocus={() => {
            focusedItemIndexRef.current = data.length;
            pendingFocusIndexRef.current = null;
          }}
        />
      ) : null,
    [data.length, layout, onNewWalletPress, setFocusableItemRef],
  );

  return isFlatList ? (
    <KeyboardAwareFlatList<TWallet>
      accessibilityRole="list"
      accessibilityLabel={loc.wallets.list_title}
      ref={flatListRef}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={horizontal ? getItemLayout : props.getItemLayout}
      showsVerticalScrollIndicator={false}
      pagingEnabled={false}
      disableIntervalMomentum={horizontal}
      snapToInterval={undefined}
      snapToOffsets={snapOffsets}
      snapToAlignment={horizontal ? 'start' : undefined}
      decelerationRate="fast"
      contentContainerStyle={contentContainerStyle}
      directionalLockEnabled
      showsHorizontalScrollIndicator={false}
      initialNumToRender={Math.min(Math.max(data.length, 1), 5)}
      maxToRenderPerBatch={5}
      windowSize={5}
      scrollEnabled={scrollEnabled}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={ListHeaderSeparator}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets
      automaticallyAdjustsScrollIndicatorInsets
      scrollToOverflowEnabled
      style={{ minHeight: carouselHeight }}
      onScrollToIndexFailed={onScrollToIndexFailed}
      ListFooterComponent={newWalletPanel}
      {...props}
      onLayout={handleCarouselLayout}
      onMomentumScrollEnd={handleMomentumScrollEnd}
      onKeyDown={handleKeyDown}
      // After `{...props}` so a caller `extraData` cannot drop `data` from the list's update signal.
      extraData={listExtraData}
    />
  ) : (
    <KeyboardAwareView
      style={largeScreenContentStyle}
      accessibilityRole="list"
      accessibilityLabel={loc.wallets.list_title}
      onLayout={handleCarouselLayout}
      onKeyDown={handleKeyDown}
    >
      {renderNonFlatListWallets()}
      {newWalletPanel}
    </KeyboardAwareView>
  );
});

export default WalletsCarousel;

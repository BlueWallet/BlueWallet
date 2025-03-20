import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, ViewStyle, TouchableOpacity, ActivityIndicator, Platform, Animated, Easing } from 'react-native';
import { Icon, ListItem } from '@rneui/base';
import { ExtendedTransaction, LightningTransaction, TWallet } from '../class/wallets/types';
import { WalletCarouselItem } from './WalletsCarousel';
import { TransactionListItem } from './TransactionListItem';
import { Theme, useTheme } from './themes';
import { BitcoinUnit } from '../models/bitcoinUnits';
import loc from '../loc';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';

// Fix: Move constants to the top before usage
const DEFAULT_VERTICAL_MARGIN = -24; // Changed from -10 to -24 for tighter spacing

enum ItemType {
  WalletSection = 'wallet',
  TransactionSection = 'transaction',
}

interface WalletItem {
  type: ItemType.WalletSection;
  data: TWallet;
}

interface TransactionItem {
  type: ItemType.TransactionSection;
  data: ExtendedTransaction & LightningTransaction;
}

type Item = WalletItem | TransactionItem;

interface ManageWalletsListItemProps {
  item: Item;
  isDraggingDisabled: boolean;
  drag?: () => void;
  isPlaceHolder?: boolean;
  onPressIn?: () => void;
  onPressOut?: () => void;
  state: { wallets: TWallet[]; searchQuery: string };
  navigateToWallet: (wallet: TWallet) => void;
  renderHighlightedText: (text: string, query: string) => JSX.Element;
  handleDeleteWallet: (wallet: TWallet) => void;
  handleToggleHideBalance: (wallet: TWallet) => void;
  isActive?: boolean;
  style?: ViewStyle;
  globalDragActive?: boolean;
  stackIndex?: number; // Added stackIndex prop for stacking effect
}

interface SwipeContentProps {
  onPress: () => void;
  hideBalance?: boolean;
  colors: any;
}

const LeftSwipeContent: React.FC<SwipeContentProps> = ({ onPress, hideBalance, colors }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.leftButtonContainer, styles.buttonAlternativeBackground]}
    accessibilityRole="button"
    accessibilityLabel={hideBalance ? loc.transactions.details_balance_show : loc.transactions.details_balance_hide}
  >
    <Icon name={hideBalance ? 'eye-slash' : 'eye'} color={colors.brandingColor} type="font-awesome-5" />
  </TouchableOpacity>
);

const RightSwipeContent: React.FC<Partial<SwipeContentProps>> = ({ onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={styles.rightButtonContainer as ViewStyle}
    accessibilityRole="button"
    accessibilityLabel="Delete Wallet"
  >
    <Icon name={Platform.OS === 'android' ? 'delete' : 'delete-outline'} color="#FFFFFF" />
  </TouchableOpacity>
);

const ManageWalletsListItem: React.FC<ManageWalletsListItemProps> = ({
  item,
  isDraggingDisabled,
  drag,
  state,
  isPlaceHolder = false,
  navigateToWallet,
  renderHighlightedText,
  handleDeleteWallet,
  handleToggleHideBalance,
  onPressIn,
  onPressOut,
  isActive,
  globalDragActive,
  stackIndex = 0,
  style,
}) => {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const resetFunctionRef = useRef<(() => void) | null>(null);

  // Animation constants - optimized for card stacking
  const CARD_SORT_ACTIVE = 1.05; // Less dramatic scaling when active
  const SCALE_DURATION = 200; // Quicker animation for better response

  // Card deck stacking constants - enhanced 3D perspective with steeper angle
  const STACK_MIN_SCALE = 0.97; // Keep cards similar in size
  const STACK_SCALE_DECREMENT = 0.002; // Minimal scale difference
  const STACK_MAX_Y_OFFSET = 2.0; // Reduced from 2.5 for tighter stacking
  const STACK_Y_OFFSET_INCREMENT = 0.3; // Reduced from 0.5 for tighter stacking
  const MAX_ROTATION_X = 10; // Reduced from 20 to improve performance
  const MAX_ROTATION_Z = 0.1; // Reduced from 0.2
  const PERSPECTIVE = 600; // Reduced from 800 for better performance

  const scaleValue = useRef(new Animated.Value(1)).current;
  const translateYValue = useRef(new Animated.Value(0)).current;
  const opacityValue = useRef(new Animated.Value(1)).current;
  const rotateValue = useRef(new Animated.Value(0)).current; // For card rotation
  const rotateXValue = useRef(new Animated.Value(0)).current; // For X-axis rotation
  const prevIsActive = useRef(isActive);

  // Move these useMemo calls outside of conditional logic
  const rotateZStr = useMemo(
    () =>
      rotateValue.interpolate({
        inputRange: [-MAX_ROTATION_Z, MAX_ROTATION_Z],
        outputRange: [`-${MAX_ROTATION_Z}deg`, `${MAX_ROTATION_Z}deg`],
      }),
    [rotateValue, MAX_ROTATION_Z],
  );

  const rotateXStr = useMemo(
    () =>
      rotateXValue.interpolate({
        inputRange: [0, MAX_ROTATION_X],
        outputRange: ['0deg', `${MAX_ROTATION_X}deg`],
      }),
    [rotateXValue, MAX_ROTATION_X],
  );

  // Define these values unconditionally
  const backgroundColor = isActive ? colors.brandingColor : colors.background;

  const staticShadow = useMemo(
    () => (isActive ? styles.activeShadow : globalDragActive ? styles.dragShadow : styles.noShadow),
    [isActive, globalDragActive],
  );

  // Optimize the animated style to reduce calculations during animation
  const animatedStyle = useMemo(() => {
    const marginStyle = globalDragActive ? (isActive ? styles.activeMargin : styles.inactiveMargin) : styles.defaultMargin;

    const zIndexStyle = isActive
      ? styles.activeZIndex
      : globalDragActive
        ? { zIndex: 50 - Math.min(stackIndex, 49) }
        : styles.defaultZIndex;

    const borderStyle = globalDragActive && !isActive ? styles.dragBorder : {};

    return [
      styles.animatedBase,
      {
        transform: [
          { perspective: PERSPECTIVE },
          { scale: scaleValue },
          { translateY: translateYValue },
          { rotateX: rotateXStr },
          { rotateZ: rotateZStr },
        ],
        opacity: opacityValue,
      },
      marginStyle,
      zIndexStyle,
      borderStyle,
    ];
  }, [scaleValue, translateYValue, opacityValue, rotateXStr, rotateZStr, globalDragActive, isActive, stackIndex, PERSPECTIVE]);

  // Pre-calculate this outside of the render method for better performance
  const getAnimationValues = useCallback(
    (isActive: boolean, globalDragActive: boolean, stackIndex: number) => {
      if (isActive) {
        return {
          scale: CARD_SORT_ACTIVE,
          translateY: -15,
          opacity: 1,
          rotateX: -5,
          rotateZ: 0,
          shadowOpacity: 0.6,
        };
      } else if (globalDragActive) {
        return {
          scale: Math.max(STACK_MIN_SCALE, 1 - stackIndex * STACK_SCALE_DECREMENT),
          translateY: Math.min(stackIndex * STACK_Y_OFFSET_INCREMENT, STACK_MAX_Y_OFFSET),
          opacity: Math.max(0.97, 1 - stackIndex * 0.003),
          rotateX: Math.min(stackIndex * 1.2, MAX_ROTATION_X), // Reduced multiplier from 1.8 to 1.2
          rotateZ: (stackIndex % 2 === 0 ? 1 : -1) * Math.min(stackIndex * 0.04, MAX_ROTATION_Z),
          shadowOpacity: Math.max(0.03, 0.1 - stackIndex * 0.01),
        };
      } else {
        return {
          scale: 1,
          translateY: 0,
          opacity: 1,
          rotateX: 0,
          rotateZ: 0,
          shadowOpacity: 0,
        };
      }
    },
    [
      CARD_SORT_ACTIVE,
      STACK_MIN_SCALE,
      STACK_SCALE_DECREMENT,
      STACK_Y_OFFSET_INCREMENT,
      STACK_MAX_Y_OFFSET,
      MAX_ROTATION_X,
      MAX_ROTATION_Z,
    ],
  );

  // Cache animation values outside of the effect for better performance
  const animationValues = useRef(getAnimationValues(!!isActive, !!globalDragActive, stackIndex));

  useEffect(() => {
    if (isActive !== prevIsActive.current) {
      triggerHapticFeedback(HapticFeedbackTypes.ImpactMedium);
    }
    prevIsActive.current = isActive;

    // Update cached animation values
    animationValues.current = getAnimationValues(!!isActive, !!globalDragActive, stackIndex);

    // Use a single parallel animation with less complexity
    Animated.parallel([
      Animated.timing(scaleValue, {
        toValue: animationValues.current.scale,
        duration: SCALE_DURATION,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(translateYValue, {
        toValue: animationValues.current.translateY,
        duration: SCALE_DURATION,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(opacityValue, {
        toValue: animationValues.current.opacity,
        duration: SCALE_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(rotateXValue, {
        toValue: animationValues.current.rotateX,
        duration: SCALE_DURATION,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(rotateValue, {
        toValue: animationValues.current.rotateZ,
        duration: SCALE_DURATION,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  }, [isActive, globalDragActive, stackIndex, getAnimationValues, scaleValue, translateYValue, opacityValue, rotateXValue, rotateValue]);

  const onPress = useCallback(() => {
    if (item.type === ItemType.WalletSection) {
      setIsLoading(true);
      navigateToWallet(item.data);
      setIsLoading(false);
    }
  }, [item, navigateToWallet]);

  const handleLeftPress = (reset: () => void) => {
    handleToggleHideBalance(item.data as TWallet);
    reset();
  };

  const leftContent = (reset: () => void) => {
    resetFunctionRef.current = reset;
    return <LeftSwipeContent onPress={() => handleLeftPress(reset)} hideBalance={(item.data as TWallet).hideBalance} colors={colors} />;
  };

  const handleRightPress = (reset: () => void) => {
    reset();

    setTimeout(() => {
      handleDeleteWallet(item.data as TWallet);
    }, 100); // short delay to allow swipe reset animation to complete
  };

  const rightContent = (reset: () => void) => {
    resetFunctionRef.current = reset;
    return <RightSwipeContent onPress={() => handleRightPress(reset)} />;
  };

  const startDrag = useCallback(() => {
    if (isSwipeActive) {
      return;
    }

    if (resetFunctionRef.current) {
      resetFunctionRef.current();
    }

    scaleValue.setValue(CARD_SORT_ACTIVE);
    triggerHapticFeedback(HapticFeedbackTypes.ImpactMedium);

    // Immediately start the drag operation
    if (drag) {
      drag();

      // Add a small timeout to ensure the drag is properly initialized
      // before any other touch events can interfere
      setTimeout(() => {
        // Prevent any other touch handlers from activating during drag
        if (Platform.OS === 'ios') {
          // iOS specific workaround to ensure drag continues
          console.log('Drag initiated on iOS');
        }
      }, 50);
    }
  }, [CARD_SORT_ACTIVE, drag, scaleValue, isSwipeActive]);

  if (isLoading) {
    return <ActivityIndicator size="large" color={colors.brandingColor} />;
  }

  if (item.type === ItemType.WalletSection) {
    const swipeDisabled = isActive || globalDragActive;

    // Now we can use the values we calculated unconditionally above
    const cardStyle = [
      style,
      isActive ? styles.activeCardBackground : styles.cardBackground,
      staticShadow,
      swipeDisabled ? styles.transparentBackground : {},
    ];

    return (
      <Animated.View style={animatedStyle}>
        <ListItem.Swipeable
          leftWidth={swipeDisabled ? 0 : 80}
          rightWidth={swipeDisabled ? 0 : 90}
          containerStyle={cardStyle}
          leftContent={swipeDisabled ? null : leftContent}
          rightContent={swipeDisabled ? null : rightContent}
          onPressOut={onPressOut}
          minSlideWidth={swipeDisabled ? 0 : 80} // Reduced from 180 to make dragging easier
          onPressIn={onPressIn}
          style={swipeDisabled ? styles.transparentBackground : {}}
          onSwipeBegin={direction => {
            if (!swipeDisabled) {
              setIsSwipeActive(true);
            }
          }}
          onSwipeEnd={() => {
            if (!swipeDisabled) {
              setIsSwipeActive(false);
            }
          }}
        >
          <ListItem.Content>
            <WalletCarouselItem
              item={item.data}
              handleLongPress={isDraggingDisabled || isSwipeActive ? undefined : startDrag}
              onPress={onPress}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              animationsEnabled={false}
              searchQuery={state.searchQuery}
              isPlaceHolder={isPlaceHolder}
              renderHighlightedText={renderHighlightedText}
              customStyle={styles.carouselItem}
            />
          </ListItem.Content>
        </ListItem.Swipeable>
      </Animated.View>
    );
  } else if (item.type === ItemType.TransactionSection && item.data) {
    const w = state.wallets.find(wallet => wallet.getTransactions().some((tx: ExtendedTransaction) => tx.hash === item.data.hash));
    const walletID = w ? w.getID() : '';

    return (
      <TransactionListItem
        item={item.data}
        itemPriceUnit={item.data.walletPreferredBalanceUnit || BitcoinUnit.BTC}
        walletID={walletID}
        searchQuery={state.searchQuery}
        renderHighlightedText={renderHighlightedText}
      />
    );
  }

  return null;
};


const styles = StyleSheet.create({
  leftButtonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonAlternativeBackground: {
    backgroundColor: (colors: Theme) => colors.buttonAlternativeTextColor,
  },
  carouselItem: {
    width: '100%',
  },
  rightButtonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'red',
  },
  transparentBackground: {
    backgroundColor: 'transparent',
  },
  activeCardBackground: {
    backgroundColor: (colors: ThemeColors) => colors.brandingColor,
  },
  cardBackground: {
    backgroundColor: (colors: ThemeColors) => colors.background,
  },
  animatedBase: {
    backgroundColor: 'transparent',
  },
  activeMargin: {
    marginVertical: 0,
  },
  inactiveMargin: {
    marginVertical: -70,
  },
  defaultMargin: {
    marginVertical: DEFAULT_VERTICAL_MARGIN,
  },
  activeZIndex: {
    zIndex: 100,
  },
  defaultZIndex: {
    zIndex: 10,
  },
  dragBorder: {
    borderWidth: 0.05,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  activeShadow: {
    shadowOpacity: 0.6,
    shadowColor: '#000',
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  dragShadow: {
    shadowOpacity: 0.1,
    shadowColor: '#000',
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 5,
  },
  noShadow: {
    shadowOpacity: 0,
    shadowColor: '#000',
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
});

export { LeftSwipeContent, RightSwipeContent };
export default ManageWalletsListItem;

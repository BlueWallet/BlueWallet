import React, { useCallback, useState, useEffect, useRef, memo } from 'react';
import { StyleSheet, ViewStyle, TouchableOpacity, ActivityIndicator, Platform, Animated, Easing, View } from 'react-native';
import { Icon, ListItem } from '@rneui/base';
import { ExtendedTransaction, LightningTransaction, TWallet } from '../class/wallets/types';
import { WalletCarouselItem } from './WalletsCarousel';
import { TransactionListItem } from './TransactionListItem';
import { useTheme } from './themes';
import { BitcoinUnit } from '../models/bitcoinUnits';
import loc from '../loc';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';

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
  optimization?: 'normal' | 'high'; // Add optimization level prop
}

interface SwipeContentProps {
  onPress: () => void;
  hideBalance?: boolean;
  colors: any;
}

const LeftSwipeContent: React.FC<SwipeContentProps> = ({ onPress, hideBalance, colors }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.leftButtonContainer, { backgroundColor: colors.buttonAlternativeTextColor } as ViewStyle]}
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
  style,
  optimization = 'normal',
}) => {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const resetFunctionRef = useRef<(() => void) | null>(null);
  const swipeResetTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dragStartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const CARD_SORT_ACTIVE = 1.06;
  const INACTIVE_SCALE_WHEN_ACTIVE = 0.9;
  const scaleValue = useRef(new Animated.Value(1)).current;
  const prevIsActive = useRef(isActive);

  const DEFAULT_VERTICAL_MARGIN = -10;
  const REDUCED_VERTICAL_MARGIN = -50;

  useEffect(() => {
    // Only trigger feedback when item FIRST becomes active, not continuously
    if (isActive && !prevIsActive.current) {
      triggerHapticFeedback(HapticFeedbackTypes.ImpactMedium);
    }
    prevIsActive.current = isActive;

    if (isActive) {
      // When becoming active (being dragged), use spring for more natural feel
      Animated.spring(scaleValue, {
        toValue: CARD_SORT_ACTIVE,
        useNativeDriver: true,
        friction: 8,
        tension: 100,
      }).start();
    } else if (globalDragActive) {
      // When another item is being dragged, use timing for smoother transition
      Animated.timing(scaleValue, {
        toValue: INACTIVE_SCALE_WHEN_ACTIVE,
        duration: 150,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start();
    } else {
      // When drag is done, spring back to normal
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
        friction: 10,
        tension: 120,
      }).start();
    }
  }, [isActive, globalDragActive, scaleValue, CARD_SORT_ACTIVE, INACTIVE_SCALE_WHEN_ACTIVE]);

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

  // Clear any existing timeout when component unmounts or when isSwipeActive changes
  useEffect(() => {
    return () => {
      if (swipeResetTimeoutRef.current) {
        clearTimeout(swipeResetTimeoutRef.current);
      }
      if (dragStartTimeoutRef.current) {
        clearTimeout(dragStartTimeoutRef.current);
      }
    };
  }, []);

  // Update startDrag to immediately start dragging without double press
  const startDrag = useCallback(() => {
    // Clear any existing timeout
    if (swipeResetTimeoutRef.current) {
      clearTimeout(swipeResetTimeoutRef.current);
      swipeResetTimeoutRef.current = null;
    }

    // Clear drag timeout if exists
    if (dragStartTimeoutRef.current) {
      clearTimeout(dragStartTimeoutRef.current);
      dragStartTimeoutRef.current = null;
    }

    if (isSwipeActive) {
      console.debug('Drag prevented because swipe is active');
      // Reset swipe state with a timeout to ensure it's not stuck
      swipeResetTimeoutRef.current = setTimeout(() => {
        console.debug('Resetting swipe active state');
        setIsSwipeActive(false);
      }, 500);
      return;
    }

    // Make sure swipe is reset if it was active
    if (resetFunctionRef.current) {
      resetFunctionRef.current();
    }

    // Use spring animation for more natural drag activation
    Animated.spring(scaleValue, {
      toValue: CARD_SORT_ACTIVE,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();

    // Ensure drag is called immediately on long press
    if (drag) {
      console.debug('Starting drag immediately');
      drag();
    }
  }, [CARD_SORT_ACTIVE, drag, scaleValue, isSwipeActive]);

  if (isLoading) {
    return <ActivityIndicator size="large" color={colors.brandingColor} />;
  }

  // Use simpler rendering for non-active items during drag to improve performance
  if (item.type === ItemType.WalletSection) {
    const animatedStyle = {
      transform: [{ scale: scaleValue }],
      marginVertical: globalDragActive && !isActive ? REDUCED_VERTICAL_MARGIN : DEFAULT_VERTICAL_MARGIN,
      // Add slight opacity to non-active items during drag
      opacity: globalDragActive && !isActive ? 0.8 : 1,
    };

    const backgroundColor = isActive || globalDragActive ? colors.brandingColor : colors.background;

    const swipeDisabled = isActive || globalDragActive;

    // Simplified rendering during drag operations for better performance
    if (optimization === 'high' && globalDragActive && !isActive) {
      return (
        <Animated.View style={animatedStyle}>
          <View style={[style, { backgroundColor }, swipeDisabled ? styles.transparentBackground : {}]}>
            <WalletCarouselItem
              item={item.data}
              handleLongPress={undefined}
              onPress={onPress}
              animationsEnabled={false} // Disable animations for non-active items during drag
              searchQuery={state.searchQuery}
              isPlaceHolder={isPlaceHolder}
              renderHighlightedText={renderHighlightedText}
              customStyle={styles.carouselItem}
              longPressAction="reorder"
              simplifiedRendering
            />
          </View>
        </Animated.View>
      );
    }

    // Regular rendering
    return (
      <Animated.View style={animatedStyle}>
        <ListItem.Swipeable
          leftWidth={swipeDisabled ? 0 : 80}
          rightWidth={swipeDisabled ? 0 : 90}
          containerStyle={[style, { backgroundColor }, swipeDisabled ? styles.transparentBackground : {}]}
          leftContent={swipeDisabled ? null : leftContent}
          rightContent={swipeDisabled ? null : rightContent}
          onPressOut={onPressOut}
          minSlideWidth={swipeDisabled ? 0 : 80}
          onPressIn={onPressIn}
          style={swipeDisabled ? styles.transparentBackground : {}}
          onSwipeBegin={direction => {
            if (!swipeDisabled) {
              console.debug(`Swipe began: ${direction}`);
              setIsSwipeActive(true);

              // Cancel any previous reset timeout
              if (swipeResetTimeoutRef.current) {
                clearTimeout(swipeResetTimeoutRef.current);
              }

              // Cancel any drag start timeout
              if (dragStartTimeoutRef.current) {
                clearTimeout(dragStartTimeoutRef.current);
                dragStartTimeoutRef.current = null;
              }
            }
          }}
          onSwipeEnd={() => {
            if (!swipeDisabled) {
              console.debug('Swipe ended');

              // Set a timeout to reset the swipe state after animation completes
              swipeResetTimeoutRef.current = setTimeout(() => {
                console.debug('Resetting swipe active state after swipe end');
                setIsSwipeActive(false);
              }, 300);
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
              animationsEnabled={!isActive && !globalDragActive} // Enable animations when not dragging
              searchQuery={state.searchQuery}
              isPlaceHolder={isPlaceHolder}
              renderHighlightedText={renderHighlightedText}
              customStyle={styles.carouselItem}
              longPressAction="reorder" // Add this prop to indicate reordering action
              simplifiedRendering={false}
              // Add shorter delay for better responsiveness
              longPressDelay={300} // Shorter delay for better UX
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
});

export { LeftSwipeContent, RightSwipeContent };
// Use React.memo with a custom comparison function for better performance
export default memo(ManageWalletsListItem, (prevProps, nextProps) => {
  // Only re-render when necessary properties change
  return (
    prevProps.isActive === nextProps.isActive &&
    prevProps.globalDragActive === nextProps.globalDragActive &&
    prevProps.isDraggingDisabled === nextProps.isDraggingDisabled &&
    prevProps.item.type === nextProps.item.type &&
    (prevProps.item.type === ItemType.WalletSection
      ? (prevProps.item.data as TWallet).getID() === (nextProps.item.data as TWallet).getID() &&
        (prevProps.item.data as TWallet).hideBalance === (nextProps.item.data as TWallet).hideBalance
      : true) &&
    prevProps.state.searchQuery === nextProps.state.searchQuery
  );
});

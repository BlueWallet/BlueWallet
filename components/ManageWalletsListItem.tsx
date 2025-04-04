import React, { useCallback, useState, useEffect, useRef } from 'react';
import { StyleSheet, ViewStyle, TouchableOpacity, ActivityIndicator, Platform, Animated } from 'react-native';
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
}) => {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const resetFunctionRef = useRef<(() => void) | null>(null);

  const CARD_SORT_ACTIVE = 1.06;
  const INACTIVE_SCALE_WHEN_ACTIVE = 0.9;
  const SCALE_DURATION = 200;
  const scaleValue = useRef(new Animated.Value(1)).current;
  const prevIsActive = useRef(isActive);

  const DEFAULT_VERTICAL_MARGIN = -10;
  const REDUCED_VERTICAL_MARGIN = -50;

  useEffect(() => {
    if (isActive !== prevIsActive.current) {
      triggerHapticFeedback(HapticFeedbackTypes.ImpactMedium);
    }
    prevIsActive.current = isActive;

    Animated.timing(scaleValue, {
      toValue: isActive ? CARD_SORT_ACTIVE : globalDragActive ? INACTIVE_SCALE_WHEN_ACTIVE : 1,
      duration: SCALE_DURATION,
      useNativeDriver: true,
    }).start();
  }, [isActive, globalDragActive, scaleValue]);

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
    if (drag) {
      drag();
    }
  }, [CARD_SORT_ACTIVE, drag, scaleValue, isSwipeActive]);

  if (isLoading) {
    return <ActivityIndicator size="large" color={colors.brandingColor} />;
  }

  if (item.type === ItemType.WalletSection) {
    const animatedStyle = {
      transform: [{ scale: scaleValue }],
      marginVertical: globalDragActive && !isActive ? REDUCED_VERTICAL_MARGIN : DEFAULT_VERTICAL_MARGIN,
    };

    const backgroundColor = isActive || globalDragActive ? colors.brandingColor : colors.background;

    const swipeDisabled = isActive || globalDragActive;

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
            }
          }}
          onSwipeEnd={() => {
            if (!swipeDisabled) {
              console.debug('Swipe ended');
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
export default ManageWalletsListItem;

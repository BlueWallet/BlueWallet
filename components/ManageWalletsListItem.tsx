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

  const leftContent = (reset: () => void) => (
    <LeftSwipeContent onPress={() => handleLeftPress(reset)} hideBalance={(item.data as TWallet).hideBalance} colors={colors} />
  );

  const handleRightPress = (reset: () => void) => {
    handleDeleteWallet(item.data as TWallet);
    reset();
  };

  const rightContent = (reset: () => void) => <RightSwipeContent onPress={() => handleRightPress(reset)} />;

  const startDrag = useCallback(() => {
    scaleValue.setValue(CARD_SORT_ACTIVE);
    triggerHapticFeedback(HapticFeedbackTypes.ImpactMedium);
    if (drag) {
      drag();
    }
  }, [CARD_SORT_ACTIVE, drag, scaleValue]);

  if (isLoading) {
    return <ActivityIndicator size="large" color={colors.brandingColor} />;
  }

  if (item.type === ItemType.WalletSection) {
    const animatedStyle = {
      transform: [{ scale: scaleValue }],
      marginVertical: globalDragActive && !isActive ? REDUCED_VERTICAL_MARGIN : DEFAULT_VERTICAL_MARGIN,
    };

    const backgroundColor = isActive || globalDragActive ? colors.brandingColor : colors.background;
    return (
      <Animated.View style={animatedStyle}>
        <ListItem.Swipeable
          leftWidth={80}
          rightWidth={90}
          containerStyle={[style, { backgroundColor }, isActive || globalDragActive ? styles.transparentBackground : {}]}
          leftContent={globalDragActive ? null : isActive ? null : leftContent}
          rightContent={globalDragActive ? null : isActive ? null : rightContent}
          onPressOut={onPressOut}
          minSlideWidth={80}
          onPressIn={onPressIn}
          style={isActive || globalDragActive ? styles.transparentBackground : {}}
        >
          <ListItem.Content>
            <WalletCarouselItem
              item={item.data}
              handleLongPress={isDraggingDisabled ? undefined : startDrag}
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

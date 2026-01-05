import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Animated,
  View,
  Text,
  TextStyle,
  Pressable,
} from 'react-native';
import { Icon, ListItem } from '@rneui/base';
import { ExtendedTransaction, LightningTransaction, Transaction, TWallet } from '../class/wallets/types';
import { WalletCarouselItem } from './WalletsCarousel';
import { TransactionListItem } from './TransactionListItem';
import { useTheme } from './themes';
import { BitcoinUnit } from '../models/bitcoinUnits';
import loc from '../loc';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import { AddressItem } from './addresses/AddressItem';
import { ItemType, AddressItemData } from '../models/itemTypes';
import WalletGradient from '../class/wallet-gradient';

interface WalletItem {
  type: ItemType.WalletSection;
  data: TWallet;
}

interface TransactionItem {
  type: ItemType.TransactionSection;
  data: ExtendedTransaction & LightningTransaction;
}

interface AddressItem {
  type: ItemType.AddressSection;
  data: AddressItemData;
}

type Item = WalletItem | TransactionItem | AddressItem;

interface ManageWalletsListItemProps {
  item: Item;
  isDraggingDisabled: boolean;
  drag?: () => void;
  isPlaceHolder?: boolean;
  onPressIn?: () => void;
  onPressOut?: () => void;
  state: { wallets: TWallet[]; searchQuery: string; isSearchFocused?: boolean };
  navigateToWallet: (wallet: TWallet) => void;
  navigateToAddress?: (address: string, walletID: string) => void;
  renderHighlightedText: (text: string, query: string) => React.ReactElement;
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
    <Icon name={hideBalance ? 'eye' : 'eye-slash'} color={colors.brandingColor} type="font-awesome-5" />
  </TouchableOpacity>
);

const ManageWalletsListItem: React.FC<ManageWalletsListItemProps> = ({
  item,
  isDraggingDisabled,
  drag,
  state,
  isPlaceHolder = false,
  navigateToWallet,
  navigateToAddress,
  renderHighlightedText,
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

  const CARD_SORT_ACTIVE = 1.03;
  const HANDLE_WIDTH = 28;
  const HANDLE_MARGIN_RIGHT = 4;
  const scaleValue = useRef(new Animated.Value(1)).current;
  const handleOpacity = useRef(new Animated.Value(1)).current;
  const prevIsActive = useRef(isActive);

  const DEFAULT_VERTICAL_MARGIN = 0;
  const searchLocked = state.searchQuery.length > 0 || state.isSearchFocused === true;
  const swipeDisabled = item.type === ItemType.WalletSection ? isActive || globalDragActive || searchLocked : true;
  const hideHandle = item.type === ItemType.WalletSection ? swipeDisabled || isDraggingDisabled : true;

  const animateItemIn = useCallback(() => {
    Animated.spring(scaleValue, {
      toValue: isActive ? CARD_SORT_ACTIVE : 1,
      friction: 7,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [isActive, scaleValue, CARD_SORT_ACTIVE]);

  useEffect(() => {
    if (isActive !== prevIsActive.current) {
      triggerHapticFeedback(HapticFeedbackTypes.ImpactMedium);
    }
    prevIsActive.current = isActive;

    animateItemIn();
  }, [isActive, globalDragActive, animateItemIn]);

  useEffect(() => {
    Animated.timing(handleOpacity, {
      toValue: hideHandle ? 0 : 1,
      duration: 140,
      useNativeDriver: true,
    }).start();
  }, [hideHandle, handleOpacity]);

  const handleAnimatedStyle = useMemo(
    () => [{ opacity: handleOpacity, width: hideHandle ? 0 : HANDLE_WIDTH, marginRight: hideHandle ? 0 : HANDLE_MARGIN_RIGHT }],
    [handleOpacity, hideHandle],
  );

  const onPress = useCallback(() => {
    if (item.type === ItemType.WalletSection) {
      setIsLoading(true);
      navigateToWallet(item.data);
      setIsLoading(false);
    } else if (item.type === ItemType.AddressSection && navigateToAddress) {
      navigateToAddress(item.data.address, item.data.walletID);
    }
  }, [item, navigateToWallet, navigateToAddress]);

  const handleLeftPress = (reset: () => void) => {
    handleToggleHideBalance(item.data as TWallet);
    reset();
  };

  const leftContent = (reset: () => void) => {
    resetFunctionRef.current = reset;
    return <LeftSwipeContent onPress={() => handleLeftPress(reset)} hideBalance={(item.data as TWallet).hideBalance} colors={colors} />;
  };

  const startDrag = useCallback(() => {
    if (isSwipeActive) {
      return;
    }

    if (resetFunctionRef.current) {
      resetFunctionRef.current();
    }

    triggerHapticFeedback(HapticFeedbackTypes.ImpactMedium);
    if (drag) {
      drag();
    }
  }, [drag, isSwipeActive]);

  if (isLoading) {
    return <ActivityIndicator size="large" color={colors.brandingColor} />;
  }

  if (item.type === ItemType.WalletSection) {
    const animatedStyle = {
      marginVertical: DEFAULT_VERTICAL_MARGIN,
      minHeight: 120,
      paddingHorizontal: 10,
      transform: [{ scale: scaleValue }],
    };

    const backgroundColor = isActive ? colors.brandingColor : colors.background;
    const dragIconName = Platform.OS === 'ios' ? 'reorder-three' : 'drag-handle';
    const dragIconType = Platform.OS === 'ios' ? 'ionicon' : 'material';

    return (
      <Animated.View style={[styles.walletRowContainer, animatedStyle]} collapsable={false}>
        <ListItem.Swipeable
          leftWidth={swipeDisabled ? 0 : 80}
          containerStyle={[styles.swipeableContainer, style, { backgroundColor }, swipeDisabled ? styles.transparentBackground : {}]}
          leftContent={swipeDisabled ? null : leftContent}
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
            <View style={styles.rowInner}>
              <Animated.View style={[styles.dragHandle, handleAnimatedStyle[0]]} pointerEvents={hideHandle ? 'none' : 'auto'}>
                <Pressable
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Reorder"
                  style={({ pressed }) => [styles.dragHandlePressable, pressed && { opacity: 0.6 }]}
                  android_ripple={{ color: colors.buttonDisabledTextColor, borderless: true }}
                  onPressIn={!hideHandle && !isSwipeActive ? startDrag : undefined}
                  disabled={hideHandle || isSwipeActive}
                  hitSlop={6}
                >
                  <Icon name={dragIconName} type={dragIconType} color={colors.alternativeTextColor} size={18} />
                </Pressable>
              </Animated.View>
              <WalletCarouselItem
                item={item.data}
                handleLongPress={isDraggingDisabled || isSwipeActive ? undefined : startDrag}
                onPress={onPress}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                animationsEnabled
                isDraggingActive={Boolean(isActive)}
                dragActiveScale={1.03}
                searchQuery={state.searchQuery}
                isPlaceHolder={isPlaceHolder}
                renderHighlightedText={renderHighlightedText}
                customStyle={styles.carouselItem}
              />
            </View>
          </ListItem.Content>
        </ListItem.Swipeable>
      </Animated.View>
    );
  } else if (item.type === ItemType.TransactionSection && item.data) {
    try {
      const w = state.wallets.find(wallet => wallet.getTransactions()?.some((tx: Transaction) => tx.hash === item.data.hash));

      const walletID = w ? w.getID() : '';

      const transactionStyle = {
        borderLeftWidth: 2,
        borderLeftColor: colors.brandingColor,
        backgroundColor: colors.background,
        background: colors.background,
      };

      return (
        <Animated.View
          style={{
            transform: [{ scale: scaleValue }],
            opacity: scaleValue.interpolate({
              inputRange: [0.9, 1],
              outputRange: [0.7, 1],
            }),
          }}
        >
          <TransactionListItem
            item={item.data}
            itemPriceUnit={w?.getPreferredBalanceUnit() || BitcoinUnit.BTC}
            walletID={walletID}
            searchQuery={state.searchQuery}
            renderHighlightedText={renderHighlightedText}
            style={transactionStyle}
          />
        </Animated.View>
      );
    } catch (e) {
      console.warn('Error rendering transaction item:', e);
      return null;
    }
  } else if (item.type === ItemType.AddressSection) {
    const wallet = state.wallets.find(w => w.getID() === item.data.walletID);
    if (!wallet) return null;

    const addressItemProps = {
      item: {
        key: item.data.address,
        index: item.data.index,
        address: item.data.address,
        isInternal: item.data.isInternal,
        balance: 0,
        transactions: 0,
      },
      balanceUnit: wallet.getPreferredBalanceUnit() || BitcoinUnit.BTC,
      walletID: item.data.walletID,
      allowSignVerifyMessage: wallet.allowSignVerifyMessage ? wallet.allowSignVerifyMessage() : false,
      onPress: navigateToAddress ? () => navigateToAddress(item.data.address, item.data.walletID) : undefined,
      searchQuery: state.searchQuery,
      renderHighlightedText,
    };

    return (
      <Animated.View
        style={{
          transform: [{ scale: scaleValue }],
          opacity: scaleValue.interpolate({
            inputRange: [0.9, 1],
            outputRange: [0.7, 1],
          }),
        }}
      >
        <AddressItem {...addressItemProps} />
      </Animated.View>
    );
  }

  return null;
};

// WalletGroupItem component to handle displaying wallet and related search results
interface WalletGroupProps {
  wallet: TWallet;
  transactions: TransactionItem[];
  addresses: AddressItem[];
  state: { wallets: TWallet[]; searchQuery: string };
  navigateToWallet: (wallet: TWallet) => void;
  navigateToAddress?: (address: string, walletID: string) => void;
  renderHighlightedText: (text: string, query: string) => React.ReactElement;
  isSearching: boolean;
}

const WalletGroupComponent: React.FC<WalletGroupProps> = ({
  wallet,
  transactions,
  addresses,
  state,
  navigateToWallet,
  navigateToAddress,
  renderHighlightedText,
  isSearching,
}) => {
  const { colors } = useTheme();
  const [expanded] = useState(true); // Always show child items when searching
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const walletGradientColors = WalletGradient.gradientsFor(wallet.type);
  const primaryColor = walletGradientColors[0];

  const containerStyle: ViewStyle = {
    marginHorizontal: 8,
    marginVertical: 10,
    borderRadius: 10,
    overflow: 'hidden' as const,
    backgroundColor: colors.elevated,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: primaryColor + '30',
  };

  const headerStyle: ViewStyle = {
    padding: 12,
    backgroundColor: primaryColor + '15', // Using translucent primary color as background
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderTopWidth: Platform.OS === 'ios' ? 4 : 2,
    borderTopColor: primaryColor,
    paddingVertical: 12,
  };

  const childItemsContainerStyle = {
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: colors.elevated,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: primaryColor + '20',
  };

  const childItemStyle = (): ViewStyle => ({
    borderLeftWidth: 3,
    borderLeftColor: primaryColor,
    backgroundColor: colors.inputBackgroundColor,
  });

  const sectionHeaderStyle: ViewStyle = {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: primaryColor + '10',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: primaryColor + '30',
  };

  const sectionHeaderTextStyle: TextStyle = {
    color: colors.foregroundColor,
    fontWeight: '600' as const,
    fontSize: 14,
  };

  const dividerStyle = [styles.itemDivider, { backgroundColor: primaryColor + '20' }];

  const onWalletPress = useCallback(() => {
    navigateToWallet(wallet);
  }, [navigateToWallet, wallet]);

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <View style={containerStyle}>
        {/* Wallet Header */}
        <View style={headerStyle}>
          <WalletCarouselItem
            item={wallet}
            handleLongPress={undefined}
            onPress={onWalletPress}
            animationsEnabled={false}
            searchQuery={state.searchQuery}
            isPlaceHolder={false}
            renderHighlightedText={renderHighlightedText}
            customStyle={styles.carouselItem}
          />
        </View>

        {/* Search results container */}
        {expanded && (
          <View style={childItemsContainerStyle}>
            {/* Transactions section */}
            {transactions.length > 0 && (
              <>
                <View style={sectionHeaderStyle}>
                  <Text style={sectionHeaderTextStyle}>
                    {loc.addresses.transactions} ({transactions.length})
                  </Text>
                </View>
                {transactions.map((transaction, index) => (
                  <View key={`tx-${index}`}>
                    <View style={childItemStyle()}>
                      <TransactionListItem
                        item={transaction.data}
                        itemPriceUnit={wallet.getPreferredBalanceUnit() || BitcoinUnit.BTC}
                        walletID={wallet.getID()}
                        searchQuery={state.searchQuery}
                        renderHighlightedText={renderHighlightedText}
                      />
                    </View>
                    {index < transactions.length - 1 && <View style={dividerStyle} />}
                  </View>
                ))}
              </>
            )}

            {/* Addresses section */}
            {addresses.length > 0 && (
              <>
                <View style={sectionHeaderStyle}>
                  <Text style={sectionHeaderTextStyle}>
                    {loc.addresses.addresses_title} ({addresses.length})
                  </Text>
                </View>
                {addresses.map((address, index) => {
                  const addressItemProps = {
                    item: {
                      key: address.data.address,
                      index: address.data.index,
                      address: address.data.address,
                      isInternal: address.data.isInternal,
                      balance: 0,
                      transactions: 0,
                    },
                    balanceUnit: wallet.getPreferredBalanceUnit() || BitcoinUnit.BTC,
                    walletID: address.data.walletID,
                    allowSignVerifyMessage: wallet.allowSignVerifyMessage ? wallet.allowSignVerifyMessage() : false,
                    // Use the onPress function returned by navigateToAddress instead of calling it directly
                    onPress: navigateToAddress ? () => navigateToAddress(address.data.address, address.data.walletID) : undefined,
                    searchQuery: state.searchQuery,
                    renderHighlightedText,
                  };

                  return (
                    <View key={`addr-${index}`}>
                      <View style={childItemStyle()}>
                        <AddressItem {...addressItemProps} />
                      </View>
                      {index < addresses.length - 1 && <View style={dividerStyle} />}
                    </View>
                  );
                })}
              </>
            )}
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  leftButtonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselItem: {
    flex: 1,
    flexBasis: 0,
    flexShrink: 1,
    maxWidth: '100%',
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  walletRowContainer: {
    width: '100%',
    paddingVertical: 0,
    marginVertical: -6, // slight overlap for stacked-card look
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexShrink: 1,
    width: '100%',
    minHeight: 120,
  },
  dragHandle: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  dragHandlePressable: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  transparentBackground: {
    backgroundColor: 'transparent',
  },
  swipeableContainer: {
    paddingVertical: 6,
    paddingHorizontal: 0,
    marginVertical: -6,
  },
  itemDivider: {
    height: 1,
    width: '100%',
  },
});

export { LeftSwipeContent, WalletGroupComponent };
export default ManageWalletsListItem;

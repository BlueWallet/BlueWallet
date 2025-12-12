import React, { useCallback, useState, useEffect, useRef } from 'react';
import { StyleSheet, ViewStyle, TouchableOpacity, ActivityIndicator, Platform, Animated, View, Text, TextStyle } from 'react-native';
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
  renderHighlightedText: (text: string, query: string) => JSX.Element;
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

  const CARD_SORT_ACTIVE = 1.06;
  const INACTIVE_SCALE_WHEN_ACTIVE = 0.9;
  const SCALE_DURATION = 200;
  const scaleValue = useRef(new Animated.Value(1)).current;
  const prevIsActive = useRef(isActive);

  const DEFAULT_VERTICAL_MARGIN = -10;
  const REDUCED_VERTICAL_MARGIN = -50;

  const animateItemIn = useCallback(() => {
    if (Platform.OS === 'ios') {
      Animated.spring(scaleValue, {
        toValue: isActive ? CARD_SORT_ACTIVE : globalDragActive ? INACTIVE_SCALE_WHEN_ACTIVE : 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(scaleValue, {
        toValue: isActive ? CARD_SORT_ACTIVE : globalDragActive ? INACTIVE_SCALE_WHEN_ACTIVE : 1,
        duration: SCALE_DURATION,
        useNativeDriver: true,
      }).start();
    }
  }, [isActive, globalDragActive, scaleValue, CARD_SORT_ACTIVE, INACTIVE_SCALE_WHEN_ACTIVE, SCALE_DURATION]);

  useEffect(() => {
    if (isActive !== prevIsActive.current) {
      triggerHapticFeedback(HapticFeedbackTypes.ImpactMedium);
    }
    prevIsActive.current = isActive;

    animateItemIn();
  }, [isActive, globalDragActive, animateItemIn]);

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

    // Disable swiping only when search bar is focused or during active dragging
    const swipeDisabled = isActive || globalDragActive || state.isSearchFocused === true;

    return (
      <Animated.View style={animatedStyle}>
        <ListItem.Swipeable
          leftWidth={swipeDisabled ? 0 : 80}
          containerStyle={[style, { backgroundColor }, swipeDisabled ? styles.transparentBackground : {}]}
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
  renderHighlightedText: (text: string, query: string) => JSX.Element;
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
    marginHorizontal: 10,
    marginVertical: 16,
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
    width: '100%',
  },
  transparentBackground: {
    backgroundColor: 'transparent',
  },
  itemDivider: {
    height: 1,
    width: '100%',
  },
});

export { LeftSwipeContent, WalletGroupComponent };
export default ManageWalletsListItem;

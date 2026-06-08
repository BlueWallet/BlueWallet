import React, { useCallback, useState, useEffect, useRef } from 'react';
import { StyleSheet, ViewStyle, ActivityIndicator, Platform, Animated, View, Text, Pressable } from 'react-native';
import { useLocale } from '@react-navigation/native';
import ReanimatedSwipeable, { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { ExtendedTransaction, LightningTransaction, Transaction, TWallet } from '../class/wallets/types';
import loc from '../loc';
import { TransactionListItem } from './TransactionListItem';
import { useTheme } from './themes';
import { BitcoinUnit } from '../models/bitcoinUnits';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import { AddressItem } from './addresses/AddressItem';
import { ItemType, AddressItemData } from '../models/itemTypes';
import { LightningCustodianWallet } from '../class/wallets/lightning-custodian-wallet';
import { LightningArkWallet } from '../class/wallets/lightning-ark-wallet';
import { MultisigHDWallet } from '../class/wallets/multisig-hd-wallet';
import { AbstractHDElectrumWallet } from '../class/wallets/abstract-hd-electrum-wallet';
import { WatchOnlyWallet } from '../class/wallets/watch-only-wallet';
import WalletListItem from './WalletListItem';
import Icon from './Icon';

const getHdElectrumWallet = (wallet: TWallet): AbstractHDElectrumWallet | undefined => {
  const w: unknown = wallet;
  if (w instanceof AbstractHDElectrumWallet) return w;
  if (w instanceof WatchOnlyWallet) {
    const inner: unknown = w._hdWalletInstance;
    if (inner instanceof AbstractHDElectrumWallet) return inner;
  }
  return undefined;
};

const getWalletIconImage = (walletType: string, direction: string) => {
  switch (walletType) {
    case LightningCustodianWallet.type:
    case LightningArkWallet.type:
      return direction === 'rtl' ? require('../img/lnd-shape-rtl.png') : require('../img/lnd-shape.png');
    case MultisigHDWallet.type:
      return direction === 'rtl' ? require('../img/vault-shape-rtl.png') : require('../img/vault-shape.png');
    default:
      return direction === 'rtl' ? require('../img/btc-shape-rtl.png') : require('../img/btc-shape.png');
  }
};

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
  handleToggleHideBalance: (wallet: TWallet) => void;
  handleCycleBalanceUnit: (wallet: TWallet) => void;
  preferredFiatLabel?: string;
  state: { wallets: TWallet[]; searchQuery: string; isSearchFocused?: boolean };
  navigateToWallet: (wallet: TWallet) => void;
  navigateToAddress: (address: string, walletID: string) => void;
  renderHighlightedText: (text: string, query: string) => React.ReactElement;
  isActive: boolean;
  globalDragActive: boolean;
  drag?: () => void;
  isPlaceHolder?: boolean;
  onPressIn?: () => void;
  onPressOut?: () => void;
  style?: ViewStyle;
}

const ManageWalletsListItem: React.FC<ManageWalletsListItemProps> = ({
  item,
  isDraggingDisabled,
  drag,
  state,
  isPlaceHolder = false,
  navigateToWallet,
  navigateToAddress,
  renderHighlightedText,
  onPressIn,
  onPressOut,
  handleToggleHideBalance,
  handleCycleBalanceUnit,
  preferredFiatLabel,
  isActive,
  globalDragActive,
  style,
}) => {
  const { colors, dark } = useTheme();
  const { direction } = useLocale();
  const [isLoading, setIsLoading] = useState(false);

  const prevIsActive = useRef(isActive);
  const swipeableRef = useRef<SwipeableMethods | null>(null);
  const swipeInProgressRef = useRef(false);

  useEffect(() => {
    if (isActive !== prevIsActive.current) {
      triggerHapticFeedback(HapticFeedbackTypes.ImpactMedium);
    }
    prevIsActive.current = isActive;
  }, [isActive]);

  const onPress = useCallback(() => {
    if (swipeInProgressRef.current) return;
    if (item.type === ItemType.WalletSection) {
      setIsLoading(true);
      navigateToWallet(item.data);
      setIsLoading(false);
    } else if (item.type === ItemType.AddressSection) {
      navigateToAddress(item.data.address, item.data.walletID);
    }
  }, [item, navigateToWallet, navigateToAddress]);

  const startDrag = useCallback(() => {
    if (swipeInProgressRef.current) {
      swipeableRef.current?.close?.();
      return;
    }
    triggerHapticFeedback(HapticFeedbackTypes.ImpactMedium);
    if (drag) {
      drag();
    }
  }, [drag]);

  if (isLoading) {
    return <ActivityIndicator size="large" color={colors.brandingColor} />;
  }

  if (item.type === ItemType.WalletSection) {
    const wallet = item.data;
    const titleColor = dark ? colors.foregroundColor : colors.darkGray;
    const iconImage = getWalletIconImage(wallet.type, direction);

    const canSwipe = !isActive && !globalDragActive;
    const isHidden = !!wallet.hideBalance;
    const currentUnit = wallet.getPreferredBalanceUnit();
    const fiatLabel = preferredFiatLabel ?? 'USD';
    let nextUnitLabel: string;
    if (currentUnit === BitcoinUnit.BTC) {
      nextUnitLabel = loc.total_balance_view.display_in_sats;
    } else if (currentUnit === BitcoinUnit.SATS) {
      nextUnitLabel = loc.formatString(loc.total_balance_view.display_in_fiat, { currency: fiatLabel });
    } else {
      nextUnitLabel = loc.total_balance_view.display_in_bitcoin;
    }

    const onToggle = () => {
      handleToggleHideBalance(wallet);
      swipeableRef.current?.close?.();
    };

    const onCycleUnit = () => {
      handleCycleBalanceUnit(wallet);
      swipeableRef.current?.close?.();
    };

    const renderLeftActions = () => (
      <View style={styles.leftActionsContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.leftAction,
            { backgroundColor: colors.buttonBackgroundColor },
            pressed && styles.leftActionPressed,
          ]}
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityLabel={isHidden ? loc.transactions.details_balance_show : loc.transactions.details_balance_hide}
          testID={isHidden ? 'SwipeShowBalance' : 'SwipeHideBalance'}
        >
          <Icon
            name={isHidden ? 'eye' : 'eye-slash'}
            type="font-awesome"
            size={20}
            color={colors.buttonTextColor}
            containerStyle={styles.leftActionIcon}
          />
          <Text style={[styles.leftActionText, { color: colors.buttonTextColor }]}>
            {isHidden ? loc.transactions.details_balance_show : loc.transactions.details_balance_hide}
          </Text>
        </Pressable>
      </View>
    );

    const renderRightActions = () => (
      <View style={styles.rightActionsContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.rightAction,
            { backgroundColor: colors.buttonBackgroundColor },
            pressed && styles.rightActionPressed,
          ]}
          onPress={onCycleUnit}
          accessibilityRole="button"
          accessibilityLabel={nextUnitLabel}
          testID="SwipeCycleBalanceUnit"
        >
          <Icon
            name="arrow-right-arrow-left"
            type="font-awesome-6"
            size={18}
            color={colors.buttonTextColor}
            containerStyle={styles.rightActionIcon}
          />
          <Text style={[styles.rightActionText, { color: colors.buttonTextColor }]}>{nextUnitLabel}</Text>
        </Pressable>
      </View>
    );

    const content = (
      <WalletListItem
        wallet={wallet}
        iconImage={iconImage}
        onPress={onPress}
        onLongPress={isDraggingDisabled ? undefined : startDrag}
        delayLongPress={500}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        searchQuery={state.searchQuery || ''}
        isActive={isActive}
        borderBottomColor={colors.lightBorder}
        backgroundColor={colors.background}
        titleColor={titleColor}
      />
    );

    if (!canSwipe) return content;

    return (
      <ReanimatedSwipeable
        ref={r => {
          swipeableRef.current = r;
        }}
        onSwipeableWillOpen={() => {
          swipeInProgressRef.current = true;
        }}
        onSwipeableWillClose={() => {
          swipeInProgressRef.current = false;
        }}
        onSwipeableClose={() => {
          swipeInProgressRef.current = false;
        }}
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        friction={2}
        leftThreshold={40}
        rightThreshold={40}
        overshootLeft={false}
        overshootRight={false}
      >
        {content}
      </ReanimatedSwipeable>
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
        <TransactionListItem
          item={item.data}
          itemPriceUnit={w?.getPreferredBalanceUnit() || BitcoinUnit.BTC}
          walletID={walletID}
          searchQuery={state.searchQuery}
          renderHighlightedText={renderHighlightedText}
          style={transactionStyle}
        />
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
      allowSignVerifyMessage: wallet.allowSignVerifyMessage(),
      onPress: () => navigateToAddress(item.data.address, item.data.walletID),
      searchQuery: state.searchQuery,
      renderHighlightedText,
    };

    return <AddressItem {...addressItemProps} />;
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
  navigateToAddress: (address: string, walletID: string) => void;
  renderHighlightedText: (text: string, query: string) => React.ReactElement;
}

const WalletGroupComponent: React.FC<WalletGroupProps> = ({
  wallet,
  transactions,
  addresses,
  state,
  navigateToWallet,
  navigateToAddress,
  renderHighlightedText,
}) => {
  const { colors, dark } = useTheme();
  const { direction } = useLocale();
  const [expanded] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const hdElectrum = getHdElectrumWallet(wallet);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const cardRadius = 16;
  const cardShadowStyle: ViewStyle = {
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: cardRadius,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  };

  const cardBorderColor = dark ? colors.lightBorder : colors.borderTopColor;

  const cardInnerStyle: ViewStyle = {
    borderRadius: cardRadius,
    overflow: 'hidden' as const,
    backgroundColor: colors.elevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: cardBorderColor,
  };

  const childItemsContainerStyle = {
    backgroundColor: colors.elevated,
  };

  const childItemStyle = (): ViewStyle => ({
    backgroundColor: colors.elevated,
  });

  const walletHeaderBackgroundColor = dark ? colors.elevated : '#F9F9F9';

  const dividerStyle = [styles.itemDivider, { backgroundColor: cardBorderColor }];

  const onWalletPress = useCallback(() => {
    navigateToWallet(wallet);
  }, [navigateToWallet, wallet]);

  const titleColor = dark ? colors.foregroundColor : colors.darkGray;
  const iconImage = getWalletIconImage(wallet.type, direction);

  const renderAddress = (address: AddressItem, index: number) => {
    const computedBalance = hdElectrum?.getBalanceForExternalIndex(address.data.index) ?? 0;
    const computedTransactions = hdElectrum?.getTransactionCountForExternalIndex(address.data.index) ?? 0;

    return (
      <View key={`addr-${index}`}>
        <View style={childItemStyle()}>
          <AddressItem
            item={{
              key: address.data.address,
              index: address.data.index,
              address: address.data.address,
              isInternal: address.data.isInternal,
              balance: computedBalance,
              transactions: computedTransactions,
            }}
            balanceUnit={wallet.getPreferredBalanceUnit() || BitcoinUnit.BTC}
            walletID={address.data.walletID}
            allowSignVerifyMessage={wallet.allowSignVerifyMessage()}
            onPress={() => navigateToAddress(address.data.address, address.data.walletID)}
            searchQuery={state.searchQuery}
            renderHighlightedText={renderHighlightedText}
          />
        </View>
        {index < addresses.length - 1 && <View style={dividerStyle} />}
      </View>
    );
  };

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <View style={cardShadowStyle}>
        <View style={cardInnerStyle}>
          <WalletListItem
            wallet={wallet}
            iconImage={iconImage}
            onPress={onWalletPress}
            searchQuery={state.searchQuery || ''}
            borderBottomColor={cardBorderColor}
            backgroundColor={walletHeaderBackgroundColor}
            titleColor={titleColor}
          />

          {expanded && (
            <View style={childItemsContainerStyle}>
              {transactions.length > 0 && (
                <>
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

              {addresses.length > 0 && <>{addresses.map(renderAddress)}</>}
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  itemDivider: {
    height: 1,
    width: '100%',
  },
  leftActionsContainer: {
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  leftAction: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
    height: '100%',
  },
  leftActionPressed: {
    opacity: 0.85,
  },
  leftActionIcon: {
    marginRight: 8,
  },
  leftActionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  rightActionsContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  rightAction: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
    height: '100%',
  },
  rightActionPressed: {
    opacity: 0.85,
  },
  rightActionIcon: {
    marginRight: 8,
  },
  rightActionText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export { WalletGroupComponent };
export default ManageWalletsListItem;

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { AccessibilityInfo, StyleSheet, ViewStyle, Platform, Animated, View, Text, Pressable } from 'react-native';
import { useLocale } from '@react-navigation/native';
import { Swipeable } from 'react-native-gesture-handler';
import ContextMenu, { ContextMenuOnPressNativeEvent } from 'react-native-context-menu-view';
import type { NativeSyntheticEvent } from 'react-native';
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
import { isDesktop } from '../blue_modules/environment';

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
  isSwipeEnabled: boolean;
  handleToggleHideBalance: (wallet: TWallet) => void;
  moveWallet: (wallet: TWallet, offset: -1 | 1) => void;
  state: { wallets: TWallet[]; searchQuery: string; isSearchFocused?: boolean };
  navigateToWallet: (wallet: TWallet) => void;
  navigateToAddress: (address: string, walletID: string) => void;
  renderHighlightedText: (text: string, query: string) => React.ReactElement;
  isActive: boolean;
  openSwipeableRef: React.MutableRefObject<Swipeable | null>;
  drag?: () => void;
  isPlaceHolder?: boolean;
  onPressIn?: () => void;
  onPressOut?: () => void;
  style?: ViewStyle;
  walletPosition?: number;
  walletCount?: number;
  onWalletFocus: (wallet: TWallet) => void;
}

const ManageWalletsListItem: React.FC<ManageWalletsListItemProps> = ({
  item,
  isDraggingDisabled,
  isSwipeEnabled,
  drag,
  state,
  isPlaceHolder = false,
  navigateToWallet,
  navigateToAddress,
  renderHighlightedText,
  onPressIn,
  onPressOut,
  handleToggleHideBalance,
  moveWallet,
  isActive,
  openSwipeableRef,
  style,
  walletPosition,
  walletCount,
  onWalletFocus,
}) => {
  const { colors, dark } = useTheme();
  const { direction } = useLocale();
  const prevIsActive = useRef(isActive);
  const swipeableRef = useRef<Swipeable | null>(null);
  const swipeInProgressRef = useRef(false);

  useEffect(() => {
    if (isActive && isActive !== prevIsActive.current) {
      triggerHapticFeedback(HapticFeedbackTypes.ImpactMedium);
    }
    prevIsActive.current = isActive;
  }, [isActive]);

  const onPress = useCallback(() => {
    if (swipeInProgressRef.current) return;
    if (item.type === ItemType.WalletSection) {
      triggerHapticFeedback(HapticFeedbackTypes.Selection);
      navigateToWallet(item.data);
    } else if (item.type === ItemType.AddressSection) {
      navigateToAddress(item.data.address, item.data.walletID);
    }
  }, [item, navigateToWallet, navigateToAddress]);

  const startDrag = useCallback(() => {
    if (swipeInProgressRef.current) {
      swipeableRef.current?.close?.();
      return;
    }
    if (drag) {
      drag();
    }
  }, [drag]);

  if (item.type === ItemType.WalletSection) {
    const wallet = item.data;
    const titleColor = colors.foregroundColor;
    const balanceColor = dark ? colors.alternativeTextColor : colors.secondButtonTextColor;
    const iconImage = getWalletIconImage(wallet.type, direction);

    const canSwipe = isSwipeEnabled && !isActive;
    const isHidden = !!wallet.hideBalance;

    const onToggle = () => {
      triggerHapticFeedback(HapticFeedbackTypes.Selection);
      handleToggleHideBalance(wallet);
      swipeableRef.current?.close?.();
      AccessibilityInfo.announceForAccessibility(
        `${wallet.getLabel()}, ${isHidden ? loc.wallets.balance_shown : loc.wallets.balance_hidden}`,
      );
    };

    const balanceActionLabel = isHidden ? loc.wallets.swipe_balance_show : loc.wallets.swipe_balance_hide;
    const canMoveUp = !isDraggingDisabled && walletPosition !== undefined && walletPosition > 0;
    const canMoveDown =
      !isDraggingDisabled && walletPosition !== undefined && walletCount !== undefined && walletPosition < walletCount - 1;
    const walletPositionLabel =
      walletPosition !== undefined && walletCount !== undefined
        ? String(
            loc.formatString(loc.wallets.wallet_position, {
              position: walletPosition + 1,
              total: walletCount,
            }),
          )
        : undefined;
    const accessibilityHint = [
      loc.wallets.open_wallet_transactions,
      !isDraggingDisabled ? loc.wallets.drag_to_reorder : undefined,
      isSwipeEnabled ? balanceActionLabel : undefined,
    ]
      .filter(Boolean)
      .join('. ');
    const accessibilityActions = [
      ...(isSwipeEnabled ? [{ name: 'toggleBalance', label: balanceActionLabel }] : []),
      ...(canMoveUp ? [{ name: 'moveUp', label: loc.wallets.move_up }] : []),
      ...(canMoveDown ? [{ name: 'moveDown', label: loc.wallets.move_down }] : []),
    ];
    const renderRightActions = () => (
      <View style={styles.rightActionsContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.swipeAction,
            { backgroundColor: colors.buttonBackgroundColor },
            pressed && styles.swipeActionPressed,
          ]}
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityLabel={`${wallet.getLabel()}, ${balanceActionLabel}`}
          accessibilityHint={balanceActionLabel}
          testID={isHidden ? 'SwipeShowBalance' : 'SwipeHideBalance'}
        >
          <Text style={[styles.swipeActionText, { color: colors.buttonTextColor }]}>
            {isHidden ? loc.wallets.swipe_balance_show : loc.wallets.swipe_balance_hide}
          </Text>
        </Pressable>
      </View>
    );

    const contextMenuActions = [
      { title: loc.wallets.open_wallet_transactions, systemIcon: 'wallet.pass' },
      { title: balanceActionLabel, systemIcon: isHidden ? 'eye' : 'eye.slash' },
      { title: loc.wallets.move_up, systemIcon: 'arrow.up', disabled: !canMoveUp },
      { title: loc.wallets.move_down, systemIcon: 'arrow.down', disabled: !canMoveDown },
    ];

    const onContextMenuPress = (event: NativeSyntheticEvent<ContextMenuOnPressNativeEvent>) => {
      switch (event.nativeEvent.index) {
        case 0:
          onPress();
          break;
        case 1:
          onToggle();
          break;
        case 2:
          moveWallet(wallet, -1);
          break;
        case 3:
          moveWallet(wallet, 1);
          break;
      }
    };

    const content = (
      <WalletListItem
        wallet={wallet}
        iconImage={iconImage}
        onPress={onPress}
        onLongPressDrag={isDraggingDisabled ? undefined : startDrag}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onFocus={() => onWalletFocus(wallet)}
        searchQuery={state.searchQuery || ''}
        isActive={isActive}
        borderBottomColor={colors.lightBorder}
        backgroundColor={colors.background}
        titleColor={titleColor}
        balanceColor={balanceColor}
        accessibilityLabel={[wallet.getLabel(), walletPositionLabel].filter(Boolean).join(', ')}
        accessibilityValue={isHidden ? loc.wallets.balance_hidden : undefined}
        accessibilityHint={accessibilityHint || undefined}
        accessibilityActions={accessibilityActions}
        onAccessibilityAction={event => {
          switch (event.nativeEvent.actionName) {
            case 'toggleBalance':
              onToggle();
              break;
            case 'moveUp':
              moveWallet(wallet, -1);
              break;
            case 'moveDown':
              moveWallet(wallet, 1);
              break;
          }
        }}
      />
    );

    const menuContent = isDesktop ? (
      <ContextMenu
        title={wallet.getLabel()}
        actions={contextMenuActions}
        onPress={onContextMenuPress}
        previewBackgroundColor="transparent"
        style={styles.contextMenu}
      >
        {content}
      </ContextMenu>
    ) : (
      content
    );

    return (
      <Swipeable
        enabled={canSwipe}
        ref={r => {
          swipeableRef.current = r;
        }}
        onSwipeableWillOpen={() => {
          if (openSwipeableRef.current !== swipeableRef.current) {
            openSwipeableRef.current?.close();
          }
          openSwipeableRef.current = swipeableRef.current;
          swipeInProgressRef.current = true;
        }}
        onSwipeableWillClose={() => {
          swipeInProgressRef.current = false;
        }}
        onSwipeableClose={() => {
          if (openSwipeableRef.current === swipeableRef.current) {
            openSwipeableRef.current = null;
          }
          swipeInProgressRef.current = false;
        }}
        renderRightActions={renderRightActions}
        friction={2}
        rightThreshold={40}
        overshootRight={false}
      >
        {menuContent}
      </Swipeable>
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
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const hdElectrum = getHdElectrumWallet(wallet);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (mounted) setReduceMotionEnabled(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotionEnabled);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: reduceMotionEnabled ? 0 : 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, reduceMotionEnabled]);

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
    triggerHapticFeedback(HapticFeedbackTypes.Selection);
    navigateToWallet(wallet);
  }, [navigateToWallet, wallet]);

  const titleColor = colors.foregroundColor;
  const balanceColor = dark ? colors.alternativeTextColor : colors.secondButtonTextColor;
  const iconImage = getWalletIconImage(wallet.type, direction);

  const renderAddress = (address: AddressItem, index: number) => {
    let computedBalance = 0;
    let computedTransactions = 0;
    try {
      computedBalance = hdElectrum?.getBalanceForExternalIndex(address.data.index) ?? 0;
      computedTransactions = hdElectrum?.getTransactionCountForExternalIndex(address.data.index) ?? 0;
    } catch {
      // Keep search results usable if a wallet cannot derive data for this address index.
    }

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
            balanceColor={balanceColor}
            accessibilityHint={loc.wallets.open_wallet_transactions}
            accessibilityValue={wallet.hideBalance ? loc.wallets.balance_hidden : undefined}
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
  contextMenu: {
    flex: 1,
  },
  rightActionsContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
    height: '100%',
    minWidth: 64,
    cursor: 'pointer',
  },
  swipeActionPressed: {
    opacity: 0.85,
  },
  swipeActionText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export { WalletGroupComponent };
export default ManageWalletsListItem;

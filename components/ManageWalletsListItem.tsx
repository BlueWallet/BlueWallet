import React, { useCallback, useState, useEffect, useRef } from 'react';
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
  ImageBackground,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useLocale } from '@react-navigation/native';
import { ExtendedTransaction, LightningTransaction, Transaction, TWallet } from '../class/wallets/types';
import { TransactionListItem } from './TransactionListItem';
import { useTheme } from './themes';
import { BitcoinUnit } from '../models/bitcoinUnits';
import loc, { formatBalance } from '../loc';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import { AddressItem } from './addresses/AddressItem';
import { ItemType, AddressItemData } from '../models/itemTypes';
import WalletGradient from '../class/wallet-gradient';
import { LightningCustodianWallet } from '../class/wallets/lightning-custodian-wallet';
import { LightningArkWallet } from '../class/wallets/lightning-ark-wallet';
import { MultisigHDWallet } from '../class/wallets/multisig-hd-wallet';
import { BlurredBalanceView } from './BlurredBalanceView';

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
  isActive?: boolean;
  style?: ViewStyle;
  globalDragActive?: boolean;
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
  isActive,
  globalDragActive,
  style,
}) => {
  const { colors, dark } = useTheme();
  const { direction } = useLocale();
  const [isLoading, setIsLoading] = useState(false);

  const prevIsActive = useRef(isActive);

  useEffect(() => {
    if (isActive !== prevIsActive.current) {
      triggerHapticFeedback(HapticFeedbackTypes.ImpactMedium);
    }
    prevIsActive.current = isActive;
  }, [isActive, globalDragActive]);

  const onPress = useCallback(() => {
    if (item.type === ItemType.WalletSection) {
      setIsLoading(true);
      navigateToWallet(item.data);
      setIsLoading(false);
    } else if (item.type === ItemType.AddressSection && navigateToAddress) {
      navigateToAddress(item.data.address, item.data.walletID);
    }
  }, [item, navigateToWallet, navigateToAddress]);

  const startDrag = useCallback(() => {
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
    const walletLabel = wallet.getLabel ? wallet.getLabel() : '';
    const balance = !wallet.hideBalance && formatBalance(Number(wallet.getBalance()), wallet.getPreferredBalanceUnit(), true);
    const gradientColors = WalletGradient.gradientsFor(wallet.type);
    const titleColor = dark ? colors.foregroundColor : colors.alternativeTextColor;

    let iconImage;
    switch (wallet.type) {
      case LightningCustodianWallet.type:
      case LightningArkWallet.type:
        iconImage = direction === 'rtl' ? require('../img/lnd-shape-rtl.png') : require('../img/lnd-shape.png');
        break;
      case MultisigHDWallet.type:
        iconImage = direction === 'rtl' ? require('../img/vault-shape-rtl.png') : require('../img/vault-shape.png');
        break;
      default:
        iconImage = direction === 'rtl' ? require('../img/btc-shape-rtl.png') : require('../img/btc-shape.png');
    }

    return (
      <TouchableOpacity
        style={[
          styles.listItem,
          {
            backgroundColor: isActive ? colors.lightButton : colors.background,
            borderBottomColor: colors.lightBorder,
          },
        ]}
        onPress={onPress}
        onLongPress={isDraggingDisabled ? undefined : startDrag}
        delayLongPress={120}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.7}
        accessibilityRole="button"
        testID={walletLabel}
      >
        <LinearGradient colors={gradientColors} style={styles.iconBox}>
          <ImageBackground source={iconImage} style={styles.iconImage} />
        </LinearGradient>
        <View style={styles.listItemContent}>
          <Text numberOfLines={1} style={[styles.listItemLabel, { color: titleColor, writingDirection: direction }]}>
            {renderHighlightedText ? renderHighlightedText(walletLabel, state.searchQuery || '') : walletLabel}
          </Text>
          {wallet.hideBalance ? (
            <BlurredBalanceView />
          ) : (
            <Text numberOfLines={1} style={[styles.listItemBalance, { color: colors.alternativeTextColor, writingDirection: direction }]}>
              {balance}
            </Text>
          )}
        </View>
      </TouchableOpacity>
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
      allowSignVerifyMessage: wallet.allowSignVerifyMessage ? wallet.allowSignVerifyMessage() : false,
      onPress: navigateToAddress ? () => navigateToAddress(item.data.address, item.data.walletID) : undefined,
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
  navigateToAddress?: (address: string, walletID: string) => void;
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

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const walletGradientColors = WalletGradient.gradientsFor(wallet.type);

  const cardRadius = 16;
  const cardShadowStyle: ViewStyle = {
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: cardRadius,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
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

  const walletHeaderBackgroundColor = colors.background === '#FFFFFF' ? '#F9F9F9' : colors.elevated;

  const sectionHeaderStyle: ViewStyle = {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: colors.elevated,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: cardBorderColor,
  };

  const sectionHeaderTextStyle: TextStyle = {
    color: colors.alternativeTextColor,
    fontWeight: '500' as const,
    fontSize: 13,
  };

  const dividerStyle = [styles.itemDivider, { backgroundColor: cardBorderColor }];

  const onWalletPress = useCallback(() => {
    navigateToWallet(wallet);
  }, [navigateToWallet, wallet]);

  const walletLabel = wallet.getLabel ? wallet.getLabel() : '';
  const balance = !wallet.hideBalance && formatBalance(Number(wallet.getBalance()), wallet.getPreferredBalanceUnit(), true);
  const titleColor = dark ? colors.foregroundColor : colors.alternativeTextColor;

  let iconImage;
  switch (wallet.type) {
    case LightningCustodianWallet.type:
    case LightningArkWallet.type:
      iconImage = direction === 'rtl' ? require('../img/lnd-shape-rtl.png') : require('../img/lnd-shape.png');
      break;
    case MultisigHDWallet.type:
      iconImage = direction === 'rtl' ? require('../img/vault-shape-rtl.png') : require('../img/vault-shape.png');
      break;
    default:
      iconImage = direction === 'rtl' ? require('../img/btc-shape-rtl.png') : require('../img/btc-shape.png');
  }

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <View style={cardShadowStyle}>
        <View style={cardInnerStyle}>
          <TouchableOpacity
            style={[
              styles.listItem,
              {
                backgroundColor: walletHeaderBackgroundColor,
                borderBottomColor: cardBorderColor,
              },
            ]}
            onPress={onWalletPress}
            delayLongPress={120}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <LinearGradient colors={walletGradientColors} style={styles.iconBox}>
              <ImageBackground source={iconImage} style={styles.iconImage} />
            </LinearGradient>
            <View style={styles.listItemContent}>
              <Text numberOfLines={1} style={[styles.listItemLabel, { color: titleColor, writingDirection: direction }]}>
                {renderHighlightedText ? renderHighlightedText(walletLabel, state.searchQuery || '') : walletLabel}
              </Text>
              {wallet.hideBalance ? (
                <BlurredBalanceView />
              ) : (
                <Text
                  numberOfLines={1}
                  style={[styles.listItemBalance, { color: colors.alternativeTextColor, writingDirection: direction }]}
                >
                  {balance}
                </Text>
              )}
            </View>
          </TouchableOpacity>

          {expanded && (
            <View style={childItemsContainerStyle}>
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

              {addresses.length > 0 && (
                <>
                  <View style={sectionHeaderStyle}>
                    <Text style={sectionHeaderTextStyle}>
                      {loc.addresses.addresses_title} ({addresses.length})
                    </Text>
                  </View>
                  {addresses.map((address, index) => {
                    const walletInstance: any = (wallet as any)?._hdWalletInstance ?? wallet;
                    let computedBalance = 0;
                    let computedTransactions = 0;
                    try {
                      const bal = walletInstance?._balances_by_external_index?.[address.data.index];
                      computedBalance = (bal?.c || 0) + (bal?.u || 0);
                      computedTransactions = walletInstance?._txs_by_external_index?.[address.data.index]?.length ?? 0;
                    } catch (_) {}

                    const addressItemProps = {
                      item: {
                        key: address.data.address,
                        index: address.data.index,
                        address: address.data.address,
                        isInternal: address.data.isInternal,
                        balance: computedBalance,
                        transactions: computedTransactions,
                      },
                      balanceUnit: wallet.getPreferredBalanceUnit() || BitcoinUnit.BTC,
                      walletID: address.data.walletID,
                      allowSignVerifyMessage: wallet.allowSignVerifyMessage ? wallet.allowSignVerifyMessage() : false,
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
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  iconImage: {
    width: 46,
    height: 46,
    resizeMode: 'center',
  },
  listItemContent: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  listItemLabel: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  listItemBalance: {
    fontSize: 14,
  },
  itemDivider: {
    height: 1,
    width: '100%',
  },
});

export { WalletGroupComponent };
export default ManageWalletsListItem;

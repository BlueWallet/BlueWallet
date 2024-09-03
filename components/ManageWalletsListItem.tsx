import React, { useCallback } from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { Icon, ListItem } from '@rneui/base';
import { ExtendedTransaction, LightningTransaction, TWallet } from '../class/wallets/types';
import { WalletCarouselItem } from './WalletsCarousel';
import { TransactionListItem } from './TransactionListItem';
import { useTheme } from './themes';
import { BitcoinUnit } from '../models/bitcoinUnits';

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
  state: { wallets: TWallet[]; searchQuery: string };
  navigateToWallet: (wallet: TWallet) => void;
  renderHighlightedText: (text: string, query: string) => JSX.Element;
  handleDeleteWallet: (wallet: TWallet) => void;
  handleToggleHideBalance: (wallet: TWallet) => void;
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
  >
    <Icon name={hideBalance ? 'eye-slash' : 'eye'} color={colors.brandingColor} type="font-awesome-5" />
  </TouchableOpacity>
);

const RightSwipeContent: React.FC<Partial<SwipeContentProps>> = ({ onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.rightButtonContainer as ViewStyle}>
    <Icon name="delete-outline" color="#FFFFFF" />
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
}) => {
  const { colors } = useTheme();

  const onPress = useCallback(() => {
    if (item.type === ItemType.WalletSection) {
      navigateToWallet(item.data);
    }
  }, [item, navigateToWallet]);

  const leftContent = useCallback(
    (reset: () => void) => (
      <LeftSwipeContent
        onPress={() => {
          handleToggleHideBalance(item.data as TWallet);
          reset();
        }}
        hideBalance={(item.data as TWallet).hideBalance}
        colors={colors}
      />
    ),
    [colors, handleToggleHideBalance, item.data],
  );

  const rightContent = useCallback(
    (reset: () => void) => (
      <RightSwipeContent
        onPress={() => {
          handleDeleteWallet(item.data as TWallet);
          reset();
        }}
      />
    ),
    [handleDeleteWallet, item.data],
  );

  if (item.type === ItemType.WalletSection) {
    return (
      <ListItem.Swipeable
        leftWidth={80}
        rightWidth={90}
        containerStyle={{ backgroundColor: colors.background }}
        leftContent={leftContent}
        rightContent={rightContent}
      >
        <ListItem.Content
          style={{
            backgroundColor: colors.background,
          }}
        >
          <View style={styles.walletCarouselItemContainer}>
            <WalletCarouselItem
              item={item.data}
              handleLongPress={isDraggingDisabled ? undefined : drag}
              onPress={onPress}
              animationsEnabled={false}
              searchQuery={state.searchQuery}
              isPlaceHolder={isPlaceHolder}
              renderHighlightedText={renderHighlightedText}
            />
          </View>
        </ListItem.Content>
      </ListItem.Swipeable>
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

  console.error('Unrecognized item type:', item);
  return null;
};

const styles = StyleSheet.create({
  walletCarouselItemContainer: {
    width: '100%',
  },
  leftButtonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightButtonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'red',
  },
});

export { ManageWalletsListItem, LeftSwipeContent, RightSwipeContent };

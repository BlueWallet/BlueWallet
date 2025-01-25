import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Icon, ListItem } from '@rneui/base';
import { ExtendedTransaction, LightningTransaction, TWallet } from '../class/wallets/types';
import { WalletCarouselItem } from './WalletsCarousel';
import { TransactionListItem } from './TransactionListItem';
import { useTheme } from './themes';
import { BitcoinUnit } from '../models/bitcoinUnits';
import { TouchableOpacityWrapper } from './ListItem';
import loc from '../loc';

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
  style,
}) => {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(false);

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

  if (isLoading) {
    return <ActivityIndicator size="large" color={colors.brandingColor} />;
  }

  if (item.type === ItemType.WalletSection) {
    return (
      <ListItem.Swipeable
        leftWidth={80}
        rightWidth={90}
        containerStyle={[{ backgroundColor: colors.background }, style]}
        leftContent={leftContent}
        rightContent={rightContent}
        Component={TouchableOpacityWrapper}
        onPressOut={onPressOut}
        onPressIn={onPressIn}
        style={isActive ? styles.activeItem : undefined}
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
              onPressIn={onPressIn}
              onPressOut={onPressOut}
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
  activeItem: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
});

export { LeftSwipeContent, RightSwipeContent };
export default ManageWalletsListItem;

import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import loc, { formatBalance } from '../../loc';
import { XnaUnit } from '../../models/xnaUnits';
import { useTheme } from '../themes';
import { AddressTypeBadge } from './AddressTypeBadge';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import ToolTipMenu from '../TooltipMenu';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { useAddressMenu } from './useAddressMenu';
import HighlightedText from '../HighlightedText';
import { useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

interface AddressItemProps {
  item: any;
  balanceUnit: XnaUnit;
  walletID: string;
  allowSignVerifyMessage: boolean;
  onPress?: () => void; // example: ManageWallets uses this
  searchQuery?: string;
  renderHighlightedText?: (text: string, query: string) => React.ReactElement;
}

type NavigationProps = NativeStackNavigationProp<DetailViewStackParamList>;

const AddressItem = ({
  item,
  balanceUnit,
  walletID,
  allowSignVerifyMessage,
  onPress,
  searchQuery = '',
  renderHighlightedText,
}: AddressItemProps) => {
  const { colors } = useTheme();
  const { menuActions, onMenuItem } = useAddressMenu({ walletID, address: item.address, allowSignVerifyMessage });
  const balanceOpacity = useSharedValue(1);
  const balanceTranslateY = useSharedValue(0);
  const previousBalance = useRef<string | undefined>(undefined);

  const hasTransactions = item.transactions > 0;

  const stylesHook = StyleSheet.create({
    container: {
      borderBottomColor: colors.lightBorder,
      backgroundColor: colors.elevated,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },

    index: {
      color: colors.alternativeTextColor,
    },
    balance: {
      color: colors.alternativeTextColor,
    },
    address: {
      color: hasTransactions ? colors.darkGray : colors.buttonTextColor,
    },
  });

  const { navigate } = useExtendedNavigation<NavigationProps>();

  const navigateToReceive = useCallback(() => {
    if (onPress) {
      onPress();
    } else {
      navigate('ReceiveDetails', {
        walletID,
        address: item.address,
      });
    }
  }, [navigate, walletID, item.address, onPress]);

  const balance = formatBalance(item.balance, balanceUnit, true);

  useEffect(() => {
    if (previousBalance.current !== undefined && previousBalance.current !== balance) {
      balanceOpacity.value = 0;
      balanceTranslateY.value = 6;
      balanceOpacity.value = withTiming(1, { duration: 180 });
      balanceTranslateY.value = withSpring(0, { damping: 16, stiffness: 220 });
    }

    previousBalance.current = balance;
  }, [balance, balanceOpacity, balanceTranslateY]);

  // Render address with highlighting if a search query is provided
  const renderAddressContent = () => {
    if (searchQuery && searchQuery.length > 0) {
      if (renderHighlightedText) {
        return renderHighlightedText(item.address, searchQuery);
      }
      return (
        <HighlightedText
          text={item.address}
          query={searchQuery}
          caseSensitive={false}
          highlightOnlyFirstMatch={searchQuery.length === 1}
          style={[stylesHook.address, styles.address]}
        />
      );
    }

    return (
      <Text style={[stylesHook.address, styles.address]} numberOfLines={1} ellipsizeMode="middle">
        {item.address}
      </Text>
    );
  };

  return (
    <ToolTipMenu
      title={item.address}
      actions={menuActions}
      onPressMenuItem={onMenuItem}
      onPress={navigateToReceive}
      isButton
      buttonStyle={styles.tooltipButton}
      shouldOpenOnLongPress
    >
      <View key={item.key} style={[styles.container, stylesHook.container]}>
        <View style={styles.row}>
          <View style={styles.leftSection}>
            <Text style={[styles.index, stylesHook.index]}>{item.index}</Text>
          </View>
          <View style={styles.middleSection}>
            {renderAddressContent()}
            <Text style={[stylesHook.balance, styles.balance]}>{balance}</Text>
          </View>
        </View>
        <View style={styles.rightContainer}>
          <AddressTypeBadge isInternal={item.isInternal} hasTransactions={hasTransactions} />
          <Text style={[stylesHook.balance, styles.balance]}>
            {loc.addresses.transactions}: {item.transactions ?? 0}
          </Text>
        </View>
      </View>
    </ToolTipMenu>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  address: {
    fontWeight: 'bold',
    marginHorizontal: 4,
  },
  tooltipButton: {
    width: '100%',
    alignSelf: 'stretch',
  },
  index: {
    fontSize: 15,
    fontWeight: '600',
  },
  balance: {
    marginTop: 6,
    fontWeight: '600',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftSection: {
    marginRight: 10,
    paddingTop: 2,
  },
  middleSection: {
    flex: 1,
    paddingRight: 12,
  },
  rightContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    minWidth: 96,
    paddingLeft: 8,
  },
});

export { AddressItem };

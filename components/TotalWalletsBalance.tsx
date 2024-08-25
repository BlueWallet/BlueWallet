import React, { useMemo } from 'react';
import { TouchableOpacity, Text, StyleSheet, LayoutAnimation, View } from 'react-native';
import { useStorage } from '../hooks/context/useStorage';
import loc, { formatBalanceWithoutSuffix } from '../loc';
import { BitcoinUnit } from '../models/bitcoinUnits';
import ToolTipMenu from './TooltipMenu';
import { CommonToolTipActions } from '../typings/CommonToolTipActions';
import { useSettings } from '../hooks/context/useSettings';
import Clipboard from '@react-native-clipboard/clipboard';
import { useTheme } from './themes';

export const TotalWalletsBalancePreferredUnit = 'TotalWalletsBalancePreferredUnit';
export const TotalWalletsBalanceKey = 'TotalWalletsBalance';

const TotalWalletsBalance: React.FC = () => {
  const { wallets } = useStorage();
  const { preferredFiatCurrency, setIsTotalBalanceEnabledStorage, totalBalancePreferredUnit, setTotalBalancePreferredUnitStorage } =
    useSettings();
  const { colors } = useTheme();

  const styleHooks = StyleSheet.create({
    balance: {
      color: colors.foregroundColor,
    },
    currency: {
      color: colors.foregroundColor,
    },
  });

  // Calculate total balance from all wallets
  const totalBalance = wallets.reduce((prev, curr) => {
    if (!curr.hideBalance) {
      return prev + curr.getBalance();
    }
    return prev;
  }, 0);

  const formattedBalance = useMemo(
    () => formatBalanceWithoutSuffix(Number(totalBalance), totalBalancePreferredUnit, true),
    [totalBalance, totalBalancePreferredUnit],
  );

  const toolTipActions = useMemo(() => {
    let viewIn;

    if (totalBalancePreferredUnit === BitcoinUnit.SATS) {
      viewIn = {
        ...CommonToolTipActions.ViewInFiat,
        text: loc.formatString(loc.total_balance_view.view_in_fiat, { currency: preferredFiatCurrency.endPointKey }),
      };
    } else if (totalBalancePreferredUnit === BitcoinUnit.LOCAL_CURRENCY) {
      viewIn = CommonToolTipActions.ViewInBitcoin;
    } else if (totalBalancePreferredUnit === BitcoinUnit.BTC) {
      viewIn = CommonToolTipActions.ViewInSats;
    } else {
      viewIn = CommonToolTipActions.ViewInBitcoin;
    }

    return [viewIn, CommonToolTipActions.CopyAmount, CommonToolTipActions.HideBalance];
  }, [preferredFiatCurrency.endPointKey, totalBalancePreferredUnit]);

  const onPressMenuItem = useMemo(
    () => async (id: string) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      switch (id) {
        case CommonToolTipActions.ViewInFiat.id:
        case CommonToolTipActions.ViewInBitcoin.id:
        case CommonToolTipActions.ViewInSats.id:
          switch (totalBalancePreferredUnit) {
            case BitcoinUnit.BTC:
              await setTotalBalancePreferredUnitStorage(BitcoinUnit.SATS);
              break;
            case BitcoinUnit.SATS:
              await setTotalBalancePreferredUnitStorage(BitcoinUnit.LOCAL_CURRENCY);
              break;
            case BitcoinUnit.LOCAL_CURRENCY:
              await setTotalBalancePreferredUnitStorage(BitcoinUnit.BTC);
              break;
            default:
              break;
          }
          break;
        case CommonToolTipActions.HideBalance.id:
          setIsTotalBalanceEnabledStorage(false);
          break;
        case CommonToolTipActions.CopyAmount.id:
          Clipboard.setString(formattedBalance.toString());
          break;
        default:
          break;
      }
    },
    [totalBalancePreferredUnit, setIsTotalBalanceEnabledStorage, formattedBalance, setTotalBalancePreferredUnitStorage],
  );

  return (
    (wallets.length > 1 && (
      <ToolTipMenu actions={toolTipActions} onPressMenuItem={onPressMenuItem}>
        <View style={styles.container}>
          <Text style={styles.label}>{loc.wallets.total_balance}</Text>
          <TouchableOpacity onPress={() => onPressMenuItem(CommonToolTipActions.ViewInBitcoin.id)}>
            <Text style={[styles.balance, styleHooks.balance]}>
              {formattedBalance}{' '}
              {totalBalancePreferredUnit !== BitcoinUnit.LOCAL_CURRENCY && (
                <Text style={[styles.currency, styleHooks.currency]}>{totalBalancePreferredUnit}</Text>
              )}
            </Text>
          </TouchableOpacity>
        </View>
      </ToolTipMenu>
    )) ||
    null
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
    color: '#9BA0A9',
  },
  balance: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1D2B53',
  },
  currency: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1D2B53',
  },
});

export default TotalWalletsBalance;

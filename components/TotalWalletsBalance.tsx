import React, { useMemo, useCallback } from 'react';
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

const TotalWalletsBalance: React.FC = React.memo(() => {
  const { wallets } = useStorage();
  const {
    preferredFiatCurrency,
    isTotalBalanceEnabled,
    setIsTotalBalanceEnabledStorage,
    totalBalancePreferredUnit,
    setTotalBalancePreferredUnitStorage,
  } = useSettings();
  const { colors } = useTheme();

  const totalBalanceFormatted = useMemo(() => {
    const totalBalance = wallets.reduce((prev, curr) => {
      return curr.hideBalance ? prev : prev + (curr.getBalance() || 0);
    }, 0);
    return formatBalanceWithoutSuffix(totalBalance, totalBalancePreferredUnit, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets, totalBalancePreferredUnit, preferredFiatCurrency]);

  const toolTipActions = useMemo(
    () => [
      {
        id: 'viewInActions',
        text: '',
        displayInline: true,
        subactions: [
          {
            ...CommonToolTipActions.ViewInFiat,
            text: loc.formatString(loc.total_balance_view.display_in_fiat, { currency: preferredFiatCurrency.endPointKey }),
            hidden: totalBalancePreferredUnit === BitcoinUnit.LOCAL_CURRENCY,
          },
          { ...CommonToolTipActions.ViewInSats, hidden: totalBalancePreferredUnit === BitcoinUnit.SATS },
          { ...CommonToolTipActions.ViewInBitcoin, hidden: totalBalancePreferredUnit === BitcoinUnit.BTC },
        ],
      },
      CommonToolTipActions.CopyAmount,
      CommonToolTipActions.Hide,
    ],
    [preferredFiatCurrency, totalBalancePreferredUnit],
  );

  const onPressMenuItem = useCallback(
    async (id: string) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      switch (id) {
        case CommonToolTipActions.ViewInFiat.id:
          await setTotalBalancePreferredUnitStorage(BitcoinUnit.LOCAL_CURRENCY);
          break;
        case CommonToolTipActions.ViewInSats.id:
          await setTotalBalancePreferredUnitStorage(BitcoinUnit.SATS);
          break;
        case CommonToolTipActions.ViewInBitcoin.id:
          await setTotalBalancePreferredUnitStorage(BitcoinUnit.BTC);
          break;
        case CommonToolTipActions.Hide.id:
          await setIsTotalBalanceEnabledStorage(false);
          break;
        case CommonToolTipActions.CopyAmount.id:
          Clipboard.setString(totalBalanceFormatted.toString());
          break;
        default:
          break;
      }
    },
    [setIsTotalBalanceEnabledStorage, totalBalanceFormatted, setTotalBalancePreferredUnitStorage],
  );

  const handleBalanceOnPress = useCallback(async () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const nextUnit =
      totalBalancePreferredUnit === BitcoinUnit.BTC
        ? BitcoinUnit.SATS
        : totalBalancePreferredUnit === BitcoinUnit.SATS
          ? BitcoinUnit.LOCAL_CURRENCY
          : BitcoinUnit.BTC;
    await setTotalBalancePreferredUnitStorage(nextUnit);
  }, [totalBalancePreferredUnit, setTotalBalancePreferredUnitStorage]);

  if (wallets.length <= 1 || !isTotalBalanceEnabled) return null;

  return (
    <ToolTipMenu actions={toolTipActions} onPressMenuItem={onPressMenuItem}>
      <View style={styles.container}>
        <Text style={styles.label}>{loc.wallets.total_balance}</Text>
        <TouchableOpacity onPress={handleBalanceOnPress}>
          <Text style={[styles.balance, { color: colors.foregroundColor }]}>
            {totalBalanceFormatted}{' '}
            {totalBalancePreferredUnit !== BitcoinUnit.LOCAL_CURRENCY && (
              <Text style={[styles.currency, { color: colors.foregroundColor }]}>{totalBalancePreferredUnit}</Text>
            )}
          </Text>
        </TouchableOpacity>
      </View>
    </ToolTipMenu>
  );
});

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
  },
  currency: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default TotalWalletsBalance;

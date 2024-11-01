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

  const styleHooks = useMemo(
    () => ({
      balance: { color: colors.foregroundColor },
      currency: { color: colors.foregroundColor },
    }),
    [colors.foregroundColor],
  );

  const totalBalance = useMemo(() => {
    return wallets.reduce((prev, curr) => {
      if (!curr.hideBalance) {
        const balance = curr.getBalance();
        return prev + (typeof balance === 'number' ? balance : 0);
      }
      return prev;
    }, 0);
  }, [wallets]);

  const formattedBalance = useMemo(() => {
    return formatBalanceWithoutSuffix(totalBalance, totalBalancePreferredUnit, true);
  }, [totalBalance, totalBalancePreferredUnit]);

  const toolTipActions = useMemo(() => {
    const viewInFiat = {
      ...CommonToolTipActions.ViewInFiat,
      text: loc.formatString(loc.total_balance_view.view_in_fiat, { currency: preferredFiatCurrency.endPointKey }),
      hidden: totalBalancePreferredUnit === BitcoinUnit.LOCAL_CURRENCY,
    };

    const viewInSats = {
      ...CommonToolTipActions.ViewInSats,
      hidden: totalBalancePreferredUnit === BitcoinUnit.SATS,
    };

    const viewInBitcoin = {
      ...CommonToolTipActions.ViewInBitcoin,
      hidden: totalBalancePreferredUnit === BitcoinUnit.BTC,
    };

    const viewInActions = {
      id: 'viewInActions',
      text: '',
      subactions: [viewInFiat, viewInSats, viewInBitcoin],
      displayInline: true,
    };

    return [viewInActions, CommonToolTipActions.CopyAmount, CommonToolTipActions.HideBalance];
  }, [preferredFiatCurrency, totalBalancePreferredUnit]);

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
        case CommonToolTipActions.HideBalance.id:
          await setIsTotalBalanceEnabledStorage(false);
          break;
        case CommonToolTipActions.CopyAmount.id:
          Clipboard.setString(formattedBalance.toString());
          break;
        default:
          break;
      }
    },
    [setIsTotalBalanceEnabledStorage, formattedBalance, setTotalBalancePreferredUnitStorage],
  );

  const handleBalanceOnPress = useCallback(async () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    let nextUnit: BitcoinUnit;
    switch (totalBalancePreferredUnit) {
      case BitcoinUnit.BTC:
        nextUnit = BitcoinUnit.SATS;
        break;
      case BitcoinUnit.SATS:
        nextUnit = BitcoinUnit.LOCAL_CURRENCY;
        break;
      default:
        nextUnit = BitcoinUnit.BTC;
    }
    await setTotalBalancePreferredUnitStorage(nextUnit);
  }, [totalBalancePreferredUnit, setTotalBalancePreferredUnitStorage]);

  // If there's only one wallet or total balance view is disabled, don't render
  if (wallets.length <= 1 || !isTotalBalanceEnabled) return null;

  return (
    <ToolTipMenu actions={toolTipActions} onPressMenuItem={onPressMenuItem}>
      <View style={styles.container}>
        <Text style={styles.label}>{loc.wallets.total_balance}</Text>
        <TouchableOpacity onPress={handleBalanceOnPress}>
          <Text style={[styles.balance, styleHooks.balance]}>
            {formattedBalance}{' '}
            {totalBalancePreferredUnit !== BitcoinUnit.LOCAL_CURRENCY && (
              <Text style={[styles.currency, styleHooks.currency]}>{totalBalancePreferredUnit}</Text>
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
    color: '#1D2B53',
  },
  currency: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1D2B53',
  },
});

export default TotalWalletsBalance;

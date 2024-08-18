import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, LayoutAnimation } from 'react-native';
import { useStorage } from '../hooks/context/useStorage';
import loc, { formatBalanceWithoutSuffix } from '../loc';
import { BitcoinUnit } from '../models/bitcoinUnits';
import ToolTipMenu from './TooltipMenu';
import { CommonToolTipActions } from '../typings/CommonToolTipActions';
import { useSettings } from '../hooks/context/useSettings';
import DefaultPreference from 'react-native-default-preference';
import { GROUP_IO_BLUEWALLET, setPreferredCurrency } from '../blue_modules/currency';

export const setTotalBalanceViewEnabled = async (value: boolean) => {
  await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
  await DefaultPreference.set(TotalWalletsBalanceKey, value.toString());
  console.debug('setTotalBalanceViewEnabled value:', value);
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
};

export const getIsTotalBalanceViewEnabled = async (): Promise<boolean> => {
  try {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    const isEnabledValue = (await DefaultPreference.get(TotalWalletsBalanceKey)) ?? false;
    console.debug('getIsTotalBalanceViewEnabled', isEnabledValue);
    return isEnabledValue === 'true';
  } catch (e) {
    console.debug('getIsTotalBalanceViewEnabled error', e);
  }
  return true;
};

export const setTotalBalancePreferredUnit = async (unit: BitcoinUnit) => {
  await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
  await DefaultPreference.set(TotalWalletsBalancePreferredUnit, unit);
};

export const getTotalBalancePreferredUnit = async (): Promise<BitcoinUnit> => {
  try {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    const unit = ((await DefaultPreference.get(TotalWalletsBalancePreferredUnit)) as BitcoinUnit) ?? BitcoinUnit.BTC;
    return unit;
  } catch (e) {
    console.debug('getPreferredUnit error', e);
  }
  return BitcoinUnit.BTC;
};

export const TotalWalletsBalancePreferredUnit = 'TotalWalletsBalancePreferredUnit';
export const TotalWalletsBalanceKey = 'TotalWalletsBalance';
const TotalWalletsBalance: React.FC = () => {
  const { wallets } = useStorage();
  const { preferredFiatCurrency, setIsTotalBalanceEnabledStorage, totalBalancePreferredUnit, setTotalBalancePreferredUnitStorage } =
    useSettings();

  // Calculate total balance from all wallets
  const totalBalance = wallets.reduce((prev, curr) => {
    if (!curr.hideBalance) {
      return prev + curr.getBalance();
    }
    return prev;
  }, 0);

  const formattedBalance = formatBalanceWithoutSuffix(Number(totalBalance), totalBalancePreferredUnit, true);

  const toolTipActions = useMemo(() => {
    const viewInFiat = CommonToolTipActions.ViewInFiat;
    viewInFiat.text = loc.formatString(loc.wallets.view_in_fiat, { currency: preferredFiatCurrency.endPointKey });

    return [viewInFiat, CommonToolTipActions.HideBalance];
  }, [preferredFiatCurrency]);

  const onPressMenuItem = async (id: string) => {
    switch (id) {
      case CommonToolTipActions.ViewInFiat.id:
        console.debug('View in fiat');
        switch (totalBalancePreferredUnit) {
          case BitcoinUnit.BTC:
            await setTotalBalancePreferredUnit(BitcoinUnit.SATS);
            break;
          case BitcoinUnit.SATS:
            await setTotalBalancePreferredUnit(BitcoinUnit.LOCAL_CURRENCY);
            break;
          case BitcoinUnit.LOCAL_CURRENCY:
            await setTotalBalancePreferredUnit(BitcoinUnit.BTC);
            break;
          default:
            break;
        }

        break;
      case CommonToolTipActions.HideBalance.id:
        console.debug('Hide balance');
        setIsTotalBalanceEnabledStorage(false);
        break;
      default:
        break;
    }
  };

  return (
    <ToolTipMenu actions={toolTipActions} onPressMenuItem={onPressMenuItem}>
      <View style={styles.container}>
        <Text style={styles.label}>{loc.wallets.total_balance}</Text>
        <Text style={styles.balance}>
          {formattedBalance} <Text style={styles.currency} />
        </Text>
      </View>
    </ToolTipMenu>
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

import dayjs from 'dayjs';
import calendar from 'dayjs/plugin/calendar';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Keyboard, NativeSyntheticEvent, StyleSheet, Text, View } from 'react-native';

import {
  CurrencyRate,
  getPreferredCurrency,
  initCurrencyDaemon,
  mostRecentFetchedRate,
  setPreferredCurrency,
} from '../../blue_modules/currency';
import presentAlert from '../../components/Alert';
import SafeAreaFlatList from '../../components/SafeAreaFlatList';
import { SettingsListItem, settingsListCard, settingsSectionHeaderText } from '../../components/SettingsSection';
import { useTheme } from '../../components/themes';
import { useSettings } from '../../hooks/context/useSettings';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { FiatUnit, FiatUnitSource, FiatUnitType, getFiatRate } from '../../models/fiatUnit';

dayjs.extend(calendar);

const MAX_DISPLAY_ITEMS = 50;

const Currency: React.FC = () => {
  const { setPreferredFiatCurrencyStorage } = useSettings();
  const [isSavingNewPreferredCurrency, setIsSavingNewPreferredCurrency] = useState<FiatUnitType | undefined>();
  const [selectedCurrency, setSelectedCurrency] = useState<FiatUnitType>(FiatUnit.USD);
  const [currencyRate, setCurrencyRate] = useState<CurrencyRate>({
    LastUpdated: null,
    Rate: null,
  });
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const { setOptions } = useExtendedNavigation();
  const { colors } = useTheme();
  const [search, setSearch] = useState('');

  const stylesHook = StyleSheet.create({
    card: { backgroundColor: colors.cardSectionBackground },
    infoHeader: { backgroundColor: colors.cardSectionHeaderBackground },
    infoTitle: { color: colors.foregroundColor },
    infoSubtitle: { color: colors.alternativeTextColor },
  });

  const filteredCurrencies = useMemo(() => {
    const searchLower = search.toLowerCase();
    return Object.values(FiatUnit)
      .filter(item => item.endPointKey.toLowerCase().includes(searchLower) || item.country.toLowerCase().includes(searchLower))
      .slice(0, MAX_DISPLAY_ITEMS);
  }, [search]);

  const fetchCurrency = useCallback(async () => {
    let preferredCurrency;
    try {
      preferredCurrency = await getPreferredCurrency();
      if (preferredCurrency === null) {
        throw Error();
      }
      setSelectedCurrency(preferredCurrency);
    } catch (_error) {
      setSelectedCurrency(FiatUnit.USD);
    }
    const mostRecentFetchedRateValue = await mostRecentFetchedRate();
    setCurrencyRate(mostRecentFetchedRateValue);
  }, []);

  useEffect(() => {
    fetchCurrency();
  }, [fetchCurrency]);

  const handleSearchChange = useCallback((event: NativeSyntheticEvent<{ text: string }>) => {
    setSearch(event.nativeEvent.text);
  }, []);

  useLayoutEffect(() => {
    setOptions({
      headerSearchBarOptions: {
        onChangeText: handleSearchChange,
        onFocus: () => setIsSearchFocused(true),
        onBlur: () => setIsSearchFocused(false),
      },
    });
  }, [setOptions, handleSearchChange]);

  const selectedCurrencyVisible = useMemo(
    () => filteredCurrencies.some(item => item.endPointKey === selectedCurrency.endPointKey),
    [filteredCurrencies, selectedCurrency.endPointKey],
  );

  const renderItem = useCallback(
    (props: { item: FiatUnitType; index: number }) => {
      const { item, index } = props;
      const isSelected = selectedCurrency.endPointKey === item.endPointKey;
      const isDisabled = isSavingNewPreferredCurrency === item || isSelected;
      const isLoading = isSavingNewPreferredCurrency === item;

      return (
        <SettingsListItem
          disabled={isDisabled}
          title={`${item.endPointKey} (${item.symbol})`}
          subtitle={item.country}
          checkmark={isSelected}
          isLoading={isLoading}
          onPress={async () => {
            if (isDisabled) return;

            Keyboard.dismiss();
            setIsSavingNewPreferredCurrency(item);
            try {
              await getFiatRate(item.endPointKey);
              await setPreferredCurrency(item);
              await initCurrencyDaemon(true);
              await fetchCurrency();
              setSelectedCurrency(item);
              setPreferredFiatCurrencyStorage(FiatUnit[item.endPointKey]);
            } catch (error: any) {
              console.log(error);
              presentAlert({
                message: error.message ? `${loc.settings.currency_fetch_error}: ${error.message}` : loc.settings.currency_fetch_error,
              });
            } finally {
              setIsSavingNewPreferredCurrency(undefined);
            }
          }}
          bottomDivider={index < filteredCurrencies.length - 1}
        />
      );
    },
    [isSavingNewPreferredCurrency, selectedCurrency, filteredCurrencies.length, fetchCurrency, setPreferredFiatCurrencyStorage],
  );

  const keyExtractor = useCallback((item: FiatUnitType) => `${item.endPointKey}-${item.locale}`, []);

  const listHeader =
    isSearchFocused || !selectedCurrencyVisible ? null : (
      <View style={[styles.infoHeader, stylesHook.infoHeader]}>
        <Text style={[settingsSectionHeaderText, styles.infoTitle, stylesHook.infoTitle]}>
          {loc.settings.currency_source} {selectedCurrency?.source ?? FiatUnitSource.CoinDesk}
        </Text>
        <Text style={[styles.infoSubtitle, stylesHook.infoSubtitle]}>
          {loc.settings.rate}: {currencyRate.Rate ?? loc._.never}
        </Text>
        <Text style={[styles.infoSubtitle, stylesHook.infoSubtitle]}>
          {loc.settings.last_updated}: {dayjs(currencyRate.LastUpdated).calendar() ?? loc._.never}
        </Text>
      </View>
    );

  return (
    <SafeAreaFlatList
      data={filteredCurrencies}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={listHeader}
      contentContainerStyle={[settingsListCard, stylesHook.card]}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets
      automaticallyAdjustKeyboardInsets
    />
  );
};

export default Currency;

const styles = StyleSheet.create({
  infoHeader: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  infoTitle: {
    marginBottom: 8,
  },
  infoSubtitle: {
    fontSize: 14,
    marginTop: 6,
  },
});

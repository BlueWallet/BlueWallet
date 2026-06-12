import dayjs from 'dayjs';
import calendar from 'dayjs/plugin/calendar';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Keyboard, NativeSyntheticEvent, StyleSheet, View } from 'react-native';

import {
  CurrencyRate,
  getPreferredCurrency,
  initCurrencyDaemon,
  mostRecentFetchedRate,
  setPreferredCurrency,
} from '../../blue_modules/currency';
import presentAlert from '../../components/Alert';
import {
  SettingsCard,
  SettingsFlatList,
  SettingsListItem,
  SettingsSection,
  SettingsSubtitle,
  SettingsText,
} from '../../components/platform';
import { useSettings } from '../../hooks/context/useSettings';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { FiatUnit, FiatUnitSource, FiatUnitType, getFiatRate } from '../../models/fiatUnit';
import NativeWidgetHelper from '../../blue_modules/NativeWidgetHelper';

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
  const [search, setSearch] = useState('');

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
      const isFirst = index === 0;
      const isLast = index === filteredCurrencies.length - 1;

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
              const rateObj = await getFiatRate(item.endPointKey);

              // Immediately update UI so header shows actual provider (fallbacks included)
              try {
                const formatted = new Intl.NumberFormat(item.locale, { style: 'currency', currency: item.endPointKey, minimumFractionDigits: 2 }).format(rateObj.rate);
                setCurrencyRate({ LastUpdated: new Date(), Rate: formatted, Source: rateObj.source });
              } catch (e) {
                // ignore formatting errors
                setCurrencyRate({ LastUpdated: new Date(), Rate: rateObj.rate, Source: rateObj.source } as any);
              }

              await setPreferredCurrency(item);
              // Ask native widgets to reload ASAP
              try {
                if (NativeWidgetHelper && typeof NativeWidgetHelper.reloadAllWidgets === 'function') NativeWidgetHelper.reloadAllWidgets();
              } catch (e) {
                console.warn('Failed to call reloadAllWidgets after selecting currency', e);
              }

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
          position={isFirst && isLast ? 'single' : isFirst ? 'first' : isLast ? 'last' : 'middle'}
          accessibilityLabel={`${item.endPointKey} ${item.symbol} ${item.country}`}
        />
      );
    },
    [isSavingNewPreferredCurrency, selectedCurrency, filteredCurrencies.length, fetchCurrency, setPreferredFiatCurrencyStorage],
  );

  const keyExtractor = useCallback((item: FiatUnitType) => `${item.endPointKey}-${item.locale}`, []);

  const ListHeaderComponent = useCallback(() => {
    if (isSearchFocused || !selectedCurrencyVisible) return null;

    return (
      <SettingsSection compact>
        <View style={styles.infoWrapper}>
          <SettingsCard style={styles.infoCard}>
            <SettingsText style={styles.infoTitle}>
              {loc.settings.currency_source} {currencyRate.Source ?? selectedCurrency?.source ?? FiatUnitSource.CoinDesk}
            </SettingsText>
            <SettingsSubtitle style={styles.infoSubtitle}>
              {loc.settings.rate}: {currencyRate.Rate ?? loc._.never}
            </SettingsSubtitle>
            <SettingsSubtitle style={styles.infoSubtitle}>
              {loc.settings.last_updated}: {dayjs(currencyRate.LastUpdated).calendar() ?? loc._.never}
            </SettingsSubtitle>
          </SettingsCard>
        </View>
      </SettingsSection>
    );
  }, [isSearchFocused, selectedCurrencyVisible, selectedCurrency?.source, currencyRate]);

  return (
    <SettingsFlatList
      data={filteredCurrencies}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeaderComponent}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets
      automaticallyAdjustKeyboardInsets
      removeClippedSubviews={true}
    />
  );
};

export default Currency;

const styles = StyleSheet.create({
  infoWrapper: {
    marginBottom: 16,
    paddingVertical: 12,
  },
  infoCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoTitle: {
    marginBottom: 8,
  },
  infoSubtitle: {
    marginTop: 6,
  },
});

import dayjs from 'dayjs';
import calendar from 'dayjs/plugin/calendar';
import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, NativeSyntheticEvent, StyleSheet, View, LayoutAnimation, UIManager, Platform, Keyboard } from 'react-native';

import {
  CurrencyRate,
  getPreferredCurrency,
  initCurrencyDaemon,
  mostRecentFetchedRate,
  setPreferredCurrency,
} from '../../blue_modules/currency';
import { BlueCard, BlueSpacing10, BlueSpacing20, BlueText } from '../../BlueComponents';
import presentAlert from '../../components/Alert';
import ListItem from '../../components/ListItem';
import { useTheme } from '../../components/themes';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { FiatUnit, FiatUnitSource, FiatUnitType, getFiatRate } from '../../models/fiatUnit';
import { useSettings } from '../../hooks/context/useSettings';

dayjs.extend(calendar);

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const Currency: React.FC = () => {
  const { setPreferredFiatCurrencyStorage } = useSettings();
  const [isSavingNewPreferredCurrency, setIsSavingNewPreferredCurrency] = useState<FiatUnitType | undefined>();
  const [selectedCurrency, setSelectedCurrency] = useState<FiatUnitType>(FiatUnit.USD);
  const [currencyRate, setCurrencyRate] = useState<CurrencyRate>({ LastUpdated: null, Rate: null });
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const { colors } = useTheme();
  const { setOptions } = useExtendedNavigation();
  const [search, setSearch] = useState('');

  const data = useMemo(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    return Object.values(FiatUnit).filter(
      item => item.endPointKey.toLowerCase().includes(search.toLowerCase()) || item.country.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search]);

  const stylesHook = StyleSheet.create({
    flex: {
      backgroundColor: colors.background,
    },
  });

  const fetchCurrency = async () => {
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
  };

  useEffect(() => {
    fetchCurrency();
  }, []);

  useLayoutEffect(() => {
    setOptions({
      headerSearchBarOptions: {
        onChangeText: (event: NativeSyntheticEvent<{ text: string }>) => setSearch(event.nativeEvent.text),
        onFocus: () => setIsSearchFocused(true),
        onBlur: () => setIsSearchFocused(false),
      },
    });
  }, [setOptions]);

  const renderItem = ({ item }: { item: FiatUnitType }) => (
    <ListItem
      disabled={isSavingNewPreferredCurrency === item || selectedCurrency.endPointKey === item.endPointKey}
      title={`${item.endPointKey} (${item.symbol})`}
      containerStyle={StyleSheet.flatten([styles.flex, stylesHook.flex, { minHeight: 60 }])}
      checkmark={selectedCurrency.endPointKey === item.endPointKey}
      isLoading={isSavingNewPreferredCurrency && selectedCurrency.endPointKey === item.endPointKey}
      subtitle={item.country}
      onPress={async () => {
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
    />
  );

  const selectedCurrencyVisible = useMemo(
    () => data.some(item => item.endPointKey === selectedCurrency.endPointKey),
    [data, selectedCurrency],
  );

  return (
    <View style={[styles.flex, stylesHook.flex]}>
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustContentInsets
        keyExtractor={(_item, index) => `${index}`}
        data={data}
        initialNumToRender={30}
        renderItem={renderItem}
      />
      {!isSearchFocused || selectedCurrencyVisible ? (
        <BlueCard>
          <BlueText>
            {loc.settings.currency_source} {selectedCurrency?.source ?? FiatUnitSource.CoinDesk}
          </BlueText>
          <BlueSpacing10 />
          <BlueText>
            {loc.settings.rate}: {currencyRate.Rate ?? loc._.never}
          </BlueText>
          <BlueSpacing10 />
          <BlueText>
            {loc.settings.last_updated}: {dayjs(currencyRate.LastUpdated).calendar() ?? loc._.never}
          </BlueText>
          <BlueSpacing20 />
        </BlueCard>
      ) : null}
    </View>
  );
};

export default Currency;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});

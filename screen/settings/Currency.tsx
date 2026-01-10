import dayjs from 'dayjs';
import calendar from 'dayjs/plugin/calendar';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { NativeSyntheticEvent, StyleSheet, View, LayoutAnimation, UIManager, Platform, Keyboard, Text, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CurrencyRate,
  getPreferredCurrency,
  initCurrencyDaemon,
  mostRecentFetchedRate,
  setPreferredCurrency,
} from '../../blue_modules/currency';
import presentAlert from '../../components/Alert';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { FiatUnit, FiatUnitSource, FiatUnitType, getFiatRate } from '../../models/fiatUnit';
import { useSettings } from '../../hooks/context/useSettings';
import SafeAreaFlatList from '../../components/SafeAreaFlatList';
import PlatformListItem from '../../components/PlatformListItem';
import { usePlatformStyles } from '../../theme/platformStyles';

dayjs.extend(calendar);

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  const { colors: platformColors, sizing, layout } = usePlatformStyles();
  const insets = useSafeAreaInsets();

  // Calculate header height for Android with transparent header
  const headerHeight = useMemo(() => {
    if (Platform.OS === 'android') {
      const statusBarHeight = StatusBar.currentHeight ?? insets.top ?? 24; // Fallback to 24dp for older Android
      return 56 + statusBarHeight;
    }
    return 0;
  }, [insets.top]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: platformColors.background,
    },
    listItemContainer: {
      backgroundColor: platformColors.cardBackground,
      minHeight: 77,
      ...(Platform.OS === 'android' && {
        paddingHorizontal: 16,
      }),
    },
    infoContainer: {
      backgroundColor: platformColors.cardBackground,
      marginBottom: 8,
      padding: 16,
      borderRadius: sizing.containerBorderRadius * 1.5,
    },
    infoText: {
      color: platformColors.titleColor,
      fontSize: sizing.subtitleFontSize,
      marginBottom: 8,
    },
    headerOffset: {
      height: sizing.firstSectionContainerPaddingTop,
    },
    contentContainer: {
      marginHorizontal: sizing.contentContainerMarginHorizontal,
      paddingHorizontal: sizing.contentContainerPaddingHorizontal,
    },
    infoWrapper: {
      marginBottom: 8,
    },
  });

  const filteredCurrencies = useMemo(() => {
    if (search.length > 0) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }

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
        <PlatformListItem
          disabled={isDisabled}
          title={`${item.endPointKey} (${item.symbol})`}
          subtitle={item.country}
          containerStyle={styles.listItemContainer}
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
          isFirst={isFirst}
          isLast={isLast}
          bottomDivider={layout.showBorderBottom && !isLast}
          accessibilityLabel={`${item.endPointKey} ${item.symbol} ${item.country}`}
        />
      );
    },
    [
      isSavingNewPreferredCurrency,
      selectedCurrency,
      filteredCurrencies.length,
      layout.showBorderBottom,
      styles.listItemContainer,
      fetchCurrency,
      setPreferredFiatCurrencyStorage,
    ],
  );

  const keyExtractor = useCallback((item: FiatUnitType) => `${item.endPointKey}-${item.locale}`, []);

  const ListHeaderComponent = useCallback(() => {
    return (
      <View>
        <View style={styles.headerOffset} />
        {!isSearchFocused && selectedCurrencyVisible && (
          <View style={styles.infoWrapper}>
            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                {loc.settings.currency_source} {selectedCurrency?.source ?? FiatUnitSource.CoinDesk}
              </Text>
              <Text style={styles.infoText}>
                {loc.settings.rate}: {currencyRate.Rate ?? loc._.never}
              </Text>
              <Text style={styles.infoText}>
                {loc.settings.last_updated}: {dayjs(currencyRate.LastUpdated).calendar() ?? loc._.never}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  }, [
    isSearchFocused,
    selectedCurrencyVisible,
    selectedCurrency?.source,
    currencyRate,
    styles.headerOffset,
    styles.infoContainer,
    styles.infoText,
    styles.infoWrapper,
  ]);

  return (
    <SafeAreaFlatList
      headerHeight={headerHeight}
      style={styles.container}
      data={filteredCurrencies}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeaderComponent}
      contentContainerStyle={styles.contentContainer}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets
      automaticallyAdjustKeyboardInsets
      removeClippedSubviews={true}
    />
  );
};

export default Currency;

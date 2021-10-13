import React, { useState, useEffect, useContext } from 'react';
import { FlatList, ActivityIndicator, View, StyleSheet } from 'react-native';
import { useTheme } from '@react-navigation/native';

import navigationStyle from '../../components/navigationStyle';
import { SafeBlueArea, BlueListItem, BlueText, BlueCard, BlueSpacing10 } from '../../BlueComponents';
import { FiatUnit, FiatUnitSource } from '../../models/fiatUnit';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
dayjs.extend(require('dayjs/plugin/calendar'));
const currency = require('../../blue_modules/currency');
const data = Object.values(FiatUnit);

const Currency = () => {
  const { setPreferredFiatCurrency } = useContext(BlueStorageContext);
  const [isSavingNewPreferredCurrency, setIsSavingNewPreferredCurrency] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [currencyRate, setCurrencyRate] = useState({ LastUpdated: null, Rate: null });
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: colors.background,
    },
    activity: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
  });

  const fetchCurrency = async () => {
    let preferredCurrency = FiatUnit.USD;
    try {
      preferredCurrency = await currency.getPreferredCurrency();
      if (preferredCurrency === null) {
        throw Error();
      }
      setSelectedCurrency(preferredCurrency);
    } catch (_error) {
      setSelectedCurrency(preferredCurrency);
    }
    AsyncStorage.getItem(currency.EXCHANGE_RATES).then(currencyInformation => {
      const formatter = new Intl.NumberFormat(preferredCurrency.locale, {
        style: 'currency',
        currency: preferredCurrency.endPointKey,
        minimumFractionDigits: 2,
        maximumFractionDigits: 8,
      });
      setCurrencyRate({
        LastUpdated: currencyInformation[currency.LAST_UPDATED],
        Rate: formatter.format(JSON.parse(currencyInformation)[`BTC_${preferredCurrency.endPointKey}`]),
      });
    });
  };

  useEffect(() => {
    fetchCurrency();
  }, []);

  if (selectedCurrency !== null && selectedCurrency !== undefined) {
    return (
      <SafeBlueArea>
        <FlatList
          style={styles.flex}
          keyExtractor={(_item, index) => `${index}`}
          data={data}
          initialNumToRender={50}
          extraData={data}
          renderItem={({ item }) => {
            return (
              <BlueListItem
                disabled={isSavingNewPreferredCurrency}
                title={`${item.endPointKey} (${item.symbol})`}
                checkmark={selectedCurrency.endPointKey === item.endPointKey}
                onPress={async () => {
                  setIsSavingNewPreferredCurrency(true);
                  setSelectedCurrency(item);
                  await currency.setPrefferedCurrency(item);
                  await currency.init(true);
                  setIsSavingNewPreferredCurrency(false);
                  setPreferredFiatCurrency();
                  fetchCurrency();
                }}
              />
            );
          }}
        />
        <BlueCard>
          <BlueText>
            {loc.settings.currency_source} {selectedCurrency.source ?? FiatUnitSource.CoinDesk}
          </BlueText>
          <BlueSpacing10 />
          <BlueText>
            {loc.settings.rate}: {currencyRate.Rate ?? loc._.never}
          </BlueText>
          <BlueSpacing10 />
          <BlueText>
            {loc.settings.last_updated}: {dayjs(currencyRate.LastUpdated).calendar() ?? loc._.never}
          </BlueText>
        </BlueCard>
      </SafeBlueArea>
    );
  }
  return (
    <View style={styles.activity}>
      <ActivityIndicator />
    </View>
  );
};

Currency.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: loc.settings.currency }));

export default Currency;

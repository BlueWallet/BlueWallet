import React, { useState, useContext, useLayoutEffect } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import navigationStyle from '../../components/navigationStyle';
import { SafeBlueArea, BlueListItem, BlueText, BlueCard, BlueSpacing10 } from '../../BlueComponents';
import { FiatUnit, FiatUnitSource, getFiatRate } from '../../models/fiatUnit';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import dayjs from 'dayjs';
import alert from '../../components/Alert';
import { useTheme } from '../../components/themes';
dayjs.extend(require('dayjs/plugin/calendar'));
const currency = require('../../blue_modules/currency');

const Currency = () => {
  const { setPreferredFiatCurrency } = useContext(BlueStorageContext);
  const [isSavingNewPreferredCurrency, setIsSavingNewPreferredCurrency] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState(FiatUnit.USD);
  const [currencyRate, setCurrencyRate] = useState({ LastUpdated: null, Rate: null });
  const { colors } = useTheme();
  const { setOptions } = useNavigation();
  const [search, setSearch] = useState('');
  const data = Object.values(FiatUnit).filter(item => item.endPointKey.toLowerCase().includes(search.toLowerCase()));
  const styles = StyleSheet.create({
    flex: {
      flex: 1,
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
    const mostRecentFetchedRate = await currency.mostRecentFetchedRate();
    setCurrencyRate(mostRecentFetchedRate);
  };

  useLayoutEffect(() => {
    setOptions({
      searchBar: {
        onChangeText: event => setSearch(event.nativeEvent.text),
      },
    });
    fetchCurrency();
  }, [setOptions]);

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
                try {
                  await getFiatRate(item.endPointKey);
                  await currency.setPrefferedCurrency(item);
                  await currency.init(true);
                  await fetchCurrency();
                  setSelectedCurrency(item);
                  setPreferredFiatCurrency();
                } catch (error) {
                  console.log(error);
                  alert(loc.settings.currency_fetch_error);
                } finally {
                  setIsSavingNewPreferredCurrency(false);
                }
              }}
            />
          );
        }}
      />
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
      </BlueCard>
    </SafeBlueArea>
  );
};

Currency.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: loc.settings.currency }));

export default Currency;

import React, { useState, useContext, useLayoutEffect } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import navigationStyle from '../../components/navigationStyle';
import { BlueText, BlueCard, BlueSpacing10 } from '../../BlueComponents';
import { FiatUnit, FiatUnitSource, getFiatRate } from '../../models/fiatUnit';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import dayjs from 'dayjs';
import alert from '../../components/Alert';
import { useTheme } from '../../components/themes';
import ListItem from '../../components/ListItem';
import { getPreferredCurrency, init, mostRecentFetchedRate, setPreferredCurrency } from '../../blue_modules/currency';
dayjs.extend(require('dayjs/plugin/calendar'));

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
      preferredCurrency = await getPreferredCurrency();
      if (preferredCurrency === null) {
        throw Error();
      }
      setSelectedCurrency(preferredCurrency);
    } catch (_error) {
      setSelectedCurrency(preferredCurrency);
    }
    const mostRecentFetchedRateValue = await mostRecentFetchedRate();
    setCurrencyRate(mostRecentFetchedRateValue);
  };

  useLayoutEffect(() => {
    setOptions({
      headerSearchBarOptions: {
        onChangeText: event => setSearch(event.nativeEvent.text),
      },
    });
    fetchCurrency();
  }, [setOptions]);

  return (
    <View style={styles.flex}>
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustContentInsets
        keyExtractor={(_item, index) => `${index}`}
        data={data}
        initialNumToRender={50}
        extraData={data}
        renderItem={({ item }) => {
          return (
            <ListItem
              disabled={isSavingNewPreferredCurrency}
              title={`${item.endPointKey} (${item.symbol})`}
              checkmark={selectedCurrency.endPointKey === item.endPointKey}
              onPress={async () => {
                setIsSavingNewPreferredCurrency(true);
                try {
                  await getFiatRate(item.endPointKey);
                  await setPreferredCurrency(item);
                  await init(true);
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
    </View>
  );
};

Currency.navigationOptions = navigationStyle({}, opts => ({ ...opts, title: loc.settings.currency }));

export default Currency;

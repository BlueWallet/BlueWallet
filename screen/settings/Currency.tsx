import { useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import React, { useContext, useLayoutEffect, useState } from 'react';
import { FlatList, NativeSyntheticEvent, StyleSheet, View } from 'react-native';
import { BlueCard, BlueSpacing10, BlueText } from '../../BlueComponents';
import {
  CurrencyRate,
  getPreferredCurrency,
  initCurrencyDaemon,
  mostRecentFetchedRate,
  setPreferredCurrency,
} from '../../blue_modules/currency';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import presentAlert from '../../components/Alert';
import ListItem from '../../components/ListItem';
import { useTheme } from '../../components/themes';
import loc from '../../loc';
import { FiatUnit, FiatUnitSource, FiatUnitType, getFiatRate } from '../../models/fiatUnit';
dayjs.extend(require('dayjs/plugin/calendar'));

const Currency = () => {
  const { setPreferredFiatCurrency } = useContext(BlueStorageContext);
  const [isSavingNewPreferredCurrency, setIsSavingNewPreferredCurrency] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<FiatUnitType>(FiatUnit.USD);
  const [currencyRate, setCurrencyRate] = useState<CurrencyRate>({ LastUpdated: null, Rate: null });
  const { colors } = useTheme();
  const { setOptions } = useNavigation<any>();

  const [search, setSearch] = useState('');
  const data = Object.values(FiatUnit).filter(item => item.endPointKey.toLowerCase().includes(search.toLowerCase()));

  const styles = StyleSheet.create({
    flex: {
      flex: 1,
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

  useLayoutEffect(() => {
    setOptions({
      headerSearchBarOptions: {
        onChangeText: (event: NativeSyntheticEvent<{ text: string }>) => setSearch(event.nativeEvent.text),
      },
    });
    fetchCurrency();
  }, [setOptions]);

  const renderItem = ({ item }: { item: FiatUnitType }) => (
    <ListItem
      disabled={isSavingNewPreferredCurrency || selectedCurrency.endPointKey === item.endPointKey}
      title={`${item.endPointKey} (${item.symbol})`}
      containerStyle={StyleSheet.flatten([styles.flex, { minHeight: 60 }])}
      checkmark={selectedCurrency.endPointKey === item.endPointKey}
      onPress={async () => {
        setIsSavingNewPreferredCurrency(true);
        try {
          await getFiatRate(item.endPointKey);
          await setPreferredCurrency(item);
          await initCurrencyDaemon(true);
          await fetchCurrency();
          setSelectedCurrency(item);
          setPreferredFiatCurrency();
        } catch (error: any) {
          console.log(error);
          presentAlert({
            message: error.message ? `${loc.settings.currency_fetch_error}: ${error.message}}` : loc.settings.currency_fetch_error,
          });
        } finally {
          setIsSavingNewPreferredCurrency(false);
        }
      }}
    />
  );

  return (
    <View style={styles.flex}>
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustContentInsets
        keyExtractor={(_item, index) => `${index}`}
        data={data}
        initialNumToRender={30}
        extraData={data}
        renderItem={renderItem}
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
          {/* @ts-ignore TODO: fix typescript error later */}
          {loc.settings.last_updated}: {dayjs(currencyRate.LastUpdated).calendar() ?? loc._.never}
        </BlueText>
      </BlueCard>
    </View>
  );
};

export default Currency;

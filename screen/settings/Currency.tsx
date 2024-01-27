import React, { useState, useContext, useLayoutEffect } from 'react';
import { FlatList, StyleSheet, View, NativeSyntheticEvent } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import navigationStyle from '../../components/navigationStyle';
import { BlueText, BlueCard, BlueSpacing10 } from '../../BlueComponents';
import { FiatUnit, FiatUnitSource, FiatUnitType, getFiatRate } from '../../models/fiatUnit';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import dayjs from 'dayjs';
import alert from '../../components/Alert';
import { useTheme } from '../../components/themes';
import ListItem from '../../components/ListItem';
dayjs.extend(require('dayjs/plugin/calendar'));
const currency = require('../../blue_modules/currency');

const ITEM_HEIGHT = 50;

interface CurrencyRate {
  LastUpdated: Date | null;
  Rate: number | null;
}

const Currency: React.FC = () => {
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
      headerSearchBarOptions: {
        onChangeText: (event: NativeSyntheticEvent<{ text: string }>) => setSearch(event.nativeEvent.text),
      },
    });
    fetchCurrency();
  }, [setOptions]);

  const getItemLayout = (_data: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  });

  const renderItem = ({ item }: { item: FiatUnitType }) => (
    <ListItem
      disabled={isSavingNewPreferredCurrency || selectedCurrency.endPointKey === item.endPointKey}
      title={`${item.endPointKey} (${item.symbol})`}
      containerStyle={{ height: ITEM_HEIGHT }}
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
        } catch (error: any) {
          console.log(error);
          alert(error.message ? `${loc.settings.currency_fetch_error}: ${error.message}}` : loc.settings.currency_fetch_error);
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
        getItemLayout={getItemLayout}
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

/* @ts-ignore TODO: fix typescript error later */
Currency.navigationOptions = navigationStyle({}, (opts: any) => ({ ...opts, title: loc.settings.currency }));

export default Currency;

import React, { useState, useEffect } from 'react';
import { FlatList, TouchableOpacity, ActivityIndicator, View, StyleSheet } from 'react-native';
import { SafeBlueArea, BlueListItem, BlueTextHooks, BlueCard, BlueNavigationStyle } from '../../BlueComponents';
import PropTypes from 'prop-types';
import { FiatUnit } from '../../models/fiatUnit';
import loc from '../../loc';
import { useTheme } from '@react-navigation/native';
const currency = require('../../blue_modules/currency');

const data = Object.values(FiatUnit);

const Currency = () => {
  const [isSavingNewPreferredCurrency, setIsSavingNewPreferredCurrency] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState(null);
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

  useEffect(() => {
    const fetchCurrency = async () => {
      try {
        const preferredCurrency = await currency.getPreferredCurrency();
        if (preferredCurrency === null) {
          throw Error();
        }
        setSelectedCurrency(preferredCurrency);
      } catch (_error) {
        setSelectedCurrency(FiatUnit.USD);
      }
    };
    fetchCurrency();
  }, []);

  if (selectedCurrency !== null && selectedCurrency !== undefined) {
    return (
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={styles.flex}>
        <FlatList
          style={styles.flex}
          keyExtractor={(_item, index) => `${index}`}
          data={data}
          extraData={data}
          renderItem={({ item }) => {
            return (
              <BlueListItem
                disabled={isSavingNewPreferredCurrency}
                title={`${item.endPointKey} (${item.symbol})`}
                {...(selectedCurrency.endPointKey === item.endPointKey
                  ? { rightIcon: { name: 'check', type: 'octaicon', color: '#0070FF' } }
                  : { hideChevron: true })}
                Component={TouchableOpacity}
                onPress={async () => {
                  setIsSavingNewPreferredCurrency(true);
                  setSelectedCurrency(item);
                  await currency.setPrefferedCurrency(item);
                  await currency.startUpdater();
                  setIsSavingNewPreferredCurrency(false);
                }}
              />
            );
          }}
        />
        <BlueCard>
          <BlueTextHooks>{loc.settings.currency_source}</BlueTextHooks>
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

Currency.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
};

Currency.navigationOptions = () => ({
  ...BlueNavigationStyle(),
  title: loc.settings.currency,
});
export default Currency;

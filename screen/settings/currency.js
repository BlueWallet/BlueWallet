import React, { useState, useEffect } from 'react';
import { FlatList, TouchableOpacity, ActivityIndicator, View, StyleSheet } from 'react-native';
import { SafeBlueArea, BlueNavigationStyle, BlueListItem, BlueText, BlueCard } from '../../BlueComponents';
import PropTypes from 'prop-types';
import { Icon } from 'react-native-elements';
import { FiatUnit } from '../../models/fiatUnit';
let loc = require('../../loc');
let currency = require('../../currency');

const data = Object.values(FiatUnit);

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  activity: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const Currency = () => {
  const [isSavingNewPreferredCurrency, setIsSavingNewPreferredCurrency] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState(null);

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
                  ? { rightIcon: <Icon name="check" type="octaicon" color="#0070FF" /> }
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
          <BlueText>Prices are obtained from CoinDesk</BlueText>
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

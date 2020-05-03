import React, { useState, useEffect } from 'react';
import { FlatList, TouchableOpacity, ActivityIndicator, View } from 'react-native';
import { SafeBlueArea, BlueNavigationStyle, BlueListItem, BlueText, BlueCard } from '../../BlueComponents';
import PropTypes from 'prop-types';
import { Icon } from 'react-native-elements';
import { FiatUnit } from '../../models/fiatUnit';
let loc = require('../../loc');
let currency = require('../../currency');

const data = Object.values(FiatUnit);

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
      <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1 }}>
        <FlatList
          style={{ flex: 1 }}
          keyExtractor={(_item, index) => `${index}`}
          data={data}
          extraData={data}
          renderItem={({ item }) => {
            return (
              <BlueListItem
                disabled={isSavingNewPreferredCurrency}
                title={`${item.endPointKey} (${item.symbol})`}
                {...(selectedCurrency.endPointKey === item.endPointKey
                  ? { rightIcon: <Icon name="check" type="font-awesome" color="#0c2550" /> }
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
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
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

import React, { Component } from 'react';
import { FlatList, TouchableOpacity, AsyncStorage, ActivityIndicator, View } from 'react-native';
import { SafeBlueArea, BlueNavigationStyle, BlueListItem } from '../../BlueComponents';
import PropTypes from 'prop-types';
import { Icon } from 'react-native-elements';
import { AppStorage } from '../../class';
import { FiatUnit } from '../../models/fiatUnit';
/** @type {AppStorage} */
let loc = require('../../loc');
let currency = require('../../currency');

export default class Currency extends Component {
  static navigationOptions = () => ({
    ...BlueNavigationStyle(),
    title: loc.settings.currency,
  });

  constructor(props) {
    super(props);
    this.state = { data: Object.values(FiatUnit), isSavingNewPreferredCurrency: false };
  }

  async componentDidMount() {
    try {
      const preferredCurrency = await AsyncStorage.getItem(AppStorage.PREFERREDCURRENCY);
      if (preferredCurrency === null) {
        throw Error();
      }
      this.setState({ selectedCurrency: JSON.parse(preferredCurrency) });
    } catch (_error) {
      this.setState({ selectedCurrency: FiatUnit.USD });
    }
  }

  renderItem = ({ item }) => {
    return (
      <TouchableOpacity
        onPress={() => {
          this.setState({ isSavingNewPreferredCurrency: true, selectedCurrency: item }, async () => {
            await AsyncStorage.setItem(AppStorage.PREFERREDCURRENCY, JSON.stringify(item));
            await currency.startUpdater(true);
            this.setState({ isSavingNewPreferredCurrency: false });
          });
        }}
      >
        <BlueListItem
          title={item.symbol + ' ' + item.formatterValue}
          {...(this.state.selectedCurrency.formatterValue === item.formatterValue
            ? {
                rightIcon: this.state.selectedNewCurrency ? (
                  <ActivityIndicator />
                ) : (
                  <Icon name="check" type="font-awesome" color="#0c2550" />
                ),
              }
            : { hideChevron: true })}
        />
      </TouchableOpacity>
    );
  };

  render() {
    if (this.state.selectedCurrency !== null && this.state.selectedCurrency !== undefined) {
      return (
        <SafeBlueArea forceInset={{ horizontal: 'always' }} style={{ flex: 1 }}>
          <FlatList
            style={{ flex: 1 }}
            keyExtractor={(_item, index) => `${index}`}
            data={this.state.data}
            extraData={this.state.data}
            renderItem={this.renderItem}
          />
        </SafeBlueArea>
      );
    }
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
}

Currency.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
};

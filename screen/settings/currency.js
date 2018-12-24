import React, { Component } from 'react';
import { FlatList, TouchableOpacity, AsyncStorage } from 'react-native';
import { SafeBlueArea, BlueNavigationStyle, BlueListItem } from '../../BlueComponents';
import PropTypes from 'prop-types';
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
    this.state = { data: Object.values(FiatUnit) };
  }

  async componentDidMount() {
    const preferredCurrency = (await AsyncStorage.getItem(AppStorage.PREFERREDCURRENCY)) || FiatUnit.USD;
    this.setState({ selectedCurrency: JSON.parse(preferredCurrency) });
  }

  renderItem = ({ item }) => {
    return (
      <TouchableOpacity
        onPress={async() => {
          await AsyncStorage.setItem(AppStorage.PREFERREDCURRENCY, JSON.stringify(item));
          await currency.startUpdater(true)
          this.props.navigation.goBack(null);
        }}
      >
        <BlueListItem title={item.symbol + ' ' + item.formatterValue} hideChevron />
      </TouchableOpacity>
    );
  };

  render() {
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
}

Currency.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
};

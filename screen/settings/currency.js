import React, { Component } from 'react';
import { FlatList, TouchableOpacity, ActivityIndicator, View } from 'react-native';
import { SafeBlueArea, BlueNavigationStyle, BlueListItem, BlueText, BlueCard } from '../../BlueComponents';
import PropTypes from 'prop-types';
import { Icon } from 'react-native-elements';
import { FiatUnit } from '../../models/fiatUnit';
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
      const preferredCurrency = await currency.getPreferredCurrency();
      if (preferredCurrency === null) {
        throw Error();
      }
      this.setState({ selectedCurrency: preferredCurrency });
    } catch (_error) {
      this.setState({ selectedCurrency: FiatUnit.USD });
    }
  }

  renderItem = ({ item }) => {
    return (
      <TouchableOpacity
        onPress={() => {
          this.setState({ isSavingNewPreferredCurrency: true, selectedCurrency: item }, async () => {
            await currency.setPrefferedCurrency(item);
            await currency.startUpdater();
            this.setState({ isSavingNewPreferredCurrency: false });
          });
        }}
      >
        <BlueListItem
          title={item.endPointKey + ' (' + item.symbol + ')'}
          {...(this.state.selectedCurrency.endPointKey === item.endPointKey
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
  }
}

Currency.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
};

import React, { Component } from 'react';
import { ActivityIndicator, View, FlatList, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeBlueArea, BlueCard, BlueListItem, BlueHeader } from '../../BlueComponents';
import PropTypes from 'prop-types';
let EV = require('../../events');
/** @type {AppStorage} */
let BlueApp = require('../../BlueApp');
let loc = require('../../loc');

export default class SendList extends Component {
  static navigationOptions = {
    tabBarLabel: loc.send.list.tabBarLabel,
    tabBarIcon: ({ tintColor, focused }) => (
      <Ionicons name={focused ? 'md-paper-plane' : 'md-paper-plane'} size={26} style={{ color: tintColor }} />
    ),
  };

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
    };
    this.walletsCount = 0;
    EV(EV.enum.WALLETS_COUNT_CHANGED, () => {
      return this.componentDidMount();
    });
  }

  async componentDidMount() {
    console.log('receive/list - componentDidMount');
    let list = [];

    this.walletsCount = 0;
    for (let w of BlueApp.getWallets()) {
      list.push({
        title: w.getAddress(),
        subtitle: w.getLabel(),
      });
      this.walletsCount++;
    }

    this.setState({
      isLoading: false,
      list: list,
      dataSource: list,
    });
  }

  render() {
    const { navigate } = this.props.navigation;

    if (this.state.isLoading) {
      return (
        <SafeBlueArea forceInset={{ horizontal: 'always' }}>
          <View style={{ flex: 1, paddingTop: 20 }}>
            <ActivityIndicator />
          </View>
        </SafeBlueArea>
      );
    }

    return (
      <SafeBlueArea forceInset={{ horizontal: 'always' }}>
        <BlueHeader
          centerComponent={{
            text: loc.send.list.header,
            style: { color: BlueApp.settings.foregroundColor, fontSize: 23 },
          }}
        />

        <BlueCard containerStyle={{ padding: 0 }}>
          <FlatList
            data={this.state.dataSource}
            extraData={this.state.dataSource}
            style={Styles.flatList}
            renderItem={item => {
              return (
                <BlueListItem
                  title={item.title}
                  subtitle={item.subtitle}
                  onPress={() => {
                    navigate('SendDetails', { fromAddress: item.title });
                  }}
                  leftIcon={{
                    name: 'bitcoin',
                    type: 'font-awesome',
                    color: BlueApp.settings.foregroundColor,
                  }}
                />
              );
            }}
          />
        </BlueCard>
      </SafeBlueArea>
    );
  }
}

const Styles = StyleSheet.create({
  flatList: {
    flex: 1,
  },
});

SendList.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
  }),
};
